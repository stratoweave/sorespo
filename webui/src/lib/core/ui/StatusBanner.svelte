<script lang="ts">
  import type { StatusMessage } from '$lib/core/ui/status-flash.svelte';

  let { message }: { message: StatusMessage | null } = $props();
</script>

{#if message}
  <div
    class="banner banner--{message.type}"
    role={message.type === 'error' ? 'alert' : 'status'}
  >
    {message.text}
  </div>
{/if}

<style>
  .banner {
    padding: 10px 14px;
    border-radius: var(--sw-radius-md);
    border: 1px solid transparent;
    font-size: 13px;
    overflow-wrap: anywhere;
  }

  .banner--success {
    background: var(--sw-success-dim);
    border-color: rgb(var(--sw-success-rgb) / 0.25);
    color: var(--sw-success);
  }

  .banner--error {
    background: var(--sw-danger-dim);
    border-color: rgb(var(--sw-danger-rgb) / 0.25);
    color: var(--sw-danger);
  }

  .banner--warning {
    background: var(--sw-warning-dim);
    border-color: rgb(var(--sw-warning-rgb) / 0.25);
    color: var(--sw-warning);
  }
</style>
