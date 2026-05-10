---
title: "shelly_rpc_lib"
date: 2026-03-26
summary: "Python client library for the local Shelly RPC API."
status: "active"
repo: "https://github.com/shaposhnikoff/shelly_rpc_lib"
stack: ["Python", "Shelly RPC", "HTTP"]
tags: ["shelly","rpc","python","library"]
---

## What it is

A Python library for talking to local Shelly Gen2, Gen3, and Gen4 devices
through their RPC API. It wraps `http://<device>/rpc`, supports digest
authentication, and exposes a small set of convenience methods for common
operations.

## Why it exists

Shelly's local API is useful, but small automation scripts should not have to
repeat transport, JSON-RPC, authentication, and error-handling code every time.
This library gives those scripts one client and one error model.

## What it covers

The first version includes generic RPC calls plus helpers for
`Shelly.GetDeviceInfo`, `Shelly.GetStatus`, `Switch.GetStatus`, `Switch.Set`,
and `Switch.Toggle`. Transport errors and RPC errors are separated so callers
can decide whether to retry, report, or fail fast.
