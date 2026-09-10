<script lang="ts">
  import { highlightXmlDiff } from '$lib/core/diff/xml-diff';
  import CodeBlock from '$lib/core/ui/CodeBlock.svelte';
  import { plainLines, runsToLines } from '$lib/core/ui/code-lines';

  let {
    diff,
    format = 'xml',
    minHeight = '',
    maxHeight = ''
  }: { diff: string; format?: string; minHeight?: string; maxHeight?: string } = $props();

  let lines = $derived(format === 'xml' ? runsToLines(highlightXmlDiff(diff)) : plainLines(diff));
</script>

<CodeBlock {lines} {minHeight} {maxHeight} label="Diff" />
