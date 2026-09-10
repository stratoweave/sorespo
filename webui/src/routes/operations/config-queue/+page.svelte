<script lang="ts">
  import { onMount } from 'svelte';

  import {
    approveConfigQueueItem,
    fetchConfigQueueItem,
    isPendingQueueItem,
    type QueueItemDetail,
    type QueueItemSummary
  } from '$lib/core/orchestron/client';
  import { queuesPoll, refreshQueues, type QueuesPollValue } from '$lib/core/orchestron/poll-store';
  import XmlDiff from '$lib/core/diff/XmlDiff.svelte';
  import EmptyState from '$lib/core/ui/EmptyState.svelte';
  import NavIcon from '$lib/core/ui/NavIcon.svelte';
  import SegmentedControl from '$lib/core/ui/SegmentedControl.svelte';
  import Skeleton from '$lib/core/ui/Skeleton.svelte';
  import StatusPill from '$lib/core/ui/StatusPill.svelte';
  import { onGlobalRefresh } from '$lib/core/util/global-refresh';
  import { LatestRequest } from '$lib/core/util/latest-request';

  let allQueues: QueueItemSummary[] = $state([]);
  let loading = $state(true);
  let error = $state('');
  let selectedDevice: string | null = $state(null);
  let selectedQueueIndex = $state(0);
  let itemDetail: QueueItemDetail | null = $state(null);
  let approvingItem: string | null = $state(null);
  let diffFormat = $state('xml');

  let pendingCount = $derived(allQueues.filter(isPendingQueueItem).length);
  let deviceGroups = $derived(
    allQueues.reduce<Record<string, QueueItemSummary[]>>((groups, item) => {
      groups[item.deviceId] = [...(groups[item.deviceId] ?? []), item];
      return groups;
    }, {})
  );
  let deviceList = $derived(
    Object.entries(deviceGroups).map(([deviceId, items]) => ({
      deviceId,
      items,
      count: items.filter(isPendingQueueItem).length
    }))
  );
  let selectedItem = $derived(
    selectedDevice && deviceGroups[selectedDevice]
      ? deviceGroups[selectedDevice][selectedQueueIndex] ?? null
      : null
  );

  onMount(() => {
    const unsubscribePoll = queuesPoll.subscribe((value) => {
      if (!value.loaded && !value.error) return;
      applyPoll(value);
    });

    const offRefresh = onGlobalRefresh(() => {
      void refreshQueues();
    });

    return () => {
      unsubscribePoll();
      offRefresh();
    };
  });

  function applyPoll(value: QueuesPollValue): void {
    const previous = selectedItem
      ? { deviceId: selectedItem.deviceId, queueId: selectedItem.queueId }
      : null;

    allQueues = value.queues;
    loading = false;
    error = value.error ?? '';

    if (value.queues.length === 0) {
      selectedDevice = null;
      selectedQueueIndex = 0;
      itemDetail = null;
      return;
    }

    if (previous) {
      const deviceItems = value.queues.filter((item) => item.deviceId === previous.deviceId);
      const nextIndex = deviceItems.findIndex((item) => item.queueId === previous.queueId);
      if (nextIndex >= 0) {
        selectedDevice = previous.deviceId;
        selectedQueueIndex = nextIndex;
        return;
      }

      // The selected item was consumed (approved/rejected); stay on the same
      // device's queue and advance to its new head rather than jumping to an
      // unrelated device's diff.
      if (deviceItems.length > 0) {
        selectedDevice = previous.deviceId;
        selectedQueueIndex = 0;
        void loadItemDetail(previous.deviceId, deviceItems[0].queueId);
        return;
      }
    }

    const firstDeviceId = value.queues[0].deviceId;
    const firstItem = value.queues.find((item) => item.deviceId === firstDeviceId)!;
    selectedDevice = firstDeviceId;
    selectedQueueIndex = 0;
    void loadItemDetail(firstDeviceId, firstItem.queueId);
  }

  async function selectDevice(deviceId: string, index = 0): Promise<void> {
    selectedDevice = deviceId;
    selectedQueueIndex = index;

    const item = deviceGroups[deviceId]?.[index];
    if (item) {
      await loadItemDetail(item.deviceId, item.queueId);
    } else {
      itemDetail = null;
    }
  }

  const detailRequest = new LatestRequest();

  async function loadItemDetail(deviceId: string, queueId: string): Promise<void> {
    const token = detailRequest.begin();
    itemDetail = null;
    try {
      const detail = await fetchConfigQueueItem(deviceId, queueId, diffFormat);
      if (!detailRequest.isCurrent(token)) return;
      itemDetail = detail;
    } catch (loadError) {
      if (!detailRequest.isCurrent(token)) return;
      error = loadError instanceof Error ? loadError.message : 'Failed to load queue item detail.';
    }
  }

  async function changeFormat(format: string): Promise<void> {
    diffFormat = format;
    if (selectedItem) {
      await loadItemDetail(selectedItem.deviceId, selectedItem.queueId);
    }
  }

  async function handleDecision(approved: boolean): Promise<void> {
    if (!selectedItem) {
      return;
    }

    try {
      approvingItem = `${selectedItem.deviceId}:${selectedItem.queueId}`;
      await approveConfigQueueItem(
        selectedItem.deviceId,
        selectedItem.queueId,
        selectedItem.deviceTxid,
        approved
      );
      await refreshQueues();
    } catch (decisionError) {
      error = decisionError instanceof Error ? decisionError.message : 'Failed to update queue item.';
    } finally {
      approvingItem = null;
    }
  }

  function approvalStatus(approved: boolean | null | undefined): { tone: 'success' | 'danger' | 'warning'; label: string } {
    if (approved === true) return { tone: 'success', label: 'Approved' };
    if (approved === false) return { tone: 'danger', label: 'Rejected' };
    return { tone: 'warning', label: 'Pending' };
  }

  async function navigateQueue(direction: 'prev' | 'next'): Promise<void> {
    if (!selectedDevice || !deviceGroups[selectedDevice]) {
      return;
    }

    const items = deviceGroups[selectedDevice];
    const nextIndex =
      direction === 'next'
        ? Math.min(selectedQueueIndex + 1, items.length - 1)
        : Math.max(selectedQueueIndex - 1, 0);

    await selectDevice(selectedDevice, nextIndex);
  }
