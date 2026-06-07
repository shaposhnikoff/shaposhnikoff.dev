---
title: "Firewall hardening on MikroTik: input, forward, WAN, and management access"
date: 2026-03-17
summary: "A baseline firewall hardening model for MikroTik: input, forward, WAN drop, management access, and rules between VLANs."
tags: ["mikrotik","routeros","firewall","security"]
topics: ["networking"]
toc: true
---

# Firewall hardening on MikroTik: input, forward, WAN, and management access

Firewall on MikroTik is where architecture becomes policy. VLANs have already split the network, DHCP/DNS already serve clients, but without firewall, different segments can get overly broad access to each other.

The goal of this article is to build a safe baseline: protect the router itself in `input`, control transit traffic in `forward`, close WAN, and leave management only to trusted networks.

## Where this fits in the overall architecture

Before this, we created VLANs and L3 services. Now we define who can talk to the router and who can move between networks.

The next article is about NAT, port forwarding, and hairpin NAT. Those topics should not be handled before the baseline firewall is understood.

## Input and forward

`input` is traffic to the router itself: WinBox, SSH, DNS cache, DHCP, ICMP, WireGuard endpoint.

`forward` is traffic through the router: LAN to internet, Guest to internet, LAN to Server, IoT to cloud.

The mistake "I allowed it in forward, but SSH to the router does not work" usually means this boundary was not understood.

## Before applying anything

Firewall can easily cut off management. Before changes:

```routeros
/system backup save name=before-firewall-hardening
/export file=before-firewall-hardening
/system console safe-mode
```

Work locally or through a trusted management segment. Check interface lists:

```routeros
/interface list print
/interface list member print
/ip firewall filter print
```

Do not apply final drop rules before allow rules for the current management path.

## Baseline input policy

Adaptable structure:

```routeros
/ip firewall filter
add chain=input action=accept connection-state=established,related,untracked comment="input: accept established related"
add chain=input action=drop connection-state=invalid comment="input: drop invalid"
add chain=input action=accept protocol=icmp comment="input: accept ICMP"
add chain=input action=accept in-interface-list=MGMT comment="input: allow management VLAN"
add chain=input action=accept in-interface=<wireguard-interface> comment="input: allow WireGuard management"
add chain=input action=accept in-interface-list=LAN protocol=udp dst-port=53 comment="input: allow DNS from LAN"
add chain=input action=accept in-interface-list=LAN protocol=tcp dst-port=53 comment="input: allow DNS TCP from LAN"
add chain=input action=accept protocol=udp dst-port=67 in-interface-list=LAN comment="input: allow DHCP requests"
add chain=input action=drop in-interface-list=WAN log=yes log-prefix="drop-input-wan" comment="input: drop WAN to router"
add chain=input action=drop log=yes log-prefix="drop-input" comment="input: drop rest"
```

This is not universal copy-paste. Adapt interface lists, WireGuard interface, and DNS/DHCP allowances to your design.

## Baseline forward policy

```routeros
/ip firewall filter
add chain=forward action=accept connection-state=established,related,untracked comment="forward: accept established related"
add chain=forward action=drop connection-state=invalid comment="forward: drop invalid"
add chain=forward action=accept in-interface-list=LAN out-interface-list=WAN comment="forward: LAN to Internet"
add chain=forward action=accept in-interface-list=GUEST out-interface-list=WAN comment="forward: Guest to Internet"
add chain=forward action=accept in-interface-list=IOT out-interface-list=WAN comment="forward: IoT to Internet"
add chain=forward action=accept in-interface-list=LAN out-interface-list=IOT comment="forward: LAN to IoT if needed"
add chain=forward action=drop in-interface-list=GUEST out-interface-list=!WAN log=yes log-prefix="drop-guest" comment="forward: block Guest to internal"
add chain=forward action=drop in-interface-list=IOT out-interface-list=!WAN log=yes log-prefix="drop-iot" comment="forward: block IoT to internal"
add chain=forward action=drop log=yes log-prefix="drop-forward" comment="forward: drop rest"
```

The `LAN -> IOT` rule in this example is too broad for a strict network. In production, allow specific services instead: for example, control of a specific lamp, Home Assistant, a printer, or a media device.

## Rule order

Order is critical. First established/related, then invalid drop, then specific allow rules, then deny/drop. If a final drop is placed too early, later allow rules will never match.

For future port forwarding, allow rules using `connection-nat-state=dstnat` must be placed before the final `drop` in forward.

## ICMP and ICMPv6

Do not break ICMP blindly. For IPv4 it is useful for diagnostics. For IPv6, ICMPv6 is part of normal protocol operation, and the IPv6 firewall must be designed separately instead of copying IPv4 rules.

## Logging

Drop-rule logs are useful, but they can spam the router. Use clear prefixes and rate limits where possible. Do not log every noisy WAN packet unless you have a reason.

## How to verify the result

Checks:

- WinBox/SSH/WebFig/DNS are not reachable from WAN;
- router management is reachable from the Management VLAN;
- Guest has internet but no access to LAN/MGMT;
- IoT cannot initiate access to LAN/MGMT;
- LAN has the required access to Server/IoT;
- DNS and DHCP work;
- drop logs are readable and do not overwhelm the device.

Commands:

```routeros
/ip firewall filter print stats
/log print
/tool torch interface=<interface-name>
```

## Common mistakes

Confusing `input` and `forward`.

Leaving management reachable from WAN.

Creating a broad allow between all VLANs.

Breaking DHCP/DNS because input to the router is not allowed.

Putting drop before allow and losing access.

## Security notes

Default-deny at the end of chains is a normal model. It is safe only if the required services are explicitly allowed before it.

Do not expose management to the internet. Use WireGuard with limited rules for remote access.

## Short takeaway

Firewall hardening separates two tasks: input protects the router, forward controls transit. First allow what is needed, then deny the rest. VLANs without this policy do not provide complete security.

The next article is about NAT, port forwarding, and hairpin NAT: how to expose services with minimal risk.
