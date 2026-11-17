---
title: "hoseline-bm-console-player"
date: 2026-10-03
summary: "Listen to BrandMeister DMR talkgroups in a local web dashboard or in the terminal, with optional WAV recording."
status: "active"
repo: "https://github.com/shaposhnikoff/hoseline-bm-console-player"
stack: ["Python", "WebSocket", "JavaScript", "Docker", "mpv"]
tags: ["ham-radio","dmr","brandmeister"]
---

## What it is

A player for BrandMeister Hoseline, the network's public listen-in stream. It
comes in two forms: a local web dashboard and a console player.

## How it works

- **Web dashboard** (Docker or `uv run`): current and recent calls from BM Last
  Heard, filtering by country and talkgroup, search with regex, favorites, and
  a mixer for up to four talkgroups. Audio plays in the browser; known
  callsigns link to QRZ.com and RadioID.
- **Console player**: joins a talkgroup over WebSocket, decodes G.711 mu-law
  and feeds it to `mpv`. At each call it prints the operator's callsign, name
  and location from a local BrandMeister user export, plus the callsign
  spelled in the phonetic alphabet.
- Optional per-call WAV recording in both modes.

There is a [short interface demo](https://youtube.com/shorts/05-hRPGhAFA) on
YouTube.

## Why it exists

I wanted to keep a few talkgroups running in the background on a laptop without
a radio or a hotspot, and to see who is talking without looking it up by hand.
