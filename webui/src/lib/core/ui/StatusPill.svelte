<script lang="ts">
  import type { StatusTone } from '$lib/core/ui/tones';

  let {
    tone = 'neutral',
    label,
    dot = true,
    mono = false,
    title = ''
  }: {
    tone?: StatusTone;
    label: string;
    dot?: boolean;
    mono?: boolean;
    title?: string;
  } = $props();
</script>

<span
  class="pill"
  class:success={tone === 'success'}
  class:warning={tone === 'warning'}
  class:danger={tone === 'danger'}
  class:mono
  title={title || undefined}
>
  {#if dot}<span class="dot" aria-hidden="true"></span>{/if}
  {label}
</span>
