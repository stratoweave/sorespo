import { normalizeIdentity } from '$lib/core/restconf/identity';
import { arrayAt, at, isRecord, stringAt } from '$lib/core/util/json';
import {
  createL3VpnSiteAccessDraft,
  createL3VpnSiteDeviceDraft,
  createL3VpnSiteDraft,
  createL3VpnSiteLanPrefixDraft,
  createL3VpnSiteLocationDraft,
  createL3VpnSiteRoutingProtocolDraft
} from '$lib/modules/l3vpn-site/defaults';
import {
  L3VPN_SITE_ACCESS_TYPES,
  L3VPN_SITE_ADDRESS_FAMILIES,
  L3VPN_SITE_MANAGEMENT_TYPES,
  L3VPN_SITE_ROUTING_PROTOCOL_TYPES,
  formatL3VpnSiteManagementType
} from '$lib/modules/l3vpn-site/model';

import type { ServiceListItem } from '$lib/core/registry/types';
import type {
  L3VpnSiteAccessDraft,
  L3VpnSiteAddressFamily,
  L3VpnSiteDeviceDraft,
  L3VpnSiteDraft,
  L3VpnSiteLanPrefixDraft,
  L3VpnSiteLocationDraft,
  L3VpnSiteManagementType,
  L3VpnSiteRoutingProtocolDraft,
  L3VpnSiteRoutingProtocolType
} from '$lib/modules/l3vpn-site/model';

function normalizeManagementType(value: unknown): L3VpnSiteManagementType {
  const normalized = normalizeIdentity(value);

  if (L3VPN_SITE_MANAGEMENT_TYPES.includes(normalized as L3VpnSiteManagementType)) {
    return normalized as L3VpnSiteManagementType;
  }

  return 'customer-managed';
}

function normalizeAccessType(value: unknown): L3VpnSiteAccessDraft['siteNetworkAccessType'] {
  const normalized = normalizeIdentity(value);

  if (L3VPN_SITE_ACCESS_TYPES.includes(normalized as L3VpnSiteAccessDraft['siteNetworkAccessType'])) {
    return normalized as L3VpnSiteAccessDraft['siteNetworkAccessType'];
  }

  return 'point-to-point';
}

function normalizeRoutingProtocolType(value: unknown): L3VpnSiteRoutingProtocolType {
  const normalized = normalizeIdentity(value);

  if (L3VPN_SITE_ROUTING_PROTOCOL_TYPES.includes(normalized as L3VpnSiteRoutingProtocolType)) {
    return normalized as L3VpnSiteRoutingProtocolType;
  }

  return 'direct';
}

function normalizeAddressFamilies(value: unknown): L3VpnSiteAddressFamily[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => normalizeIdentity(item))
    .filter((item, index, items): item is L3VpnSiteAddressFamily => {
      return L3VPN_SITE_ADDRESS_FAMILIES.includes(item as L3VpnSiteAddressFamily) && items.indexOf(item) === index;
    });
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isNaN(value) ? null : value;
  }

  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numeric = Number(value);
  return Number.isNaN(numeric) ? null : numeric;
}

function normalizeBool(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return null;
}

interface BgpSessionInfo {
  state: string | null;
  debug: boolean | null;
  transitions: number | null;
  lastEvent: string | null;
  negotiatedHoldTime: number | null;
  lastNotification: string | null;
}

/** Read the eBGP session telemetry the CFS layer augments onto the site
 * (sorespo-ietf-l3vpn-svc:bgp-sessions), keyed by site-network-access. */
function parseBgpSessions(site: unknown): Record<string, BgpSessionInfo> {
  const container = at(site, 'sorespo-ietf-l3vpn-svc:bgp-sessions') ?? at(site, 'bgp-sessions');
  const out: Record<string, BgpSessionInfo> = {};
  for (const entry of arrayAt(container, 'bgp-session')) {
    const id = stringAt(entry, 'site-network-access');
    if (!id) continue;
    const sessionState = at(entry, 'session-state');
    const lastEvent = at(entry, 'last-event');
    const lastNotification = at(entry, 'last-notification');
    out[id] = {
      state: sessionState != null ? normalizeIdentity(sessionState) : null,
      debug: normalizeBool(at(entry, 'debug-active')),
      transitions: toNumber(at(entry, 'established-transitions')),
      lastEvent: lastEvent != null ? String(lastEvent) : null,
      negotiatedHoldTime: toNumber(at(entry, 'negotiated-hold-time')),
      lastNotification: lastNotification != null ? String(lastNotification) : null
    };
  }
  return out;
}

