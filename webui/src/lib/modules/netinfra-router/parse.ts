import { createNetinfraRouterDraft } from '$lib/modules/netinfra-router/defaults';
import { at, booleanAt, isRecord, numberAt, stringAt } from '$lib/core/util/json';

import type { ServiceListItem } from '$lib/core/registry/types';
import type { NetinfraRouterDraft } from '$lib/modules/netinfra-router/model';

/** First entry of the list at `path`, null for an empty list, undefined when absent. */
function firstEntry(input: unknown, ...path: string[]): unknown {
  const list = at(input, ...path);
  return Array.isArray(list) ? (list[0] ?? null) : undefined;
}

function getRouterEntry(input: unknown): unknown {
  const bare = firstEntry(input, 'netinfra:router');
  if (bare !== undefined) return bare;

  const nested = firstEntry(input, 'netinfra:netinfra', 'router');
  if (nested !== undefined) return nested;

  if (isRecord(input) && 'name' in input) {
    return input;
  }

  return null;
}

export function parseNetinfraRouter(input: unknown): NetinfraRouterDraft {
  const defaults = createNetinfraRouterDraft();
  const router = getRouterEntry(input);

  if (!router) {
    return defaults;
  }

  return {
    name: stringAt(router, 'name'),
    id: numberAt(router, 'id'),
    type: stringAt(router, 'type'),
    role: stringAt(router, 'role'),
    asn: numberAt(router, 'asn'),
    mock: booleanAt(router, 'mock'),
    approvalRequired: booleanAt(router, 'approval-required'),
    featureFlags: {
      runtimeSchemaFetch: booleanAt(router, 'feature-flags', 'runtime-schema-fetch')
    }
  };
}

export function listNetinfraRouters(input: unknown): ServiceListItem[] {
  const routers = at(input, 'netinfra:netinfra', 'router') ?? at(input, 'netinfra:router') ?? [];

  if (!Array.isArray(routers)) {
    return [];
  }

  return routers.map((router) => {
    const asn = numberAt(router, 'asn');
    return {
      id: stringAt(router, 'name'),
      label: stringAt(router, 'name'),
      description: [stringAt(router, 'type'), stringAt(router, 'role') || null, asn ? `AS${asn}` : null]
        .filter(Boolean)
        .join(' · ')
    };
  });
}
