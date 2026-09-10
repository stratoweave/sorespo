<script lang="ts">
  import { appHref } from '$lib/core/util/nav';

  import type { StatusTone } from '$lib/core/ui/tones';

  let {
    label,
    value,
    hint = '',
    tone = 'neutral',
    href = '',
    loading = false
  }: {
    label: string;
    value: string | number | null | undefined;
    hint?: string;
    tone?: StatusTone;
    href?: string;
    loading?: boolean;
  } = $props();

  let display = $derived(value === null || value === undefined ? '—' : String(value));
</script>

{#snippet body()}
  <span class="stat__label">{label}</span>
  {#if loading}
    <span class="stat__value stat__value--loading" aria-busy="true">
      <span class="stat__skeleton"></span>
    </span>
  {:else}
    <span class="stat__value" class:stat__value--warning={tone === 'warning'} class:stat__value--danger={tone === 'danger'} class:stat__value--success={tone === 'success'}>{display}</span>
  {/if}
  {#if hint}
    <span class="stat__hint">{hint}</span>
  {/if}
{/snippet}

{#if href}
  <a class="stat card stat--link" href={appHref(href)}>{@render body()}</a>
{:else}
  <div class="stat card">{@render body()}</div>
{/if}

<style>
  .stat {
    display: grid;
    gap: 6px;
    padding: 16px 18px;
    min-width: 0;
    text-decoration: none;
    color: inherit;
  }

  .stat--link {
    transition: background var(--sw-dur-fast), border-color var(--sw-dur-fast);
  }

  .stat--link:hover {
    background: var(--sw-bg-hover);
    border-color: var(--sw-border-default);
  }

  .stat__label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--sw-text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .stat__value {
    font-size: 26px;
    font-weight: 600;
    letter-spacing: -0.02em;
    line-height: 1.1;
    font-variant-numeric: tabular-nums;
    color: var(--sw-text-primary);
  }

  .stat__value--warning { color: var(--sw-warning); }
  .stat__value--danger  { color: var(--sw-danger); }
  .stat__value--success { color: var(--sw-success); }

  .stat__value--loading {
    display: flex;
    align-items: center;
    height: 29px;
  }

  .stat__skeleton {
    display: block;
    width: 48px;
    height: 20px;
    border-radius: var(--sw-radius-sm);
    background: linear-gradient(90deg, var(--sw-bg-elevated) 0%, var(--sw-bg-hover) 40%, var(--sw-bg-elevated) 80%);
    background-size: 200% 100%;
    animation: sw-shimmer 1.6s linear infinite;
  }

  .stat__hint {
    font-size: 12px;
    color: var(--sw-text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
