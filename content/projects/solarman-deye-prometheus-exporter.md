---
title: "solarman-deye-prometheus-exporter"
date: 2026-07-28
summary: "Prometheus exporter for Deye hybrid inverters through the Solarman V5 Wi-Fi logger, with a ready Grafana dashboard."
status: "active"
repo: "https://github.com/shaposhnikoff/solarman-deye-prometheus-grafana-"
stack: ["Python", "Solarman V5", "Prometheus", "Grafana", "Docker"]
tags: ["deye","solarman","solar","prometheus","grafana"]
---

## What it is

A standalone exporter for Deye hybrid inverters that have a Solarman V5 logger.
It polls the logger over the local network and exposes the latest complete
reading as Prometheus metrics.

## How it works

- Field mapping lives in a YAML profile; values come out in SI units.
- Status fields (grid, battery, work mode) get both a numeric metric and an
  `_info` metric with a readable state label.
- Health endpoints: `/health` for liveness, `/ready` only after a fresh
  successful poll, plus metrics for data age and poll failures.
- Ships with a Grafana dashboard: generation, grid and load power, battery
  state, daily energy and exporter health.
- Runs in Docker or as a systemd service.

## Why it exists

It was the first way I got inverter data without the vendor app: no extra
hardware, just the Wi-Fi logger that was already there. The direct Modbus
version, [deye-6-modbus-management](/projects/deye-6-modbus-management/), came
later for faster and more reliable reads.
