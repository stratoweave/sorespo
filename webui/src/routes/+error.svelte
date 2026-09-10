<script lang="ts">
  import { page } from '$app/state';

  import EmptyState from '$lib/core/ui/EmptyState.svelte';
  import { appHref } from '$lib/core/util/nav';

  let title = $derived(page.status === 404 ? 'Page not found' : `Error ${page.status}`);
  let description = $derived(
    page.error?.message || (page.status === 404 ? 'Nothing lives at this address.' : 'Something went wrong.')
  );
</script>

<div class="page-header">
  <div>
    <h1>{title}</h1>
  </div>
</div>

<EmptyState icon="alert" tone={page.status === 404 ? 'neutral' : 'danger'} title={title} {description}>
  {#snippet action()}
    <a class="btn btn-primary btn-sm" href={appHref('/')}>Back to dashboard</a>
  {/snippet}
</EmptyState>
