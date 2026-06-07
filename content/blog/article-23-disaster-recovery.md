---
title: "Disaster recovery: restoring the network after router failure or configuration mistakes"
date: 2026-04-02
summary: "Disaster recovery for a MikroTik network: lockout recovery, hardware replacement, runbook, documentation, and restore checks."
tags: ["mikrotik","routeros","disaster-recovery","backup"]
topics: ["networking"]
toc: true
---

# Disaster recovery: restoring the network after router failure or configuration mistakes

Disaster recovery is not heroic late-night restoration; it is a prepared plan. If the router dies, configuration breaks, or VLAN/firewall cuts off access, you should know the next step.

A DR plan is especially important for a network where MikroTik is the core router/firewall.

## Where this fits in the overall architecture

Backup automation already creates artifacts. Now you need to understand how to use them: what to do during lockout, failed upgrade, hardware failure, corrupted config, or a bad firewall rule.

The final article will be a security checklist before considering the network ready.

## Failure scenarios

| Scenario | Example |
| --- | --- |
| Lockout | VLAN filtering/firewall cut off management |
| Failed upgrade | RouterOS upgraded incorrectly |
| Hardware failure | Device does not boot |
| Bad config | DHCP/DNS/firewall is broken |
| WAN outage | Provider is unavailable |
| Lost VPN | Remote access disappeared |

Each scenario needs its own recovery path.

## Before applying anything

A DR plan is not dangerous by itself, but recovery tests can affect the network. Before practice:

```routeros
/system backup save name=before-dr-test
/export file=before-dr-test
```

Test in a maintenance window or on CHR/spare hardware.

## Lockout recovery

Prevention:

- Safe Mode before risky changes;
- local management port;
- separate Management VLAN;
- rollback timer through scheduler for dangerous changes;
- fresh export.

If access is lost:

- try a local port;
- connect through MAC WinBox if applicable and allowed locally;
- use console/serial if the model supports it;
- restore from backup/export;
- reset and rebuild as a last resort.

## Hardware replacement

For device replacement, you need:

- the same model or a compatible replacement;
- RouterOS version;
- export;
- binary backup if it is the same model;
- interface list and roles;
- VLAN/port map;
- ISP credentials;
- WireGuard keys/peers;
- DNS/monitoring/backup credentials.

Do not blindly apply an export to another model: interface names and hardware-specific settings may differ.

## DR runbook

Minimal runbook:

```text
1. Identify scenario: lockout, hardware, WAN, config.
2. Save current state if access exists.
3. Check latest backup/export.
4. Restore management access.
5. Restore WAN.
6. Restore VLAN gateways, DHCP/DNS.
7. Restore firewall/NAT.
8. Check VPN.
9. Check monitoring/backups.
10. Record result and cause.
```

## Network documentation

DR is impossible without documentation:

- model and serial;
- RouterOS version;
- port map;
- VLAN table;
- IP plan;
- firewall policy summary;
- WireGuard peers;
- backup location;
- ISP details;
- emergency contacts.

This information must be available outside the router.

## How to verify the DR plan

Checks:

- find the latest export without router access;
- read the VLAN/port map;
- start CHR and apply part of the export;
- restore DHCP/DNS in a test;
- verify the backup is not empty;
- run a tabletop exercise: "the router is dead, what do we do?"

## Common mistakes

Having a backup but not knowing the password/storage location.

Keeping documentation only on a NAS behind the same router.

Not having ISP credentials.

Blindly importing an export onto another model.

Not testing DR before an incident.

## Security notes

DR materials contain secrets and topology. Access to them must be limited, but not so limited that nobody can recover the network during an incident.

After recovery, check that temporary emergency access is closed.

## Short takeaway

Disaster recovery is backup, documentation, runbook, and a tested recovery path. The goal is not to never make mistakes, but to prevent a mistake from becoming a long outage.

The next article completes the series with a final security checklist.
