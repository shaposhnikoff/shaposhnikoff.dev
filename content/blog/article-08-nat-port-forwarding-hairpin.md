---
title: "NAT, port forwarding, and hairpin NAT: exposing services with minimal risk"
date: 2026-03-18
summary: "A look at srcnat, dstnat, port forwarding, hairpin NAT, and split DNS on MikroTik with a focus on minimal attack surface."
tags: ["mikrotik","routeros","nat","port-forwarding"]
topics: ["networking"]
toc: true
---

# NAT, port forwarding, and hairpin NAT: exposing services with minimal risk

NAT is often treated as firewall, but they are different things. NAT changes addresses and ports, while firewall decides which traffic is allowed. If you expose a service through port forwarding without a careful firewall, you may create unnecessary attack surface.

In this article we cover srcnat for internet access, dstnat for publishing a service, and hairpin NAT for accessing an internal service through its external name from LAN.

## Where this fits in the overall architecture

The firewall should already have a baseline model: input protects the router, forward controls transit, and WAN has no access to management.

Now we add exceptions for published services. Every exception should be minimal: a specific port, protocol, internal IP, and clear reason.

## Srcnat masquerade

Normal IPv4 LAN access to the internet uses masquerade:

```routeros
/ip firewall nat
add chain=srcnat out-interface-list=WAN action=masquerade comment="srcnat: LAN to Internet"
```

This rule applies to outbound traffic through WAN. It does not open incoming connections from the internet.

## Before applying anything

Before changing NAT/firewall:

```routeros
/system backup save name=before-nat-port-forward
/export file=before-nat-port-forward
/system console safe-mode
```

First clarify:

- external port;
- internal IP;
- internal port;
- TCP/UDP protocol;
- WAN interface or WAN interface-list;
- whether access should be limited to specific external addresses;
- where the final `drop` is in forward.

## Port forwarding

Example of publishing an internal HTTPS service:

```routeros
/ip firewall nat
add chain=dstnat in-interface-list=WAN protocol=tcp dst-port=<external-port> action=dst-nat to-addresses=<internal-ip> to-ports=<internal-port> comment="dstnat: publish service"
```

A NAT rule alone is not enough. You also need a forward allow before the final drop:

```routeros
/ip firewall filter
add chain=forward action=accept connection-nat-state=dstnat protocol=tcp dst-address=<internal-ip> dst-port=<internal-port> comment="forward: allow published service"
```

For a stricter policy, add `src-address-list=<trusted-public-sources>` or limit geography/addresses on an external firewall if possible.

## Why not expose management

WinBox, SSH, WebFig, and API should not be published through port forwarding. Use WireGuard for administration. If temporary emergency access is needed, it must be source-address limited, time-limited, logged, and have an explicit rollback.

## Hairpin NAT

Hairpin NAT is needed when a LAN client accesses an internal service by an external DNS name that resolves to the router's public IP.

Example logic:

```routeros
/ip firewall nat
add chain=dstnat dst-address=<wan-public-ip> protocol=tcp dst-port=<external-port> src-address=<lan-subnet> action=dst-nat to-addresses=<internal-ip> to-ports=<internal-port> comment="hairpin dstnat"
add chain=srcnat src-address=<lan-subnet> dst-address=<internal-ip> protocol=tcp dst-port=<internal-port> action=masquerade comment="hairpin srcnat"
```

This is an example that must be adapted. If the WAN IP is dynamic, consider split DNS or an address-list updated by script instead of hardcoding the IP.

## Split DNS as an alternative

Often it is better for internal clients to resolve `service.example.com` directly to the internal IP. Then hairpin NAT is not needed, or is needed less.

Split DNS is easier to diagnose, but requires controlled DNS for clients. If some clients use external DoH, behavior may differ.

## How to verify the result

External checks:

- only the required port is open;
- the service responds;
- management ports are closed;
- source restrictions work, if configured.

Internal checks:

- LAN can open the service by internal IP;
- LAN can open the service by external name if hairpin/split DNS is configured;
- Guest does not get access to the service if that is forbidden;
- firewall logs show expected matches.

Commands:

```routeros
/ip firewall nat print stats
/ip firewall filter print stats
/log print
```

## Common mistakes

Creating dstnat and forgetting the forward allow.

Allowing `connection-nat-state=dstnat` too broadly for all protocols and all internal addresses.

Publishing NAS/admin panels without VPN.

Trying to solve hairpin NAT when split DNS would be simpler.

Opening a port on WAN but not testing the service from an external network.

## Security notes

Every port forward is a public commitment to maintain the service: updates, auth, TLS, logs, brute-force protection, and monitoring.

If the service is only for you, WireGuard is almost always better than port forwarding.

## Short takeaway

NAT helps route IPv4 traffic across address boundaries, but firewall provides security. Port forwarding should be specific, testable, and minimal. Hairpin NAT is needed only where split DNS does not solve the problem more simply.

The next article is about Guest Wi-Fi through a separate VLAN.
