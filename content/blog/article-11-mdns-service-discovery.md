---
title: "mDNS and service discovery between VLANs: Chromecast, AirPlay, printers, and smart home"
date: 2026-03-21
summary: "How to design mDNS and service discovery between VLANs without undoing IoT, Guest, and LAN isolation."
tags: ["mikrotik","routeros","mdns","service-discovery","vlan"]
topics: ["networking"]
toc: true
---

# mDNS and service discovery between VLANs: Chromecast, AirPlay, printers, and smart home

After splitting the network into VLANs, some convenient features may stop working: a phone does not see Chromecast, a laptop cannot find a printer, Home Assistant does not discover a device. That does not mean the VLANs are configured incorrectly. The cause is often service discovery.

mDNS and similar mechanisms are designed for a local broadcast/multicast domain. They do not cross VLANs automatically.

## Where this fits in the overall architecture

IoT isolation blocked IoT from initiating access to LAN. But LAN sometimes needs to find and use IoT devices. Discovery must be handled carefully without destroying segmentation.

This article is about the discovery plane, not broad allow between VLANs.

## Basic concepts

mDNS uses multicast `224.0.0.251:5353` for IPv4 and `ff02::fb` for IPv6. It is normally not routed between VLANs.

SSDP/UPnP uses other multicast/broadcast mechanisms and has its own risks. UPnP for automatic outbound port forwarding is undesirable by default.

Discovery is not the same as service access. A device can be discovered, but the firewall must still allow only the required connections.

## Before applying anything

Before changing multicast/discovery/firewall:

```routeros
/system backup save name=before-mdns-discovery
/export file=before-mdns-discovery
```

First make a list:

- which devices need to be discovered;
- from which VLAN they must be visible;
- which protocols are needed: mDNS, SSDP, vendor-specific;
- which real TCP/UDP ports are needed after discovery.

## Approaches to mDNS between VLANs

Practical options:

| Approach | When it fits | Risks |
| --- | --- | --- |
| mDNS reflector/repeater | Discovery must cross between LAN and IoT | May expose extra services |
| Home Assistant as the center | Smart home is controlled through one controller | Requires explicit firewall rules |
| Split by design | Devices that need LAN discovery live in LAN | Less isolation |
| Do not forward discovery | IoT is cloud-only or manually addressed | Less convenience |

RouterOS itself is not a universal mDNS gateway for every scenario. A separate reflector on Linux/Home Assistant/Avahi or a specific controller feature is often used.

## Firewall for discovery and access

Do not do this:

```text
allow LAN -> IoT any
allow IoT -> LAN any
```

Split the problem instead:

- discovery only between required VLANs;
- access only from specific controllers/clients to specific devices;
- IoT -> LAN remains deny by default.

Example policy:

```text
LAN phones -> Chromecast: allow required ports
Home Assistant -> IoT devices: allow required API ports
IoT -> LAN: deny by default
IoT -> DNS/NTP/Internet: allow as needed
```

## Chromecast, AirPlay, printers

Chromecast and AirPlay may require not only mDNS, but also additional TCP/UDP connections. Printers may use mDNS, IPP, LPR, RAW printing, or vendor tools.

Do not try to guess every port. First check device documentation, then look at firewall logs and packet captures.

Useful RouterOS tools:

```routeros
/tool torch interface=<interface-name>
/tool sniffer quick interface=<interface-name>
/log print
```

## IPv6 nuance

If IPv6 is enabled, discovery may also happen over IPv6. You cannot configure only the IPv4 firewall and assume segmentation is complete. IPv6 firewall is a separate topic, but keep it in mind when troubleshooting discovery.

## How to verify the result

Check by layers:

1. Devices are in the correct VLANs.
2. IP connectivity is allowed only where needed.
3. Discovery requests reach the reflector/controller.
4. The client sees the service.
5. After discovery, the service actually opens.
6. IoT does not get extra access to LAN.

Commands:

```routeros
/ip firewall filter print stats
/tool torch interface=<iot-or-lan-interface>
/log print
```

## Common mistakes

Allowing all traffic between LAN and IoT for Chromecast.

Confusing discovery and data plane.

Forgetting IPv6 and getting a bypass around IPv4 policy.

Enabling UPnP and accidentally letting devices open ports outward.

Not documenting exceptions, turning the firewall into a set of temporary rules.

## Security notes

Discovery reveals information about services. The more VLANs see mDNS responses, the more devices become discoverable.

Forward only what is needed. If Home Assistant can control a device directly, not every LAN client needs discovery for the whole IoT segment.

## Short takeaway

mDNS between VLANs is a separate task, not a reason to cancel isolation. Design discovery precisely: who needs to see whom, which service is needed, and which firewall rules support it.

The next article is about CAPsMAN in RouterOS 7: centralized Wi-Fi, SSID, and VLAN per SSID.
