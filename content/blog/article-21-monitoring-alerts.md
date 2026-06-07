---
title: "Monitoring and alerts: WAN, VPN, CPU/RAM, DHCP pools, logs, and notifications"
date: 2026-03-31
summary: "Monitoring and alerts for MikroTik: WAN, VPN, CPU/RAM, DHCP pools, DNS, backups, logs, SNMP, and actionable alerts."
tags: ["mikrotik","routeros","monitoring","alerts","snmp"]
topics: ["networking"]
toc: true
---

# Monitoring and alerts: WAN, VPN, CPU/RAM, DHCP pools, logs, and notifications

Monitoring answers the question "is the network healthy?" Alerts answer "when does a human need to intervene?" Without them, problems are discovered through user complaints.

MikroTik can expose state through RouterOS tools, SNMP, logs, scripts, and external monitoring systems.

## Where this fits in the overall architecture

Logging already defined which events to write. Monitoring adds regular checks: WAN, VPN, CPU/RAM, interfaces, DHCP pools, backup status, firewall/log signals.

The goal is to see degradation before it becomes an incident.

## What to monitor

| Object | What to check |
| --- | --- |
| WAN | link, route, ping target, DNS resolution |
| Dual WAN | active uplink, failover/failback |
| VPN | WireGuard handshake age, peer reachability |
| CPU/RAM | sustained high usage, low memory |
| Interfaces | errors, drops, traffic anomalies |
| DHCP | pool utilization, lease failures |
| DNS | resolver availability |
| Backups | last success, upload result |
| Logs | critical prefixes/errors |

## Before applying anything

Before enabling scripts/SNMP/alerts:

```routeros
/system backup save name=before-monitoring
/export file=before-monitoring
```

Do not expose monitoring endpoints to the internet. SNMP/API must be reachable only from a trusted monitoring segment or through VPN.

## SNMP

If you use Prometheus exporter, Zabbix, LibreNMS, or another monitoring system, SNMP can be convenient:

```routeros
/snmp set enabled=yes contact=<contact> location=<location>
```

Configure community, allowed addresses, and version strictly. Do not use public communities such as `public` without source restrictions.

## Netwatch and scripts

For simple checks, RouterOS netwatch can be used:

```routeros
/tool netwatch
add host=1.1.1.1 interval=30s timeout=2s up-script=":log info \"wan-check: up\"" down-script=":log warning \"wan-check: down\""
```

For production, do not rely on a single target. Check both IP reachability and DNS.

## WireGuard monitoring

Check latest handshake and peer reachability. If a peer should always be online, lack of handshake is an alert. If it is a road-warrior laptop, lack of handshake may be normal.

Separate always-on site-to-site peers from occasional road-warrior peers.

## DHCP pools

DHCP pool exhaustion can silently break new device connections. This is especially relevant for Guest and IoT.

Periodically check leases and pool sizes:

```routeros
/ip dhcp-server lease print
/ip pool print
```

## Alerts

Channels:

- email;
- Telegram/webhook through script;
- external monitoring;
- syslog rules;
- NMS alerts.

An alert should be actionable: what broke, where, when, and how critical it is.

## How to verify the result

Checks:

- WAN disconnection creates an alert;
- failover creates an alert;
- backup failure creates an alert;
- high CPU/RAM is visible;
- DHCP pool threshold is checked;
- remote monitoring is not reachable from Guest/WAN;
- false positives are acceptable.

Commands:

```routeros
/system resource print
/interface monitor-traffic <interface-name>
/tool netwatch print
/log print
```

## Common mistakes

Monitoring only "ping 8.8.8.8" and calling the network healthy.

Sending alerts for every temporary event and training yourself to ignore them.

Exposing SNMP/API externally.

Not monitoring backup success.

Not distinguishing critical and informational events.

## Security notes

Monitoring has access to sensitive network information. Limit source addresses, use VPN/trusted VLAN, and do not expose SNMP/API to the internet.

Alerts can disclose internal addresses and device names. The notification channel should be protected.

## Short takeaway

Monitoring should cover WAN, VPN, resources, DHCP, DNS, backups, and critical logs. Alerts should be rare, clear, and actionable.

The next article is about automated backups.
