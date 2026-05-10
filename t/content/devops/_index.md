---
title: "DevOps"
description: "Pipelines, GitOps, Kubernetes, observability — what I actually run."
date: 2026-01-01
---

DevOps is a job description, not an architecture. What I actually do:

- shorten the path from `git push` to "running in production"
- make rollback the default, not the exception
- give engineers a self-service platform that doesn't require my approval
- own the parts of "operations" that don't have a clear owner yet

## How I run pipelines

- **Trunk-based** with required checks and short-lived branches
- One pipeline definition per repo, committed alongside the code
- Build → test → publish artefact → render manifests → push to a delivery repo
- Deployment is a pull from the cluster, not a push from CI (GitOps)

## How I run Kubernetes

- Managed control plane (EKS) wherever possible
- One cluster per blast-radius boundary, not one per environment
- Workloads expressed as Helm/Kustomize, applied by ArgoCD
- Cluster addons (cert-manager, external-dns, etc.) are versioned in a
  separate "platform" repo and rolled out through the same pipeline

## Observability

- Metrics, logs, traces — all three, no exceptions
- Prometheus/Mimir for metrics, Loki for logs, Tempo for traces
- Alert on **symptoms**, page only on **user-visible errors**
- An SLO doc per service, owned by the team that wrote the service

## A short opinion list

- YAML is fine. JSON-with-comments would be better.
- Most outages are a deploy or a DNS change. Look there first.
- If your runbook is a video, you don't have a runbook.

See the [blog](/blog/) for posts tagged `devops`.
