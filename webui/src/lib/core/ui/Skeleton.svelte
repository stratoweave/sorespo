<script lang="ts">
  /**
   * Loading placeholder. `rows` renders a table-like stack of bars, `block`
   * a single rectangle (use `height`), `text` a short inline bar.
   */
  let {
    variant = 'block',
    rows = 4,
    height = '120px',
    width = '100%'
  }: {
    variant?: 'block' | 'rows' | 'text';
    rows?: number;
    height?: string;
    width?: string;
  } = $props();
</script>

{#if variant === 'rows'}
  <div class="skeleton-rows card" aria-busy="true" aria-label="Loading">
    {#each Array.from({ length: rows }) as _, i}
      <div class="skeleton-row" style={`--delay: ${i * 40}ms`}>
        <span class="skeleton skeleton--bar" style="width: 28%"></span>
        <span class="skeleton skeleton--bar" style="width: 16%"></span>
        <span class="skeleton skeleton--bar" style="width: 22%"></span>
        <span class="skeleton skeleton--bar push-right" style="width: 10%"></span>
      </div>
    {/each}
  </div>
{:else if variant === 'text'}
  <span class="skeleton skeleton--bar" style={`width: ${width}`} aria-busy="true"></span>
{:else}
  <div class="skeleton skeleton--block" style={`height: ${height}; width: ${width}`} aria-busy="true" aria-label="Loading"></div>
{/if}

<style>
  .skeleton {
    display: block;
    border-radius: var(--sw-radius-sm);
    background: linear-gradient(
      90deg,
      var(--sw-bg-elevated) 0%,
      var(--sw-bg-hover) 40%,
      var(--sw-bg-elevated) 80%
    );
    background-size: 200% 100%;
    animation: sw-shimmer 1.6s linear infinite;
  }

  .skeleton--bar {
    height: 12px;
  }

  .skeleton--block {
    border-radius: var(--sw-radius-md);
  }

  .skeleton-rows {
    display: grid;
    overflow: hidden;
  }

  .skeleton-row {
    display: flex;
    align-items: center;
    gap: 24px;
    padding: 14px 16px;
    border-bottom: 1px solid var(--sw-border-subtle);
  }

  .skeleton-row:last-child {
    border-bottom: none;
  }

</style>
