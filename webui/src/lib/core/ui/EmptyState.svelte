<script lang="ts">
  import type { Snippet } from 'svelte';

  import NavIcon, { type NavIconName } from '$lib/core/ui/NavIcon.svelte';

  let {
    icon = 'inbox',
    title,
    description = '',
    tone = 'neutral',
    compact = false,
    action
  }: {
    icon?: NavIconName;
    title: string;
    description?: string;
    tone?: 'neutral' | 'danger';
    compact?: boolean;
    action?: Snippet;
  } = $props();
</script>

<div class="empty" class:empty--danger={tone === 'danger'} class:empty--compact={compact} role={tone === 'danger' ? 'alert' : undefined}>
  <span class="empty__icon" aria-hidden="true"><NavIcon name={icon} size={compact ? 18 : 22} /></span>
  <div class="empty__copy">
    <strong>{title}</strong>
    {#if description}
      <p>{description}</p>
    {/if}
  </div>
  {#if action}
    <div class="empty__action">{@render action()}</div>
  {/if}
</div>

<style>
  .empty {
    display: grid;
    justify-items: center;
    gap: 12px;
    padding: 40px 24px;
    border-radius: var(--sw-radius-lg);
    border: 1px dashed var(--sw-border-default);
    background: var(--sw-bg-card);
    text-align: center;
  }

  .empty--compact {
    padding: 24px 16px;
    gap: 8px;
  }

  .empty__icon {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    color: var(--sw-text-muted);
    background: var(--sw-bg-elevated);
  }

  .empty--compact .empty__icon {
    width: 32px;
    height: 32px;
  }

  .empty__copy {
    display: grid;
    gap: 4px;
    max-width: 44ch;
  }

  .empty__copy strong {
    font-size: 14px;
    font-weight: 600;
    color: var(--sw-text-primary);
  }

  .empty--compact .empty__copy strong {
    font-size: 13px;
  }

  .empty__copy p {
    margin: 0;
    font-size: 13px;
    color: var(--sw-text-muted);
  }

  .empty--danger {
    border-color: rgba(239, 68, 68, 0.35);
    background: var(--sw-danger-dim);
  }

  .empty--danger .empty__icon {
    color: var(--sw-danger);
    background: rgba(239, 68, 68, 0.15);
  }

  .empty--danger .empty__copy p {
    color: var(--sw-text-secondary);
    overflow-wrap: anywhere;
  }

  .empty__action {
    display: flex;
    gap: 8px;
    margin-top: 4px;
  }
</style>
