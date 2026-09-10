<script lang="ts" module>
  export type NavIconName =
    | 'dashboard'
    | 'devices'
    | 'queue'
    | 'apply'
    | 'layers'
    | 'services'
    | 'settings'
    | 'refresh'
    | 'search'
    | 'check'
    | 'alert'
    | 'copy'
    | 'wrap'
    | 'chevron-left'
    | 'chevron-right'
    | 'history'
    | 'file';
</script>

<script lang="ts">
  let { name, size = 18 }: { name: NavIconName; size?: number } = $props();
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="1.6"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
  focusable="false"
>
  {#if name === 'dashboard'}
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  {:else if name === 'devices'}
    <rect x="3" y="4" width="18" height="6" rx="1.5" />
    <rect x="3" y="14" width="18" height="6" rx="1.5" />
    <path d="M6 7h.01M6 17h.01M16 7h2M16 17h2" />
  {:else if name === 'queue'}
    <path d="m3 6 1.5 1.5L7 5M11 6h10M3 12h4M11 12h10M3 18h4M11 18h10" />
  {:else if name === 'apply'}
    <path d="M14 3H5v18h14V8zM14 3v5h5m-11 6 3 3 5-6" />
  {:else if name === 'layers'}
    <path d="m12 3 9 5-9 5-9-5zM3 12l9 5 9-5M3 16l9 5 9-5" />
  {:else if name === 'services'}
    <rect x="9" y="3" width="6" height="5" rx="1" />
    <rect x="3" y="16" width="6" height="5" rx="1" />
    <rect x="15" y="16" width="6" height="5" rx="1" />
    <path d="M12 8v4M6 16v-4h12v4" />
  {:else if name === 'settings'}
    <path d="M3 6h8m6 0h4M3 12h2m6 0h10M3 18h10m6 0h2" />
    <circle cx="14" cy="6" r="3" />
    <circle cx="8" cy="12" r="3" />
    <circle cx="16" cy="18" r="3" />
  {:else if name === 'refresh'}
    <path d="M20 4v5h-5M4 20v-5h5M20 9a8 8 0 0 0-14-3M4 15a8 8 0 0 0 14 3" />
  {:else if name === 'search'}
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.2-4.2" />
  {:else if name === 'check'}
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  {:else if name === 'alert'}
    <path d="M12 3 2.5 20h19z" />
    <path d="M12 10v4M12 17h.01" />
  {:else if name === 'copy'}
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V6a2 2 0 0 1 2-2h9" />
  {:else if name === 'wrap'}
    <path d="M3 6h18M3 12h13a3 3 0 0 1 0 6h-3M3 18h6" />
    <path d="m15 15-2 3 2 3" />
  {:else if name === 'chevron-left'}
    <path d="m15 5-7 7 7 7" />
  {:else if name === 'chevron-right'}
    <path d="m9 5 7 7-7 7" />
  {:else if name === 'history'}
    <path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" />
    <path d="M12 8v4l3 2" />
  {:else if name === 'file'}
    <path d="M14 3H6v18h12V7z" />
    <path d="M14 3v4h4M9 13h6M9 17h6" />
  {/if}
</svg>
