---
title: "ArgoCD without the religion"
date: 2026-02-28
summary: "GitOps is great. The cult around it is not. A pragmatic ArgoCD setup that survives contact with real teams."
tags: ["kubernetes","argocd","gitops"]
topics: ["devops"]
toc: true
---

I've shipped ArgoCD to four organisations now. The setup I keep landing on
is unfashionably boring, and that's the point.

## One delivery repo, not one per app

The temptation is to give every team their own delivery repo "for
isolation." Don't. You end up writing a meta-tool that aggregates them.
Use one repo, one folder per environment, ApplicationSets to do the
multiplication.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: workloads
  namespace: argocd
spec:
  generators:
    - git:
        repoURL: https://github.com/example/delivery
        revision: HEAD
        directories:
          - path: "envs/*/apps/*"
  template:
    metadata:
      name: '{{path[1]}}-{{path[3]}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/example/delivery
        targetRevision: HEAD
        path: '{{path}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{path[3]}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
```

## App-of-apps is a smell, not a pattern

If you're three levels deep in App-of-apps, you've reinvented Helm with
extra YAML. Flatten it.

## Sync windows are non-negotiable

Production gets sync windows. Staging doesn't. This is the single most
useful operational lever ArgoCD gives you and almost nobody turns it on.

## What lives in CI vs. ArgoCD

- **CI** does: build, test, publish image, render manifests, commit to
  delivery repo.
- **ArgoCD** does: pull manifests, apply, watch, alert.

Crossing those lanes is how teams end up debugging deploys at 3 a.m.

## Drift detection is the killer feature

Forget the "declarative" rhetoric for a moment. The reason to run ArgoCD
is that it tells you, in a UI a non-engineer can read, that someone ran
`kubectl edit` on a thing they shouldn't have. That alone justifies it.
