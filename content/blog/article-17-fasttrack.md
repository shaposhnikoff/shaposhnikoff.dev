---
title: "FastTrack on MikroTik: acceleration, exceptions, and side effects"
date: 2026-03-27
summary: "How to use FastTrack on MikroTik without breaking QoS, mangle, policy routing, and observability."
tags: ["mikrotik","routeros","fasttrack","performance"]
topics: ["networking"]
toc: true
---

# FastTrack on MikroTik: acceleration, exceptions, and side effects

FastTrack accelerates processing for some IPv4 traffic in RouterOS by bypassing certain later packet processing stages. It is useful for performance, but it can conflict with QoS, accounting, queues, policy routing, and some firewall scenarios.

Do not enable FastTrack as "speed everything up" without understanding the consequences.

## Where this fits in the overall architecture

We already have firewall and NAT. FastTrack is usually added after the baseline security policy, when it is clear which flows can be accelerated and which must remain visible to queues, monitoring, or special routing.

## What FastTrack does

A typical rule accelerates established/related IPv4 connections:

```routeros
/ip firewall filter
add chain=forward action=fasttrack-connection connection-state=established,related hw-offload=yes comment="fasttrack established related"
add chain=forward action=accept connection-state=established,related comment="accept established related"
```

Order matters: `fasttrack-connection` usually comes before accepting established/related.

## Before applying anything

Before changing firewall/FastTrack:

```routeros
/system backup save name=before-fasttrack
/export file=before-fasttrack
```

Check current rules, queues, mangle, and policy routing:

```routeros
/ip firewall filter print
/ip firewall mangle print
/queue simple print
/queue tree print
/ip route print
```

If QoS or policy routing exists, enable FastTrack especially carefully.

## What should not be fasttracked blindly

Exclude:

- traffic that must hit queues/QoS;
- policy-routed traffic;
- VPN traffic if routing/accounting nuances exist;
- inter-VLAN traffic that needs detailed logging;
- connections that require mangle/accounting.

FastTrack is useful for ordinary LAN -> WAN established traffic, but not for every flow.

## Exceptions through connection marks

One approach is to mark traffic that must not be fasttracked and apply FastTrack only to the rest:

```routeros
/ip firewall filter
add chain=forward action=fasttrack-connection connection-state=established,related connection-mark=no-mark comment="fasttrack only unmarked"
add chain=forward action=accept connection-state=established,related comment="accept established related"
```

Marking is done in mangle according to your logic. This requires testing because mistakes in marks can break QoS/policy routing.

## FastTrack and QoS

If you configure traffic shaping, FastTrack can bypass queues. That is why FastTrack is often disabled before QoS, or traffic that must be shaped is excluded.

If the ISP uplink is congested, "acceleration" without shaping can even worsen latency under load.

## FastTrack and IPv6

This article is about typical IPv4 FastTrack. IPv6 acceleration and hardware offload depend on RouterOS, the model, and the specific configuration. Do not transfer IPv4 logic blindly.

## How to verify the result

Checks:

```routeros
/ip firewall filter print stats
/tool profile
/interface monitor-traffic <interface-name>
```

Compare:

- CPU under load before/after;
- whether QoS still works;
- whether VPN/policy routing still works;
- firewall counters grow as expected;
- inter-VLAN restrictions remain in place.

## Common mistakes

FastTrack is enabled and then "QoS does not work".

FastTrack accelerates traffic that should go through mangle/policy routing.

The rule is placed before security checks and hides diagnostics.

Expecting FastTrack to fix weak hardware in every scenario.

## Security notes

FastTrack must not bypass security intent. First firewall policy, then optimization. If you cannot explain which flows are accelerated, it is too early to enable FastTrack.

Logs and counters may become less obvious. Document exceptions.

## Short takeaway

FastTrack is useful when you need to reduce CPU on ordinary established traffic. But it conflicts with QoS, mangle, policy routing, and some observability. Enable it selectively and verify the consequences.

The next article is about QoS and traffic shaping.
