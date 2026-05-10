---
title: "k8s-attic"
date: 2025-05-02
summary: "A daily cron that finds and gently warns about abandoned Kubernetes resources."
status: "active"
repo: "https://github.com/shaposhnikoff/k8s-attic"
stack: ["Go", "Kubernetes", "Slack"]
tags: ["kubernetes","cleanup"]
---

## What it is

A small controller that finds Kubernetes resources nobody loves anymore —
deployments scaled to zero for 30+ days, PVCs unbound, ConfigMaps with no
references — and posts a polite weekly digest to Slack.

## Why it exists

Cluster sprawl is real and silent. Nothing pages, but six months later
your cluster has 800 unused ConfigMaps and three leaked LoadBalancers
quietly costing $40 each.
