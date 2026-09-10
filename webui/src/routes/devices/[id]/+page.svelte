<script lang="ts">
  import { browser } from '$app/environment';
  import { invalidate } from '$app/navigation';
  import { onMount } from 'svelte';

  import {
    approveConfigQueueItem,
    fetchConfigQueueItem,
    fetchDeviceConfigQueue,
    resyncDevice,
    type DeviceInfo,
    type QueueItemDetail
  } from '$lib/core/orchestron/client';
  import XmlDiff from '$lib/core/diff/XmlDiff.svelte';
  import EmptyState from '$lib/core/ui/EmptyState.svelte';
  import NavIcon from '$lib/core/ui/NavIcon.svelte';
  import Skeleton from '$lib/core/ui/Skeleton.svelte';
  import StatusPill from '$lib/core/ui/StatusPill.svelte';
  import { onGlobalRefresh } from '$lib/core/util/global-refresh';
  import { appHref } from '$lib/core/util/nav';

  let {
    data
  }: { data: { deviceId: string; device: DeviceInfo | null; loadError: string } } = $props();

  let lastLoadedId = $state('');

  let configQueue: Record<string, { tid?: string }> = $state({});
  let selectedQueueItem: string | null = $state(null);
  let queueItemDetail: QueueItemDetail | null = $state(null);
  let resyncing = $state(false);
  let message: { type: 'success' | 'error'; text: string } | null = $state(null);
  let loadingQueue = $state(false);
  let approvingItem: string | null = $state(null);

  let device = $derived(data.device);
  let deviceId = $derived(data.deviceId);
  let error = $derived(data.loadError);
  let queueEntries = $derived(Object.entries(configQueue));

  $effect(() => {
    if (browser && deviceId && deviceId !== lastLoadedId) {
      lastLoadedId = deviceId;
      loadConfigQueue(deviceId);
    }
  });

  onMount(() =>
    onGlobalRefresh(() => {
      invalidate(`data:device:${data.deviceId}`);
      loadConfigQueue();
    })
  );

  async function loadConfigQueue(requestId = data.deviceId): Promise<void> {
    try {
      loadingQueue = true;
      const queue = await fetchDeviceConfigQueue(requestId);
      if (requestId !== data.deviceId) return;
      configQueue = queue;

      if (selectedQueueItem && !configQueue[selectedQueueItem]) {
        selectedQueueItem = null;
        queueItemDetail = null;
      }
    } catch (loadError) {
      if (requestId !== data.deviceId) return;
      console.error('Failed to load config queue:', loadError);
      configQueue = {};
    } finally {
      if (requestId === data.deviceId) {
        loadingQueue = false;
      }
    }
  }

  async function viewQueueItem(queueId: string): Promise<void> {
    try {
      selectedQueueItem = queueId;
      queueItemDetail = await fetchConfigQueueItem(deviceId, queueId);
    } catch (loadError) {
      message = {
        type: 'error',
        text: loadError instanceof Error ? loadError.message : 'Failed to load queue item.'
      };
    }
  }

  async function handleApproveItem(queueId: string): Promise<void> {
    try {
      approvingItem = queueId;
      const detail =
        selectedQueueItem === queueId && queueItemDetail
          ? queueItemDetail
          : await fetchConfigQueueItem(deviceId, queueId);

      await approveConfigQueueItem(deviceId, queueId, detail.device_txid, true);
      message = { type: 'success', text: `Queue item ${queueId} approved and pushed to device.` };

      if (selectedQueueItem === queueId) {
        selectedQueueItem = null;
        queueItemDetail = null;
      }

      await loadConfigQueue();
    } catch (approveError) {
      message = {
        type: 'error',
        text: approveError instanceof Error ? approveError.message : 'Failed to approve queue item.'
      };
    } finally {
      approvingItem = null;
    }
  }

  async function handleResync(): Promise<void> {
    try {
      resyncing = true;
      message = null;
      await resyncDevice(deviceId);
      message = { type: 'success', text: 'Device resynced successfully.' };
      await invalidate(`data:device:${data.deviceId}`);
      await loadConfigQueue();
    } catch (resyncError) {
      message = {
        type: 'error',
        text: resyncError instanceof Error ? resyncError.message : 'Failed to resync device.'
      };
    } finally {
      resyncing = false;
    }
  }

  function approvalLabel(approved: boolean | null | undefined): { tone: 'success' | 'danger' | 'warning'; label: string } {
    if (approved === true) return { tone: 'success', label: 'Approved' };
    if (approved === false) return { tone: 'danger', label: 'Rejected' };
    return { tone: 'warning', label: 'Pending approval' };
  }
</script>

