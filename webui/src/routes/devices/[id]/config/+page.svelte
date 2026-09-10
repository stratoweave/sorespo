<script lang="ts">
  import { onMount } from 'svelte';

  import { fetchDeviceConfig, type DeviceConfigView } from '$lib/core/orchestron/client';
  import ConfigViewerCard from '$lib/core/ui/ConfigViewerCard.svelte';
  import EmptyState from '$lib/core/ui/EmptyState.svelte';
  import SegmentedControl from '$lib/core/ui/SegmentedControl.svelte';
  import { LatestRequest } from '$lib/core/util/latest-request';

  import type { PageProps } from './$types';

  let { data }: PageProps = $props();

  const VIEW_OPTIONS: { value: DeviceConfigView; label: string }[] = [
    { value: 'running', label: 'Running' },
    { value: 'target', label: 'Target' }
  ];
  const FORMAT_OPTIONS = [
    { value: 'json', label: 'JSON' },
    { value: 'xml', label: 'XML' },
    { value: 'gdata', label: 'GData' },
    { value: 'adata', label: 'AData' }
  ];

  let configViewMode = $state<DeviceConfigView>('running');
  let configFormat = $state('xml');
  let configData = $state('');
  let loadingConfig = $state(false);

  let device = $derived(data.device);
  let deviceId = $derived(data.deviceId);
  let error = $derived(data.loadError);

  const configRequest = new LatestRequest();

  // The layout remounts this page per pathname, so one initial load suffices.
  onMount(() => {
    void loadConfigView('running');
  });

  async function loadConfigView(mode: DeviceConfigView): Promise<void> {
    const token = configRequest.begin();
    try {
      loadingConfig = true;
      configViewMode = mode;
      configData = '';

      const result = await fetchDeviceConfig(deviceId, mode, configFormat);
      if (!configRequest.isCurrent(token)) return;
      configData = result;
    } catch (loadError) {
      if (!configRequest.isCurrent(token)) return;
      configData = `# Error loading ${mode} configuration: ${
        loadError instanceof Error ? loadError.message : 'Unknown failure'
      }`;
    } finally {
      if (configRequest.isCurrent(token)) {
        loadingConfig = false;
      }
    }
  }

  async function changeFormat(format: string): Promise<void> {
    configFormat = format;
    await loadConfigView(configViewMode);
  }
</script>

<div class="page-header">
  <div>
    <h1>Device Configuration</h1>
    <p>Inspect the running or target configuration in JSON, XML, GData, or AData form.</p>
  </div>
</div>

{#if error}
  <EmptyState tone="danger" icon="alert" title="Device unavailable" description={error} />
{:else if device}
  <div data-tour="config-viewer">
    <ConfigViewerCard title={device.name || device.id} loading={loadingConfig} content={configData}>
    {#snippet controls()}
      <SegmentedControl
        label="View"
        options={VIEW_OPTIONS}
        value={configViewMode}
        onchange={(mode) => loadConfigView(mode)}
      />
      <SegmentedControl
        label="Format"
        options={FORMAT_OPTIONS}
        value={configFormat}
        onchange={(format) => changeFormat(format)}
      />
    {/snippet}
    </ConfigViewerCard>
  </div>
{/if}
