---
title: "CAPsMAN in RouterOS 7: centralized Wi-Fi, SSID, and VLAN per SSID"
date: 2026-03-22
summary: "Centralized Wi-Fi through CAPsMAN in RouterOS 7: SSID, security profiles, VLAN per SSID, and management VLAN for APs."
tags: ["mikrotik","routeros","capsman","wifi","vlan"]
topics: ["networking"]
toc: true
---

# CAPsMAN in RouterOS 7: centralized Wi-Fi, SSID, and VLAN per SSID

When a network has more than one access point, manually configuring each AP quickly becomes inconvenient. CAPsMAN helps centralize Wi-Fi: SSIDs, security profiles, VLAN per SSID, provisioning, and some operational parameters.

In RouterOS 7, it is important to understand the differences between legacy wireless and the newer WiFi stack. Commands and capabilities depend on the model, installed package, and device generation.

## Where this fits in the overall architecture

We already have a VLAN design: LAN, Guest, IoT, Management. Wi-Fi should become the access layer that connects clients to the correct VLANs:

- Main SSID -> LAN VLAN;
- Guest SSID -> Guest VLAN;
- IoT SSID -> IoT VLAN;
- AP management -> Management VLAN.

## CAPsMAN does not replace VLAN/firewall

CAPsMAN manages Wi-Fi configuration, but it does not solve every security task. Even if an SSID sends a client into the Guest VLAN, the firewall on the core router must block Guest access to LAN/Management.

Wi-Fi segmentation must match the wired VLAN design.

## Before applying anything

Before configuring CAPsMAN:

```routeros
/system backup save name=before-capsman
/export file=before-capsman
```

Check:

```routeros
/system package print
/interface print
```

Clarify whether legacy wireless or the newer WiFi package is used. Do not mix instructions for different stacks without checking.

## Management VLAN for APs

Access points should be managed from the Management VLAN. That means:

- the trunk to the AP carries client VLANs tagged;
- the AP has a management IP in the Management VLAN;
- CAPsMAN is reachable only from a trusted network;
- Guest/IoT clients do not see AP management interfaces.

If the AP receives management through an untagged/native VLAN, document it explicitly in the port table and do not leave it accidental.

## SSID matrix

| SSID | VLAN | Purpose | Client isolation |
| --- | --- | --- | --- |
| `Home-Main` | 20 | Trusted devices | Usually no |
| `Home-Guest` | 30 | Guests | Yes |
| `Home-IoT` | 40 | IoT devices | Often yes |

Each SSID has a security profile and VLAN behavior. Specific commands depend on the WiFi package.

## Channel planning

Centralization does not remove radio planning:

- do not put every AP on the same channel;
- account for 2.4 GHz congestion;
- do not raise transmit power without need;
- test roaming;
- do not enable overly wide channel width in noisy environments;
- test IoT devices for compatibility separately.

Bad radio design cannot be fixed by VLANs.

## Provisioning logic

CAPsMAN provisioning should be predictable: which APs receive which SSIDs, which radios are used, and which VLANs are applied.

Document:

```text
AP: ap-living-room
Management VLAN: 10
SSIDs: Home-Main, Home-Guest, Home-IoT
Uplink: trunk
Allowed VLANs: 10,20,30,40
```

## Firewall around CAPsMAN

CAPsMAN/control traffic should be reachable only between CAP and controller. Do not open AP management from Guest/IoT.

Check input rules on the core router if CAPsMAN runs there, and forward rules if the controller is in another segment.

## How to verify the result

Checks:

- AP receives a management IP in the correct VLAN;
- CAP is visible to the controller;
- each SSID gives an address from the correct subnet;
- Guest cannot see LAN/MGMT;
- IoT cannot initiate access to LAN/MGMT;
- roaming and coverage are acceptable;
- logs do not show constant disconnect/provisioning loops.

Commands depend on the WiFi stack, but general diagnostics:

```routeros
/interface print
/ip dhcp-server lease print
/log print
```

## Common mistakes

Mixing legacy wireless and WiFi package instructions.

Giving the AP a management IP in a client VLAN.

Configuring the SSID but forgetting the VLAN tag on the trunk.

Enabling Guest SSID without firewall isolation.

Trying to fix poor coverage by raising power on every AP.

## Security notes

Wi-Fi is the access layer for untrusted radio clients. Even the Main SSID should not give management access to every device by default.

A WPA password does not replace segmentation. A leaked guest password should not become access to LAN.

## Short takeaway

CAPsMAN is useful for centralized Wi-Fi, but it must run on top of a predesigned VLAN/security model. The essentials are SSID per VLAN, Management VLAN for APs, and firewall on the core router.

The next article is about IPv6 on MikroTik: prefix delegation, RA/SLAAC, and a separate firewall.
