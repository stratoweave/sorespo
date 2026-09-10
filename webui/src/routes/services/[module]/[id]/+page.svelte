<script lang="ts">
  import { goto, invalidate } from '$app/navigation';
  import { onMount, untrack } from 'svelte';

  import { DraftStore } from '$lib/core/drafts/draft-store.svelte';
  import { getServiceModuleOrThrow } from '$lib/core/registry/service-modules';
  import {
    formatServiceRouteId,
    getDraftKey,
    getDraftKeyLabel,
    getDraftPathKey,
    getRoutePathKey,
    pathKeysEqual
  } from '$lib/core/registry/types';
  import {
    getListEntryPath,
    restconfDelete,
    restconfPutJson,
    wrapListEntryBody
  } from '$lib/core/restconf/client';
  import ConfirmDialog from '$lib/core/ui/ConfirmDialog.svelte';
  import { StatusFlash } from '$lib/core/ui/status-flash.svelte';
  import { onGlobalRefresh } from '$lib/core/util/global-refresh';
  import { appHref } from '$lib/core/util/nav';
  import ServiceWorkspace from '$lib/core/workspace/ServiceWorkspace.svelte';

  import type { PageProps } from './$types';

  let { data }: PageProps = $props();

  // Initial values only; later `data` changes are handled by the effect below.
  let serviceModule = $state(untrack(() => getServiceModuleOrThrow(data.moduleId)));
  let store = $state(untrack(() => new DraftStore(data.draft, serviceModule.validate)));
  let saving = $state(false);
  let deleting = $state(false);
  let validationActive = $state(false);
  let validationKey = $state(0);
  let confirmDeleteOpen = $state(false);
  const status = new StatusFlash(
    untrack(() => (data.loadError ? { type: 'error', text: data.loadError } : null))
  );
  let lastData = untrack(() => data);
  let lastRouteKey = untrack(() => `${data.moduleId}:${data.serviceId}`);

  let routeKey = $derived(`${data.moduleId}:${data.serviceId}`);
  let cloneHref = $derived(
    appHref(`/services/${serviceModule.id}/new?clone=${encodeURIComponent(data.serviceId)}`)
  );
  let displayServiceId = $derived(formatServiceRouteId(serviceModule, data.serviceId));

  $effect(() => {
    const nextData = data;
    if (nextData === lastData) return;

    untrack(() => {
      lastData = nextData;
      const sameRoute = routeKey === lastRouteKey;
      lastRouteKey = routeKey;

      // A same-route reload (Refresh, invalidate) must not clobber unsaved edits.
      if (sameRoute && store.dirty) {
        if (nextData.loadError) status.error(nextData.loadError);
        return;
      }

      serviceModule = getServiceModuleOrThrow(nextData.moduleId);
      store = new DraftStore(nextData.draft, serviceModule.validate);
      saving = false;
      deleting = false;
      validationActive = false;
      validationKey += 1;
      confirmDeleteOpen = false;
      status.set(nextData.loadError ? { type: 'error', text: nextData.loadError } : null);
    });
  });

  onMount(() =>
    onGlobalRefresh(() => invalidate(`data:service:${data.moduleId}:${data.serviceId}`))
  );

  async function handleSave(): Promise<void> {
    const key = getDraftKey(serviceModule, store.draft);

    if (!key) {
      status.error(`${getDraftKeyLabel(serviceModule)} is required before saving.`);
      return;
    }

    const snapshot = store.draft;
    const routePathKey = getRoutePathKey(serviceModule, data.serviceId);

    if (!pathKeysEqual(getDraftPathKey(serviceModule, snapshot), routePathKey)) {
      status.error(
        `${getDraftKeyLabel(serviceModule)} cannot be changed on an existing entry — use "Clone as new" to copy it under a new key.`
      );
      return;
    }

    try {
      saving = true;
      status.set(null);
      const payload = serviceModule.serialize(snapshot);
      // PUT (replace) so cleared leaves and removed list rows actually
      // disappear server-side; a merge PATCH would leave them untouched.
      await restconfPutJson(
        getListEntryPath(serviceModule.restconfRoot, routePathKey),
        wrapListEntryBody(serviceModule.restconfRoot, payload)
      );
      store.markSaved(snapshot);
      status.flash(`Saved ${key} successfully.`);
    } catch (saveError) {
      status.error(
        saveError instanceof Error ? saveError.message : 'Failed to save service draft.'
      );
    } finally {
      saving = false;
    }
  }

  async function handleDelete(): Promise<void> {
    if (!serviceModule.deletable) {
      return;
    }

    try {
      deleting = true;
      status.set(null);
      await restconfDelete(
        getListEntryPath(serviceModule.restconfRoot, getRoutePathKey(serviceModule, data.serviceId))
      );
      await goto(appHref(`/services/${serviceModule.id}`), {
        invalidateAll: true
      });
    } catch (deleteError) {
      status.error(
        deleteError instanceof Error ? deleteError.message : 'Failed to delete service draft.'
      );
    } finally {
      deleting = false;
    }
  }

  async function confirmDelete(): Promise<void> {
    confirmDeleteOpen = false;
    await handleDelete();
  }

  function handleReset(): void {
    validationActive = false;
    validationKey += 1;
    status.set(null);
    store.reset();
  }
</script>

{#snippet cloneAction()}
  <a class="btn btn-secondary btn-sm" href={cloneHref}>Clone as new</a>
{/snippet}

<ServiceWorkspace
  module={serviceModule}
  title={`${serviceModule.title} · ${displayServiceId}`}
  subtitle="Edit an existing RESTCONF list entry using the shared service workspace."
  draft={store.draft}
  original={store.original}
  validation={store.validation}
  dirty={store.dirty}
  {saving}
  {deleting}
  {validationActive}
  {validationKey}
  saveDisabled={!store.validation.ok || !getDraftKey(serviceModule, store.draft)}
  showDelete={serviceModule.deletable ?? false}
  statusMessage={status.message}
  headerActions={cloneAction}
  onchange={(next) => store.set(next)}
  ontouch={() => (validationActive = true)}
  onreset={handleReset}
  onsave={handleSave}
  ondelete={() => (confirmDeleteOpen = true)}
/>

<ConfirmDialog
  open={confirmDeleteOpen}
  title={`Remove ${displayServiceId}?`}
  message="This removes the RESTCONF entry for this service."
  confirmLabel="Remove"
  oncancel={() => (confirmDeleteOpen = false)}
  onconfirm={confirmDelete}
/>
