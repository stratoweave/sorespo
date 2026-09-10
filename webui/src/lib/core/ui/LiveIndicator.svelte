<script lang="ts">
  import { onMount } from 'svelte';

  import { queuesPoll } from '$lib/core/orchestron/poll-store';

  let now = $state(Date.now());
  // The poll store only reflects real backend state in the browser; during
  // SSR the relative /api fetch fails, so stay on "connecting" until mounted.
  let mounted = $state(false);

  onMount(() => {
    mounted = true;
    const timer = setInterval(() => (now = Date.now()), 1000);
    return () => clearInterval(timer);
  });

  let poll = $derived($queuesPoll);
  let status = $derived<'live' | 'error' | 'connecting'>(
    !mounted ? 'connecting' : poll.error ? 'error' : poll.loaded ? 'live' : 'connecting'
  );
  let ageSeconds = $derived(
    poll.updatedAt === null ? null : Math.max(0, Math.round((now - poll.updatedAt) / 1000))
  );
  let ageLabel = $derived(
    ageSeconds === null ? '' : ageSeconds < 2 ? 'just now' : `${ageSeconds}s ago`
  );
  let title = $derived(
    status === 'error'
      ? `Backend unreachable: ${poll.error}`
      : status === 'live'
        ? `Connected to orchestrator. Last update ${ageLabel}.`
        : 'Connecting to orchestrator…'
  );
</script>

<span class="live live--{status}" {title} aria-live="polite">
  <span class="live__dot" aria-hidden="true"></span>
  <span class="live__label">
    {#if status === 'error'}Disconnected{:else if status === 'live'}Live{:else}Connecting{/if}
  </span>
  {#if status === 'live' && ageLabel}
    <span class="live__age">{ageLabel}</span>
  {/if}
</span>

<style>
  .live {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 4px 10px;
    border-radius: var(--sw-radius-pill);
    border: 1px solid var(--sw-border-subtle);
    background: var(--sw-bg-card);
    font-size: 12px;
    font-weight: 500;
    color: var(--sw-text-secondary);
    white-space: nowrap;
  }

  .live__dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--sw-text-muted);
  }

  .live--live .live__dot {
    background: var(--sw-success);
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.5);
    animation: live-pulse 2s ease-out infinite;
  }

  .live--error {
    color: var(--sw-danger);
    border-color: rgba(239, 68, 68, 0.3);
    background: var(--sw-danger-dim);
  }

  .live--error .live__dot {
    background: var(--sw-danger);
  }

  .live__age {
    color: var(--sw-text-muted);
    font-variant-numeric: tabular-nums;
  }

  @keyframes live-pulse {
    0%   { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.45); }
    70%  { box-shadow: 0 0 0 6px rgba(34, 197, 94, 0); }
    100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
  }

  @media (max-width: 640px) {
    .live__age { display: none; }
  }
</style>
