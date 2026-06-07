---
title: "What we are building: the target network architecture on MikroTik RouterOS 7"
date: 2026-03-10
summary: "Target architecture for a managed MikroTik RouterOS 7 network with VLANs, a Wi-Fi access layer, firewall, and VPN."
tags: ["mikrotik","routeros","vlan","network-architecture"]
topics: ["networking"]
toc: true
---

# What we are building: the target network architecture on MikroTik RouterOS 7

A home or office network often starts with a simple goal: make the internet work. That is not enough for normal operations. If work laptops, phones, cameras, IoT devices, a NAS, guest devices, and VPN clients all live in one network, "one router, one Wi-Fi, one NAT" quickly turns into an unmanaged risk zone.

In this series we build a MikroTik RouterOS 7 network as an engineered system: clear architecture, segmentation, access restrictions, observability, backups, and a recovery plan.

## Where this article fits in the architecture

This is article zero in the series. We are not writing a large configuration or enabling dangerous settings here. The goal is different: describe what network we are building, what roles the devices have, which VLANs are needed, which access flows are allowed, and where the responsibility boundaries are.

Each following article covers one layer: hardware, RouterOS baseline setup, VLANs, DHCP/DNS, firewall, NAT, Wi-Fi, IPv6, WireGuard, DNS policy, QoS, failover, logging, monitoring, backups, and disaster recovery.

## Core idea

In this design, MikroTik is not "the ISP Wi-Fi box". It is the core router and firewall. It receives WAN from the provider, routes between segments, applies the security policy, serves DHCP/DNS where appropriate, terminates WireGuard, and provides a control point for monitoring.

Wi-Fi is better treated as the access layer. Access points or CAPs do not work as separate home routers with their own NAT. They are managed devices that attach clients to the right VLANs. One SSID can map to LAN, another to Guest, and a third to IoT.

The switch, if present, is responsible for L2 delivery of VLANs to ports, servers, and access points. It should not make security decisions that belong on the router/firewall.

## Target topology

The base design looks like this:

```text
Internet / ISP
    |
  WAN
    |
MikroTik RouterOS 7
  core router / firewall / DHCP / DNS cache / WireGuard
    |
  trunk VLAN
    |
Managed switch
  |       |         |
NAS     PC      CAP/AP
                  |
              SSID per VLAN
```

For a small network, the managed switch can be built into the MikroTik itself. As the network grows, a separate CRS/CSS or another managed switch makes the design simpler and cleaner.

## Network segments

A starting VLAN set:

| VLAN ID | Purpose | Example subnet | Gateway | DHCP | Access |
| --- | --- | --- | --- | --- | --- |
| 10 | Management | `10.10.10.0/24` | `10.10.10.1` | Yes/limited | Router, switch, and AP administration |
| 20 | LAN | `10.10.20.0/24` | `10.10.20.1` | Yes | Workstations, phones, trusted clients |
| 30 | Guest | `10.10.30.0/24` | `10.10.30.1` | Yes | Internet and local DHCP/DNS only |
| 40 | IoT | `10.10.40.0/24` | `10.10.40.1` | Yes | Internet and strictly required services |
| 50 | Server/NAS | `10.10.50.0/24` | `10.10.50.1` | Depends | NAS, homelab, self-hosted services |
| 90 | VPN | `10.10.90.0/24` | WireGuard | No or peer-based | Limited access by policy |

This is an example, not a universal design. VLAN IDs, subnets, and names must be adapted to the specific network. The important part is not the number of VLANs, but that every segment has a clear role and access policy.

## SSID and VLAN

Wi-Fi should not be one shared network for every device.

| SSID | VLAN | Purpose |
| --- | --- | --- |
| `Home-Main` | 20 | Primary trusted devices |
| `Home-Guest` | 30 | Guests, internet only |
| `Home-IoT` | 40 | Smart devices, cameras, appliances |

For CAPsMAN or the WiFi package in RouterOS 7, this means VLAN per SSID. The access point sends client traffic into the corresponding VLAN, and the core router applies the access rules.

## Baseline security policy

Minimal access logic:

| Source | Destination | Policy |
| --- | --- | --- |
| Management | Router, switch, AP | Allow |
| LAN | Internet | Allow |
| LAN | IoT | Only required services |
| Guest | Internet | Allow |
| Guest | LAN/Management/Server | Deny |
| IoT | Internet | As needed |
| IoT | LAN/Management | Deny initiating access |
| VPN | Internal VLANs | Explicit allow only |
| WAN | Router management | Deny |

Management services such as WinBox, SSH, and WebFig are not exposed to the internet. Remote access is done through WireGuard, not through an open management port on WAN.

## Naming convention

Names should make the configuration readable:

| Object | Example |
| --- | --- |
| Bridge | `br-core` |
| VLAN interface | `vlan10-mgmt`, `vlan20-lan`, `vlan30-guest` |
| Interface list | `WAN`, `LAN`, `MGMT`, `GUEST`, `IOT` |
| Address-list | `trusted-admins`, `local-subnets`, `guest-subnets` |
| WireGuard interface | `wg-roadwarrior`, `wg-site-office` |
| WireGuard peer | `peer-max-laptop`, `peer-office-r1` |

Bad names like `vlan1`, `test`, or `newbridge` work technically, but make auditing and recovery harder.

## Before applying anything

In this article we are only designing, but later in the series there will be dangerous VLAN and firewall changes. Before those changes:

```routeros
/system backup save name=before-change
/export file=before-change
```

Also use Safe Mode, keep local access to the router or a rollback plan, do not apply critical VLAN/firewall changes remotely without testing, and check the interface names, bridge, VLAN IDs, and subnets on the actual device in advance.

## How to validate the design

Before configuring hardware, you should have:

- a list of VLANs and subnets;
- a clear understanding of where management access lives;
- an SSID -> VLAN table;
- a list of devices that belong in each segment;
- a draft access matrix between VLANs;
- a clear view of which services will be reachable through VPN.

If you cannot explain why a specific device belongs in a specific VLAN, the segmentation is not ready yet.

## Common mistakes

The first mistake is enabling bridge VLAN filtering before planning management access. That is a direct path to lockout.

The second mistake is mixing Guest, IoT, and LAN in the same broadcast domain. In that case, the "guest network" is just another SSID with the same trust level.

The third mistake is exposing WinBox or SSH to the internet. That is not remote administration; it is unnecessary attack surface.

The fourth mistake is enabling IPv6 and forgetting that NAT no longer hides internal addresses. IPv6 requires a separate firewall.

## Security notes

A network is healthy not when everything can see everything else, but when each segment can see only what it needs. Default-deny between segments is easier to maintain than endless exceptions on top of broad allow rules.

Do not try to solve everything with firewall rules if the architecture is bad. First roles and segments, then routing, then firewall, then observability.

## Short takeaway

We are building a managed network: MikroTik as the core router/firewall, VLANs for different trust levels, Wi-Fi as the access layer, management only from trusted/VPN paths, and separate policies for Guest, IoT, LAN, and servers.

The next article is about choosing MikroTik hardware: which router, switch, and Wi-Fi devices fit this architecture and where you need growth margin.
