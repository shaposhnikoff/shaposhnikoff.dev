---
title: "DNS filtering: AdGuard Home, Pi-hole, NextDNS, and different policies for VLANs"
date: 2026-03-26
summary: "DNS filtering per VLAN with AdGuard Home, Pi-hole, NextDNS, DHCP options, and firewall enforcement."
tags: ["mikrotik","dns-filtering","adguard","pi-hole","nextdns"]
topics: ["networking"]
toc: true
---

# DNS filtering: AdGuard Home, Pi-hole, NextDNS, and different policies for VLANs

DNS filtering helps block ads, malware domains, trackers, and unwanted categories. But it works only for DNS queries that actually pass through the selected resolver.

In a VLAN network, filtering should differ by segment: IoT and Guest are usually stricter, Management is more conservative, and LAN is more flexible.

## Where this fits in the overall architecture

In the previous article, we covered DNS cache, DoH, and enforcement. Now we choose the filtering backend and tie it to VLAN policy.

MikroTik can direct clients to a filtering resolver, but it usually does not replace a full DNS filtering service by itself.

## Filtering options

| Solution | Where it runs | Pros | Cons |
| --- | --- | --- | --- |
| AdGuard Home | local server/container | Flexible policies, UI, local control | Requires a separate host |
| Pi-hole | local server/container | Simple, popular | Fewer enterprise-style policies |
| NextDNS | cloud service | Convenient profiles, DoH/DoT | Depends on an external service |
| MikroTik DNS static | router | Simple for local records | Not full filtering |

## Policies by VLAN

Example:

| VLAN | Resolver | Policy |
| --- | --- | --- |
| Management | trusted DNS | Minimal filtering, maximum stability |
| LAN | AdGuard/Pi-hole | Ads/malware block, allowlist as needed |
| Guest | Strict filtering | Malware/adult/tracking block |
| IoT | Strict filtering | Carefully block unnecessary cloud/tracking domains |
| VPN | Internal DNS | Local names plus the required profile |

## Before applying anything

Before changing DNS filtering:

```routeros
/system backup save name=before-dns-filtering
/export file=before-dns-filtering
```

Check where the filtering server is located, its IP, reachability from VLANs, and fallback behavior. If the DNS server fails, clients can lose name resolution.

## DHCP options

The simplest way is to provide the required DNS through DHCP:

```routeros
/ip dhcp-server network
set [find address=10.10.20.0/24] dns-server=<lan-filter-dns-ip>
set [find address=10.10.30.0/24] dns-server=<guest-filter-dns-ip>
set [find address=10.10.40.0/24] dns-server=<iot-filter-dns-ip>
```

If there is one filtering server, different policies can be applied by source subnet inside AdGuard Home/Pi-hole/NextDNS profile, if the solution supports it.

## Firewall enforcement

To prevent clients from bypassing DNS policy through regular DNS:

```routeros
/ip firewall filter
add chain=forward action=accept protocol=udp dst-port=53 dst-address=<filter-dns-ip> src-address-list=local-subnets comment="allow DNS to filter"
add chain=forward action=accept protocol=tcp dst-port=53 dst-address=<filter-dns-ip> src-address-list=local-subnets comment="allow DNS TCP to filter"
add chain=forward action=drop protocol=udp dst-port=53 src-address-list=local-subnets out-interface-list=WAN comment="block direct DNS UDP"
add chain=forward action=drop protocol=tcp dst-port=53 src-address-list=local-subnets out-interface-list=WAN comment="block direct DNS TCP"
```

DoH/DoT need a separate policy and are not fully blocked by this set.

## Local names

For local services, you can use:

- records in AdGuard/Pi-hole;
- MikroTik static DNS;
- split DNS;
- a separate internal zone.

The point is to avoid making users remember NAS, Home Assistant, and monitoring IP addresses.

## How to verify the result

Checks:

- the client receives the correct DNS through DHCP;
- queries are visible in the filtering resolver UI;
- blocked domains are actually blocked;
- allowlist works;
- direct DNS outward is blocked if policy requires it;
- local names resolve;
- fallback does not bypass filtering.

Commands:

```routeros
/ip dhcp-server network print
/ip firewall filter print stats
/tool torch interface=<vlan-interface>
```

## Common mistakes

Providing filtering DNS through DHCP but not blocking direct DNS.

Using overly aggressive lists and breaking IoT/cloud devices.

Having no fallback or monitoring for the local DNS server.

Treating DNS filtering as antivirus.

Not separating Guest, IoT, and LAN policies.

## Security notes

DNS filtering reduces noise and some risks, but it does not replace firewall, updates, and segmentation. A device can connect by IP directly or use DoH.

Use filtering carefully for IoT: sometimes blocking a vendor domain breaks updates or control. That must be logged and documented.

## Short takeaway

DNS filtering works best as policy per VLAN: different resolvers/profiles, DHCP options, firewall enforcement, and clear exceptions. It is useful, but it is not a complete security boundary.

The next article is about FastTrack: acceleration, exceptions, and side effects.
