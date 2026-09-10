<script lang="ts">
  import type { Snippet } from 'svelte';

  import CodeBlock from '$lib/core/ui/CodeBlock.svelte';
  import Skeleton from '$lib/core/ui/Skeleton.svelte';

  let {
    title,
    controls,
    loading,
    content
  }: {
    title?: string;
    controls: Snippet;
    loading: boolean;
    content: string;
  } = $props();
</script>

<div class="card config-page">
  <div class="config-page__header">
    {#if title}
      <h3>{title}</h3>
    {/if}
    <div class="config-page__controls">
      {@render controls()}
    </div>
  </div>

  <div class="config-page__content">
    {#if loading}
      <Skeleton height="26rem" />
    {:else}
      <CodeBlock {content} minHeight="26rem" maxHeight="calc(100vh - 280px)" label="Configuration" />
    {/if}
  </div>
</div>

<style>
  .config-page {
    display: grid;
    gap: 1rem;
    padding: 1.25rem;
    min-width: 0;
    max-width: 100%;
  }

  .config-page__content {
    min-width: 0;
    max-width: 100%;
  }

  .config-page__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .config-page__controls {
    display: flex;
    gap: 1.25rem;
    flex-wrap: wrap;
    margin-left: auto;
  }
</style>
