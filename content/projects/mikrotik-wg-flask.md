---
title: "mikrotik-wg-flask"
date: 2026-03-01
summary: "Flask and HTMX WireGuard config generator for MikroTik RouterOS."
status: "active"
repo: "https://github.com/shaposhnikoff/mikrotik-wg-flask"
stack: ["Python", "Flask", "HTMX", "SQLite"]
tags: ["mikrotik","wireguard","flask"]
---

## What it is

A small web app that generates WireGuard server and client configs for
MikroTik RouterOS. It builds paste-ready RouterOS commands, standard
WireGuard client `.conf` files, QR codes for mobile clients, and ZIP archives
for bulk download.

## Why it exists

The original version was a client-side Vue app. This rewrite moves key
generation and config storage server-side, which makes it easier to keep a
history of generated server and client configs instead of treating every run
as a disposable browser session.

## How it works

Flask handles the app and API routes, Jinja2 and HTMX render the UI, SQLite
stores generated configs, and Python `cryptography` generates X25519 keys and
preshared keys. The app is intentionally boring: fill in router parameters,
generate the server, generate clients, then paste the commands into RouterOS.
