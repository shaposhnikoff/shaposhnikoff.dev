---
title: "Logging strategy: which events to write, where to send them, and how not to drown the router in logs"
date: 2026-03-30
summary: "Logging strategy for MikroTik: security events, firewall prefixes, remote syslog, script logs, and noise control."
tags: ["mikrotik","routeros","logging","syslog"]
topics: ["networking"]
toc: true
---

# Logging strategy: which events to write, where to send them, and how not to drown the router in logs

Logs are not for checking a box. They help you understand what happened: why WAN went down, who tried to connect to WireGuard, which firewall drops triggered, when a backup failed, and why a DHCP pool ran out.

But the router has limited resources. If you log everything, you get noise, storage wear, and loss of useful signal.

## Where this fits in the overall architecture

After firewall, VPN, DNS, and dual WAN, the network already has many events. Logging strategy defines which ones matter, where they are stored, and how they are used for monitoring/alerts.

The next article is about monitoring and alerts, where logs become one of the signal sources.

## What to log

Baseline categories:

| Category | Examples |
| --- | --- |
| Security | WAN drops, failed login, VPN peer events |
| Network | WAN up/down, DHCP problems, route changes |
| Operations | backup success/failure, script errors |
| Performance | CPU/RAM warnings, interface errors |
| DNS/firewall policy | important deny events only, not all noise |

Not every dropped packet deserves a log entry.

## Before applying anything

Before changing logging:

```routeros
/system backup save name=before-logging
/export file=before-logging
```

Check current rules:

```routeros
/system logging print
/log print
```

## Firewall logging

Log final denies carefully:

```routeros
/ip firewall filter
add chain=forward action=drop in-interface-list=GUEST out-interface-list=!WAN log=yes log-prefix="drop-guest" comment="guest: block internal"
```

The prefix should be short and understandable. For noisy rules, use rate-limit where applicable, or log only separate diagnostic rules.

Do not permanently log all WAN scan noise unless you have external syslog and a reason to keep it.

## Remote syslog

For normal history, send logs outside the router:

```routeros
/system logging action
add name=remote-syslog target=remote remote=<syslog-server-ip> remote-port=514

/system logging
add topics=info action=remote-syslog
add topics=warning action=remote-syslog
add topics=error action=remote-syslog
```

Adapt syntax and topics to your RouterOS and syslog server. The syslog server should be in a trusted segment, and firewall should allow sending only there.

## Script logs

Backup/failover/alert scripts should write clear messages:

```routeros
:log info "backup: export completed"
:log error "backup: upload failed"
```

If a message cannot be found quickly by prefix, it is a poor operational log.

## Retention and noise

Logs on the router itself are limited. Therefore:

- send critical events to external syslog;
- enable debug only temporarily;
- log firewall deny selectively;
- use clear prefixes;
- document which events are alert-worthy.

## How to verify the result

Checks:

- local `/log print` shows expected events;
- remote syslog receives messages;
- drop prefixes are understandable;
- noise does not overwhelm logs;
- script errors are visible;
- important events can be found for the required period.

Commands:

```routeros
/system logging print
/log print
```

## Common mistakes

Enabling debug and forgetting to disable it.

Logging every WAN drop and losing useful signal.

Not sending logs externally, then investigating an event after reboot.

Using identical prefixes for different rules.

Not logging backup/script errors.

## Security notes

Logs can contain IP addresses, device names, and operational information. The syslog server must be protected and access to it must be limited.

Do not send logs to untrusted places without understanding what data they disclose.

## Short takeaway

Logging strategy should provide useful signal: security events, WAN/VPN/DHCP/backup/script failures, and important denies. Logs should be limited, labeled with prefixes, and preferably sent to remote syslog.

The next article is about monitoring and alerts.
