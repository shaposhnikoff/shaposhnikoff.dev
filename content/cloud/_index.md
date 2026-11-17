---
title: "Cloud"
description: "AWS and Azure, Terraform, cost, observability - and where LLMs actually help in day-to-day infra work."
date: 2026-01-01
---

I've been running infrastructure for a long time, mostly on AWS and Azure these
days. Most of my work comes down to the same few things: make environments
reproducible, make them visible, and stop paying for things nobody uses.

## What I actually do

**Infrastructure as code.** Terraform and Terragrunt for the cloud, Ansible for
whatever still has an OS to configure. Multi-account on AWS, multi-subscription
on Azure. If a change didn't go through a plan and a review, I assume it will
drift - and it usually does.

**Delivery.** GitHub Actions, GitLab CI, Jenkins, Tekton, Argo CD - I've
maintained all of them, and the pipelines I like best are the boring ones.
Shared workflows, pinned versions, a build check on every PR. Some of that lives
in [my-shared-pipeline](/projects/my-shared-pipeline/).

**Observability.** Prometheus and Grafana, alerts that someone actually reads.
If I can't answer "what changed?" from dashboards during an incident, the
monitoring isn't done yet.

**Cost.** I treat the cloud bill as an engineering metric. Inventory scripts,
lifecycle rules, rightsizing, cross-cloud reports that turn "we spend too much"
into a list of specific resources and owners.

**Data platforms.** EMR, Glue, Databricks, Airflow, Snowflake - mostly from the
infrastructure side: IAM, networking, keeping the jobs running and the bill sane.

## Where AI fits in

I use LLMs as a working tool, not a slide. Where they've earned a place for me:

- **Migrations.** I built a converter on Claude that turns `.gitlab-ci.yml` into
  GitHub Actions workflows and writes down what it mapped, what it assumed and
  what it couldn't translate. The notes turned out to matter more than the YAML.
- **Reviewing and validating config** - Terraform plans, CI files, policies.
  A second pair of eyes that doesn't get bored on line 400.
- **Documentation** that would otherwise never get written: runbooks, change
  notes, explanations of legacy setups.

The rules I stick to: no secrets or customer data in prompts, inputs get
sanitized, output gets reviewed like any other pull request. The model drafts;
a human (me) decides what ships.

Next on my list is the other direction - running AI workloads, not just using
them: GPU capacity and its cost, private model endpoints, and guardrails around
who can send what to which model.

## How I like to work

- Everything in git, nothing clicked in a console "just this once".
- Least privilege by default; secrets live in Key Vault / Secrets Manager, never
  in repos.
- If it can't be observed, it isn't in production yet.
- The simplest setup the team can still run at 3 a.m. wins.

More detail in the [CV](/cv/), or just [write to me](/contact/).