function parseLanPrefix(input: unknown): L3VpnSiteLanPrefixDraft {
  const defaults = createL3VpnSiteLanPrefixDraft();

  return {
    ...defaults,
    lan: stringAt(input, 'lan'),
    lanTag: stringAt(input, 'lan-tag'),
    nextHop: stringAt(input, 'next-hop')
  };
}

function parseRoutingProtocol(input: unknown): L3VpnSiteRoutingProtocolDraft {
  const defaults = createL3VpnSiteRoutingProtocolDraft();
  const type = normalizeRoutingProtocolType(at(input, 'type'));

  if (type === 'bgp') {
    return {
      ...defaults,
      type,
      bgpAutonomousSystem: toNumber(at(input, 'bgp', 'autonomous-system')),
      // Augmented leaf — RESTCONF serves it module-prefixed.
      bgpAuthenticationKey: String(
        at(input, 'bgp', 'sorespo-ietf-l3vpn-svc:authentication-key') ??
          at(input, 'bgp', 'authentication-key') ??
          ''
      ),
      addressFamilies: normalizeAddressFamilies(at(input, 'bgp', 'address-family'))
    };
  }

  if (type === 'ospf') {
    return {
      ...defaults,
      type,
      ospfAreaAddress: stringAt(input, 'ospf', 'area-address'),
      ospfMetric: toNumber(at(input, 'ospf', 'metric')),
      addressFamilies: normalizeAddressFamilies(at(input, 'ospf', 'address-family'))
    };
  }

  if (type === 'rip') {
    return {
      ...defaults,
      type,
      addressFamilies: normalizeAddressFamilies(at(input, 'rip', 'address-family'))
    };
  }

  if (type === 'vrrp') {
    return {
      ...defaults,
      type,
      addressFamilies: normalizeAddressFamilies(at(input, 'vrrp', 'address-family'))
    };
  }

  if (type === 'static') {
    return {
      ...defaults,
      type,
      staticIpv4LanPrefixes: arrayAt(input, 'static', 'cascaded-lan-prefixes', 'ipv4-lan-prefixes').map(parseLanPrefix),
      staticIpv6LanPrefixes: arrayAt(input, 'static', 'cascaded-lan-prefixes', 'ipv6-lan-prefixes').map(parseLanPrefix)
    };
  }

  return {
    ...defaults,
    type,
    addressFamilies: []
  };
}

function parseAccess(input: unknown): L3VpnSiteAccessDraft {
  const defaults = createL3VpnSiteAccessDraft();

  return {
    ...defaults,
    siteNetworkAccessId: stringAt(input, 'site-network-access-id'),
    siteNetworkAccessType: normalizeAccessType(at(input, 'site-network-access-type')),
    locationReference: stringAt(input, 'location-reference'),
    deviceReference: stringAt(input, 'device-reference'),
    inputBandwidth: stringAt(input, 'service', 'svc-input-bandwidth'),
    outputBandwidth: stringAt(input, 'service', 'svc-output-bandwidth'),
    mtu: toNumber(at(input, 'service', 'svc-mtu')),
    vpnId: stringAt(input, 'vpn-attachment', 'vpn-id'),
    providerAddress: stringAt(input, 'ip-connection', 'ipv4', 'addresses', 'provider-address'),
    customerAddress: stringAt(input, 'ip-connection', 'ipv4', 'addresses', 'customer-address'),
    prefixLength: toNumber(at(input, 'ip-connection', 'ipv4', 'addresses', 'prefix-length')),
    bearerReference: stringAt(input, 'bearer', 'bearer-reference'),
    routingProtocols: arrayAt(input, 'routing-protocols', 'routing-protocol').map(parseRoutingProtocol)
  };
}

