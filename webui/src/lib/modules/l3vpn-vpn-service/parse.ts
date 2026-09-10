import { normalizeIdentity } from '$lib/core/restconf/identity';
import { at, isRecord, stringAt } from '$lib/core/util/json';
import { createL3VpnVpnServiceDraft } from '$lib/modules/l3vpn-vpn-service/defaults';
import { L3VPN_VPN_SERVICE_TOPOLOGIES, formatL3VpnVpnServiceTopology } from '$lib/modules/l3vpn-vpn-service/model';

import type { ServiceListItem } from '$lib/core/registry/types';
import type { L3VpnVpnServiceDraft, L3VpnVpnServiceTopology } from '$lib/modules/l3vpn-vpn-service/model';

function normalizeTopology(value: unknown): L3VpnVpnServiceTopology {
  const normalized = normalizeIdentity(value);

  if (L3VPN_VPN_SERVICE_TOPOLOGIES.includes(normalized as L3VpnVpnServiceTopology)) {
    return normalized as L3VpnVpnServiceTopology;
  }

  return 'any-to-any';
}

/** First entry of the list at `path`, null for an empty list, undefined when absent. */
function firstEntry(input: unknown, ...path: string[]): unknown {
  const list = at(input, ...path);
  return Array.isArray(list) ? (list[0] ?? null) : undefined;
}

const VPN_SERVICE_LIST_PATHS: string[][] = [
  ['ietf-l3vpn-svc:vpn-service'],
  ['ietf-l3vpn-svc:vpn-services', 'vpn-service'],
  ['ietf-l3vpn-svc:l3vpn-svc', 'vpn-services', 'vpn-service'],
  ['vpn-services', 'vpn-service']
];

function getVpnServiceEntry(input: unknown): unknown {
  for (const path of VPN_SERVICE_LIST_PATHS) {
    const entry = firstEntry(input, ...path);
    if (entry !== undefined) return entry;
  }

  if (isRecord(input) && 'vpn-id' in input) {
    return input;
  }

  return null;
}

function getVpnServices(input: unknown): unknown[] {
  const vpnServices =
    at(input, 'ietf-l3vpn-svc:l3vpn-svc', 'vpn-services', 'vpn-service') ??
    at(input, 'ietf-l3vpn-svc:vpn-services', 'vpn-service') ??
    at(input, 'vpn-services', 'vpn-service') ??
    at(input, 'ietf-l3vpn-svc:vpn-service') ??
    [];

  return Array.isArray(vpnServices) ? vpnServices : [];
}

export function parseL3VpnVpnService(input: unknown): L3VpnVpnServiceDraft {
  const defaults = createL3VpnVpnServiceDraft();
  const vpnService = getVpnServiceEntry(input);

  if (!vpnService) {
    return defaults;
  }

  return {
    vpnId: stringAt(vpnService, 'vpn-id'),
    customerName: stringAt(vpnService, 'customer-name'),
    topology: normalizeTopology(at(vpnService, 'vpn-service-topology'))
  };
}

export function listL3VpnVpnServices(input: unknown): ServiceListItem[] {
  return getVpnServices(input).map((vpnService) => {
    const vpnId = stringAt(vpnService, 'vpn-id');
    const customerName = stringAt(vpnService, 'customer-name').trim();
    const topology = formatL3VpnVpnServiceTopology(normalizeTopology(at(vpnService, 'vpn-service-topology')));

    return {
      id: vpnId,
      label: vpnId,
      description: [customerName || null, topology].filter(Boolean).join(' · ')
    };
  });
}
