---
title: "tfdrift"
date: 2025-09-14
summary: "Detect Terraform drift across hundreds of stacks without running plan everywhere."
status: "active"
repo: "https://github.com/shaposhnikoff/tfdrift"
stack: ["Go", "Terraform", "AWS"]
tags: ["terraform","drift","tooling"]
---

## What it is

`tfdrift` is a small Go tool that walks a tree of Terraform stacks, runs
`terraform plan` in batches with a configurable concurrency, and emits a
single newline-delimited JSON report you can ship to S3 or splunk.

## Why it exists

We had ~280 Terraform stacks across 14 AWS accounts. The naive answer
("Atlantis on every PR") didn't catch drift introduced outside Git, and the
batch answer (`for d in stacks; do terraform plan; done`) took about
nine hours. `tfdrift` runs the same workload in roughly 18 minutes by
parallelising aggressively, sharing provider plugin caches, and skipping
stacks whose state hasn't changed since the last run.

## How it works

- Walks `**/*.tf` recursively, treating each leaf directory as a stack
- Reads stack metadata from a sidecar `tfdrift.toml` (account, region, owner)
- Spins up a worker pool sized to `min(NumCPU * 2, 32)`
- Streams plan output through a parser that classifies each change as
  `add`, `change`, `destroy`, `replace`, or `noop`
- Emits one NDJSON record per stack and exits non-zero if any drift is
  detected
