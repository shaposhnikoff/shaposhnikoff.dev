---
title: "Cloud"
description: "Notes on cloud infrastructure: AWS-first, multi-account landing zones, isolation, cost."
date: 2026-01-01
---

I think of "cloud" as a discipline, not a vendor. The job is the same
everywhere: clear boundaries, written intent, and small reversible changes.
This page is a permanent draft of the patterns I keep returning to.

## What I work on

- **Landing zones.** Multi-account AWS organisations with strong SCP-driven
  guardrails. Central logging, central network, isolated workload accounts.
- **Identity.** AWS IAM Identity Center as the front door. Minimal long-lived
  credentials. Workload identity over keys, always.
- **Network.** Hub-and-spoke with Transit Gateway when the org is big enough
  to justify it. Otherwise, plain VPC peering and good docs.
- **Cost.** Tagging that's enforced at create-time, not audited after the
  fact. Anomaly alarms. Reserved capacity bought against actual baselines,
  not vendor pitches.

## Stack I reach for first

- Terraform (state in S3 + DynamoDB lock, one state per account/region)
- AWS Control Tower / Organizations / SCPs
- AWS IAM Identity Center
- EKS, with addons managed as separate Terraform stacks
- AWS Backup (centralised), AWS Config (organisation aggregator)
- Datadog or Grafana Cloud — never both

## Recent posts

See the [blog](/blog/) for write-ups tagged `cloud`.
