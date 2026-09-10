<script lang="ts">
  import { onMount } from 'svelte';

  import { fetchDeviceConfigLog, type ConfigLogEntry } from '$lib/core/orchestron/client';
  import CodeBlock from '$lib/core/ui/CodeBlock.svelte';
  import EmptyState from '$lib/core/ui/EmptyState.svelte';
  import SegmentedControl from '$lib/core/ui/SegmentedControl.svelte';
  import Skeleton from '$lib/core/ui/Skeleton.svelte';
  import StatusPill from '$lib/core/ui/StatusPill.svelte';
  import { onGlobalRefresh } from '$lib/core/util/global-refresh';
  import { startPolling } from '$lib/core/util/poll';

  import type { StatusTone } from '$lib/core/ui/tones';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();

  let configLog = $state.raw<ConfigLogEntry[]>([]);
  let selectedEntry: ConfigLogEntry | null = $state(null);
  let selectedIndex = $state(-1);
  let configFormat = $state('xml');
  let loadingLog = $state(false);

  let device = $derived(data.device);
  let deviceId = $derived(data.deviceId);
  let error = $derived(data.loadError);

  const LOG_POLL_MS = 1000;

  // The layout remounts this page per pathname, so the poller is per device.
  onMount(() => {
    void loadLog(false);
    const offRefresh = onGlobalRefresh(() => loadLog());
    const stopPolling = startPolling(() => loadLog(true), LOG_POLL_MS, { immediate: false });

    return () => {
      offRefresh();
      stopPolling();
    };
  });

  async function loadLog(silent = false): Promise<void> {
    try {
      if (!silent) {
        loadingLog = true;
      }

      const response = await fetchDeviceConfigLog(deviceId, configFormat);
      const nextLog = response.log || [];
      const previousTimestamp = selectedEntry?.timestamp;

      configLog = nextLog;

      if (previousTimestamp) {
        const nextIndex = configLog.findIndex((entry) => entry.timestamp === previousTimestamp);
        if (nextIndex >= 0) {
          selectEntry(nextIndex);
        } else if (configLog.length > 0) {
          selectEntry(0);
        } else {
          selectedEntry = null;
          selectedIndex = -1;
        }
      } else if (configLog.length > 0 && !selectedEntry) {
        selectEntry(0);
      }
    } catch (loadError) {
      if (!silent) {
        console.error('Failed to load config log:', loadError);
        configLog = [];
      }
    } finally {
      if (!silent) {
        loadingLog = false;
      }
    }
  }

  function selectEntry(index: number): void {
    selectedIndex = index;
    selectedEntry = configLog[index] ?? null;
  }

  async function changeFormat(format: string): Promise<void> {
    configFormat = format;
    await loadLog();
  }

  function formatTimestamp(timestamp: string): string {
    const asString = String(timestamp);
    const date = asString.includes('T') ? new Date(asString) : new Date(Number(asString) * 1000);

    return new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(date);
  }

  function eventTone(event: string): StatusTone {
    switch (event) {
      case 'sent':
        return 'success';
      case 'failed':
        return 'danger';
      default:
        return 'neutral';
    }
  }
</script>

<div class="page-header">
  <div>
    <h1>Configuration log</h1>
    <p>Delivery history for {device?.name || deviceId}. Updates live.</p>
  </div>
</div>

{#if error}
  <EmptyState tone="danger" icon="alert" title="Device unavailable" description={error} />
{:else if device}
  <div class="log-layout">
    <section class="card log-layout__sidebar" data-tour="log-history">
      <div class="log-layout__sidebar-header">
        <h2>History</h2>
        <span class="pill">{configLog.length} entr{configLog.length === 1 ? 'y' : 'ies'}</span>
      </div>
      <div class="log-layout__list">
        {#if loadingLog && configLog.length === 0}
          <Skeleton variant="rows" rows={4} />
        {:else if configLog.length === 0}
          <EmptyState icon="history" title="No entries yet" description="Configuration pushes to this device will appear here." compact />
        {:else}
          {#each configLog as entry, index (`${index}:${entry.timestamp}`)}
            <button class:selected={selectedIndex === index} class="log-entry" type="button" onclick={() => selectEntry(index)}>
              <StatusPill tone={eventTone(entry.event)} label={entry.event} />
              <small class="monospace">{formatTimestamp(entry.timestamp)}</small>
            </button>
          {/each}
        {/if}
      </div>
    </section>

    <section class="card log-layout__detail">
      <div class="log-layout__detail-header">
        <div>
          <h2>Entry detail</h2>
          <p>XML is the only format the current backend renders reliably.</p>
        </div>
        <SegmentedControl
          ariaLabel="Diff format"
          options={[
            { value: 'json', label: 'JSON', disabled: true },
            { value: 'xml', label: 'XML' },
            { value: 'gdata', label: 'GData', disabled: true }
          ]}
          value={configFormat}
          onchange={(format) => changeFormat(format)}
        />
      </div>

      {#if selectedEntry}
        <div class="log-layout__detail-meta">
          <StatusPill tone={eventTone(selectedEntry.event)} label={selectedEntry.event} />
          <span class="pill mono">{formatTimestamp(selectedEntry.timestamp)}</span>
        </div>
        {#if selectedEntry.conf_diff}
          <CodeBlock content={selectedEntry.conf_diff} minHeight="28rem" maxHeight="var(--sw-code-viewer-height)" label="Diff" />
        {:else}
          <EmptyState icon="file" title="No diff" description="This entry carries no configuration diff." compact />
        {/if}
      {:else}
        <EmptyState icon="history" title="Select an entry" description="Pick a log entry on the left to inspect its diff." />
      {/if}
    </section>
  </div>
{/if}

<style>
  .log-layout {
    display: grid;
    gap: 1rem;
    grid-template-columns: minmax(260px, 0.85fr) minmax(0, 1.4fr);
  }

  .log-layout__sidebar,
  .log-layout__detail {
    padding: 16px;
  }

  .log-layout__sidebar {
    display: grid;
    gap: 1rem;
    align-content: start;
    align-self: start;
  }

  .log-layout__sidebar-header h2,
  .log-layout__detail-header h2 {
    font-size: 15px;
  }

  .log-layout__sidebar-header,
  .log-layout__detail-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
  }

  .log-layout__detail-header p {
    margin-top: 4px;
    font-size: 13px;
    color: var(--sw-text-muted);
  }

  .log-layout__list {
    display: grid;
    gap: 6px;
  }

  .log-entry {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 10px 12px;
    border: 1px solid var(--sw-border-subtle);
    border-radius: var(--sw-radius-md);
    background: var(--sw-bg-elevated);
    text-align: left;
    cursor: pointer;
    color: var(--sw-text-primary);
    transition: border-color var(--sw-dur-fast), background var(--sw-dur-fast);
  }

  .log-entry:hover {
    border-color: var(--sw-border-default);
  }

  .log-entry.selected {
    border-color: var(--sw-accent-dim);
    background: var(--sw-accent-glow);
  }

  .log-entry small {
    font-size: 12px;
    color: var(--sw-text-muted);
  }

  .log-layout__detail {
    display: grid;
    gap: 1rem;
  }

  .log-layout__detail-meta {
    display: flex;
    gap: 0.6rem;
    flex-wrap: wrap;
  }

  @media (max-width: 960px) {
    .log-layout {
      grid-template-columns: 1fr;
    }
  }
</style>
