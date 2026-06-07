---
title: "Automated backups: binary backup, export, scheduler, and off-router storage"
date: 2026-04-01
summary: "Automated backups for MikroTik: binary backup, export, scheduler, external storage, retention, and restore testing."
tags: ["mikrotik","routeros","backup","automation"]
topics: ["networking"]
toc: true
---

# Automated backups: binary backup, export, scheduler, and off-router storage

Backup is needed not when everything works, but when you make a mistake, the device dies, or an update goes wrong. On MikroTik, it is important to distinguish binary backup from `/export`.

A normal strategy includes automatic creation, storage outside the router, restore testing, and success monitoring.

## Where this fits in the overall architecture

We have already built a complex configuration: VLANs, firewall, NAT, WireGuard, DNS, monitoring. Losing it without backup is unacceptable.

Disaster recovery in the next article relies on backup/export already existing.

## Binary backup and export

Binary backup:

- suitable for restore on the same device;
- may contain sensitive data;
- depends on model/version;
- convenient for quick rollback.

`/export`:

- readable text;
- useful for audits;
- better for moving logic to another model;
- sensitive values may be hidden or shown depending on parameters.

You need both.

## Before applying anything

Before configuring automation:

```routeros
/system backup save name=before-backup-automation
/export file=before-backup-automation
```

Define where files will be uploaded: SFTP/SCP, FTP only in a trusted network, SMB, external collector, or manual pull. Do not keep the only copy on the router.

## Manual backup

```routeros
/system backup save name=manual-backup
/export file=manual-export
```

If an export with sensitive values is needed for closed storage, use the relevant RouterOS parameters deliberately and protect the file as a secret.

## Scheduler

Approximate scheduler logic:

```routeros
/system scheduler
add name=nightly-export interval=1d start-time=03:00:00 on-event="/export file=nightly-export"
```

For production this is not enough: you need a date in the name, external upload, error handling, and result logging.

## External upload

The script should:

- create backup/export;
- upload the file to an external host;
- write success/failure to log;
- avoid storing secrets in clear text unless necessary;
- clean old local files where possible.

RouterOS scripting is syntax-sensitive. Test scripts on a spare device.

## Storage and retention

Practical scheme:

- daily exports for 7-14 days;
- weekly backups for 1-3 months;
- a copy before major changes;
- separate storage before RouterOS upgrade;
- administrator-only access.

Backup without retention becomes either clutter or one old file.

## Restore testing

An untested backup is an assumption. Periodically check:

- the file is created;
- the file is uploaded;
- the file is readable;
- export can be applied in parts on a test CHR;
- binary backup matches the specific device.

## How to verify the result

Checks:

```routeros
/file print
/system scheduler print
/log print
```

Outside the router:

- backup appeared in storage;
- the name contains date/device;
- file size is non-zero;
- access permissions are restricted;
- monitoring sees last success.

## Common mistakes

Storing backup only on the router.

Creating only binary backup and having no readable export.

Not logging upload failure.

Committing exports with secrets to git.

Never testing restore.

## Security notes

Backup can contain keys, passwords, WireGuard private keys, VPN secrets, and internal topology. It is a secret artifact.

Backup storage must be protected at least as well as the router itself.

## Short takeaway

Automated backups are binary backup, export, schedule, external storage, retention, logs, and restore testing. A file stored only on the router is not enough protection.

The next article is about disaster recovery.