<div class="device-detail">
  {#if error}
    <div class="page-header">
      <div>
        <h2>Device</h2>
      </div>
    </div>
    <EmptyState tone="danger" icon="alert" title="Device unavailable" description={error} />
  {:else if device}
    <div class="page-header">
      <div class="device-detail__title">
        <h2>{device.name || device.id}</h2>
        <div class="device-detail__subtitle">
          {#if device.type}
            <span>{device.type}</span>
          {/if}
          {#if device.name && device.name !== device.id}
            <span class="monospace">{device.id}</span>
          {/if}
          {#if device.approvalRequired}
            <StatusPill tone="warning" label="Approval required" />
          {:else}
            <StatusPill tone="neutral" label="Auto-approve" dot={false} />
          {/if}
        </div>
      </div>

      <div class="device-detail__actions" data-tour="device-actions">
        <a class="btn btn-secondary" href={appHref(`/devices/${deviceId}/config`)}>
          <NavIcon name="file" size={15} /> Configuration
        </a>
        <a class="btn btn-secondary" href={appHref(`/devices/${deviceId}/log`)}>
          <NavIcon name="history" size={15} /> Log
        </a>
        <button class="btn btn-primary" type="button" disabled={resyncing} onclick={handleResync}>
          <NavIcon name="refresh" size={15} /> {resyncing ? 'Resyncing...' : 'Resync'}
        </button>
      </div>
    </div>

    {#if message}
      <div class="flash {message.type}">{message.text}</div>
    {/if}

    <div class="device-detail__grid">
      <section class="panel">
        <h4>Device information</h4>
        <dl class="meta-list">
          <div>
            <dt>ID</dt>
            <dd class="monospace">{device.id}</dd>
          </div>
          <div>
            <dt>Type</dt>
            <dd>{device.type || 'Unknown'}</dd>
          </div>
          {#if device.username}
            <div>
              <dt>Username</dt>
              <dd>{device.username}</dd>
            </div>
          {/if}
          {#if device.addresses?.length}
            <div>
              <dt>Addresses</dt>
              <dd class="monospace">
                {#each device.addresses as address}
                  <div>{address.name}: {address.address}:{address.port}</div>
                {/each}
              </dd>
            </div>
          {/if}
        </dl>
      </section>

      <section class="panel">
        <h4>Status</h4>
        <dl class="meta-list">
          <div>
            <dt>Running config</dt>
            <dd>
              {#if device.hasRunningConfig}
                <StatusPill tone="success" label="Present" />
              {:else}
                <StatusPill tone="danger" label="Missing" />
              {/if}
            </dd>
          </div>
          <div>
            <dt>Target config</dt>
            <dd>
              {#if device.hasTargetConfig}
                <StatusPill tone="success" label="Present" />
              {:else}
                <StatusPill tone="neutral" label="None" />
              {/if}
            </dd>
          </div>
          <div>
            <dt>Queue length</dt>
            <dd class="num-inline">{device.queueLength ?? 0}</dd>
          </div>
          <div>
            <dt>Pending approvals</dt>
            <dd class="num-inline" class:attention={(device.pendingApprovals ?? 0) > 0}>{device.pendingApprovals ?? 0}</dd>
          </div>
        </dl>
      </section>

      <section class="panel">
        <h4>Feature flags</h4>
        {#if device.featureFlags && Object.keys(device.featureFlags).length > 0}
          <ul class="flag-list">
            {#each Object.entries(device.featureFlags) as [flag, enabled]}
              <li>
                <span class="monospace">{flag}</span>
                <StatusPill tone={enabled ? 'success' : 'neutral'} label={enabled ? 'Enabled' : 'Disabled'} dot={enabled} />
              </li>
            {/each}
          </ul>
        {:else}
          <p class="text-muted">No feature flags configured.</p>
        {/if}
      </section>
    </div>

    <section class="card" data-tour="device-queue">
      <div class="card-header">
        <h3>Configuration queue</h3>
        <span class="card-badge push-right">{queueEntries.length} item{queueEntries.length === 1 ? '' : 's'}</span>
      </div>

      <div class="card-body">
        {#if loadingQueue && queueEntries.length === 0}
          <Skeleton variant="rows" rows={2} />
        {:else if queueEntries.length === 0}
          <EmptyState icon="check" title="Queue is empty" description="No configuration changes are waiting for this device." compact />
        {:else}
          <div class="queue-layout">
            <div class="queue-layout__list">
              {#each queueEntries as [queueId, item], index}
                <div class:selected={selectedQueueItem === queueId} class="queue-card">
                  <div class="queue-card__header">
                    <strong>Queue #{queueId}</strong>
                    {#if item.tid}
                      <StatusPill tone="neutral" label={item.tid} mono dot={false} title="Transaction ID" />
                    {/if}
                  </div>
                  <div class="queue-card__actions">
                    <button class="btn btn-secondary btn-sm" type="button" onclick={() => viewQueueItem(queueId)}>
                      View diff
                    </button>
                    <button
                      class="btn btn-primary btn-sm"
                      type="button"
                      disabled={index !== 0 || approvingItem === queueId}
                      title={index !== 0 ? 'Only the first queued change per device can be approved.' : undefined}
                      onclick={() => handleApproveItem(queueId)}
                    >
                      {approvingItem === queueId ? 'Approving...' : 'Approve'}
                    </button>
                  </div>
                </div>
              {/each}
            </div>

            <div class="queue-layout__detail">
              {#if selectedQueueItem && queueItemDetail}
                {@const status = approvalLabel(queueItemDetail.approved)}
                <div class="queue-layout__detail-header">
                  <h5>Queue item {selectedQueueItem}</h5>
                  <StatusPill tone={status.tone} label={status.label} />
                </div>
                {#if queueItemDetail.config_diff}
                  <XmlDiff diff={queueItemDetail.config_diff} minHeight="16rem" maxHeight="40rem" />
                {:else}
                  <EmptyState icon="file" title="No diff" description="This queue item carries no configuration diff." compact />
                {/if}
              {:else}
                <EmptyState icon="file" title="Select a queue item" description="Pick an item on the left to inspect its diff." compact />
              {/if}
            </div>
          </div>
        {/if}
      </div>
    </section>

    <section class="card" data-tour="device-modules">
      <div class="card-header">
        <h3>YANG modules</h3>
        <span class="card-badge push-right">{device.modules?.length ?? 0} module{device.modules?.length === 1 ? '' : 's'}</span>
      </div>

      {#if device.modules?.length}
        <div class="card-body no-pad module-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Module</th>
                <th>Namespace</th>
                <th>Revision</th>
                <th class="num">Features</th>
              </tr>
            </thead>
            <tbody>
              {#each device.modules as moduleInfo}
                <tr>
                  <td class="monospace">{moduleInfo.name}</td>
                  <td class="module-table__ns" title={moduleInfo.namespace}>{moduleInfo.namespace}</td>
                  <td class="monospace">{moduleInfo.revision || '—'}</td>
                  <td class="num">{moduleInfo.features?.length ?? 0}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {:else}
        <div class="card-body">
          <EmptyState icon="layers" title="No YANG modules" description="The device did not report any supported modules." compact />
        </div>
      {/if}
    </section>
  {/if}
</div>

<style>
  .device-detail {
    display: grid;
    gap: 20px;
  }

  .device-detail :global(.page-header) {
    margin-bottom: 0;
    align-items: center;
  }

  .device-detail__title {
    display: grid;
    gap: 6px;
  }

  .device-detail__subtitle {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px 12px;
    font-size: 13px;
    color: var(--sw-text-secondary);
  }

  .device-detail__actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .device-detail__grid {
    display: grid;
    gap: 16px;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  }

  .device-detail__grid h4 {
    margin-bottom: 14px;
  }

  .num-inline {
    font-variant-numeric: tabular-nums;
  }

  .attention {
    color: var(--sw-warning);
    font-weight: 600;
  }

  .flag-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 8px;
  }

  .flag-list li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    font-size: 12px;
    color: var(--sw-text-secondary);
  }

  .queue-layout {
    display: grid;
    gap: 16px;
    grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.4fr);
  }

  .queue-layout__list {
    display: grid;
    gap: 10px;
    align-content: start;
  }

  .queue-card {
    display: grid;
    gap: 10px;
    padding: 12px 14px;
    border: 1px solid var(--sw-border-subtle);
    border-radius: var(--sw-radius-md);
    background: var(--sw-bg-elevated);
    transition: border-color var(--sw-dur-fast), background var(--sw-dur-fast);
  }

  .queue-card.selected {
    border-color: var(--sw-accent-dim);
    background: var(--sw-accent-glow);
  }

  .queue-card__header,
  .queue-card__actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .queue-card__header strong {
    font-size: 13px;
  }

  .queue-card__actions {
    flex-wrap: wrap;
  }

  .queue-layout__detail {
    display: grid;
    gap: 12px;
    align-content: start;
    min-width: 0;
  }

  .queue-layout__detail-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .module-table-wrap {
    overflow: auto;
  }

  .module-table__ns {
    max-width: 420px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--sw-text-secondary);
  }

  @media (max-width: 960px) {
    .queue-layout {
      grid-template-columns: 1fr;
    }
  }
</style>