</script>

<div class="page-header">
  <div>
    <h2>Configuration Queue</h2>
    <p>Review pending device approvals and apply or reject the first queued change per device.</p>
  </div>
  <div class="queue-meta">
    <StatusPill tone={pendingCount > 0 ? 'warning' : 'success'} label={`${pendingCount} pending`} />
  </div>
</div>

<div class="queue-layout">
  <section class="card queue-layout__sidebar" data-tour="queue-list">
    {#if loading && allQueues.length === 0}
      <Skeleton variant="rows" rows={3} />
    {:else if error && allQueues.length === 0}
      <EmptyState tone="danger" icon="alert" title="Queue unavailable" description={error} compact />
    {:else if allQueues.length === 0}
      <EmptyState icon="check" title="Nothing to approve" description="All device queues are empty." compact />
    {:else}
      <div class="queue-device-list">
        {#each deviceList as device}
          <div class:selected={selectedDevice === device.deviceId} class="queue-device">
            <button type="button" onclick={() => selectDevice(device.deviceId, 0)}>
              <strong>{device.deviceId}</strong>
              <StatusPill tone={device.count > 0 ? 'warning' : 'neutral'} label={String(device.count)} dot={false} />
            </button>
            {#if selectedDevice === device.deviceId}
              <div class="queue-device__items">
                {#each device.items as item, index}
                  {@const status = approvalStatus(item.approved)}
                  <button
                    class:active={selectedQueueIndex === index}
                    class="queue-device__item"
                    type="button"
                    onclick={() => selectDevice(device.deviceId, index)}
                  >
                    <span class="monospace">#{item.queueId}</span>
                    <StatusPill tone={status.tone} label={status.label} />
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </section>

  <section class="card queue-layout__detail" data-tour="queue-detail">
    {#if error && allQueues.length > 0}
      <div class="flash error">{error}</div>
    {/if}

    {#if selectedItem && itemDetail}
      <div class="queue-layout__detail-header">
        <div>
          <h3>{selectedItem.deviceId}</h3>
          <p>
            Queue #{selectedItem.queueId}
            {#if itemDetail.tid}
              · TID {itemDetail.tid}
            {/if}
            {#if itemDetail.device_txid}
              · Device TxID {itemDetail.device_txid}
            {/if}
          </p>
        </div>
        <SegmentedControl
          ariaLabel="Diff format"
          options={[
            { value: 'xml', label: 'XML' },
            { value: 'json', label: 'JSON' },
            { value: 'adata', label: 'AData' },
            { value: 'gdata', label: 'GData' }
          ]}
          value={diffFormat}
          onchange={(format) => changeFormat(format)}
        />
      </div>

      <div class="queue-layout__detail-toolbar">
        <div class="queue-layout__nav">
          <button class="btn btn-secondary btn-sm" type="button" disabled={selectedQueueIndex === 0} onclick={() => navigateQueue('prev')}>
            <NavIcon name="chevron-left" size={14} /> Previous
          </button>
          <span class="queue-layout__position">
            {selectedQueueIndex + 1} / {selectedDevice ? deviceGroups[selectedDevice]?.length ?? 1 : 1}
          </span>
          <button
            class="btn btn-secondary btn-sm"
            type="button"
            disabled={!selectedDevice || selectedQueueIndex >= (deviceGroups[selectedDevice]?.length ?? 1) - 1}
            onclick={() => navigateQueue('next')}
          >
            Next <NavIcon name="chevron-right" size={14} />
          </button>
        </div>
        <div class="queue-layout__actions" data-tour="queue-actions">
          <button
            class="btn btn-danger"
            type="button"
            disabled={selectedQueueIndex !== 0 || approvingItem === `${selectedItem.deviceId}:${selectedItem.queueId}`}
            title={selectedQueueIndex !== 0 ? 'Only the first queued change per device can be approved or rejected.' : undefined}
            onclick={() => handleDecision(false)}
          >
            {approvingItem === `${selectedItem.deviceId}:${selectedItem.queueId}` ? 'Updating...' : 'Reject'}
          </button>
          <button
            class="btn btn-primary"
            type="button"
            disabled={selectedQueueIndex !== 0 || approvingItem === `${selectedItem.deviceId}:${selectedItem.queueId}`}
            title={selectedQueueIndex !== 0 ? 'Only the first queued change per device can be approved or rejected.' : undefined}
            onclick={() => handleDecision(true)}
          >
            <NavIcon name="check" size={15} />
            {approvingItem === `${selectedItem.deviceId}:${selectedItem.queueId}` ? 'Updating...' : 'Approve & Apply'}
          </button>
        </div>
      </div>

      {#if itemDetail.config_diff}
        <XmlDiff diff={itemDetail.config_diff} format={diffFormat} minHeight="28rem" maxHeight="calc(100vh - 340px)" />
      {:else}
        <EmptyState icon="file" title="No diff" description="This queue item carries no configuration diff." compact />
      {/if}
    {:else if selectedItem}
      <Skeleton height="28rem" />
    {:else}
      <EmptyState icon="queue" title="Select a queue item" description="Pick a device on the left to review its pending change." />
    {/if}
  </section>
</div>

<style>
  .queue-meta {
    display: flex;
    gap: 0.6rem;
    flex-wrap: wrap;
  }

  .queue-layout {
    display: grid;
    gap: 1rem;
    grid-template-columns: minmax(280px, 0.85fr) minmax(0, 1.45fr);
  }

  .queue-layout__sidebar,
  .queue-layout__detail {
    padding: 16px;
  }

  .queue-layout__sidebar {
    align-self: start;
  }

  .queue-device-list {
    display: grid;
    gap: 8px;
  }

  .queue-device {
    padding: 10px 12px;
    border-radius: var(--sw-radius-md);
    border: 1px solid var(--sw-border-subtle);
    background: var(--sw-bg-elevated);
    transition: border-color var(--sw-dur-fast), background var(--sw-dur-fast);
  }

  .queue-device.selected {
    border-color: var(--sw-accent-dim);
    background: var(--sw-accent-glow);
  }

  .queue-device > button {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    border: none;
    background: transparent;
    padding: 2px 0;
    cursor: pointer;
    color: var(--sw-text-primary);
    font-size: 13px;
  }

  .queue-device__items {
    display: grid;
    gap: 6px;
    margin-top: 10px;
  }

  .queue-device__item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 8px 10px;
    border: 1px solid var(--sw-border-subtle);
    border-radius: var(--sw-radius-sm);
    background: var(--sw-bg-card);
    cursor: pointer;
    color: var(--sw-text-primary);
    font-size: 12px;
    transition: border-color var(--sw-dur-fast), background var(--sw-dur-fast);
  }

  .queue-device__item:hover {
    border-color: var(--sw-border-default);
  }

  .queue-device__item.active {
    border-color: var(--sw-accent-dim);
    background: var(--sw-accent-glow);
  }

  .queue-layout__detail {
    display: grid;
    gap: 1rem;
  }

  .queue-layout__detail-header,
  .queue-layout__detail-toolbar {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .queue-layout__detail-header p {
    margin-top: 4px;
    font-size: 13px;
    color: var(--sw-text-muted);
  }

  .queue-layout__nav,
  .queue-layout__actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .queue-layout__position {
    font-size: 12px;
    color: var(--sw-text-muted);
    font-variant-numeric: tabular-nums;
  }

  @media (max-width: 980px) {
    .queue-layout {
      grid-template-columns: 1fr;
    }
  }
</style>
