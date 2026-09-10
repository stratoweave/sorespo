<script lang="ts">
  import { invalidate } from '$app/navigation';
  import { onMount } from 'svelte';

  import { getServiceModule } from '$lib/core/registry/service-modules';
  import { formatServiceRouteId, getRoutePathKey } from '$lib/core/registry/types';
  import { getListEntryPath, restconfDelete } from '$lib/core/restconf/client';
  import ConfirmDialog from '$lib/core/ui/ConfirmDialog.svelte';
  import EmptyState from '$lib/core/ui/EmptyState.svelte';
  import StatusBanner from '$lib/core/ui/StatusBanner.svelte';
  import StatusPill from '$lib/core/ui/StatusPill.svelte';
  import { StatusFlash } from '$lib/core/ui/status-flash.svelte';
  import { listItemTone } from '$lib/core/ui/tones';
  import { onGlobalRefresh } from '$lib/core/util/global-refresh';
  import { appHref } from '$lib/core/util/nav';

  import type { PageProps } from './$types';

  let { data }: PageProps = $props();

  let removingId = $state('');
  const status = new StatusFlash();
  let pendingRemoval: { id: string; label: string } | null = $state(null);

  let serviceModule = $derived(getServiceModule(data.moduleId));
  let items = $derived(data.items);
  let error = $derived(data.loadError);

  onMount(() => onGlobalRefresh(() => invalidate(`data:services:${data.moduleId}`)));

  function openRemoval(item: { id: string; label: string }): void {
    pendingRemoval = item;
  }

  async function confirmRemoval(): Promise<void> {
    if (!serviceModule?.deletable || !pendingRemoval) {
      return;
    }

    const item = pendingRemoval;
    pendingRemoval = null;
    const displayId = formatServiceRouteId(serviceModule, item.id);

    try {
      removingId = item.id;
      status.set(null);
      await restconfDelete(
        getListEntryPath(serviceModule.restconfRoot, getRoutePathKey(serviceModule, item.id))
      );
      await invalidate(`data:services:${data.moduleId}`);
      status.flash(`Removed ${displayId}.`);
    } catch (removeError) {
      status.error(
        removeError instanceof Error ? removeError.message : 'Failed to remove service.'
      );
    } finally {
      removingId = '';
    }
  }
</script>

{#if serviceModule}
  <div class="page-header">
    <div>
      <h1>{serviceModule.title}</h1>
      <p>{serviceModule.description}</p>
    </div>
    <div>
      <a class="btn btn-primary" href={appHref(`/services/${serviceModule.id}/new`)} data-tour="service-create">Create new</a>
    </div>
  </div>

  <div class="service-status">
    <StatusBanner message={status.message} />
  </div>

  {#if error}
    <EmptyState tone="danger" icon="alert" title="Could not load {serviceModule.collectionLabel.toLowerCase()}" description={error} />
  {:else if !serviceModule.list}
    <EmptyState icon="services" title="No collection view" description="This module does not expose a collection view yet." />
  {:else if items.length === 0}
    <EmptyState icon="services" title="No {serviceModule.collectionLabel.toLowerCase()} yet" description="Create the first one to see it listed here.">
      {#snippet action()}
        <a class="btn btn-primary btn-sm" href={appHref(`/services/${serviceModule.id}/new`)}>Create {serviceModule.collectionLabel.toLowerCase().replace(/s$/, '')}</a>
      {/snippet}
    </EmptyState>
  {:else}
    <div class="service-list" data-tour="service-list">
      {#each items as item (item.id)}
        <article class="card service-list__item">
          <a class="service-list__link" href={appHref(`/services/${serviceModule.id}/${encodeURIComponent(item.id)}`)}>
            <div class="service-list__copy">
              <div class="service-list__heading">
                <h2>{item.label}</h2>
                {#if item.badges && item.badges.length > 0}
                  <div class="service-list__badges">
                    {#each item.badges as badge (badge.text)}
                      <StatusPill tone={listItemTone(badge.tone)} label={badge.text} title={badge.title ?? ''} mono />
                    {/each}
                  </div>
                {/if}
              </div>
              {#if item.description}
                <p>{item.description}</p>
              {/if}
            </div>
            <span class="pill monospace service-list__id-pill">{formatServiceRouteId(serviceModule, item.id)}</span>
          </a>

          <div class="service-list__actions">
            <a
              class="btn btn-secondary btn-sm"
              href={appHref(`/services/${serviceModule.id}/new?clone=${encodeURIComponent(item.id)}`)}
            >
              Clone
            </a>

            {#if serviceModule.deletable}
              <button class="btn btn-danger btn-sm" type="button" disabled={Boolean(removingId)} onclick={() => openRemoval(item)}>
                {removingId === item.id ? 'Removing...' : 'Remove'}
              </button>
            {/if}
          </div>
        </article>
      {/each}
    </div>
  {/if}

  <ConfirmDialog
    open={pendingRemoval !== null}
    title={pendingRemoval ? `Remove ${formatServiceRouteId(serviceModule, pendingRemoval.id)}?` : 'Remove service?'}
    message="This removes the RESTCONF entry for this service."
    confirmLabel="Remove"
    oncancel={() => (pendingRemoval = null)}
    onconfirm={confirmRemoval}
  />
{/if}

<style>
  .service-status:not(:empty) {
    margin-bottom: 1rem;
  }

  .service-list {
    display: grid;
    gap: 1rem;
  }

  .service-list__item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 14px 18px;
    transition: border-color var(--sw-dur-fast);
  }

  .service-list__item:hover {
    border-color: var(--sw-border-default);
  }

  .service-list__link {
    display: flex;
    flex: 1;
    min-width: 0;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    text-decoration: none;
  }

  .service-list__copy {
    flex: 1;
    min-width: 0;
  }

  .service-list__copy h2 {
    font-size: 15px;
  }

  .service-list__copy p {
    margin-top: 0.35rem;
    font-size: 13px;
    color: var(--sw-text-muted);
  }

  .service-list__heading {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  }

  .service-list__badges {
    margin-left: auto;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }


  .service-list__id-pill {
    padding: 5px 10px;
    font-size: 12px;
  }

  .service-list__actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    flex-wrap: wrap;
    flex-shrink: 0;
  }

  @media (max-width: 720px) {
    .service-list__item {
      flex-direction: column;
      align-items: stretch;
    }

    .service-list__actions {
      display: flex;
      justify-content: flex-end;
    }
  }
</style>
