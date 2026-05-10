---
title: "Designing an AWS landing zone you can defend in writing"
date: 2026-04-12
summary: "Most landing zones drift because they were never written down. Here's the document I make every team produce before any HCL is committed."
tags: ["aws","landing-zone","architecture"]
topics: ["cloud"]
toc: true
---

The mistake I see most often is treating the landing zone as a Terraform
problem. It is not. It's a *governance* problem with a Terraform front-end.
This post is the document I make every team produce — in plain prose,
before any HCL — and the rough shape of the implementation it justifies.

## The two-page brief

Every landing zone starts with a two-page document. Not three, not five.
Two. It answers four questions:

1. **What are the boundaries?** What does an "account" mean here — a
   product, a team, an environment, a customer?
2. **Who can do what?** Roles, scopes, escalation paths.
3. **How does data leave?** Egress controls, peering, internet exposure.
4. **What is logged, and where?** Centralised audit, retention, who reads.

If you can't answer those in two pages, you are not ready to write
Terraform yet.

## Account topology

A topology I've shipped four times now and would ship again:

- **management** — billing, Organizations, SCPs. No workloads. Ever.
- **log-archive** — immutable bucket, KMS-CMK, two-region replication.
- **audit** — read-only access for security; runs Detective, Security Hub.
- **shared-services** — central VPC, Transit Gateway, DNS, CI runners.
- **identity** — AWS IAM Identity Center home account.
- **network** — public-facing perimeter (WAF, CloudFront origins).
- **workload-prod-N** — one per product or blast-radius boundary.
- **workload-stage-N** — mirror of prod for dogfood / staging.
- **sandbox-${user}** — auto-expiring 30-day sandboxes for engineers.

The point isn't the names. The point is that every account has exactly
one job and the SCPs reflect that.

## SCPs are a feature, not a chore

Service Control Policies are how you keep accounts honest. The pattern I
like:

- A baseline SCP attached to the org root: deny anything obviously
  catastrophic (root user actions, IAM user creation, leaving the
  region allow-list).
- A workload SCP attached to the workload OU: deny disabling
  CloudTrail, deny `s3:PutBucketPolicy` that allows public, deny
  `iam:CreateAccessKey`.
- An exception OU you can move accounts into temporarily, with a
  scheduled CI job that moves them back after seven days.

```hcl
resource "aws_organizations_policy" "deny_leave_region" {
  name = "deny-leave-region"
  type = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "DenyOutsideAllowedRegions"
      Effect    = "Deny"
      Action    = "*"
      Resource  = "*"
      Condition = {
        StringNotEquals = { "aws:RequestedRegion" = ["eu-central-1", "eu-west-1"] }
      }
    }]
  })
}
```

## Identity, briefly

- AWS IAM Identity Center, federated to your IdP.
- Permission sets, never inline policies.
- One break-glass IAM user per account, MFA, password in a vault, used
  twice a year for a fire drill and never otherwise.

{{< note kind="warn" label="// don't do this" >}}
If your incident response plan involves "log in as root," you don't have
an incident response plan. You have an outage with extra steps.
{{< /note >}}

## What this looks like at the end

Six months in, a healthy landing zone has these properties:

- A new product team can get a pair of accounts (prod + stage) on the
  same day they ask, via a self-service workflow.
- Nobody has long-lived credentials.
- Every API call lands in one S3 bucket, in one account, replicated to
  one region you don't normally use.
- Cost can be sliced by team, product, environment and (most usefully)
  service in less than thirty seconds.

That's the bar. It's an unromantic bar. It's the right bar.

## Further reading

- AWS Well-Architected — Security pillar
- *Building Secure & Reliable Systems* (Google SRE)
- The original Control Tower whitepaper, which is short and good
