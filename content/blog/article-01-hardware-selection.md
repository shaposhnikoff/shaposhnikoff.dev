---
title: "How to choose MikroTik hardware for a proper network: router, switch, Wi-Fi, and room to grow"
date: 2026-03-11
summary: "Practical MikroTik router, switch, and Wi-Fi device selection for VLANs, firewall, WireGuard, and network growth."
tags: ["mikrotik","routeros","hardware","network-design"]
topics: ["networking"]
toc: true
---

# How to choose MikroTik hardware for a proper network: router, switch, Wi-Fi, and room to grow

A proper network does not start with buying the most expensive router. It starts with understanding roles. MikroTik can be a router/firewall, switch, Wi-Fi controller, CAP, VPN gateway, DNS cache, and monitoring target. But one device should not always do everything at once.

The goal of this article is to choose hardware for the architecture from the first article: core router, managed switch, access points, and enough performance headroom.

## Where this fits in the overall architecture

We already defined the target design: MikroTik as the core router/firewall, VLAN segmentation, managed switching, Wi-Fi through CAP/AP, and separate SSIDs for different VLANs.

Now we need to decide which devices can handle that. A mistake at this stage leads to strange compromises: VLANs exist, but there are not enough ports; WireGuard is needed, but the CPU is weak; Wi-Fi is built in, but coverage is poor; the switch supports VLANs, but administration is awkward.

## Device roles

In a normal design, roles are split like this:

| Role | What it does | What to check |
| --- | --- | --- |
| Core router | Routing, firewall, NAT, WireGuard, DHCP/DNS | CPU, RAM, RouterOS 7, throughput with firewall |
| Switch | Trunk/access VLANs, L2 fan-out | VLAN support, port count, PoE, uplink speed |
| CAP/AP | Wi-Fi access layer | WiFi package, bands, VLAN per SSID, PoE |
| Optional server | DNS filtering, monitoring, backups | Not necessarily MikroTik |

You can start with one device, but the architecture should allow growth.

## Router: the main criterion

For a core router, "gigabit ports" are not enough. You need to understand which traffic will go through the CPU:

- firewall;
- NAT;
- inter-VLAN routing;
- WireGuard;
- QoS/queues;
- logging;
- IPv6 firewall;
- dual WAN checks.

FastPath/FastTrack can accelerate some traffic, but hardware choice should not be based only on marketing "up to" numbers. A production-like network always has rules, exceptions, VPN, and traffic between VLANs.

Practical guidance:

| Scenario | What you need |
| --- | --- |
| Small apartment, 1 WAN, basic firewall | hAP ax2/ax3 or a similar current RouterBOARD |
| House/homelab, VLANs, WireGuard, NAS | Stronger ARM/ARM64 router with CPU headroom |
| Small office, many VLANs/VPN/rules | Separate router in the RB5009/CCR class, depending on load |
| 10G uplink or heavy routing | Check real tests and CPU/switch-chip architecture |

The model name alone guarantees nothing. Check RouterOS 7 support, CPU, RAM, ports, PoE, SFP/SFP+, hardware offload, and real limitations.

## Switch: VLANs without surprises

A switch is needed when the router has too few ports or when the network physically spreads across rooms, a rack, APs, and servers.

Critical points:

- tagged/untagged VLAN support;
- trunk/access ports;
- predictable PVID behavior;
- enough ports;
- PoE for CAP/AP and cameras, if needed;
- 1G/2.5G/10G uplink according to real need;
- a management model you can operate.

A CRS can be a good switch, but not every CRS should be used as a heavy router. MikroTik devices are optimized for different roles.

## Wi-Fi: do not confuse router and access layer

Built-in Wi-Fi in a router is convenient for a small network, but scales poorly. If coverage matters, it is better to use separate CAP/AP devices:

- one SSID for LAN;
- a separate SSID for Guest;
- a separate SSID for IoT;
- VLAN per SSID;
- PoE power;
- centralized configuration through CAPsMAN where it makes sense.

In RouterOS 7, account for the differences between legacy wireless and the newer WiFi packages. Commands and capabilities depend on the model and installed package, so Wi-Fi configuration must be checked on the actual device.

## Practical selection matrix

Before buying, fill in this table:

| Question | Example answer |
| --- | --- |
| How many WAN links? | 1 primary, 1 backup |
| What WAN speed? | 1 Gbit/s |
| Is inter-VLAN routing needed? | Yes, LAN -> Server, LAN -> IoT partially |
| Is WireGuard needed? | Yes, 3 road-warrior peers |
| Is QoS needed? | Yes, if the uplink becomes congested |
| How many wired clients? | 12 |
| How many APs? | 2 |
| Is PoE needed? | Yes, APs and cameras |
| Is 10G needed? | Only NAS uplink, if the budget allows |

After that, choose a set of roles, not "the most popular MikroTik": router separately, switch separately, AP separately.

## Before applying anything

Choosing hardware does not change the configuration, but before migrating the network to a new device, prepare:

```routeros
/system backup save name=before-migration
/export file=before-migration
```

Binary backup is suitable for restoring on the same device. For moving logic to another model, `/export` is more useful because interface names, switch chip, and Wi-Fi package can differ.

## How to check that the choice is adequate

Pre-purchase checks:

- the device supports RouterOS 7;
- there are enough ports with margin;
- WAN/LAN uplink does not become the bottleneck;
- CPU fits WireGuard/firewall/QoS needs;
- the switch supports the required VLAN design;
- APs support the required Wi-Fi package and VLAN per SSID;
- PoE budget is enough for all powered devices;
- there is at least 20-30% growth margin.

## Common mistakes

Buying a router only by port count. Ports do not tell you how much firewall/VPN/QoS load it can handle.

Using a CRS as a universal router without evaluating CPU. A CRS is often good as a switch, but routing with firewall may not be its strength.

Leaving Wi-Fi on one device in the corner of the apartment and then trying to fix coverage by raising transmit power.

Ignoring PoE. Access points and cameras then get separate power adapters, the rack becomes messier, and resilience gets worse.

## Security notes

Hardware affects security indirectly. If the router cannot handle firewall or WireGuard, there is a temptation to disable checks, expose management, or give up segmentation. That is a bad compromise.

Performance headroom is needed not for appearance, but so the security policy stays enabled under real load.

## Short takeaway

Choose MikroTik by roles: the router routes and filters, the switch delivers VLANs, and CAP/AP devices serve Wi-Fi. Do not mix every task without need, and do not rely on "magic" throughput numbers without firewall/VPN/QoS.

The next article is about the initial RouterOS 7 setup: how to start safely, reduce attack surface, and prepare the device for a normal configuration.
