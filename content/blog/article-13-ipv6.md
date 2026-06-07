---
title: "IPv6 on MikroTik: prefix delegation, RA/SLAAC, and a separate firewall"
date: 2026-03-23
summary: "Enabling IPv6 on MikroTik deliberately: prefix delegation, RA/SLAAC, DNS, and a separate firewall for VLANs."
tags: ["mikrotik","routeros","ipv6","firewall"]
topics: ["networking"]
toc: true
---

# IPv6 on MikroTik: prefix delegation, RA/SLAAC, and a separate firewall

IPv6 is not "IPv4 with longer addresses". It has a different addressing, discovery, autoconfiguration, and security model. The familiar NAT from IPv4 is not the main protection boundary.

If you enable IPv6 without a firewall, internal devices can receive global addresses and become more reachable than you expect.

## Where this fits in the overall architecture

Until now the network worked on IPv4: VLANs, DHCP, DNS, firewall, and NAT. IPv6 adds a separate stack that should repeat the security intent, but not mechanically copy IPv4 rules.

You need prefix delegation from the ISP, IPv6 addresses on VLANs, RA/SLAAC or DHCPv6, DNS, and a separate IPv6 firewall.

## Basic concepts

Prefix Delegation means the provider gives the router an IPv6 prefix, for example `/56` or `/60`, from which `/64` networks can be assigned to VLANs.

RA/SLAAC means Router Advertisement lets clients configure an IPv6 address and gateway automatically.

DHCPv6 can be used for additional parameters, but it does not always replace SLAAC.

ICMPv6 is critical for normal IPv6 operation. Do not block it blindly.

## Before applying anything

Before enabling IPv6:

```routeros
/system backup save name=before-ipv6
/export file=before-ipv6
/system console safe-mode
```

Check that IPv6 is available/enabled for your RouterOS and clarify provider PD behavior. Do not enable IPv6 on a production network without a firewall.

## Receiving a prefix

The design depends on WAN: DHCPv6-PD, PPPoE, or static prefix. Approximate logic:

```routeros
/ipv6 dhcp-client
add interface=<wan-interface> request=prefix pool-name=isp-ipv6-pool add-default-route=yes
```

Parameters may differ depending on the provider. Check them on the actual line.

## Distributing the prefix across VLANs

Each VLAN usually needs a `/64`:

```routeros
/ipv6 address
add from-pool=isp-ipv6-pool interface=vlan20-lan advertise=yes
add from-pool=isp-ipv6-pool interface=vlan30-guest advertise=yes
add from-pool=isp-ipv6-pool interface=vlan40-iot advertise=yes
```

Enable the Management VLAN more carefully: not every management device needs global IPv6.

## IPv6 firewall

A separate IPv6 firewall is mandatory. Baseline logic:

```routeros
/ipv6 firewall filter
add chain=input action=accept connection-state=established,related,untracked comment="ipv6 input: established related"
add chain=input action=drop connection-state=invalid comment="ipv6 input: drop invalid"
add chain=input action=accept protocol=icmpv6 comment="ipv6 input: allow ICMPv6"
add chain=input action=accept in-interface-list=MGMT comment="ipv6 input: allow management"
add chain=input action=drop in-interface-list=WAN comment="ipv6 input: drop WAN to router"
add chain=input action=drop comment="ipv6 input: drop rest"

add chain=forward action=accept connection-state=established,related,untracked comment="ipv6 forward: established related"
add chain=forward action=drop connection-state=invalid comment="ipv6 forward: drop invalid"
add chain=forward action=accept protocol=icmpv6 comment="ipv6 forward: allow ICMPv6"
add chain=forward action=accept in-interface-list=LAN out-interface-list=WAN comment="ipv6 forward: LAN to Internet"
add chain=forward action=accept in-interface-list=GUEST out-interface-list=WAN comment="ipv6 forward: Guest to Internet"
add chain=forward action=drop in-interface-list=GUEST out-interface-list=!WAN comment="ipv6 forward: block Guest internal"
add chain=forward action=drop comment="ipv6 forward: drop rest"
```

This is a starting structure, not a universal full ruleset. ICMPv6 should be detailed consciously, not blocked entirely.

## DNS and RA

Clients must receive DNS. This can happen through RA options or DHCPv6, depending on client support and RouterOS behavior.

Test on real clients: Windows, macOS, Linux, iOS, and Android can behave differently.

## How to verify the result

On MikroTik:

```routeros
/ipv6 dhcp-client print
/ipv6 address print
/ipv6 route print
/ipv6 firewall filter print stats
/ping 2606:4700:4700::1111
```

On a client:

- it has an IPv6 address from the correct prefix;
- it has a default gateway through RA;
- IPv6 DNS/access works;
- Guest cannot see internal IPv6 addresses;
- WAN does not expose router management.

## Common mistakes

Enabling IPv6 and forgetting the firewall.

Copying IPv4 firewall and breaking ICMPv6.

Expecting NAT66 to be the main security mechanism.

Distributing one prefix without understanding VLAN boundaries.

Not checking that DNS works over IPv6.

## Security notes

IPv6 makes devices globally addressable. That is fine when the firewall is configured. It is dangerous if you relied on NAT as protection.

IPv6 policy must match IPv4 intent: Guest remains guest, IoT remains untrusted, and management is not open from WAN.

## Short takeaway

IPv6 is a separate stack with prefix delegation, RA/SLAAC, DHCPv6 nuances, and mandatory firewall. Enable it deliberately, not as a checkbox.

The next article is about WireGuard on MikroTik: road-warrior, site-to-site, and limited access to VLANs.
