---
title: "Ham Radio"
description: "Amateur radio: HF/VHF operating, weak-signal modes, antennas, propagation logs."
date: 2026-01-01
---

I'm an amateur radio operator. The hobby is the cleanest counterweight to
day-job cloud work I've found: a long, narrow band of physics that doesn't
care about Kubernetes. Most of my time is on **20m and 40m SSB**, with
**FT8** and **CW** when conditions are bad. {{< signal label="20m · SSB · 14.205 MHz" >}}

## Station

| | |
|---|---|
| Transceiver | Yaesu FT-991A |
| Antenna (HF) | End-fed half-wave, 40m–10m, ~12 m above ground |
| Antenna (VHF) | Diamond X-300 vertical |
| Logger | CQRLOG (Linux) → ADIF → LoTW & QRZ |
| Logging machine | A small fanless mini-PC running Debian, syncs to my home Nextcloud |

## Logbook (recent)

<div class="cv-row">
  <div class="cv-row__when">2026-04-22</div>
  <div>
    <div class="cv-row__role">DX · 20m SSB · 59/57</div>
    <div class="cv-row__org">// VK4 → OK · ~15,800 km · long path</div>
  </div>
</div>
<div class="cv-row">
  <div class="cv-row__when">2026-04-19</div>
  <div>
    <div class="cv-row__role">FT8 · 40m</div>
    <div class="cv-row__org">// 14 contacts in one evening, mostly EU + W1</div>
  </div>
</div>
<div class="cv-row">
  <div class="cv-row__when">2026-04-12</div>
  <div>
    <div class="cv-row__role">CW · 30m · QRP 5 W</div>
    <div class="cv-row__org">// patient. enjoyable. recommend.</div>
  </div>
</div>

## Antenna notes

I run an end-fed half-wave with a 49:1 unun, fed with about 18 m of LMR-400.
SWR is below 2.0 across 40, 20, 17, 15 and 10. I keep a small folder of
antenna analyzer sweeps in `/ham/antennas/`; if you're building one, the
short version is *raise it higher than you think you need to*.

## Why

Radio is a way to keep talking to the physical world. Signals fade, the
ionosphere shifts at sunset, and you can't `kubectl rollout undo` a bad
solar storm. It's also a tradition — I'm one of millions on the bands
on any given evening, and the etiquette is good.

## Useful

- [QRZ profile](#)
- [LoTW](https://lotw.arrl.org/)
- [DX cluster](http://www.dxsummit.fi/)
