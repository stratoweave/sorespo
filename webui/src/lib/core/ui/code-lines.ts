import type { XmlDiffRun, XmlDiffRunKind } from '$lib/core/diff/xml-diff';

export interface CodeSegment {
  text: string;
  kind?: XmlDiffRunKind;
}

export interface CodeLine {
  segments: CodeSegment[];
  /** Line-level tone: set when any segment on the line carries a diff kind. */
  kind?: XmlDiffRunKind;
}

/** Split plain text into uncolored lines. A trailing newline does not add an empty line. */
export function plainLines(content: string): CodeLine[] {
  if (content === '') return [];
  const parts = content.split('\n');
  if (parts[parts.length - 1] === '') parts.pop();
  return parts.map((text) => ({ segments: [{ text }] }));
}

/**
 * Re-flow diff runs (which may span several lines) into per-line segments so
 * each line can carry its own gutter number and background tone.
 */
export function runsToLines(runs: XmlDiffRun[]): CodeLine[] {
  const lines: CodeLine[] = [];
  let current: CodeLine = { segments: [] };

  const flush = (): void => {
    lines.push(current);
    current = { segments: [] };
  };

  for (const run of runs) {
    const parts = run.text.split('\n');
    parts.forEach((part, index) => {
      if (index > 0) flush();
      if (part === '') return;
      current.segments.push({ text: part, kind: run.kind });
      if (run.kind === 'remove' && part.trim() !== '') {
        current.kind = 'remove';
      } else if (run.kind === 'add' && part.trim() !== '' && current.kind !== 'remove') {
        current.kind = 'add';
      }
    });
  }

  if (current.segments.length > 0) flush();
  return lines;
}

export function linesToText(lines: CodeLine[]): string {
  return lines.map((line) => line.segments.map((segment) => segment.text).join('')).join('\n');
}
