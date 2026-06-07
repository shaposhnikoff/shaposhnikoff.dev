---
title: "WireGuard on MikroTik: road-warrior, site-to-site, and limited access to VLANs"
date: 2026-03-24
summary: "Configuring WireGuard on MikroTik for road-warrior and site-to-site scenarios with limited VLAN access."
tags: ["mikrotik","routeros","wireguard","vpn"]
topics: ["networking"]
toc: true
---

# WireGuard on MikroTik: road-warrior, site-to-site, and limited access to VLANs

WireGuard is a good way to provide remote network access without exposing WinBox, SSH, or WebFig to the internet. But VPN should not automatically mean "full access to everything".

In RouterOS 7, WireGuard is built in and works well for road-warrior clients and site-to-site links if allowed-address, routing, and firewall are configured correctly.

## Where this fits in the overall architecture

Management from WAN is closed. For remote administration and access to internal services, you need a protected entry point. WireGuard becomes a separate VPN segment, and the firewall decides which VLANs are available to specific peers.

## Road-warrior and site-to-site

Road-warrior means an administrator laptop or phone connects to the home/office network.

Site-to-site means two routers connect two networks, for example home and office.

They have different allowed-address and routing requirements. Do not force them into one template.

## Before applying anything

Before configuring VPN:

```routeros
/system backup save name=before-wireguard
/export file=before-wireguard
/system console safe-mode
```

Prepare:

- UDP port for WireGuard;
- VPN subnet;
- peer list;
- which VLANs each peer may access;
- where private keys will be stored;
- how access will be revoked.

Do not publish management services instead of VPN.

## WireGuard interface

Example:

```routeros
/interface wireguard
add name=wg-roadwarrior listen-port=<udp-port> comment="Road-warrior VPN"

/ip address
add address=10.10.90.1/24 interface=wg-roadwarrior comment="WireGuard gateway"
```

RouterOS will create keys for the interface. The private key must be protected as a secret.

## Peer for road-warrior

```routeros
/interface wireguard peers
add interface=wg-roadwarrior public-key="<peer-public-key>" allowed-address=10.10.90.10/32 comment="admin laptop"
```

On MikroTik, `allowed-address` for a road-warrior peer usually contains the specific client's VPN IP as `/32`. On the client, allowed IPs define which traffic goes into the tunnel: only internal networks or the whole internet.

## Firewall for WireGuard

Input: allow the WireGuard port itself from WAN:

```routeros
/ip firewall filter
add chain=input action=accept in-interface-list=WAN protocol=udp dst-port=<udp-port> comment="input: allow WireGuard"
```

This rule must be before the WAN-to-router drop.

Forward: allow VPN only to required VLANs:

```routeros
/ip firewall filter
add chain=forward action=accept in-interface=wg-roadwarrior out-interface-list=MGMT src-address=10.10.90.10 comment="vpn: admin to management"
add chain=forward action=accept in-interface=wg-roadwarrior out-interface-list=LAN src-address=10.10.90.10 comment="vpn: admin to LAN"
add chain=forward action=drop in-interface=wg-roadwarrior log=yes log-prefix="drop-vpn" comment="vpn: drop rest"
```

Do not give every VPN peer full access to every VLAN without a reason.

## DNS for VPN

Clients can use MikroTik DNS or an internal resolver. Then input firewall must allow DNS from the WireGuard interface:

```routeros
/ip firewall filter
add chain=input action=accept in-interface=wg-roadwarrior protocol=udp dst-port=53 comment="vpn: allow DNS UDP"
add chain=input action=accept in-interface=wg-roadwarrior protocol=tcp dst-port=53 comment="vpn: allow DNS TCP"
```

If split DNS is needed for internal names, document it separately.

## Site-to-site nuances

For site-to-site, allowed-address contains the remote subnet:

```routeros
/interface wireguard peers
add interface=wg-site-office public-key="<remote-router-public-key>" allowed-address=<remote-subnet> endpoint-address=<remote-endpoint> endpoint-port=<remote-port> persistent-keepalive=25s
```

Routes and firewall must explicitly describe which local VLANs are reachable from the remote site. Subnet conflicts between sites must be eliminated in advance.

## How to verify the result

On MikroTik:

```routeros
/interface wireguard print
/interface wireguard peers print
/ip firewall filter print stats
/log print
```

Checks:

- peer gets a handshake;
- the client can ping the VPN gateway;
- only allowed VLANs are reachable;
- management is not open directly from WAN;
- DNS works if it should;
- a disabled peer loses access.

## Common mistakes

Confusing allowed-address on the server with allowed IPs on the client.

Using `0.0.0.0/0` where split tunnel is needed.

Allowing VPN to every VLAN without policy.

Forgetting firewall input for the UDP WireGuard port.

Using VPN as a substitute for proper management segmentation.

## Security notes

WireGuard is simple, but keys are access. Use a separate peer for each device so a specific access can be revoked.

VPN clients must be part of the firewall policy, not an exception from it.

## Short takeaway

WireGuard solves remote access without exposing management to the internet. Road-warrior and site-to-site require different allowed-address, routing, and firewall rules.

The next article is about DoH DNS and DNS policy: what MikroTik DNS cache can do and where its limits are.
