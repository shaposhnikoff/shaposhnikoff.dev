---
title: "Exim4 + Dovecot Mail Server Setup Guide"
date: 2026-02-28
summary: "Exim4 + Dovecot Mail Server Setup Guide shaposhnikoff.dev."
tags: ["exim4","dovecot","smtp"]
topics: ["devops"]
toc: true
---


# Exim4 + Dovecot Mail Server Setup Guide

> **Platform:** Debian 12 (Bookworm) / Ubuntu 22.04+  
> **Domain:** `shaposhnikoff.dev`  
> **MX hostname:** `mail.shaposhnikoff.dev`  
> **Stack:** Exim4 (SMTP) + Dovecot (IMAP/LMTP) + Let's Encrypt (TLS) + DKIM + Greylisting  
> **Storage:** Flat files (no database), Maildir format  

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [DNS Records](#2-dns-records)
3. [Install Packages](#3-install-packages)
4. [Create vmail User](#4-create-vmail-user)
5. [Flat File Layout](#5-flat-file-layout)
6. [Exim4 Configuration](#6-exim4-configuration)
7. [Let's Encrypt TLS Certificate](#7-lets-encrypt-tls-certificate)
8. [DKIM Keys](#8-dkim-keys)
9. [Dovecot Configuration](#9-dovecot-configuration)
10. [Dovecot User Database](#10-dovecot-user-database)
11. [Fix File Permissions](#11-fix-file-permissions)
12. [Start Services](#12-start-services)
13. [Testing](#13-testing)
14. [Greylisting](#14-greylisting)
15. [Common Errors & Fixes](#15-common-errors--fixes)
16. [Maintenance](#16-maintenance)

---

## 1. Prerequisites

- A VPS or dedicated server with a **static public IP**
- Root or sudo access
- Domain name with ability to manage DNS records
- Port **25, 465, 587, 143, 993** open in firewall

Check your IP:

```bash
curl -s https://ipinfo.io/ip
```

Check open ports:

```bash
ufw allow 25/tcp
ufw allow 465/tcp
ufw allow 587/tcp
ufw allow 143/tcp
ufw allow 993/tcp
ufw allow 80/tcp   # required for Let's Encrypt
ufw reload
```

---

## 2. DNS Records

Configure the following DNS records **before** proceeding. TLS certificate issuance and mail delivery depend on them.

| Type | Name | Value | Priority |
|------|------|-------|----------|
| A | `mail.shaposhnikoff.dev` | `<YOUR_SERVER_IP>` | — |
| MX | `shaposhnikoff.dev` | `mail.shaposhnikoff.dev` | 10 |
| TXT | `shaposhnikoff.dev` | `v=spf1 mx a:mail.shaposhnikoff.dev ~all` | — |
| TXT | `mail._domainkey.shaposhnikoff.dev` | *(generated in step 8)* | — |
| TXT | `_dmarc.shaposhnikoff.dev` | `v=DMARC1; p=quarantine; rua=mailto:postmaster@shaposhnikoff.dev` | — |

**PTR record (reverse DNS)** — configure at your hosting provider (Hetzner, DigitalOcean, etc.):

```
<YOUR_SERVER_IP>  →  mail.shaposhnikoff.dev
```

> Without a PTR record, outgoing mail will be rejected or go to spam by Gmail, Outlook, and others.

Verify DNS propagation:

```bash
dig mail.shaposhnikoff.dev A +short
dig -x <YOUR_SERVER_IP> +short
dig shaposhnikoff.dev MX +short
dig shaposhnikoff.dev TXT +short
```

---

## 3. Install Packages

```bash
apt-get update
apt-get install -y \
    exim4-daemon-heavy \
    dovecot-core \
    dovecot-imapd \
    dovecot-lmtpd \
    greylistd \
    certbot \
    opendkim-tools
```

> **Why `exim4-daemon-heavy`?**  
> The heavy variant includes MySQL, PostgreSQL, and other lookup drivers. It also supports more ACL conditions than `exim4-daemon-light`.

Disable the default Debian Exim split-config system — we will use a single `exim4.conf`:

```bash
# The presence of /etc/exim4/exim4.conf automatically disables
# the Debian update-exim4.conf split-config system.
# No additional steps needed.
```

---

## 4. Create vmail User

All virtual mailboxes are owned by a dedicated `vmail` system user.

```bash
groupadd -g 5000 vmail
useradd -u 5000 -g 5000 -d /var/vmail -s /sbin/nologin vmail
```

> If UID/GID 5000 are taken on your system, choose other values and update `dovecot.conf` accordingly (`first_valid_uid`, `last_valid_uid`, `mail_uid`, `mail_gid`).

Check the assigned UID:

```bash
id vmail
```

Create the maildir root:

```bash
mkdir -p /var/vmail/shaposhnikoff.dev/max/Maildir/{cur,new,tmp}
chown -R vmail:vmail /var/vmail
chmod -R 700 /var/vmail
```

---

## 5. Flat File Layout

```
/etc/exim4/
├── exim4.conf                          # main Exim configuration
├── virtual/
│   ├── domains                         # one domain per line
│   ├── mailboxes                       # user@domain: /path/to/maildir/
│   ├── aliases                         # alias@domain: target@domain
│   └── quota                           # user@domain: <bytes>  (informational)
├── dkim/
│   └── mail.shaposhnikoff.dev.private  # DKIM private key
/etc/aliases                            # system aliases (root, postmaster)
/etc/dovecot/
├── dovecot.conf                        # main Dovecot configuration
└── users                               # virtual user credentials
```

### `/etc/exim4/virtual/domains`

```
shaposhnikoff.dev
```

### `/etc/exim4/virtual/mailboxes`

```
# Format: user@domain: /path/to/maildir/
# Path must end with / (Maildir format)
max@shaposhnikoff.dev:    /var/vmail/shaposhnikoff.dev/max/Maildir/
```

### `/etc/exim4/virtual/aliases`

```
# Format: alias@domain: target@domain
# Multiple targets: alias@domain: user1@domain, user2@domain
postmaster@shaposhnikoff.dev:    max@shaposhnikoff.dev
abuse@shaposhnikoff.dev:         max@shaposhnikoff.dev
admin@shaposhnikoff.dev:         max@shaposhnikoff.dev
info@shaposhnikoff.dev:          max@shaposhnikoff.dev
hostmaster@shaposhnikoff.dev:    max@shaposhnikoff.dev
```

### `/etc/aliases`

```
# System aliases for the primary hostname domain
root:          max@shaposhnikoff.dev
postmaster:    max@shaposhnikoff.dev
abuse:         max@shaposhnikoff.dev
mailer-daemon: postmaster
```

After editing `/etc/aliases`, run:

```bash
newaliases
```

Set correct permissions on aliases:

```bash
chown root:Debian-exim /etc/aliases
chmod 640 /etc/aliases
```

---

## 6. Exim4 Configuration

Create `/etc/exim4/exim4.conf`:

```
# =============================================================================
# /etc/exim4/exim4.conf
# Domain: shaposhnikoff.dev
# =============================================================================

primary_hostname = mail.shaposhnikoff.dev

domainlist local_domains  = lsearch;/etc/exim4/virtual/domains
domainlist relay_domains  =
hostlist   relay_from_hosts =

domainlist dkim_required_domains = gmail.com : yandex.ru : rambler.ru : \
                                   mail.ru : bk.ru : list.ru : inbox.ru

acl_not_smtp   = acl_check_not_smtp
acl_smtp_rcpt  = acl_check_rcpt
acl_smtp_data  = acl_check_data
acl_smtp_dkim  = acl_check_dkim

disable_ipv6
daemon_smtp_ports    = 25 : 465 : 587
tls_on_connect_ports = 465

tls_advertise_hosts = *
tls_certificate     = /etc/letsencrypt/live/mail.shaposhnikoff.dev/fullchain.pem
tls_privatekey      = /etc/letsencrypt/live/mail.shaposhnikoff.dev/privkey.pem

# GnuTLS priority string (Debian default, NOT OpenSSL syntax)
tls_require_ciphers = NORMAL:-VERS-SSL3.0:-VERS-TLS1.0:-VERS-TLS1.1:+VERS-TLS1.2:+VERS-TLS1.3

# Only advertise AUTH over encrypted connections
auth_advertise_hosts = ${if eq{$tls_in_cipher}{}{}{*}}

qualify_domain    = shaposhnikoff.dev
qualify_recipient = shaposhnikoff.dev

never_users = root
keep_environment =

host_lookup = *

rfc1413_hosts         = *
rfc1413_query_timeout = 0s

sender_unqualified_hosts    = +relay_from_hosts
recipient_unqualified_hosts = +relay_from_hosts

message_size_limit   = 30M
percent_hack_domains =

ignore_bounce_errors_after = 2d
timeout_frozen_after       = 7d


begin acl

  acl_check_not_smtp:
    accept

  acl_check_rcpt:

    accept hosts = :

    deny message     = Restricted characters in address
         domains     = +local_domains
         local_parts = ^[.] : ^.*[@%!/|]

    deny message     = Restricted characters in address
         domains     = !+local_domains
         local_parts = ^[./|] : ^.*[@%!] : ^.*/\\.\\./

    accept local_parts = postmaster : abuse
           domains     = +local_domains

    require verify = sender

    accept hosts   = +relay_from_hosts
           control = submission

    deny message       = Local sender must be authenticated
         sender_domains = +local_domains
         !authenticated = *

    deny message      = Send your own mail from yourself
         condition     = ${if eq{$authenticated_id}{$sender_address}{no}{yes}}
         authenticated = *

    accept authenticated = *
           control = submission/domain=

    require message = Relay not permitted
            domains = +local_domains : +relay_domains

    require verify = recipient

    defer message    = Greylisting in action, try later
          log_message = greylisted.
          !senders   = :
          !hosts     = ${if exists{/etc/greylistd/whitelist-hosts}\
                                  {/etc/greylistd/whitelist-hosts}{}} : \
                       ${if exists{/var/lib/greylistd/whitelist-hosts}\
                                  {/var/lib/greylistd/whitelist-hosts}{}}
          dnslists   = zen.spamhaus.org
          condition  = ${readsocket{/var/run/greylistd/socket}\
                                   {--grey $sender_host_address $sender_address $local_part@$domain}\
                                   {5s}{}{false}}

    accept

  acl_check_data:
    accept

  acl_check_dkim:

    deny message     = Wrong DKIM signature
         dkim_status = fail

    deny message       = Valid DKIM signature required for mail from $sender_domain
         sender_domains = +dkim_required_domains
         dkim_status    = none

    accept


begin routers

  dnslookup:
    driver              = dnslookup
    domains             = ! +local_domains
    transport           = remote_smtp
    ignore_target_hosts = 0.0.0.0 : 127.0.0.0/8
    no_more

  system_aliases:
    driver     = redirect
    allow_fail
    allow_defer
    domains    = shaposhnikoff.dev
    data       = ${lookup{$local_part}lsearch{/etc/aliases}}

  aliases:
    driver     = redirect
    allow_fail
    allow_defer
    data       = ${lookup{$local_part@$domain}lsearch{/etc/exim4/virtual/aliases}}

  mailbox:
    driver               = accept
    condition            = ${lookup{$local_part@$domain}\
                                   lsearch{/etc/exim4/virtual/mailboxes}\
                                   {yes}{no}}
    address_data         = ${local_part}@${domain}
    transport            = dovecot_virtual_delivery
    cannot_route_message = Unknown user


begin transports

  remote_smtp:
    driver           = smtp
    dkim_domain      = ${lc:${domain:$h_from:}}
    dkim_selector    = mail
    dkim_private_key = ${if exists\
                           {/etc/exim4/dkim/$dkim_selector.$dkim_domain.private}\
                           {/etc/exim4/dkim/$dkim_selector.$dkim_domain.private}\
                           {}}

  dovecot_virtual_delivery:
    driver   = smtp
    protocol = lmtp
    allow_localhost
    hosts    = 127.0.0.1
    port     = 24
    rcpt_include_affixes = true


begin retry

  *   *   F,2h,15m; G,16h,1h,1.5; F,4d,6h


begin rewrite


begin authenticators

  dovecot_login:
    driver        = dovecot
    public_name   = LOGIN
    server_socket = /var/run/dovecot/auth-client
    server_set_id = $auth1

  dovecot_plain:
    driver        = dovecot
    public_name   = PLAIN
    server_socket = /var/run/dovecot/auth-client
    server_set_id = $auth1
```

Set permissions:

```bash
chown root:Debian-exim /etc/exim4/exim4.conf
chmod 640 /etc/exim4/exim4.conf
```

---

## 7. Let's Encrypt TLS Certificate

Make sure port 80 is open and `mail.shaposhnikoff.dev` resolves to your server IP before running this.

```bash
certbot certonly --standalone -d mail.shaposhnikoff.dev \
    --agree-tos --non-interactive \
    --email max@shaposhnikoff.dev
```

Install the deploy hook so Exim reloads automatically after certificate renewal:

```bash
cat > /etc/letsencrypt/renewal-hooks/deploy/exim4.sh << 'EOF'
#!/bin/bash
set -euo pipefail

DOMAIN="mail.shaposhnikoff.dev"
EXIM_GROUP="Debian-exim"

chown root:"${EXIM_GROUP}" /etc/letsencrypt/live
chmod 750                  /etc/letsencrypt/live
chown root:"${EXIM_GROUP}" "/etc/letsencrypt/live/${DOMAIN}"
chmod 750                  "/etc/letsencrypt/live/${DOMAIN}"
chown root:"${EXIM_GROUP}" /etc/letsencrypt/archive
chmod 750                  /etc/letsencrypt/archive
chown root:"${EXIM_GROUP}" "/etc/letsencrypt/archive/${DOMAIN}"
chmod 750                  "/etc/letsencrypt/archive/${DOMAIN}"
chown root:"${EXIM_GROUP}" "/etc/letsencrypt/archive/${DOMAIN}"/*.pem
chmod 640                  "/etc/letsencrypt/archive/${DOMAIN}"/*.pem

if systemctl is-active --quiet exim4; then
    systemctl reload exim4
fi

# Uncomment if Dovecot uses the same certificate:
# if systemctl is-active --quiet dovecot; then
#     systemctl reload dovecot
# fi
EOF

chmod 750 /etc/letsencrypt/renewal-hooks/deploy/exim4.sh

# Apply permissions immediately
/etc/letsencrypt/renewal-hooks/deploy/exim4.sh
```

Test auto-renewal:

```bash
certbot renew --dry-run
```

---

## 8. DKIM Keys

Generate a key pair for `shaposhnikoff.dev`:

```bash
mkdir -p /etc/exim4/dkim
opendkim-genkey -D /etc/exim4/dkim/ -d shaposhnikoff.dev -s mail
mv /etc/exim4/dkim/mail.private /etc/exim4/dkim/mail.shaposhnikoff.dev.private
mv /etc/exim4/dkim/mail.txt     /etc/exim4/dkim/mail.shaposhnikoff.dev.public
chown root:Debian-exim /etc/exim4/dkim/mail.shaposhnikoff.dev.private
chmod 640              /etc/exim4/dkim/mail.shaposhnikoff.dev.private
```

View the public key to add to DNS:

```bash
cat /etc/exim4/dkim/mail.shaposhnikoff.dev.public
```

Output example:

```
mail._domainkey IN TXT ( "v=DKIM1; k=rsa; "
      "p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA..." )
```

Add this as a TXT record in DNS:

```
Name:   mail._domainkey.shaposhnikoff.dev
Type:   TXT
Value:  v=DKIM1; k=rsa; p=<YOUR_PUBLIC_KEY>
```

Verify after DNS propagation:

```bash
dig mail._domainkey.shaposhnikoff.dev TXT +short
```

---

## 9. Dovecot Configuration

> **Important:** The Debian `dovecot-core` package installs split config files in `/etc/dovecot/conf.d/`. Our single `dovecot.conf` takes precedence, but some `conf.d/` files may still be included. Disable conflicting ones as needed (see [Section 15](#15-common-errors--fixes)).

Create `/etc/dovecot/dovecot.conf`:

```
# =============================================================================
# /etc/dovecot/dovecot.conf
# Domain: shaposhnikoff.dev
# =============================================================================

protocols = imap lmtp
listen = *

# ---------------------------------------------------------------------------
# Mail storage
# ---------------------------------------------------------------------------
mail_home     = /var/vmail/%d/%n
mail_location = maildir:/var/vmail/%d/%n/Maildir

mail_uid = vmail
mail_gid = vmail

# Must match the actual UID of the vmail user (check with: id vmail)
first_valid_uid = 5000
last_valid_uid  = 5000

# ---------------------------------------------------------------------------
# Authentication — flat file /etc/dovecot/users
# Format: user@domain:{SHA512-CRYPT}hash
# Generate hash: doveadm pw -s SHA512-CRYPT
# ---------------------------------------------------------------------------
passdb {
  driver = passwd-file
  args   = /etc/dovecot/users
}

userdb {
  driver = static
  args   = uid=vmail gid=vmail home=/var/vmail/%d/%n
}

# ---------------------------------------------------------------------------
# TLS — Let's Encrypt
# ---------------------------------------------------------------------------
ssl         = required
ssl_cert    = </etc/letsencrypt/live/mail.shaposhnikoff.dev/fullchain.pem
ssl_key     = </etc/letsencrypt/live/mail.shaposhnikoff.dev/privkey.pem
ssl_min_protocol = TLSv1.2

# ---------------------------------------------------------------------------
# Namespace (required — must define inbox namespace explicitly)
# ---------------------------------------------------------------------------
namespace inbox {
  inbox = yes
  location =
  prefix =
  mailbox Drafts {
    special_use = \Drafts
  }
  mailbox Junk {
    special_use = \Junk
  }
  mailbox Sent {
    special_use = \Sent
  }
  mailbox Trash {
    special_use = \Trash
  }
}

# ---------------------------------------------------------------------------
# IMAP
# ---------------------------------------------------------------------------
protocol imap {
  mail_max_userip_connections = 20
  imap_idle_notify_interval   = 2 mins
}

# ---------------------------------------------------------------------------
# LMTP — receives mail from Exim on localhost:24
# ---------------------------------------------------------------------------
protocol lmtp {
  postmaster_address = postmaster@shaposhnikoff.dev
  hostname           = mail.shaposhnikoff.dev
}

service lmtp {
  inet_listener lmtp {
    address = 127.0.0.1
    port    = 24
  }
}

# ---------------------------------------------------------------------------
# Auth socket for Exim SASL
# ---------------------------------------------------------------------------
service auth {
  unix_listener auth-client {
    mode  = 0660
    user  = Debian-exim
    group = Debian-exim
  }
}

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
log_path       = /var/log/dovecot.log
info_log_path  = /var/log/dovecot-info.log
```

---

## 10. Dovecot User Database

Generate a password hash:

```bash
doveadm pw -s SHA512-CRYPT
```

Enter your password when prompted. Copy the output hash.

Create `/etc/dovecot/users`:

```bash
# Replace the hash with the one generated above
echo 'max@shaposhnikoff.dev:{SHA512-CRYPT}$6$rounds=5000$YOUR_HASH_HERE' \
    > /etc/dovecot/users

chown root:dovecot /etc/dovecot/users
chmod 640 /etc/dovecot/users
```

> **Never** copy-paste this file from a web browser or chat — email addresses may be reformatted as markdown links `[user@domain](mailto:...)`. Always write the file directly in the terminal as shown above.

Verify the user is found:

```bash
doveadm user max@shaposhnikoff.dev
```

Expected output:

```
field   value
uid     5000
gid     5000
home    /var/vmail/shaposhnikoff.dev/max
mail    maildir:/var/vmail/shaposhnikoff.dev/max/Maildir
```

Test password authentication:

```bash
doveadm auth test max@shaposhnikoff.dev YOUR_PASSWORD
```

---

## 11. Fix File Permissions

```bash
# Exim config
chown root:Debian-exim /etc/exim4/exim4.conf
chmod 640              /etc/exim4/exim4.conf

# Virtual files
chown root:root /etc/exim4/virtual/*
chmod 644       /etc/exim4/virtual/*

# System aliases
chown root:Debian-exim /etc/aliases
chmod 640              /etc/aliases

# DKIM private key
chown root:Debian-exim /etc/exim4/dkim/mail.shaposhnikoff.dev.private
chmod 640              /etc/exim4/dkim/mail.shaposhnikoff.dev.private

# Dovecot users file
chown root:dovecot /etc/dovecot/users
chmod 640          /etc/dovecot/users

# Maildir
chown -R vmail:vmail /var/vmail
chmod -R 700         /var/vmail

# Let's Encrypt (run the deploy hook)
/etc/letsencrypt/renewal-hooks/deploy/exim4.sh
```

---

## 12. Start Services

```bash
systemctl enable --now greylistd
systemctl enable --now dovecot
systemctl enable --now exim4

# Verify all are running
systemctl status exim4 dovecot greylistd
```

Verify listening ports:

```bash
ss -tlnp | grep -E '25|465|587|143|993|24'
```

Expected output:

```
LISTEN  0.0.0.0:25    exim4
LISTEN  0.0.0.0:465   exim4
LISTEN  0.0.0.0:587   exim4
LISTEN  0.0.0.0:143   dovecot
LISTEN  0.0.0.0:993   dovecot
LISTEN  127.0.0.1:24  dovecot/lmtp
```

---

## 13. Testing

### Send a test message locally

```bash
echo "Test message" | mail -s "Test" max@shaposhnikoff.dev
tail -f /var/log/exim4/mainlog
```

A successful delivery looks like:

```
=> max@shaposhnikoff.dev R=mailbox T=dovecot_virtual_delivery
Completed
```

### Verify mail landed in Maildir

```bash
ls -la /var/vmail/shaposhnikoff.dev/max/Maildir/new/
```

### Test TLS

```bash
openssl s_client -connect mail.shaposhnikoff.dev:25 -starttls smtp \
    </dev/null 2>&1 | grep -E "subject|issuer|Protocol|Cipher"
```

### Test SMTP AUTH

```bash
# Install swaks if needed
apt install swaks

swaks --to max@shaposhnikoff.dev \
      --from max@shaposhnikoff.dev \
      --server mail.shaposhnikoff.dev \
      --port 587 \
      --tls \
      --auth LOGIN \
      --auth-user max@shaposhnikoff.dev \
      --auth-password YOUR_PASSWORD
```

### External verification

Send a test message to [mail-tester.com](https://www.mail-tester.com) to verify SPF, DKIM, DMARC, and spam score:

```bash
swaks --to test-XXXXXXX@mail-tester.com \
      --from max@shaposhnikoff.dev \
      --server mail.shaposhnikoff.dev \
      --port 587 --tls \
      --auth-user max@shaposhnikoff.dev \
      --auth-password YOUR_PASSWORD
```

### Check PTR record

```bash
dig -x YOUR_SERVER_IP +short
# Should return: mail.shaposhnikoff.dev.
```

---

## 14. Greylisting

Greylisting is already configured in the ACL — it applies only to senders listed in the Spamhaus blacklist (`zen.spamhaus.org`), not to all incoming mail. This keeps delays minimal for legitimate senders.

Whitelist a trusted IP (skip greylisting):

```bash
echo "1.2.3.4" >> /etc/greylistd/whitelist-hosts
systemctl reload greylistd
```

View greylisting statistics:

```bash
greylistd-stats
```

---

## 15. Common Errors & Fixes

### `openssl_options is set but we're using GnuTLS`

Debian builds Exim with GnuTLS, not OpenSSL. Remove `openssl_options` and use GnuTLS priority string instead:

```
# Wrong (OpenSSL syntax):
openssl_options = +no_sslv2 +no_sslv3

# Correct (GnuTLS syntax):
tls_require_ciphers = NORMAL:-VERS-SSL3.0:-VERS-TLS1.0:-VERS-TLS1.1:+VERS-TLS1.2:+VERS-TLS1.3
```

### `unknown ACL condition: spf = fail`

Native SPF checking requires Exim built with `EXPERIMENTAL_SPF=yes` — not included in the standard Debian package. Either rebuild the package or remove the SPF ACL condition and rely on DKIM + DMARC instead.

### `Tainted arg for dovecot_virtual_delivery`

Exim 4.94+ marks data received from external sources as "tainted". Fix by passing a sanitized copy via `address_data` in the router:

```
# In the mailbox router:
address_data = ${local_part}@${domain}

# In the transport command, use $address_data instead of $local_part@$domain:
# (LMTP transport is not affected — this applied to the old pipe/LDA transport)
```

### `Error while reading file` (TLS cert)

Exim cannot read the Let's Encrypt certificate. Fix permissions:

```bash
chown root:Debian-exim /etc/letsencrypt/live
chmod 750              /etc/letsencrypt/live
chown root:Debian-exim /etc/letsencrypt/live/mail.shaposhnikoff.dev
chmod 750              /etc/letsencrypt/live/mail.shaposhnikoff.dev
chown root:Debian-exim /etc/letsencrypt/archive
chmod 750              /etc/letsencrypt/archive
chown root:Debian-exim /etc/letsencrypt/archive/mail.shaposhnikoff.dev
chmod 750              /etc/letsencrypt/archive/mail.shaposhnikoff.dev
chown root:Debian-exim /etc/letsencrypt/archive/mail.shaposhnikoff.dev/*.pem
chmod 640              /etc/letsencrypt/archive/mail.shaposhnikoff.dev/*.pem
systemctl reload exim4
```

### `Mail access for users with UID XXXX not permitted`

The `vmail` user UID does not match `first_valid_uid` in `dovecot.conf`. Check the real UID and update the config:

```bash
id vmail
# Update first_valid_uid and last_valid_uid in /etc/dovecot/dovecot.conf
systemctl restart dovecot
```

### `namespace configuration error: inbox=yes namespace missing`

The `conf.d/10-mail.conf` was disabled but the inbox namespace was not defined in `dovecot.conf`. Add the namespace block:

```
namespace inbox {
  inbox = yes
  location =
  prefix =
}
```

### `routing defer (-52): retry time not reached`

Exim is waiting for the retry timer after previous delivery failures. Force an immediate queue run:

```bash
# Remove retry database
systemctl stop exim4
rm -f /var/spool/exim4/db/retry*
systemctl start exim4

# Force queue run
exim -qff
```

Remove frozen bounce messages:

```bash
exiqgrep -zi | xargs -r exim -Mrm
```

### `failed to open /etc/aliases: Permission denied`

```bash
chown root:Debian-exim /etc/aliases
chmod 640 /etc/aliases
systemctl reload exim4
```

---

## 16. Maintenance

### View mail queue

```bash
exim -bp
exim -bp | exiqsumm   # summary by domain
```

### Force queue run

```bash
exim -qff
```

### Remove all frozen messages

```bash
exiqgrep -zi | xargs -r exim -Mrm
```

### View a specific message

```bash
exim -Mvh <message-id>   # headers
exim -Mvb <message-id>   # body
exim -Mvl <message-id>   # delivery log
```

### Retry a specific message

```bash
exim -M <message-id>
```

### Check Exim configuration syntax

```bash
exim -bV        # version and compile options
exim -C /etc/exim4/exim4.conf -bV   # validate config
```

### Add a new mailbox

1. Add to `/etc/exim4/virtual/mailboxes`:
   ```
   newuser@shaposhnikoff.dev:    /var/vmail/shaposhnikoff.dev/newuser/Maildir/
   ```

2. Create Maildir:
   ```bash
   mkdir -p /var/vmail/shaposhnikoff.dev/newuser/Maildir/{cur,new,tmp}
   chown -R vmail:vmail /var/vmail/shaposhnikoff.dev/newuser
   ```

3. Generate password and add to `/etc/dovecot/users`:
   ```bash
   HASH=$(doveadm pw -s SHA512-CRYPT)
   echo "newuser@shaposhnikoff.dev:${HASH}" >> /etc/dovecot/users
   ```

4. Reload services:
   ```bash
   systemctl reload exim4
   systemctl reload dovecot
   ```

### Renew TLS certificate manually

```bash
certbot renew
# The deploy hook runs automatically and reloads Exim
```

### Monitor logs

```bash
# Exim
tail -f /var/log/exim4/mainlog

# Dovecot
tail -f /var/log/dovecot.log

# Both at once
tail -f /var/log/exim4/mainlog /var/log/dovecot.log
```

---

## Mail Client Settings

### Incoming (IMAP)

| Setting | Value |
|---------|-------|
| Server | `mail.shaposhnikoff.dev` |
| Port | `993` |
| Security | SSL/TLS |
| Username | `max@shaposhnikoff.dev` |
| Password | your password |

### Outgoing (SMTP)

| Setting | Value |
|---------|-------|
| Server | `mail.shaposhnikoff.dev` |
| Port | `587` |
| Security | STARTTLS |
| Authentication | Password |
| Username | `max@shaposhnikoff.dev` |
| Password | your password |

> Port `465` with implicit SSL is also available as an alternative to `587`.

---

*Last updated: May 2026*
