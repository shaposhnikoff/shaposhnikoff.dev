---
title: "deye-6-modbus-management"
date: 2026-10-20
summary: "Read-only Modbus RTU monitoring for a Deye hybrid inverter on a Raspberry Pi: Prometheus metrics, MQTT and Telegram alerts."
status: "active"
repo: "https://github.com/shaposhnikoff/deye-6-modbus-management"
stack: ["Python", "Modbus RTU", "RS485", "Raspberry Pi", "Prometheus", "MQTT"]
tags: ["deye","modbus","solar","energy","prometheus","raspberry-pi"]
---

## What it is

A monitoring service for a Deye hybrid inverter (tested on a single-phase
SUN-6K). A Raspberry Pi talks to the inverter's Modbus port over an isolated
USB-RS485 adapter and reads PV, battery, grid and temperature values.

It only ever sends Modbus function `03` (read holding registers). There is no
write path in the code, so it cannot reconfigure the inverter by accident.

## How it works

- `dmon` CLI: one-shot table, JSON line, raw register dump, or a polling loop.
- A collector service owns the serial port, serves `/metrics` for Prometheus
  and writes the latest state to a cache file.
- A separate publisher reads that cache and pushes values to MQTT for Home
  Assistant, so it never competes for the serial port.
- Built-in Telegram alerts for failed reads, stale data and overheating. No
  Alertmanager needed.

## Why it exists

The vendor cloud is slow and opaque. I wanted the numbers locally, every few
seconds, in the same Prometheus and Grafana I use for everything else. The
README also covers the wiring and RS485 pitfalls I ran into.
