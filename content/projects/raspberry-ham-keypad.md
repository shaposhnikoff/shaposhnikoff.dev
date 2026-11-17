---
title: "Raspberry_Ham_Keypad"
date: 2026-05-11
summary: "Turns a USB numpad or macro pad into a control panel for a ham radio station on a Raspberry Pi."
status: "active"
repo: "https://github.com/shaposhnikoff/Raspberry_Ham_Keypad"
stack: ["Python", "evdev", "Raspberry Pi", "systemd", "YAML"]
tags: ["ham-radio","raspberry-pi","yaesu","hamlib"]
---

## What it is

A userspace daemon that reads a chosen USB keyboard, numpad or macro pad
through `evdev` and runs a configured command for each key. No kernel driver:
Linux already exposes the device as `/dev/input/eventX`.

## How it works

- Pick the device by path, name or physical port; optionally grab it
  exclusively so it stops typing into the system.
- Key-to-command mapping in YAML, using names like `KEY_F12` or `KEY_KPENTER`.
  A `--scan-keys` mode shows which name each key sends.
- Commands run one at a time by default, so two radio procedures never
  overlap. Debounce, timeouts and dry-run mode are built in.
- A small local web UI shows the devices and lets you edit bindings. It
  validates before saving, keeps a backup, and listens on localhost only
  unless told otherwise.

## Why it exists

At the station I want one physical button for things like "safe tune" or
"drop RF power" on the FTDX10, not a terminal and a `rigctl` command line.
A cheap numpad next to the radio does the job.
