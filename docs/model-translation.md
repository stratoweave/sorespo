# Device model translation

The IOS-XR 25.3.1 and Junos cRPD 24.4 adapters accept shared IETF intent together
with native bindings. `BaseConfig`, `BBInterface`, `IbgpNeighbor`, `Vrf`,
`VrfInterface`, and `EbgpCustomer` now produce IETF intent for both platforms.
Their shared code constructs interfaces, IS-IS, MPLS/LDP, BGP, VPNs, keys, and
policy references. Small platform choices preserve the existing behavior:
Junos RTC, IS-IS lifetime, iBGP timers/logging, passive customer groups and
per-VRF labels; XR customer export policy and keepalive interval. SR Linux
is unchanged.

`sorespo.devices.ietf_dm` is generated independently from the vendor bindings.
The source YANG under `spec/yang/IETFDevice` includes the 2026-08-14 BGP models
and the routing-policy and system models ported from the NSO packages. NSO
mounting, servicepoints and imports were removed. The system namespace is the
standard `urn:ietf:params:xml:ns:yang:ietf-system`. Routing-policy retains the
prefix lower/upper range keys. `ietf-routing-policy-stratoweave` provides the
`ios-xr-policy-type` and `junos-match-type` extensions.

The additional network models are published downloads, with source URLs and
SHA256 hashes in `spec/yang/IETFDevice/SOURCES.txt`: `ietf-ip` (RFC 8344),
`ietf-isis` (RFC 9130), `ietf-mpls` (RFC 8960), `ietf-mpls-ldp` (RFC 9070),
`ietf-network-instance` (RFC 8529), and the interface-extension and VLAN drafts.
Dependencies include IANA interface types, IEEE VLAN types, and schema mount.
The downloaded definitions are unchanged. `spec/src/ietf_device_paths.act`
filters their compiled schema to the supported configuration subset. Unsupported
nodes fail at the translation boundary. RFC 8960 has a broken leafref in its
unused active-route RPC; the generator allows that one resolution failure before
filtering the RPC out, without modifying the published module.

`stratoweave-network` is a local module in the StratoWeave namespace. It adds VPN
RD/RT/label attributes and an RTC AFI/SAFI identity. Protocols stay under standard
`/routing`; BGP protocol instance names identify their network instance directly.
The BGP name `default` denotes global routing and is reserved: a VRF cannot use
that name. Every other BGP name must match an existing network instance, with no
`vrf:` prefix. IS-IS and LDP retain their process names and operate only in the
default routing instance. The `vpn` presence container selects the non-mounted
L3VPN case of the mandatory `root-type` choice. Its data path remains
`/network-instances/network-instance/vpn`; no separate representation marker is
needed. Dynamic schema mounting and the expired BGP L3VPN draft are not used.
RD/RT values include the standard type discriminator, for example `0:65000:100`.

`translations/ietf_iosxr.act` and `translations/ietf_junos.act` contain the
data-only mapping functions. Both input and output use generated **adata** bindings;
the mappings read fields, iterate lists and perform keyed lookups directly.
They depend on YANG utilities and generated bindings;
`translations/model_translations.act` alone provides StratoWeave registration.
`adata_translation(...)` wraps each typed function with the source root's
`from_gdata` method and serializes its native result at the orchestration boundary.
There is no gdata traversal or StratoWeave dependency in the mapping functions.

`ietf_iosxr_network.act` and `ietf_junos_network.act` implement the network mappings;
`network_data.act` provides shared typed validation and value conversion. Each
vendor has one coordinated registration owning `/interfaces`, `/routing`,
`/network-instances`, and `/key-chains`, because these roots reference each other.
References are resolved after all RFS contributions merge.

For example, the Junos hostname mapping reads and writes typed fields:

```acton
mut def system(tree: ietf_dm.root) -> junos.root:
    source = translation_data.system_input(tree, network_services=False)
    native = junos.root()
    native.configuration.system.host_name = source.hostname
    return native
```

Register it separately:

```acton
system_translation = adata_translation(
    "ietf-system", ietf_dm.SRC_DNODE,
    [Id(ietf_dm.NS_ietf_system, "system")],
    ietf_dm.root.from_gdata, system)
```

Each mapping receives its complete owned source root after contributions merge.
A standalone caller can pass standard adata directly and receive vendor adata.
Unsupported-feature checks also operate on typed data, so direct calls get the
same restrictions. The mappings do not mutate their inputs. There is no standalone
runner in this iteration.

| Standard configuration | IOS-XR | Junos cRPD |
| --- | --- | --- |
| Hostname | UM hostname | system host-name |
| Prefix sets | RPL prefix sets | route-filter-list |
| Tag sets | RPL tag sets | inline single-tag match |
| Community sets | RPL community sets | community, optional INVERTED variant |
| AS-path sets | RPL AS-path sets | as-path-group |
| Call-policy | HIERARCHICAL policy variant | from policy |
| Prefix/AS-path inversion | negated RPL condition | generated NOT-PREFIX-SET / NOT-AS-PATH-SET policy |
| Community inversion | negated matches-any | INVERTED community |
| Origin, local preference, next-hop, MED | RPL actions | native then actions |
| Community add/replace/remove | referenced or inline | referenced set only |
| Accept/reject/next statement | done/drop/fall-through | accept/reject/fall-through |
| NTP | plain IPv4/IPv6 servers on UDP 123 | unsupported |
| DNS | name servers on port 53, Loopback0 source | unsupported |
| Interface IPv4 addresses and descriptions | interface address/netmask | interface/unit family inet |
| Single C-VLAN subinterfaces and VRF binding | dot1q and interface vrf | unit vlan-id and routing-instance interface |
| IS-IS level 2, NET, metrics, passive/p2p | process and address families | protocols isis and loopback ISO address |
| MPLS/LDP IPv4 interfaces | LDP interfaces | MPLS and LDP interfaces |
| iBGP groups/neighbors, VPNv4/VPNv6 | neighbor-groups | internal groups |
| RTC address family | unsupported | family route-target |
| VPN RD/RT and customer eBGP | VRF and BGP VRF | routing-instance |
| BGP MD5 key references | type-7 password | Junos authentication-key |
| System authentication/users | unsupported | unsupported |

