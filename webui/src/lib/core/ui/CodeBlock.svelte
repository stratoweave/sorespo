<script lang="ts">
  import NavIcon from '$lib/core/ui/NavIcon.svelte';
  import { linesToText, plainLines, type CodeLine } from '$lib/core/ui/code-lines';

  let {
    content = '',
    lines = undefined,
    minHeight = '',
    maxHeight = '',
    label = 'Code'
  }: {
    content?: string;
    lines?: CodeLine[];
    minHeight?: string;
    maxHeight?: string;
    label?: string;
  } = $props();

  let resolvedLines = $derived(lines ?? plainLines(content));
  let text = $derived(lines ? linesToText(lines) : content);
  let gutterWidth = $derived(`${Math.max(2, String(resolvedLines.length).length)}ch`);

  let wrap = $state(false);
  let copied = $state(false);
  let copyTimer: ReturnType<typeof setTimeout> | null = null;

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
      if (copyTimer) clearTimeout(copyTimer);
      copyTimer = setTimeout(() => (copied = false), 1600);
    } catch {
      copied = false;
    }
  }
</script>

<div class="code" style={`${minHeight ? `min-height: ${minHeight};` : ''}${maxHeight ? `max-height: ${maxHeight};` : ''}`}>
  <div class="code__toolbar">
    <span class="code__meta">{resolvedLines.length} line{resolvedLines.length === 1 ? '' : 's'}</span>
    <button
      class="code__tool"
      class:active={wrap}
      type="button"
      onclick={() => (wrap = !wrap)}
      aria-pressed={wrap}
      title={wrap ? 'Disable line wrap' : 'Wrap long lines'}
    >
      <NavIcon name="wrap" size={14} /> Wrap
    </button>
    <button class="code__tool" type="button" onclick={copy} title={`Copy ${label.toLowerCase()} to clipboard`}>
      <NavIcon name={copied ? 'check' : 'copy'} size={14} />
      {copied ? 'Copied' : 'Copy'}
    </button>
  </div>

  <div class="code__scroll" class:code__scroll--wrap={wrap}>
    {#if resolvedLines.length === 0}
      <div class="code__empty">Empty</div>
    {:else}
      <pre class="code__pre" style={`--gutter: ${gutterWidth}`}>{#each resolvedLines as line, index}<div
          class="code__line"
          class:code__line--add={line.kind === 'add'}
          class:code__line--remove={line.kind === 'remove'}
        ><span class="code__gutter" aria-hidden="true">{index + 1}</span><span class="code__text">{#each line.segments as segment}{#if segment.kind}<span class:diff-add={segment.kind === 'add'} class:diff-remove={segment.kind === 'remove'}>{segment.text}</span>{:else}{segment.text}{/if}{/each}{#if line.segments.length === 0}{' '}{/if}</span></div>{/each}</pre>
    {/if}
  </div>
</div>

<style>
  .code {
    display: flex;
    flex-direction: column;
    min-width: 0;
    max-width: 100%;
    border: 1px solid var(--sw-border-subtle);
    border-radius: var(--sw-radius-md);
    background: var(--sw-bg-deep);
    overflow: hidden;
  }

  .code__toolbar {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 6px 4px 12px;
    border-bottom: 1px solid var(--sw-border-subtle);
    background: var(--sw-bg-chrome);
  }

  .code__meta {
    margin-right: auto;
    font-family: var(--sw-font-mono);
    font-size: 11px;
    color: var(--sw-text-muted);
    font-variant-numeric: tabular-nums;
  }

  .code__tool {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 8px;
    border: 1px solid transparent;
    border-radius: var(--sw-radius-sm);
    background: transparent;
    color: var(--sw-text-secondary);
    font-size: 12px;
    cursor: pointer;
    transition: background var(--sw-dur-fast), color var(--sw-dur-fast);
  }

  .code__tool:hover {
    background: var(--sw-bg-hover);
    color: var(--sw-text-primary);
  }

  .code__tool.active {
    color: var(--sw-accent);
    background: var(--sw-accent-glow);
  }

  .code__scroll {
    flex: 1;
    min-height: 0;
    max-width: 100%;
    overflow: auto;
    scrollbar-width: thin;
  }

  .code__pre {
    margin: 0;
    padding: 10px 0;
    border: none;
    border-radius: 0;
    background: transparent;
    min-width: max-content;
    font-size: 12.5px;
    line-height: 1.6;
    tab-size: 2;
  }

  .code__scroll--wrap .code__pre {
    min-width: 0;
  }

  .code__line {
    display: flex;
    align-items: flex-start;
    padding-right: 16px;
  }

  .code__gutter {
    flex: 0 0 auto;
    width: calc(var(--gutter) + 24px);
    padding-right: 12px;
    text-align: right;
    color: var(--sw-text-muted);
    opacity: 0.6;
    user-select: none;
    font-variant-numeric: tabular-nums;
  }

  .code__text {
    flex: 1 1 auto;
    min-width: 0;
    white-space: pre;
    color: var(--sw-text-secondary);
  }

  .code__scroll--wrap .code__text {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .code__line--add {
    background: rgb(var(--sw-success-rgb) / 0.07);
    box-shadow: inset 2px 0 0 var(--sw-success);
  }

  .code__line--remove {
    background: rgb(var(--sw-danger-rgb) / 0.09);
    box-shadow: inset 2px 0 0 var(--sw-danger);
  }

  .diff-add {
    color: var(--sw-success);
  }

  .diff-remove {
    color: var(--sw-danger);
  }

  .code__empty {
    padding: 24px;
    text-align: center;
    color: var(--sw-text-muted);
    font-size: 13px;
  }
</style>
