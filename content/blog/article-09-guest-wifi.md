---
title: "Guest Wi-Fi through a separate VLAN: internet access without LAN access"
date: 2026-03-19
summary: "Guest Wi-Fi as a separate VLAN: SSID, DHCP/DNS, firewall internet-only policy, and blocking LAN access."
tags: ["mikrotik","routeros","wifi","guest-vlan"]
topics: ["networking"]
toc: true
---

# Guest Wi-Fi through a separate VLAN: internet access without LAN access

A guest network should provide internet access, not access to your laptops, NAS, printers, and management interfaces. A separate SSID without a separate VLAN and firewall is often just cosmetic.

In this article we build Guest Wi-Fi as a separate segment: SSID -> Guest VLAN -> DHCP/DNS -> internet only -> no access to internal networks.

## Where this fits in the overall architecture

We already described VLANs, DHCP/DNS, firewall, and NAT. Guest Wi-Fi uses all of these layers:

- AP/CAP sends clients into the Guest VLAN;
- MikroTik provides addresses through DHCP;
- DNS is available only as an allowed service;
- firewall blocks access to LAN/MGMT/Server;
- NAT lets guests reach the internet.

## What Guest VLAN must support

Minimal policy:

| Action | Decision |
| --- | --- |
| Get DHCP | allow |
| Use DNS | allow to the approved resolver |
| Access internet | allow |
| Access LAN | deny |
| Access Management | deny |
| Access Server/NAS | deny by default |
| See other guest clients | preferably deny with Wi-Fi client isolation |

## Before applying anything

Before changing Wi-Fi/VLAN/firewall:

```routeros
/system backup save name=before-guest-wifi
/export file=before-guest-wifi
/system console safe-mode
```

Check the RouterOS package and AP model. RouterOS 7 has differences between legacy wireless and the newer WiFi stack, so specific CAPsMAN/Wi-Fi commands must be verified on the device or on CHR/test AP.

## VLAN and DHCP

Guest VLAN should already exist:

```routeros
/interface vlan
add name=vlan30-guest interface=br-core vlan-id=30

/ip address
add address=10.10.30.1/24 interface=vlan30-guest comment="Guest gateway"

/ip pool
add name=pool-guest ranges=10.10.30.100-10.10.30.199

/ip dhcp-server
add name=dhcp-guest interface=vlan30-guest address-pool=pool-guest lease-time=8h disabled=no

/ip dhcp-server network
add address=10.10.30.0/24 gateway=10.10.30.1 dns-server=10.10.30.1
```

This is an example addressing plan. Use your own networks and names.

## SSID -> VLAN

On the AP or CAPsMAN, Guest SSID must land in VLAN 30. The exact syntax depends on the WiFi package and model, so the logic matters here:

```text
SSID: Home-Guest
VLAN mode: use tag
VLAN ID: 30
Client isolation: enabled
Authentication: WPA2/WPA3 personal or captive policy as needed
```

The access point must be connected through a trunk port where Guest VLAN is allowed tagged.

## Firewall for Guest

Input to the router:

```routeros
/ip firewall filter
add chain=input action=accept in-interface-list=GUEST protocol=udp dst-port=53 comment="guest: allow DNS UDP to router"
add chain=input action=accept in-interface-list=GUEST protocol=tcp dst-port=53 comment="guest: allow DNS TCP to router"
add chain=input action=accept in-interface-list=GUEST protocol=udp dst-port=67 comment="guest: allow DHCP"
add chain=input action=drop in-interface-list=GUEST comment="guest: block access to router"
```

Forward:

```routeros
/ip firewall filter
add chain=forward action=accept in-interface-list=GUEST out-interface-list=WAN comment="guest: allow internet"
add chain=forward action=drop in-interface-list=GUEST out-interface-list=!WAN log=yes log-prefix="drop-guest" comment="guest: block internal networks"
```

Order must account for established/related at the beginning of chains and the final drop at the end.

## DNS enforcement

If guests may use only DNS through MikroTik or a filtering resolver, you can block direct DNS outward and redirect/allow according to policy. But DoH over 443 cannot be fully solved this way. DNS policy is a separate topic.

## How to verify the result

From a guest client:

- connect to the Guest SSID;
- receive an IP from the Guest subnet;
- check gateway and DNS;
- open the internet;
- try opening the router management IP; it should be blocked;
- try opening a LAN/NAS IP; it should be blocked;
- check whether other guest clients are visible.

On MikroTik:

```routeros
/ip dhcp-server lease print where server=dhcp-guest
/ip firewall filter print stats
/log print
```

## Common mistakes

Creating a Guest SSID but leaving it in the LAN VLAN.

Allowing Guest to DNS but accidentally opening all input to the router.

Forgetting Wi-Fi client isolation.

Allowing Guest to Server/NAS "temporarily" and leaving it forever.

Not checking the trunk to the AP: the SSID exists, but the VLAN does not pass.

## Security notes

Treat the guest network as untrusted. Even if guests are friends, their devices may be compromised, misconfigured, or simply should not see your infrastructure.

Do not use the Guest VLAN for IoT. IoT has different requirements: sometimes LAN needs access to devices, service discovery, and Home Assistant integration.

## Short takeaway

Guest Wi-Fi is a separate SSID, a separate VLAN, its own DHCP/DNS, and an "internet only" firewall policy. Without VLANs and forward restrictions, a guest network does not solve the security problem.

The next article is about IoT isolation: separating smart devices without breaking smart-home behavior.
