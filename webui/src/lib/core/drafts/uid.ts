let counter = 0;

/** Client-side identity for list rows in drafts, so keyed `{#each}` blocks
 * survive edits and removals. Never serialized. */
export function newDraftUid(): number {
  counter += 1;
  return counter;
}
