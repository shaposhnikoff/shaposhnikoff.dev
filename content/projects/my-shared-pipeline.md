---
title: "my_shared_pipeline"
date: 2026-03-08
summary: "Reusable GitHub Actions workflows for Terraform, Python, and IaC repositories."
status: "active"
repo: "https://github.com/shaposhnikoff/my_shared_pipeline"
stack: ["GitHub Actions", "Terraform", "Python", "HCL"]
tags: ["ci","github-actions","terraform","security"]
---

## What it is

A central repository of reusable GitHub Actions workflows. Product repositories
call these workflows with `uses:` instead of copying CI logic into every repo.
The current set covers linting, Terraform validation, security scanning, cost
estimation, and scheduled security checks.

## Why it exists

CI drift is easy to create and annoying to clean up. One repository pins tool
versions differently, another skips a security check, and a third still has an
old workflow nobody wants to touch. A shared pipeline puts that logic in one
place so fixes and tool bumps roll out through a single path.

## How it works

Calling repositories keep a thin `.github/workflows/ci.yml`. The shared
workflows run path-based filtering, then blocking lint and validation jobs,
then advisory cost reporting where Terraform changes are present. The design
also pushes teams toward OIDC instead of long-lived cloud credentials.