function parseLocation(input: unknown): L3VpnSiteLocationDraft {
  const defaults = createL3VpnSiteLocationDraft();

  return {
    ...defaults,
    locationId: stringAt(input, 'location-id'),
    address: stringAt(input, 'address'),
    postalCode: stringAt(input, 'postal-code'),
    state: stringAt(input, 'state'),
    city: stringAt(input, 'city'),
    countryCode: stringAt(input, 'country-code')
  };
}

function parseDevice(input: unknown): L3VpnSiteDeviceDraft {
  const defaults = createL3VpnSiteDeviceDraft();
  const addressFamily = normalizeIdentity(at(input, 'management', 'address-family'));

  return {
    ...defaults,
    deviceId: stringAt(input, 'device-id'),
    location: stringAt(input, 'location'),
    managementAddressFamily: L3VPN_SITE_ADDRESS_FAMILIES.includes(addressFamily as L3VpnSiteAddressFamily)
      ? (addressFamily as L3VpnSiteAddressFamily)
      : '',
    managementAddress: stringAt(input, 'management', 'address')
  };
}

/** First entry of the list at `path`, null for an empty list, undefined when absent. */
function firstEntry(input: unknown, ...path: string[]): unknown {
  const list = at(input, ...path);
  return Array.isArray(list) ? (list[0] ?? null) : undefined;
}

const SITE_LIST_PATHS: string[][] = [
  ['ietf-l3vpn-svc:site'],
  ['ietf-l3vpn-svc:sites', 'site'],
  ['ietf-l3vpn-svc:l3vpn-svc', 'sites', 'site'],
  ['sites', 'site']
];

function getSiteEntry(input: unknown): unknown {
  for (const path of SITE_LIST_PATHS) {
    const entry = firstEntry(input, ...path);
    if (entry !== undefined) return entry;
  }

  if (isRecord(input) && 'site-id' in input) {
    return input;
  }

  return null;
}

export function getSites(input: unknown): unknown[] {
  const sites =
    at(input, 'ietf-l3vpn-svc:l3vpn-svc', 'sites', 'site') ??
    at(input, 'ietf-l3vpn-svc:sites', 'site') ??
    at(input, 'sites', 'site') ??
    at(input, 'ietf-l3vpn-svc:site') ??
    [];

  return Array.isArray(sites) ? sites : [];
}

export function parseL3VpnSite(input: unknown): L3VpnSiteDraft {
  const defaults = createL3VpnSiteDraft();
  const site = getSiteEntry(input);

  if (!site) {
    return defaults;
  }

  const accesses: L3VpnSiteAccessDraft[] = arrayAt(site, 'site-network-accesses', 'site-network-access').map(parseAccess);
  const sessions = parseBgpSessions(site);
  for (const access of accesses) {
    const session = sessions[access.siteNetworkAccessId];
    if (session) {
      access.bgpSessionState = session.state;
      access.bgpDebugActive = session.debug;
      access.bgpEstablishedTransitions = session.transitions;
      access.bgpLastEvent = session.lastEvent;
      access.bgpNegotiatedHoldTime = session.negotiatedHoldTime;
      access.bgpLastNotification = session.lastNotification;
    }
  }

  return {
    siteId: stringAt(site, 'site-id'),
    managementType: normalizeManagementType(at(site, 'management', 'type')),
    locations: arrayAt(site, 'locations', 'location').map(parseLocation),
    devices: arrayAt(site, 'devices', 'device').map(parseDevice),
    accesses
  };
}

export function listL3VpnSites(input: unknown): ServiceListItem[] {
  return getSites(input).map((site) => {
    const siteId = stringAt(site, 'site-id');
    const managementType = normalizeManagementType(at(site, 'management', 'type'));
    const locations = arrayAt(site, 'locations', 'location').length;
    const accesses = arrayAt(site, 'site-network-accesses', 'site-network-access').length;

    return {
      id: siteId,
      label: siteId,
      description: [
        formatL3VpnSiteManagementType(managementType),
        `${locations} location${locations === 1 ? '' : 's'}`,
        `${accesses} access${accesses === 1 ? '' : 'es'}`
      ].join(' · ')
    };
  });
}
