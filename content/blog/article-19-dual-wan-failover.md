---
title: "Dual WAN and failover: backup ISP, routes, checks, and notifications"
date: 2026-03-29
summary: "Dual WAN on MikroTik: route distance, recursive checks, NAT, DNS, WireGuard, failover/failback, and notifications."
tags: ["mikrotik","routeros","dual-wan","failover"]
topics: ["networking"]
toc: true
---

# Dual WAN and failover: backup ISP, routes, checks, and notifications

Dual WAN is useful when availability matters more than simplicity. A backup ISP can save remote work, VPN, monitoring, and services, but only if failover is configured deliberately.

Simply adding a second default route is not enough. You need to understand distance, gateway checks, routing tables, NAT, DNS, and notifications.

## Where this fits in the overall architecture

We already have firewall, NAT, VPN, DNS policy, and QoS. Dual WAN touches all of these layers:

- default route can switch;
- NAT must work on both WAN links;
- WireGuard endpoint can change;
- DNS and monitoring must survive failover;
- port forwarding from backup WAN may be impossible or require a separate design.

## Basic concepts

Primary WAN is the main provider.

Secondary WAN is the backup provider, LTE/5G, or second ISP.

Route distance is route priority. Lower distance is preferred.

Check gateway or recursive routing is a way to determine that the path actually works, not just that the interface is up.

## Before applying anything

Before Dual WAN:

```routeros
/system backup save name=before-dual-wan
/export file=before-dual-wan
/system console safe-mode
```

Collect data:

- type of each WAN: DHCP/static/PPPoE/LTE;
- gateway;
- public/private IP;
- whether inbound access is needed;
- which services depend on the external IP;
- how alerts will be sent.

## Simple design with distance

If gateway checks are enough:

```routeros
/ip route
add dst-address=0.0.0.0/0 gateway=<primary-gateway> distance=1 comment="default via primary WAN"
add dst-address=0.0.0.0/0 gateway=<secondary-gateway> distance=2 comment="default via backup WAN"
```

For DHCP/PPPoE routes, some parameters may be received automatically. Do not duplicate routes without understanding them.

## NAT for two WAN links

```routeros
/ip firewall nat
add chain=srcnat out-interface=<primary-wan> action=masquerade comment="srcnat primary WAN"
add chain=srcnat out-interface=<secondary-wan> action=masquerade comment="srcnat backup WAN"
```

You can use `out-interface-list=WAN` if both WAN links are in the list and policy is the same.

## Recursive checks

Sometimes link up does not mean internet up. Recursive routing can check reachability of an external target through a specific provider. This is more reliable, but more complex and requires careful host-route configuration.

Do not deploy recursive routing without a lab test: mistakes can make failover unstable.

## DNS during failover

If the DNS resolver is reachable only through primary WAN, clients can lose DNS during failover. Use a resolver reachable through both WAN links or a local cache with correct upstreams.

Check not only IP ping, but also resolution:

```routeros
/resolve google.com
/ping 8.8.8.8
```

## WireGuard and inbound services

If the WireGuard endpoint is published on primary WAN, the external address changes during failover. Options:

- dynamic DNS;
- WireGuard client initiates an outbound connection;
- backup endpoint;
- VPS/hub as a stable point;
- no inbound access on backup WAN.

Port forwarding over LTE/CGNAT may be impossible. Accept this in advance.

## Notifications

Failover without notifications is hidden degradation. You need to know that the network is running on backup:

- log events;
- Telegram/email/webhook notification;
- monitoring check;
- periodic report.

In RouterOS, this can be done through scripts/scheduler or external monitoring.

## How to verify the result

Test:

1. Check normal state: primary active.
2. Disconnect primary WAN physically or logically.
3. Check transition to backup.
4. Check DNS.
5. Check VPN/critical services.
6. Restore primary.
7. Check failback.
8. Check notifications.

Commands:

```routeros
/ip route print
/ip firewall nat print stats
/ping 8.8.8.8
/resolve google.com
/log print
```

## Common mistakes

Checking only interface up/down, not the real internet path.

Forgetting NAT for backup WAN.

Not checking DNS during failover.

Expecting inbound port forwarding through CGNAT.

Not notifying about transition to backup.

## Security notes

Backup WAN must not expose management. Interface list `WAN` must include both WAN links, and the firewall input drop must apply to both.

Security policy must not become weaker during failover.

## Short takeaway

Dual WAN is not just a second cable. It needs routes, checks, NAT, DNS, a VPN plan, and notifications. The setup must be tested as a failure scenario, not only read in the config.

The next article is about logging strategy: which events to write and how not to drown the router in logs.
