import type { ServiceListItemTone } from '$lib/core/registry/types';

export type StatusTone = 'success' | 'warning' | 'danger' | 'neutral';

/** Map the up/down vocabulary used by service list badges onto pill tones. */
export function listItemTone(tone: ServiceListItemTone | undefined): StatusTone {
  if (tone === 'up') return 'success';
  if (tone === 'down') return 'danger';
  return 'neutral';
}
