# Heliophon — 5-Minute Pitch

## Hook (0:00–0:15)

> **"Most of the time, people have to stare at complex charts to get space weather warnings. We believe in accessibility as well as urgency — so we built Heliophon: a system that lets you *hear* the state of the grid."**

---

## The Problem (0:15–0:45)

Space weather — solar flares, CMEs, geomagnetic storms — can **collapse power grids, disable GPS, drag satellites from orbit, and black out aviation comms**.

But today's warnings live in **NOAA dashboards, JSON feeds, and specialist charts**. Operators must *watch* them. In a crisis, eyes are busy. Ears are free.

---

## The Solution: Heliophon (0:45–2:00)

**Heliophon** (Greek: *helios* = sun, *phonē* = sound) turns live NASA/NOAA data into a **continuous, perceptually-designed soundscape**.

### 5 Continuous Layers — always playing, always telling you the state:

| Layer | Data | Sound | Why it works |
|-------|------|-------|--------------|
| **Kp Bass** | Kp-index 0–9 | C2 drone + FM harmonics | Timbre = tension (no melody to learn) |
| **GOES Lead** | Flare class A–X | Dissonant dual-osc (C4+G3) | Brightness + minor 7th = danger |
| **Dst Sub-Bass** | Ring current (nT) | 15–30 Hz rumble | *Felt* in chest — somatic warning |
| **CME Siren** | CME speed | Two-tone C5↔C6 square wave | Euro emergency siren pattern = universal |
| **Solar Wind** | Proton flux | Filtered brown noise | Density = particle storm intensity |

### 5 Event Alerts — threshold-triggered, debounced:

- **Grid Blackout** (Kp≥7): Deep minor chord
- **GPS Disruption** (Kp≥6 or M/X): Glitchy FM trills
- **Satellite Drag** (Kp≥6): Descending sawtooth glide
- **Radiation Risk** (X-flare/fast CME): 3 noise bursts
- **Comms Blackout** (M/X flare): Stuttering square wave

> **No training required.** A siren means "move." A descending glide means "falling." A minor chord means "bad." The sound *is* the meaning.

---

## Live + Simulation Dual Mode (2:00–2:45)

- **Live**: Real NOAA/NASA data, 20-min cache, manual refresh (rate-limit safe)
- **Simulation**: 5 historical events — Carrington 1859, Halloween 2003, May 2024, Quebec 1989 — for training and demos
- **One click switches**. The sonification engine is identical.

---

## Visuals That Match the Sound (2:45–3:30)

- **Solar System view**: Wireframe CME cone, magnetopause, orbits
- **Earth Inset**: Real-time magnetosphere compression + aurora ovals
- **Audio Visualizer**: Live waveform + frequency bars (red when blackout risk)
- **Alert Banner**: Red glow, pulse animation, hover tooltip — "Appears only for G3+ watches"

---

## Accessibility First (3:30–4:00)

- `prefers-reduced-motion` → animations pause, **audio continues**
- Full ARIA: `role="alert"`, `aria-live="assertive"`, keyboard navigation
- Screen-reader friendly sonification guide at `/sonification` (3 tabs: Layers / Alerts / Principles)
- **Not an official warning** — perceptual design, transparent data sources

---

## Tech & Deployment (4:00–4:30)

- **Next.js 15 + TypeScript + Tailwind v4 + Tone.js**
- **Static export** → deploys to Vercel in seconds, zero backend cost
- **20-min localStorage cache** → no API abuse, works offline after first load
- **Open data**: NASA DONKI, NOAA SWPC/GOES, Kyoto WDC — all attributed

---

## Why This Wins (4:30–5:00)

| Category | Heliophon |
|----------|-----------|
| **Art & Technology** | Sound *is* the interface — not a chart sonified after the fact |
| **Most Inspirational** | Makes invisible threat visceral; eyes-free ops for grid/sat/aviation |
| **Global Impact** | Runs anywhere with a browser; zero infrastructure |
| **Best Use of Data** | 4 live sources, mapped to 5 perceptual dimensions + 5 alerts |

---

## Closing (5:00)

> **"Heliophon gives operators a new sense — hearing the sun. When the grid is at risk, you don't need to look. You'll *know*."**

**[Demo: Play → Switch to Quebec 1989 → Open `/sonification` → Show alert banner]**

---

**Name**: Heliophon  
**Team**: NRZB  
**Challenge**: NASA Space Apps 2026  
**Live**: `https://heliophon.vercel.app` (or your deploy URL)