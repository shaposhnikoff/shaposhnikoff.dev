---
title: "cw-trainer"
date: 2026-03-21
summary: "Linux terminal Morse code trainer for iambic paddles."
status: "experimental"
repo: "https://github.com/shaposhnikoff/cw-trainer"
stack: ["Go", "Linux", "ALSA", "TUI"]
tags: ["ham","morse","go","tui"]
---

## What it is

A pair of Linux terminal tools for practicing Morse code with an iambic paddle.
`cw-trainer` decodes paddle input in real time, plays an audio tone, and shows
the decoded text in a TUI. `cw-groups` plays character groups and checks typed
answers for Koch-style practice sessions.

## Why it exists

Most Morse trainers either assume keyboard input or hide too much of the real
keying behavior. This one reads Linux `evdev` events from a real paddle, uses
ALSA for sound, and keeps the feedback loop in the terminal.

## Status

It is Linux-only and expects the paddle to appear as `/dev/input/eventN`.
That is a deliberate tradeoff: less portability, but direct access to the
input events needed for real-time iambic A/B decoding.
