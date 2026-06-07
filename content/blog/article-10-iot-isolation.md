---
title: "IoT isolation: a separate segment for smart devices without breaking smart home"
date: 2026-03-20
summary: "Isolating IoT in a separate VLAN with DHCP/DNS, firewall policy, address-lists, and controlled access from trusted segments."
tags: ["mikrotik","routeros","iot","vlan","security"]
topics: ["networking"]
toc: true
---

# IoT isolation: a separate segment for smart devices without breaking smart home

IoT devices are convenient, but they should not be trusted like a work laptop. Cameras, bulbs, plugs, TVs, and appliances are often updated rarely, actively talk to cloud services, and may have a weak security model.

The goal of IoT isolation is to separate these devices from LAN and Management without breaking required smart-home scenarios.

## Where this fits in the overall architecture

Guest VLAN already gave us an "internet only" model. IoT is similar to Guest because it should not initiate access to LAN/Management, but it differs because LAN sometimes needs to access IoT: Home Assistant, printers, media devices, local APIs.

That is why IoT policy is usually not as simple as Guest policy.

## Baseline policy

| Flow | Decision |
| --- | --- |
| IoT -> Internet | allow or limited |
| IoT -> DNS/DHCP | allow to approved services |
| IoT -> LAN | deny by default |
| IoT -> Management | deny |
| LAN -> IoT | allow only required services |
| Home Assistant -> IoT | allow by list |
| IoT -> Server | deny except explicit exceptions |

The main principle: IoT does not initiate access to trusted segments.

## Before applying anything

Before changing VLAN/firewall/Wi-Fi:

```routeros
/system backup save name=before-iot-isolation
/export file=before-iot-isolation
/system console safe-mode
```

First inventory devices: IP/MAC, purpose, cloud/local mode, required ports, and whether multicast/mDNS is needed.

## IoT VLAN and DHCP

Example:

```routeros
/interface vlan
add name=vlan40-iot interface=br-core vlan-id=40

/ip address
add address=10.10.40.1/24 interface=vlan40-iot comment="IoT gateway"

/ip pool
add name=pool-iot ranges=10.10.40.100-10.10.40.199

/ip dhcp-server
add name=dhcp-iot interface=vlan40-iot address-pool=pool-iot lease-time=1d disabled=no

/ip dhcp-server network
add address=10.10.40.0/24 gateway=10.10.40.1 dns-server=10.10.40.1
```

Static leases are useful for important IoT devices: firewall rules are easier to write against address-lists or stable IPs.

## Wi-Fi for IoT

The IoT SSID should map to the IoT VLAN:

```text
SSID: Home-IoT
VLAN ID: 40
Security: WPA2/WPA3 according to device compatibility
Client isolation: enable if devices should not talk to each other
```

Some old devices work poorly with WPA3, band steering, or modern roaming features. That is not a reason to put them in LAN; make a separate IoT SSID with compatible settings and a strict firewall policy.

## Firewall

Input:

```routeros
/ip firewall filter
add chain=input action=accept in-interface-list=IOT protocol=udp dst-port=53 comment="iot: allow DNS UDP"
add chain=input action=accept in-interface-list=IOT protocol=tcp dst-port=53 comment="iot: allow DNS TCP"
add chain=input action=accept in-interface-list=IOT protocol=udp dst-port=67 comment="iot: allow DHCP"
add chain=input action=drop in-interface-list=IOT comment="iot: block router management"
```

Forward:

```routeros
/ip firewall filter
add chain=forward action=accept in-interface-list=IOT out-interface-list=WAN comment="iot: allow internet"
add chain=forward action=accept src-address=<home-assistant-ip> dst-address-list=iot-devices comment="lan: allow HA to IoT"
add chain=forward action=drop in-interface-list=IOT out-interface-list=!WAN log=yes log-prefix="drop-iot" comment="iot: block internal"
```

The Home Assistant rule is an example. It is better to explicitly list devices and services than to allow all LAN -> IoT without need.

## Address-lists

Address-lists help maintain policy:

```routeros
/ip firewall address-list
add list=iot-devices address=<iot-device-ip> comment="living room TV"
add list=iot-controllers address=<home-assistant-ip> comment="Home Assistant"
```

After that, the firewall can be read as policy instead of a set of random IP addresses.

## mDNS and discovery

Many smart-home scenarios depend on mDNS/SSDP/broadcast discovery. This does not work automatically between VLANs. Do not try to solve it with a broad allow between LAN and IoT.

There will be a separate article about mDNS and service discovery. Here the important point is: routed access and multicast discovery are different tasks.

## How to verify the result

Checks:

- an IoT device receives an IP from the IoT subnet;
- internet works if allowed;
- IoT cannot open LAN/MGMT addresses;
- LAN or Home Assistant sees only allowed IoT services;
- DNS/DHCP work;
- logs show blocked IoT -> internal attempts.

Commands:

```routeros
/ip dhcp-server lease print where server=dhcp-iot
/ip firewall address-list print
/ip firewall filter print stats
/log print
```

## Common mistakes

Creating an IoT VLAN but allowing IoT -> LAN fully.

Putting Home Assistant into IoT and losing control over the trust boundary.

Assuming mDNS will work between VLANs by itself.

Allowing IoT to management because "it is easier to configure".

## Security notes

The IoT segment should be untrusted. If a device requires full LAN access for basic operation, reconsider the device or scenario.

A separate VLAN does not protect anything if the firewall allows everything. A separate firewall rule does not help if all devices remain in one LAN.

## Short takeaway

IoT isolation is a compromise between security and functionality. IoT should not initiate access to LAN/Management, while trusted segments receive only the required exceptions.

The next article is about mDNS and service discovery between VLANs.
