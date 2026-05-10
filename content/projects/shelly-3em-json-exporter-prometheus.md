---
title: "shelly_3em_json_exporter_prom"
date: 2026-02-08
summary: "Prometheus monitoring setup for Shelly 3EM through JSON Exporter."
status: "active"
repo: "https://github.com/shaposhnikoff/shelly_3em_json_exporter_prometheus"
stack: ["Python", "Prometheus", "JSON Exporter", "Shelly"]
tags: ["shelly","prometheus","energy","monitoring"]
---

## What it is

A Prometheus monitoring setup for a Shelly 3EM three-phase energy monitor. It
uses Prometheus JSON Exporter to poll Shelly's local RPC status endpoint and
turn the JSON response into scrapeable metrics.

## What it collects

The exporter maps per-phase current, voltage, active power, apparent power,
power factor, frequency, and energy counters. It also exposes total power and
energy, device uptime, RAM, temperature, Wi-Fi RSSI, cloud status, and MQTT
status.

## Why it exists

Shelly already exposes the data locally, but dashboards and alerts need the
data in a time-series system. This project is the thin bridge between the
device API, Prometheus, and Grafana.