Policy statements retain their authored order. XR `ios-xr-policy-type` supports
`regular`, `hierarchical`, or `both`; call-policy uses the `-HIERARCHICAL` name.
Junos `junos-match-type` supports `regular`, `inverted`, or `both`. Generated names
must not collide with explicit policy/community names. Prefix-set names are
unique across families on XR; Junos combines the families into one route-filter
list. Prefix ranges must fit the address family and start at the prefix length
or later. Zero-valued local preference and MED are preserved. Numeric uint32 communities
and the four well-known identities in `iana-bgp-community-types` use canonical AS:value
notation in native output.

Platform restrictions from the NSO implementation are explicit errors: `all`
matching for prefix/tag/AS-path sets on XR, and `all` for prefix/AS-path sets on
Junos; Junos tag matching accepts exactly one tag and `any`; Junos `any` community
matching accepts at most one member. Junos inline community actions are rejected.
XR match-interface is unsupported. XR source-protocol accepts `direct`; the NSO
implementation silently ignored other protocols, whereas this port rejects them.
NTP peer modes, nondefault ports, iburst and prefer are rejected on XR. DNS search
lists/options, system clock/timezone and all other unimplemented input nodes fail
explicitly.

Network support covers the current RFS footprint. XR supports one primary IPv4
address per interface; Junos supports multiple addresses. Subinterfaces have an
explicit parent, C-VLAN tag, and `parent.<unit>` name. `Loopback0` with type
`softwareLoopback` maps to Junos `lo0.0`; cRPD physical interfaces retain their
Linux names in protocol configuration. Junos NETCONF RFC/YANG compliance flags
are platform behavior emitted with global BGP intent.

VPNs currently support IPv4 and type-0 RD/RT values. Junos requires one matching
import/export RT. Both mappings support one local BGP AS across VRFs and one
protocol instance per protocol type per network instance. Customer neighbors
require an explicit peer AS. Junos neighbors sharing a group must use identical
policies; XR supports one policy per direction. BGP address-family entries require
explicit `enabled=true`, preserving the draft's disabled default. MD5 references
require one key using the MD5 algorithm. Encoding happens inside the vendor
mapping. Missing references, unsupported modes, and duplicate peer addresses
fail explicitly.

All RFS contributions merge before translation, allowing policy/set definitions
in separate transforms. `merge([ietf_dm_root, native_root])` returns the usual
RFS `MNode`. An identical native value can coexist with a translated value;
a conflicting one aborts the transaction. Source intent persists separately
from native output. Approvals and NETCONF see only the native target, and removal
of source data removes its generated contribution on the next render.

Tests in `translations/test_model_translation.act` and
`translations/test_network_translation.act` cover both mappings against the
native generated schemas, all six RFS transforms, merged references, VRF isolation,
and unsupported combinations. The `l3vpn_svc_adata` snapshot verifies native
device output. Parent access interfaces use the shared description `Customer
access port` on both XR and Junos; subinterfaces retain their customer-specific
descriptions. Discovery snapshots capture this intentional difference from the
older Junos fixture descriptions. The core translation suite covers
transaction merging, conflicts, persistence, approvals and reconciliation. Validate with:

```sh
make gen-ldep
make build DEP_OVERRIDES="--dep netconf=../netconf --dep stratoweave=../stratoweave --dep yang=../acton-yang --dep tmf=../actmf --dep http_router=../http-router"
make test DEP_OVERRIDES="--dep netconf=../netconf --dep stratoweave=../stratoweave --dep yang=../acton-yang --dep tmf=../actmf --dep http_router=../http-router"
```

After updating the six snapshots for the shared parent-interface description,
`make test-ldep` also passed all 33 tests from a fresh test-result cache.

Initial validation on 2026-10-12: generation and the host build succeeded; all 33
tests passed, including the then-unchanged native `l3vpn_svc_adata` snapshot. Generation
needed `make gen-ldep RELEASE="--release --always-build"` to refresh stale Acton
dependency artifacts. The ten downloaded modules match their recorded SHA256
hashes, and `pyang -p spec/yang/IETFDevice
spec/yang/IETFDevice/stratoweave-network@2026-10-12.yang` passed.

The final binary was also checked in the existing four-router notconf lab:

```sh
make build-linux-aarch64 DEP_OVERRIDES="--dep netconf=../netconf --dep stratoweave=../stratoweave --dep yang=../acton-yang --dep tmf=../actmf --dep http_router=../http-router"
cd test/quicklab-notconf
make copy
docker exec sorespo-quicklab-notconf-sweave /sorespo --log.level debug --exit-on-done netinfra.xml l3vpn-svc.xml
```

This lab run preceded the shared parent-interface description change.
All startup configuration completed successfully. Each of AMS, FRA, STO and LJU
reported no difference between its running configuration and the translated
native target. This checks NETCONF model integration, not a real router dataplane.
The framework's existing no-difference path does not retain `target_conf`, so its
target/diff API views remain empty in this case; verification used the device
manager's reconciliation logs. No framework changes are included here.

Forward configuration only is supported. OpenConfig, reverse/operational-state
translation, standalone execution and new adapter packages remain out of scope.
