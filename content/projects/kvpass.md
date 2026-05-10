---
title: "kvpass"
date: 2026-03-09
summary: "Command-line password manager backed by Azure Key Vault."
status: "active"
repo: "https://github.com/shaposhnikoff/kvpass"
stack: ["Python", "Azure Key Vault", "CLI"]
tags: ["azure","keyvault","passwords","cli"]
---

## What it is

`kvpass` is a command-line password manager that stores secrets in Azure Key
Vault. The shape is close to `pass`: hierarchical names like
`prod/db/password`, quick reads and writes, search, editor support, clipboard
copy, and access to previous secret versions.

## Why it exists

GPG-backed password stores are simple and pleasant, but they do not always fit
teams already living in Azure. `kvpass` keeps the terminal workflow while using
Key Vault for storage, auditability, and access control.

## Status

It is a focused CLI for people who already have Azure authentication and a Key
Vault in place. The tool keeps its own namespace prefix so it can share a vault
with other secrets without making the secret list messy.
