---
title: "DoH DNS and DNS policy: MikroTik DNS cache, enforcement, and limitations"
date: 2026-03-25
summary: "DNS policy on MikroTik: DNS cache, DoH upstream, enforcement by VLAN, and the limits of blocking client DoH."
tags: ["mikrotik","routeros","dns","doh","security"]
topics: ["networking"]
toc: true
---

# DoH DNS and DNS policy: MikroTik DNS cache, enforcement, and limitations

DNS policy is not only choosing a resolver. It is deciding who in the network may use which DNS servers, how local names are handled, whether filtering is needed, what to do with DoH, and how not to turn the router into an open resolver.

MikroTik can be a DNS cache and enforcement point, but it does not solve every privacy and filtering problem by itself.

## Where this fits in the overall architecture

We have VLANs, firewall, Guest, IoT, and WireGuard. Now we need to define DNS behavior for different segments:

- LAN can use the local DNS cache;
- Guest can use only an approved resolver;
- IoT can be forced to a filtering DNS;
- VPN clients can receive internal DNS;
- WAN must not have access to the router's DNS resolver.

## What MikroTik DNS cache is

RouterOS can accept DNS queries from clients and forward them to an upstream resolver:

```routeros
/ip dns
set servers=1.1.1.1,8.8.8.8 allow-remote-requests=yes
```

`allow-remote-requests=yes` means "answer clients", not "open DNS to everyone". Firewall must block DNS from WAN.

## DoH on MikroTik

RouterOS supports DNS-over-HTTPS as an upstream for the router itself. This can protect DNS queries between MikroTik and the upstream DoH provider from simple ISP interception, but it does not provide complete privacy:

- the DoH provider sees queries;
- SNI/IP destination can still reveal a lot;
- clients can use their own DoH in the browser;
- DoH over 443 is hard to distinguish from normal HTTPS without more complex tools.

## Before applying anything

Before changing DNS policy:

```routeros
/system backup save name=before-dns-policy
/export file=before-dns-policy
```

Check the current DNS configuration:

```routeros
/ip dns print
/ip firewall filter print
/ip firewall nat print
```

Do not enable DNS for clients without firewall protection from WAN.

## DNS enforcement

If policy requires clients to use only your resolver, you can:

- allow DNS to MikroTik or a filtering server;
- block direct UDP/TCP 53 outward;
- redirect DNS to a local resolver if needed;
- explicitly accept the limits of DoH/DoT.

Example direct DNS block:

```routeros
/ip firewall filter
add chain=forward action=drop protocol=udp dst-port=53 out-interface-list=WAN src-address-list=local-subnets comment="block direct DNS UDP"
add chain=forward action=drop protocol=tcp dst-port=53 out-interface-list=WAN src-address-list=local-subnets comment="block direct DNS TCP"
```

Redirect can be useful, but it must be documented:

```routeros
/ip firewall nat
add chain=dstnat protocol=udp dst-port=53 src-address-list=local-subnets action=redirect to-ports=53 comment="redirect DNS UDP to router"
add chain=dstnat protocol=tcp dst-port=53 src-address-list=local-subnets action=redirect to-ports=53 comment="redirect DNS TCP to router"
```

Do not apply redirect without understanding which VLANs and devices it affects.

## Different policies for VLANs

| VLAN | DNS policy |
| --- | --- |
| Management | trusted resolver, possibly without filtering |
| LAN | local DNS cache or filtering DNS |
| Guest | filtering DNS, no direct DNS |
| IoT | strict filtering DNS, no direct DNS |
| VPN | internal DNS for local names |

This can be implemented through MikroTik DNS cache, AdGuard Home/Pi-hole, NextDNS, or a combination.

## How to verify the result

Checks:

```routeros
/ip dns cache print
/ip firewall filter print stats
/ip firewall nat print stats
/resolve google.com
```

From a client:

- DNS responds;
- direct `8.8.8.8:53` is blocked if that is the policy;
- local names resolve;
- Guest/IoT do not bypass policy through regular DNS;
- DoH bypass is documented as a limitation, not hidden.

## Common mistakes

Enabling `allow-remote-requests=yes` and exposing DNS from WAN.

Promising that DoH fully solves privacy.

Blocking UDP 53 and forgetting TCP 53.

Breaking corporate/VPN DNS scenarios with a global redirect.

Trying to fully block DoH with one firewall rule.

## Security notes

DNS policy must be part of firewall policy. If Guest must not access internal networks, a DNS exception must not open management to it.

DoH protects the channel to the resolver; it is not universal protection against tracking, malware, or leaks.

## Short takeaway

MikroTik can be a DNS cache and enforcement point, but DNS policy must be designed per VLAN. DoH is useful, but has limitations, especially when clients use their own HTTPS traffic.

The next article is about DNS filtering: AdGuard Home, Pi-hole, NextDNS, and different policies for VLANs.
