---
title: "QoS and traffic shaping: queues, CAKE/FQ-CoDel, and congestion control"
date: 2026-03-28
summary: "QoS and traffic shaping on MikroTik: bottleneck shaping, queues, CAKE/FQ-CoDel, FastTrack, and latency testing."
tags: ["mikrotik","routeros","qos","traffic-shaping"]
topics: ["networking"]
toc: true
---

# QoS and traffic shaping: queues, CAKE/FQ-CoDel, and congestion control

QoS is not for "making the internet faster"; it is for controlling congestion. When an uplink is saturated, latency rises and calls, VPN, games, and interactive work suffer. Traffic shaping helps keep the queue under control.

MikroTik RouterOS 7 has several queue mechanisms. The right choice depends on version, model, FastTrack, traffic type, and goal.

## Where this fits in the overall architecture

FastTrack already showed that some traffic can bypass queues. That means QoS must be designed together with FastTrack: either disable FastTrack for shaped traffic or create exceptions.

QoS is usually applied at the WAN bottleneck, not "a little everywhere".

## Basic concepts

Shaping means limiting speed slightly below the real bottleneck so the queue forms on your router, not at the provider.

FQ-CoDel/CAKE are algorithms that help reduce bufferbloat and fairly distribute the queue between flows. Availability and behavior depend on RouterOS version.

Simple queues are easier; queue tree is more flexible but requires more understanding.

## Before applying anything

Before QoS:

```routeros
/system backup save name=before-qos
/export file=before-qos
```

Measure real speeds without shaping:

- download/upload in a quiet period;
- idle latency;
- latency under load;
- router CPU under load.

Check FastTrack:

```routeros
/ip firewall filter print
/queue simple print
/queue tree print
/tool profile
```

## Simple strategy

For a home/homelab network, it is often enough to:

- determine real upload/download speed;
- set shaping to 90-95% of stable speed;
- disable FastTrack or exclude traffic that must go through queues;
- test latency under load;
- avoid complex priorities without measurements.

## Example simple queue

Approximate template:

```routeros
/queue simple
add name=wan-shaping target=<lan-subnet> max-limit=<upload-rate>/<download-rate> comment="shape WAN bottleneck"
```

Check syntax and rate direction for your design. For complex VLANs and multiple WAN links, a simple queue may not be enough.

## CAKE/FQ-CoDel

If the RouterOS version and device support the required queue types, you can use modern algorithms against bufferbloat. But you cannot promise identical behavior on every model.

Check available types:

```routeros
/queue type print
```

If CAKE/FQ-CoDel is unavailable or the CPU is weak, choose a simpler approach.

## Priorities

Priorities are useful when real traffic classes exist:

- VoIP/video calls;
- VPN;
- interactive SSH/RDP;
- bulk downloads;
- backups.

Do not put "everything important" into high priority. If everything is important, there are no priorities.

## How to verify the result

Checks:

- idle latency;
- latency during download;
- latency during upload;
- speed did not drop too much;
- CPU does not stay at 100%;
- queue counters grow;
- VPN/calls are more stable;
- FastTrack does not bypass shaping.

Commands:

```routeros
/queue simple print stats
/queue tree print stats
/tool profile
/interface monitor-traffic <wan-interface>
```

## Common mistakes

Setting max-limit above the real uplink speed.

Leaving FastTrack enabled and wondering why queues do not work.

Building complex classification without measurements.

Shaping LAN instead of the real bottleneck.

Ignoring CPU and treating QoS as free.

## Security notes

QoS is not a security control, but it affects availability. Without shaping, one backup or torrent can degrade VPN, monitoring, and remote work.

You can prioritize management/VPN traffic, but it must be tested, not added by guesswork.

## Short takeaway

QoS is queue control and latency under load. Start with measurements, shape the bottleneck, account for FastTrack, and do not complicate classification without a reason.

The next article is about Dual WAN and failover.
