<script lang="ts">
  import { invalidate } from '$app/navigation';
  import { onMount } from 'svelte';

  import DeviceConfigStatus from '$lib/core/ui/DeviceConfigStatus.svelte';
  import EmptyState from '$lib/core/ui/EmptyState.svelte';
  import { onGlobalRefresh } from '$lib/core/util/global-refresh';
  import { appHref } from '$lib/core/util/nav';

  import type { DeviceSummary } from '$lib/core/orchestron/client';

  let { data }: { data: { devices: DeviceSummary[]; loadError: string } } = $props();

  let searchQuery = $state('');

  let devices = $derived<DeviceSummary[]>(data.devices);
  let error = $derived(data.loadError);
  let filteredDevices = $derived(
    devices.filter((device) => device.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  onMount(() => onGlobalRefresh(() => invalidate('data:devices')));
</script>

<div class="page-header">
  <div>
    <h2>Devices</h2>
    <p>{devices.length} managed device{devices.length === 1 ? '' : 's'}</p>
  </div>

  <label>
    <span class="sr-only">Search devices</span>
    <input
      class="device-search"
      type="search"
      bind:value={searchQuery}
      placeholder="Search devices..."
    />
  </label>
</div>

{#if error}
  <EmptyState tone="danger" icon="alert" title="Devices unavailable" description={error} />
{:else if devices.length === 0}
  <EmptyState icon="devices" title="No devices" description="No managed devices were returned by the orchestrator." />
{:else if filteredDevices.length === 0}
  <EmptyState icon="search" title="No matches" description={`No device name contains "${searchQuery}".`} compact>
    {#snippet action()}
      <button class="btn btn-secondary btn-sm" type="button" onclick={() => (searchQuery = '')}>Clear search</button>
    {/snippet}
  </EmptyState>
{:else}
  <div class="device-grid" data-tour="device-grid">
    {#each filteredDevices as device}
      <a class="device-card card" href={appHref(`/devices/${encodeURIComponent(device.id)}`)}>
        <div class="device-card__header">
          <h3>{device.name}</h3>
          <DeviceConfigStatus hasRunningConfig={device.hasRunningConfig} />
        </div>
        <div class="device-card__meta">
          {#if device.type}
            <span>{device.type}</span>
          {/if}
          {#if device.address}
            <span class="monospace">{device.address}</span>
          {/if}
          {#if device.id !== device.name}
            <span class="monospace">{device.id}</span>
          {/if}
        </div>
        {#if (device.pendingApprovals ?? 0) > 0}
          <span class="device-card__pending">
            {device.pendingApprovals} pending approval{device.pendingApprovals === 1 ? '' : 's'}
          </span>
        {/if}
      </a>
    {/each}
  </div>
{/if}

<style>
  .device-search {
    min-width: 16rem;
    padding: 9px 12px;
    border-radius: var(--sw-radius-md);
    border: 1px solid var(--sw-border-default);
    background: var(--sw-bg-input);
    color: var(--sw-text-primary);
    font-size: 13px;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  .device-search::placeholder {
    color: var(--sw-text-muted);
  }

  .device-search:focus {
    border-color: var(--sw-accent);
    box-shadow: 0 0 0 3px var(--sw-accent-glow);
  }

  .device-grid {
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  }

  .device-card {
    display: grid;
    gap: 8px;
    padding: 16px;
    text-decoration: none;
    transition: background-color var(--sw-dur-fast), border-color var(--sw-dur-fast);
  }

  .device-card:hover {
    background: var(--sw-bg-hover);
    border-color: var(--sw-border-default);
  }

  .device-card__header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .device-card__header h3 {
    font-size: 15px;
    overflow-wrap: anywhere;
  }

  .device-card__meta {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    font-size: 12px;
    color: var(--sw-text-muted);
    overflow-wrap: anywhere;
  }

  .device-card__pending {
    font-size: 12px;
    font-weight: 500;
    color: var(--sw-warning);
  }

  @media (max-width: 640px) {
    .device-search {
      width: 100%;
      min-width: 0;
    }
  }
</style>
