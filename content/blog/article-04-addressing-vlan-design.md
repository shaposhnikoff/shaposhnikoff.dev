---
title: "Addressing plan and VLAN design: segments, subnets, and access rules"
date: 2026-03-14
summary: "Planning VLAN IDs, subnets, gateways, DHCP, trunk/access ports, and an access matrix before configuring MikroTik."
tags: ["mikrotik","routeros","vlan","addressing"]
topics: ["networking"]
toc: true
---

# Addressing plan and VLAN design: segments, subnets, and access rules

VLAN design is not a list of nice-looking IDs. It is a document that explains which segments exist in the network, which devices live in them, which subnets are used, and which access flows are allowed.

If this plan is not created before bridge VLAN filtering, the risk of lockout and chaotic firewall rules rises sharply.

## Where this fits in the overall architecture

We already defined MikroTik as the core router. Now we need to prepare the L2/L3 map: VLAN IDs, interface names, subnets, DHCP, gateway, SSIDs, and security policy.

The next article is about bridge VLAN filtering. Mistakes there can cut off device management. That is why we design the management path and trunk/access ports in advance here.

## What VLAN means in this series

A VLAN splits one physical L2 domain into several logical broadcast domains. Each VLAN can have its own gateway on MikroTik, DHCP pool, firewall rules, and trust level.

Important: VLAN does not replace firewall. It separates L2, but L3 access between VLANs is controlled by the router/firewall.

## Baseline VLAN table

Example starting plan:

| VLAN ID | Name | Subnet | Gateway | DHCP | Purpose |
| --- | --- | --- | --- | --- | --- |
| 10 | `mgmt` | `10.10.10.0/24` | `10.10.10.1` | Yes/limited | Router, switch, AP management |
| 20 | `lan` | `10.10.20.0/24` | `10.10.20.1` | Yes | Trusted clients |
| 30 | `guest` | `10.10.30.0/24` | `10.10.30.1` | Yes | Guest Wi-Fi |
| 40 | `iot` | `10.10.40.0/24` | `10.10.40.1` | Yes | IoT devices |
| 50 | `server` | `10.10.50.0/24` | `10.10.50.1` | Depends | NAS, homelab services |

Use an addressing plan that does not conflict with VPNs, offices, clouds, and future site-to-site links. Networks like `192.168.0.0/24` and `192.168.1.0/24` often conflict with other home networks.

## Management VLAN

Design the Management VLAN first. It contains:

- router management address;
- switch management;
- CAP/AP management;
- sometimes a controller or monitoring host.

Management must not be reachable from Guest and IoT. From LAN, access can be limited to trusted-admin devices only. For remote access, WireGuard is the better option.

## Trunk and access ports

An access port carries one untagged VLAN for an endpoint device. Example: a PC port in the LAN VLAN.

A trunk port carries multiple tagged VLANs. Example: an uplink from router to managed switch, or from switch to AP where the AP has multiple SSIDs.

PVID defines which VLAN untagged traffic entering the port belongs to. PVID mistakes often put a device in the wrong network.

## Port table

Before configuration, fill in a port map:

| Device | Port | Role | Tagged VLAN | Untagged VLAN / PVID |
| --- | --- | --- | --- | --- |
| MikroTik router | `<trunk-to-switch>` | trunk | 10,20,30,40,50 | none or native by design |
| Switch | `<uplink-to-router>` | trunk | 10,20,30,40,50 | none or native by design |
| Switch | `<port-to-admin-pc>` | access | none | 20 |
| Switch | `<port-to-ap>` | trunk | 10,20,30,40 | 10 for AP management, if needed |
| Switch | `<port-to-nas>` | access | none | 50 |

Do not use real interface names from the example without checking your device.

## Access matrix

Minimal policy:

| From | To | Decision |
| --- | --- | --- |
| LAN | Internet | allow |
| LAN | Server | allow or limited |
| LAN | IoT | allow only needed services |
| Guest | Internet | allow |
| Guest | LAN/Server/MGMT | deny |
| IoT | Internet | allow or limited |
| IoT | LAN/MGMT | deny |
| MGMT | Network devices | allow |
| VPN | Internal networks | explicit allow only |

This table later becomes firewall rules. If a rule cannot be explained in the table, it is too early to write it in RouterOS.

## Before applying anything

VLAN changes are dangerous. Before configuration:

```routeros
/system backup save name=before-vlan-design
/export file=before-vlan-design
/system console safe-mode
```

You also need local access to the router or a separate port that temporarily preserves management access. Do not enable bridge VLAN filtering remotely without a rollback plan.

## Practical naming convention

Recommended names:

```text
br-core
vlan10-mgmt
vlan20-lan
vlan30-guest
vlan40-iot
vlan50-server
pool-lan
pool-guest
dhcp-lan
dhcp-guest
```

Names should match roles, not the current accidental port layout.

## How to validate the design

Before CLI configuration, check:

- every VLAN has a purpose;
- every VLAN has a subnet and gateway;
- it is clear where DHCP is enabled and where it is not;
- the management path does not depend on an untested trunk;
- every trunk lists tagged VLANs;
- every access port has a PVID;
- there is an access matrix between segments;
- there is a rollback plan.

## Common mistakes

Enabling VLAN filtering without a management plan. This is the main lockout risk.

Using VLAN 1 as an implicit management network without a conscious decision.

Creating VLANs but forgetting the firewall policy. The result is that all VLANs route to each other.

Assigning subnets without growth margin and without accounting for VPN/site-to-site conflicts.

## Security notes

Do not make Guest and IoT "almost LAN". If a segment was created as less trusted, its default policy should be restrictive.

The Management VLAN should be the most protected internal network. If an IoT camera can open router WinBox, the VLAN design is not doing its job.

## Short takeaway

Good VLAN design starts on paper: IDs, names, subnets, ports, SSIDs, DHCP, and the access matrix. Only after that does bridge VLAN filtering make sense.

The next article is about bridge VLAN filtering: trunk, access, PVID, bridge VLAN table, and lockout protection.
