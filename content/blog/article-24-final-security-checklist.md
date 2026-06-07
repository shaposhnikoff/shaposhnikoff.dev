---
title: "Final security checklist: verifying the network before calling it ready"
date: 2026-04-03
summary: "Final security checklist for a MikroTik network: baseline, VLANs, firewall, Wi-Fi, IPv6, VPN, DNS, monitoring, backups, and DR."
tags: ["mikrotik","routeros","security","checklist"]
topics: ["networking"]
toc: true
---

# Final security checklist: verifying the network before calling it ready

A network is not ready just because the internet works. A ready network is segmented, manageable, observable, documented, and recoverable.

This final checklist helps review every layer: RouterOS baseline, VLANs, firewall, Wi-Fi, IPv6, VPN, DNS, monitoring, backups, and DR.

## Where this fits in the overall architecture

This is the last article in the series. It does not add a new mechanism; it checks that all previous decisions do not contradict each other and actually work.

The checklist is useful after initial setup, before moving to production, after major changes, and before the administrator goes on vacation.

## Before applying anything

No dangerous action is needed before the final review. But before fixing issues found by the checklist:

```routeros
/system backup save name=before-final-security-fixes
/export file=before-final-security-fixes
/system console safe-mode
```

Do not fix firewall/VLAN remotely without a rollback plan.

## Baseline

- RouterOS is updated to the selected stable version.
- RouterBOARD firmware has been checked.
- Default `admin` is disabled or protected.
- Passwords are strong and unique.
- Unnecessary services are disabled.
- WinBox/SSH/WebFig/API are not reachable from WAN.
- Timezone and NTP are configured.
- Device identity is clear.
- Fresh backup and export exist.

Checks:

```routeros
/system package print
/system routerboard print
/user print
/ip service print
/system clock print
```

## VLAN and addressing

- Every VLAN has a purpose.
- Subnets do not conflict with VPN/site-to-site.
- Management VLAN is defined.
- Trunk/access ports are documented.
- PVIDs are checked.
- Bridge VLAN table matches the port map.
- Guest/IoT are not in the LAN broadcast domain.

Checks:

```routeros
/interface bridge port print
/interface bridge vlan print
/interface vlan print
/ip address print
```

## DHCP and DNS

- DHCP server works only on the required VLANs.
- Pools have spare capacity.
- Gateway/DNS options are correct.
- DNS resolver is not open from WAN.
- DNS policy distinguishes LAN/Guest/IoT/VPN.
- Direct DNS outward is blocked if policy requires it.
- DoH limitations are documented.

Checks:

```routeros
/ip dhcp-server print
/ip dhcp-server network print
/ip dhcp-server lease print
/ip dns print
```

## IPv4 firewall

- `input` protects the router itself.
- `forward` controls inter-VLAN and internet traffic.
- Established/related rules are at the beginning.
- Invalid drop exists.
- WAN-to-router drop exists.
- Management is allowed only from trusted/VPN.
- Guest has only internet plus required DHCP/DNS.
- IoT does not initiate access to LAN/MGMT.
- There is no broad allow between VLANs without a reason.
- Drop rules have clear prefixes if logged.

Checks:

```routeros
/ip firewall filter print stats
/ip firewall nat print stats
/log print
```

## NAT and published services

- Masquerade is limited to WAN.
- Port forwards are documented.
- Every dstnat has a matching forward allow.
- Management services are not published.
- Hairpin NAT or split DNS has been checked.
- Inbound services have updates, auth, TLS, and monitoring.

## Wi-Fi and CAPsMAN

- Main/Guest/IoT SSIDs map to the correct VLANs.
- Guest client isolation is enabled if needed.
- IoT SSID is compatible with devices but isolated by firewall.
- AP management is in the Management VLAN.
- Trunk to AP carries the required tagged VLANs.
- RouterOS 7 WiFi/wireless packages are not mixed in the config without understanding.

## IPv6

- IPv6 is enabled only deliberately.
- Prefix delegation works.
- Each VLAN receives the expected prefix.
- IPv6 firewall is configured separately.
- ICMPv6 is not blocked blindly.
- Guest/IoT policy is respected in IPv6.
- Management is not open from WAN over IPv6.

Checks:

```routeros
/ipv6 address print
/ipv6 route print
/ipv6 firewall filter print stats
```

## WireGuard

- Each device has a separate peer.
- Allowed-address is configured deliberately.
- VPN subnet does not conflict with LAN/remote networks.
- WireGuard UDP port is allowed in input only as needed.
- VPN peers have limited access to VLANs.
- A lost peer can be revoked quickly.
- Road-warrior and site-to-site are not mixed.

## FastTrack and QoS

- FastTrack does not break QoS, queues, mangle, or policy routing.
- Traffic shaping has been tested under load.
- WAN bottleneck is shaped below real speed.
- CPU is not overloaded.
- FastTrack exceptions are documented.

## Dual WAN

- Both WAN links are included in firewall policy as WAN.
- Backup WAN does not expose management.
- NAT works on both WAN links.
- Failover and failback have been tested.
- DNS works during failover.
- WireGuard/inbound services have a plan for WAN changes.
- Alerts arrive when switching to backup.

## Logging, monitoring, backups, DR

- Important events are logged with clear prefixes.
- Remote syslog or external log collection is configured if needed.
- Monitoring covers WAN, VPN, CPU/RAM, DHCP pools, DNS, backups.
- Alerts are actionable and not noisy.
- Automated backups create binary backup and export.
- Backup is stored outside the router.
- Restore testing has been done.
- DR runbook is available outside the network.

## Final client-side check

Check with real devices:

- LAN receives the correct IP and internet.
- Guest receives a guest IP and cannot see LAN/MGMT.
- IoT receives an IoT IP and cannot initiate access to LAN/MGMT.
- VPN client sees only allowed networks.
- WAN scan does not see management ports.
- IPv6 policy matches IPv4 intent.
- DNS filtering works according to VLAN policy.

## Common mistakes

Checking only from the administrator's LAN laptop.

Not testing Guest/IoT/VPN as real clients.

Forgetting IPv6.

Not testing failover and restore.

Leaving temporary allow rules after setup.

## Security notes

The checklist does not replace regular review. Networks change: new devices, providers, services, and exceptions appear.

Every exception should have an owner, reason, and review date.

## Short takeaway

A ready MikroTik network is not a set of commands; it is a verifiable system: segmentation, firewall, management boundary, DNS policy, VPN, Wi-Fi, IPv6, monitoring, backups, and DR.

This completes the baseline production-ready path for the "MikroTik from scratch" series. From here, you can go deeper into specific scenarios: site-to-site, advanced routing, BGP, centralized monitoring, zero-trust access, and automation.
