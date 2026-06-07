---
title: "MikroTik as the core router: roles, responsibility boundaries, and basic network logic"
date: 2026-03-13
summary: "How to use MikroTik as the core router and security boundary between WAN, VLANs, VPN, and internal segments."
tags: ["mikrotik","routeros","routing","firewall"]
topics: ["networking"]
toc: true
---

# MikroTik as the core router: roles, responsibility boundaries, and basic network logic

The core router is where the network makes decisions. Traffic between WAN, LAN, VLANs, VPN, and server segments passes through it. It does not merely "share the internet"; it defines rules: who routes where, who can reach whom, what is logged, and where the firewall is applied.

In MikroTik RouterOS 7, this role can be built cleanly if you do not mix routing, switching, and Wi-Fi into an unreadable configuration.

## Where this fits in the overall architecture

After the baseline, the device is safer and easier to understand. Now we define its role: MikroTik becomes the core router/firewall, not a random collection of bridges, DHCP, and NAT.

The next articles will build VLAN design, bridge VLAN filtering, DHCP/DNS, and firewall. That makes it important to lock in the model now: which interfaces are WAN, which belong to internal segments, where L2 ends, and where L3 begins.

## Core router roles

The core router usually provides:

- WAN termination;
- default route to the internet;
- inter-VLAN routing;
- firewall for input and forward;
- NAT for IPv4 internet access;
- DHCP server for VLANs;
- DNS cache or DNS forwarding;
- WireGuard endpoint;
- monitoring/logging target;
- backup automation.

Not every function must be enabled immediately, but each one must have a clear place.

## Routing vs switching

Switching works at L2: frames, MAC addresses, VLAN tags, trunk/access ports. Routing works at L3: IP networks, gateway, routes, firewall between subnets.

A common mistake is expecting VLANs by themselves to provide security. VLANs separate broadcast domains, but if the router has interfaces for those VLANs and the firewall allows forward traffic, packets can move between segments. Without firewall, VLANs are address-space segmentation, not a complete access policy.

## Basic L3 model

On the core router, each internal VLAN usually has an L3 interface:

| VLAN | Interface | Gateway |
| --- | --- | --- |
| Management | `vlan10-mgmt` | `10.10.10.1/24` |
| LAN | `vlan20-lan` | `10.10.20.1/24` |
| Guest | `vlan30-guest` | `10.10.30.1/24` |
| IoT | `vlan40-iot` | `10.10.40.1/24` |
| Server/NAS | `vlan50-server` | `10.10.50.1/24` |

Each client receives a gateway in its own VLAN. Traffic between VLANs goes through MikroTik, where it can be filtered.

## Before applying anything

Any routing, bridge, or VLAN changes can cause loss of access. Before practical configuration:

```routeros
/system backup save name=before-core-router
/export file=before-core-router
/system console safe-mode
```

Work locally or through a confirmed management path. Do not enable VLAN filtering or move management remotely without a rollback plan.

## Basic state checks

Before building the core router role, check:

```routeros
/interface print
/interface list print
/interface list member print
/ip address print
/ip route print
/ip firewall filter print
/ip firewall nat print
```

This shows current interfaces, lists, addresses, routes, and rules. Do not build a new policy on top of a configuration you have not read.

## Interface lists

Interface lists make firewall and NAT readable:

```routeros
/interface list
add name=WAN
add name=LAN
add name=MGMT
add name=GUEST
add name=IOT
```

Members are added after real interfaces exist:

```routeros
/interface list member
add list=WAN interface=<wan-interface>
add list=MGMT interface=<management-vlan-interface>
add list=LAN interface=<lan-vlan-interface>
add list=GUEST interface=<guest-vlan-interface>
add list=IOT interface=<iot-vlan-interface>
```

That lets the firewall say "allow management from MGMT" instead of depending on an arbitrary port name.

## Default route and WAN

WAN can be DHCP, static IP, PPPoE, or LTE. In every case, the core router must have a clear default route:

```routeros
/ip route print
```

If the default route is received automatically from the provider, that is fine, but you still need to understand it. Dual WAN and policy routing make the logic more complex, and we will cover them separately.

## NAT is not firewall

IPv4 internet access usually needs masquerade:

```routeros
/ip firewall nat
add chain=srcnat out-interface-list=WAN action=masquerade comment="masquerade LAN to Internet"
```

This rule does not protect the router itself and does not control access between VLANs. NAT only changes the source address for outbound access. The security policy lives in firewall filter.

## Management boundary

Management access to the router, switch, and APs should come only from a trusted segment or through WireGuard.

Practical logic:

- Management VLAN is available to administrators;
- LAN may have limited access to selected services;
- Guest has no access to management;
- IoT has no access to management;
- WAN has no access to management at all.

This boundary matters more than convenience. If management is open from everywhere, segmentation loses its meaning.

## How to verify the result

After designing the core-router role, it should be clear:

- which interface is WAN;
- where the trunk to switch/AP is;
- which VLANs will have an L3 gateway on MikroTik;
- which interface lists are needed for firewall;
- where management lives;
- which functions MikroTik provides and which remain on switch/AP/server.

On a running device, verify:

```routeros
/ip address print
/ip route print
/interface list member print
/ping 8.8.8.8
/ping google.com
```

## Common mistakes

Treating a bridge as a firewall boundary. A bridge is L2; security between VLANs is done with the L3 firewall.

Giving every VLAN full access to every other VLAN "while configuring" and then forgetting to remove it.

Mixing WAN, LAN, and management in one bridge without a clear reason.

Using NAT rules as a substitute for forward filtering.

## Security notes

The core router should be the most understandable device in the network. If it contains chaotic bridges, NAT, DHCP, and firewall rules, troubleshooting becomes guesswork.

Fewer rules with clear interface lists and address-lists are better than a long configuration with broad `accept any`.

## Short takeaway

MikroTik as the core router is the L3 and security boundary of the network. It routes between VLANs, protects itself through input, filters transit through forward, and should not mix roles unnecessarily.

The next article is about addressing and VLAN design: which segments to choose, which subnets to assign, and how to describe access rules in advance.
