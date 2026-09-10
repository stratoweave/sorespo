import { parseLinkStatus } from '$lib/core/topology/model';
import { at, isRecord, stringAt } from '$lib/core/util/json';
import { createNetinfraBackboneLinkDraft } from '$lib/modules/netinfra-backbone-link/defaults';
import {
  formatNetinfraBackboneLinkEndpoints,
  getNetinfraBackboneLinkRouteId
} from '$lib/modules/netinfra-backbone-link/model';

import type { ServiceListItem } from '$lib/core/registry/types';
import type { NetinfraBackboneLinkDraft } from '$lib/modules/netinfra-backbone-link/model';

/** First entry of the list at `path`, null for an empty list, undefined when absent. */
function firstEntry(input: unknown, ...path: string[]): unknown {
  const list = at(input, ...path);
  return Array.isArray(list) ? (list[0] ?? null) : undefined;
}

function getBackboneLinkEntry(input: unknown): unknown {
  const bare = firstEntry(input, 'netinfra:backbone-link');
  if (bare !== undefined) return bare;

  const nested = firstEntry(input, 'netinfra:netinfra', 'backbone-link');
  if (nested !== undefined) return nested;

  if (isRecord(input) && 'left-router' in input) {
    return input;
  }

  return null;
}

export function parseNetinfraBackboneLink(input: unknown): NetinfraBackboneLinkDraft {
  const defaults = createNetinfraBackboneLinkDraft();
  const backboneLink = getBackboneLinkEntry(input);

  if (!backboneLink) {
    return defaults;
  }

  return {
    leftRouter: stringAt(backboneLink, 'left-router'),
    leftInterface: stringAt(backboneLink, 'left-interface'),
    rightRouter: stringAt(backboneLink, 'right-router'),
    rightInterface: stringAt(backboneLink, 'right-interface'),
    linkStatus: parseLinkStatus(at(backboneLink, 'state', 'link-status'))
  };
}

export function listNetinfraBackboneLinks(input: unknown): ServiceListItem[] {
  const backboneLinks =
    at(input, 'netinfra:netinfra', 'backbone-link') ?? at(input, 'netinfra:backbone-link') ?? [];

  if (!Array.isArray(backboneLinks)) {
    return [];
  }

  return backboneLinks.map((backboneLink) => {
    const draft = parseNetinfraBackboneLink(backboneLink);
    const status = draft.linkStatus;

    return {
      id: getNetinfraBackboneLinkRouteId(draft),
      label: formatNetinfraBackboneLinkEndpoints(draft),
      badges: [
        {
          text: status === 'up' ? 'UP' : status === 'down' ? 'DOWN' : 'UNKNOWN',
          tone: status,
          title: 'Backbone link operational status'
        }
      ]
    };
  });
}
