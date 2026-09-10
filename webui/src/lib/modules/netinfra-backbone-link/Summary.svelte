<script lang="ts">
  import { formatNetinfraBackboneLinkEndpoints } from '$lib/modules/netinfra-backbone-link/model';

  import type { NetinfraBackboneLinkDraft } from '$lib/modules/netinfra-backbone-link/model';

  let { draft }: { draft: NetinfraBackboneLinkDraft } = $props();
</script>

<div class="summary">
  <span class="summary__pill">{formatNetinfraBackboneLinkEndpoints(draft)}</span>
  <span
    class="summary__pill status"
    class:status--up={draft.linkStatus === 'up'}
    class:status--down={draft.linkStatus === 'down'}
    title="Backbone link operational status"
  >● {draft.linkStatus.toUpperCase()}</span>
</div>

<style>
  .summary {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .summary__pill {
    display: inline-flex;
    align-items: center;
    padding: 3px 10px;
    border-radius: 20px;
    background: var(--sw-bg-elevated);
    color: var(--sw-text-secondary);
    font-size: 11px;
    font-weight: 500;
  }

  .summary__pill.status {
    font-family: var(--sw-font-mono);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .summary__pill.status--up {
    color: rgb(var(--sw-success-rgb) / 0.95);
    background: rgb(var(--sw-success-rgb) / 0.12);
  }

  .summary__pill.status--down {
    color: rgb(var(--sw-danger-rgb) / 0.95);
    background: rgb(var(--sw-danger-rgb) / 0.12);
  }
</style>
