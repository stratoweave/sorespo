<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title?: string;
    description?: string;
    yangPath?: string;
    children?: Snippet;
  }

  let { title = '', description = '', yangPath = '', children }: Props = $props();
</script>

<section class="section">
  <header class="section__header">
    <div class="section__title-group">
      <h3>{title}</h3>
      {#if description}
        <p>{description}</p>
      {/if}
    </div>
    {#if yangPath}
      <span class="section__yang-path">{yangPath}</span>
    {/if}
  </header>

  <div class="section__content">
    {@render children?.()}
  </div>
</section>

<style>
  .section {
    display: grid;
    gap: 16px;
  }

  :global(.section + .section) {
    padding-top: 20px;
    border-top: 1px solid var(--sw-border-subtle);
  }

  .section__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
  }

  .section__title-group h3 {
    font-size: 14px;
  }

  .section__title-group p {
    margin: 4px 0 0;
    font-size: 12px;
    color: var(--sw-text-secondary);
  }

  .section__yang-path {
    font-family: var(--sw-font-mono);
    font-size: 11px;
    color: var(--sw-text-muted);
    background: var(--sw-bg-deep);
    padding: 2px 8px;
    border-radius: 3px;
  }

  .section__content {
    display: grid;
    gap: 16px;
  }
</style>
