---
title: "DHCP, DNS, and basic routing for multiple VLANs"
date: 2026-03-16
summary: "The L3 foundation for VLANs in RouterOS 7: gateway addresses, DHCP pools, DNS cache, routes, and interface lists."
tags: ["mikrotik","routeros","dhcp","dns","routing"]
topics: ["networking"]
toc: true
---

# DHCP, DNS, and basic routing for multiple VLANs

After VLAN filtering, every segment needs an L3 foundation: gateway, DHCP, DNS, and routing. At this stage the network becomes convenient for clients, but it still needs a careful security policy.

MikroTik RouterOS 7 works well for basic DHCP/DNS in a small network if you do not turn the DNS cache into an open resolver and do not forget the firewall.

## Where this fits in the overall architecture

Bridge VLAN filtering delivered VLANs to the router CPU. Now IP addresses, pools, DHCP servers, and DNS settings are created for each VLAN.

Firewall hardening comes in the next article. Here we prepare services that the firewall must later allow only for the right segments.

## L3 interfaces and gateway

Each VLAN interface gets a gateway address:

```routeros
/ip address
add address=10.10.10.1/24 interface=vlan10-mgmt comment="MGMT gateway"
add address=10.10.20.1/24 interface=vlan20-lan comment="LAN gateway"
add address=10.10.30.1/24 interface=vlan30-guest comment="Guest gateway"
add address=10.10.40.1/24 interface=vlan40-iot comment="IoT gateway"
```

The addresses are examples. Use your addressing plan and avoid conflicts with VPN/site-to-site networks.

## Before applying anything

Before changing L3 and DHCP:

```routeros
/system backup save name=before-dhcp-dns-routing
/export file=before-dhcp-dns-routing
/system console safe-mode
```

Check that VLAN interfaces exist and are active:

```routeros
/interface vlan print
/ip address print
```

## DHCP pools

Create a separate pool for each client VLAN:

```routeros
/ip pool
add name=pool-mgmt ranges=10.10.10.100-10.10.10.199
add name=pool-lan ranges=10.10.20.100-10.10.20.199
add name=pool-guest ranges=10.10.30.100-10.10.30.199
add name=pool-iot ranges=10.10.40.100-10.10.40.199
```

Do not give the whole `/24` to DHCP. Leave room for static addresses, infrastructure, and reserves.

## DHCP servers

```routeros
/ip dhcp-server
add name=dhcp-mgmt interface=vlan10-mgmt address-pool=pool-mgmt lease-time=1d disabled=no
add name=dhcp-lan interface=vlan20-lan address-pool=pool-lan lease-time=1d disabled=no
add name=dhcp-guest interface=vlan30-guest address-pool=pool-guest lease-time=8h disabled=no
add name=dhcp-iot interface=vlan40-iot address-pool=pool-iot lease-time=1d disabled=no
```

For the management VLAN, DHCP is sometimes limited or replaced with static leases. That depends on policy.

## DHCP network options

```routeros
/ip dhcp-server network
add address=10.10.10.0/24 gateway=10.10.10.1 dns-server=10.10.10.1
add address=10.10.20.0/24 gateway=10.10.20.1 dns-server=10.10.20.1
add address=10.10.30.0/24 gateway=10.10.30.1 dns-server=10.10.30.1
add address=10.10.40.0/24 gateway=10.10.40.1 dns-server=10.10.40.1
```

If DNS filtering runs on a separate AdGuard Home/Pi-hole, you can specify that address as DNS server. The important part is not to forget firewall and DNS enforcement if policy requires them.

## DNS cache on MikroTik

Basic setup:

```routeros
/ip dns
set servers=1.1.1.1,8.8.8.8 allow-remote-requests=yes
```

`allow-remote-requests=yes` means clients can use MikroTik as a DNS resolver. This is convenient, but DNS must not be reachable from WAN. Firewall rules will enforce that.

## Default route

Check the internet route:

```routeros
/ip route print
/ping 8.8.8.8
/ping google.com
```

If WAN receives the route via DHCP/PPPoE, it may appear automatically. If WAN is static, add the default route explicitly using provider data.

## Interface lists

Add VLAN interfaces to lists for the future firewall:

```routeros
/interface list member
add list=MGMT interface=vlan10-mgmt
add list=LAN interface=vlan20-lan
add list=GUEST interface=vlan30-guest
add list=IOT interface=vlan40-iot
```

If the lists do not exist yet, create them first. This makes rules easier to understand.

## How to verify the result

On MikroTik:

```routeros
/ip dhcp-server print
/ip dhcp-server network print
/ip pool print
/ip dhcp-server lease print
/ip dns print
/ip route print
```

On clients:

- the client receives an address from the correct subnet;
- gateway matches the VLAN;
- DNS responds;
- ping to gateway works;
- internet works where allowed;
- a Guest client must not receive a LAN address.

## Common mistakes

Creating a DHCP server on the wrong interface. Clients either receive no address or receive one from the wrong VLAN.

Forgetting `dhcp-server network`: addresses are handed out, but gateway/DNS are wrong.

Enabling DNS cache and exposing it from WAN.

Not leaving addresses for static infrastructure devices.

## Security notes

DHCP and DNS are infrastructure services. Guest and IoT should access them only in their own VLAN or through an explicitly allowed resolver. This is not a reason to give Guest access to the management segment.

DNS policy is a separate topic. Here the key point is to avoid making MikroTik an open DNS resolver on the internet.

## Short takeaway

Each VLAN gets a gateway, DHCP pool, DHCP server, and DNS logic. After that, the network becomes usable for clients, but security between segments appears only after firewall hardening.

The next article is about firewall: input, forward, WAN drop, and management access.
