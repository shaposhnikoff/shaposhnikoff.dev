---
title: "Bridge VLAN filtering on MikroTik: trunk, access, PVID, and lockout protection"
date: 2026-03-15
summary: "Configuring bridge VLAN filtering in RouterOS 7: trunk, access, PVID, bridge VLAN table, and lockout protection."
tags: ["mikrotik","routeros","vlan","bridge"]
topics: ["networking"]
toc: true
---

# Bridge VLAN filtering on MikroTik: trunk, access, PVID, and lockout protection

Bridge VLAN filtering in RouterOS 7 is the key mechanism for a proper VLAN design on MikroTik. It lets one bridge serve multiple VLANs, separate tagged and untagged traffic, build trunks to switches/APs, and provide access ports for endpoint devices.

This is one of the most useful and most dangerous topics in the series: the wrong order of operations can easily cut off access to the router.

## Where this fits in the overall architecture

In the previous article, we designed VLAN IDs, subnets, port roles, and the management path. Now that plan is moved into the RouterOS bridge.

At this stage we are not building the full firewall yet. The task is to deliver L2/VLAN correctly to MikroTik L3 interfaces and physical ports.

## Basic concepts

A bridge in RouterOS joins L2 ports. VLAN filtering enables VLAN membership control on the bridge: which VLANs are allowed on which ports, where traffic is tagged, where it is untagged, and which PVID is applied.

A trunk port carries multiple VLANs tagged. An access port gives the client one VLAN untagged. PVID defines the VLAN for incoming untagged traffic.

The bridge VLAN table describes which ports participate in each VLAN:

- tagged: trunk ports and the bridge itself for the L3 VLAN interface;
- untagged: access ports;
- pvid: the VLAN where untagged traffic on a port lands.

## Before applying anything

This is a risky stage. Before configuration:

```routeros
/system backup save name=before-bridge-vlan-filtering
/export file=before-bridge-vlan-filtering
/system console safe-mode
```

Make sure you have local access or a separate temporary management port. Do not enable `vlan-filtering=yes` remotely without a rollback plan. Check real interface names:

```routeros
/interface print
/interface bridge print
/interface bridge port print
```

## Baseline sequence

The safer order is:

1. Create or check the bridge with `vlan-filtering=no`.
2. Add ports to the bridge.
3. Configure PVID for access ports.
4. Create VLAN interfaces on the bridge for L3.
5. Fill in the bridge VLAN table.
6. Check the tables.
7. Only then enable `vlan-filtering=yes`.

Do not start from the last step.

## Example bridge and ports

The names below are placeholders. Replace them with real ones:

```routeros
/interface bridge
add name=br-core vlan-filtering=no comment="Core bridge for VLANs"

/interface bridge port
add bridge=br-core interface=<trunk-to-switch> frame-types=admit-only-vlan-tagged
add bridge=br-core interface=<access-lan-port> pvid=20
add bridge=br-core interface=<access-mgmt-port> pvid=10
```

The trunk accepts tagged traffic. Access ports get a PVID so an untagged client lands in the correct VLAN.

## VLAN interfaces for L3

If MikroTik will be the gateway for VLANs, create VLAN interfaces on the bridge:

```routeros
/interface vlan
add name=vlan10-mgmt interface=br-core vlan-id=10
add name=vlan20-lan interface=br-core vlan-id=20
add name=vlan30-guest interface=br-core vlan-id=30
add name=vlan40-iot interface=br-core vlan-id=40
```

These interfaces will later receive IP addresses, DHCP servers, and firewall membership.

## Bridge VLAN table

Example:

```routeros
/interface bridge vlan
add bridge=br-core vlan-ids=10 tagged=br-core,<trunk-to-switch> untagged=<access-mgmt-port>
add bridge=br-core vlan-ids=20 tagged=br-core,<trunk-to-switch> untagged=<access-lan-port>
add bridge=br-core vlan-ids=30 tagged=br-core,<trunk-to-switch>
add bridge=br-core vlan-ids=40 tagged=br-core,<trunk-to-switch>
```

`br-core` must be tagged for VLANs where the router itself has an L3 VLAN interface. Otherwise RouterOS will not correctly receive that VLAN on the CPU.

## Enabling filtering

Before enabling it, check:

```routeros
/interface bridge port print
/interface bridge vlan print
/interface vlan print
```

If the table looks correct and the management path is preserved, enable:

```routeros
/interface bridge set br-core vlan-filtering=yes
```

If access disappears, Safe Mode should roll back the changes. If Safe Mode was not used, local access or reset/recovery may be required.

## How to verify the result

Checks:

```routeros
/interface bridge port print
/interface bridge vlan print
/interface vlan print
/ip address print
```

From a client device:

- an access LAN port receives an address from the LAN VLAN;
- a management host sees the router management IP;
- Guest/IoT SSIDs or ports land in their subnets;
- the trunk to switch/AP carries the required tagged VLANs;
- untagged traffic does not appear where it should not.

## Common mistakes

Not adding `br-core` as tagged in the VLAN table for an L3 VLAN. The VLAN interface exists, but traffic does not work.

Mixing up tagged and untagged on trunk/access ports.

Leaving a trunk with an untagged native VLAN without a conscious decision.

Enabling filtering before PVID and the VLAN table are configured.

## Security notes

For trunk ports, it is useful to restrict frame types and enable ingress filtering, but the exact parameter set depends on the model, switch chip, and RouterOS version. Test on CHR or a spare device before moving to production.

VLAN filtering does not replace firewall. After L2 segmentation, configure the L3 firewall between VLANs.

## Short takeaway

Bridge VLAN filtering gives MikroTik a clean VLAN foundation: trunk, access, PVID, and the bridge VLAN table. The main principle is: first tables and management path, then `vlan-filtering=yes`.

The next article is about DHCP, DNS, and basic routing for multiple VLANs.
