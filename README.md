# ☀️ Heliophon

> **"We believe in accessibility & simplicity"**
>
> Most space-weather warnings live in dashboards, JSON feeds, and specialist charts.
> Heliophon turns them into a **soundscape you can trust with your eyes closed**.

[![NASA Space Apps 2026](https://img.shields.io/badge/NASA%20Space%20Apps-2026-0B3D91?logo=nasa&logoColor=white)](https://www.spaceappschallenge.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![Tone.js](https://img.shields.io/badge/Tone.js-14-E91E63?logo=tone.js&logoColor=white)](https://tonejs.github.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Heliophon** (Greek: *helios* = sun, *phonē* = sound) sonifies live NASA DONKI + NOAA SWPC
data into a continuous, perceptually-designed soundscape — so grid, satellite, GPS, and
aviation operators can **hear the storm coming** while their eyes are busy.

---

## ⚡ The Problem

Space weather — solar flares, CMEs, geomagnetic storms — can **collapse power grids,
disable GPS, drag satellites from orbit, and black out aviation comms**.

But today's warnings must be **watched**. In a crisis, eyes are busy. **Ears are free.**

```
   TODAY'S PIPELINE                      HELIOPHON'S PIPELINE
 ┌──────────────────────┐            ┌──────────────────────────────┐
 │  NASA DONKI (CMEs)   │            │  NASA DONKI (CMEs)           │
 │  NOAA SWPC (Kp, Dst) │            │  NOAA SWPC (Kp, Dst, GOES)   │
 │  GOES X-ray flux     │            └──────────────┬───────────────┘
 └──────────┬───────────┘                           │
            ▼                                       ▼
 ┌──────────────────────┐            ┌──────────────────────────────┐
 │  JSON tables & charts│            │  Sonification engine (Tone.js)│
 │  operator must WATCH │            │  5 layers + 5 alerts = HEAR it│
 └──────────────────────┘            └──────────────────────────────┘
```

---

## 🌟 The Wow Factors

### 1. Sound *is* the interface — five continuous layers

No melody to learn, no training required. Each data stream owns one **distinct sonic
dimension** on its own frequency band, so the brain separates them effortlessly:

```
 FREQUENCY
   ▲
   │  ♦ CME Siren (C5↔C6) ......... two-tone square = universal emergency siren
   │  ♦ GOES Lead (C4+G3) ......... dissonant dual-osc, brighter = bigger flare
   │  ♦ Kp Bass (C2 FM) ........... more harmonics = more geomagnetic tension
   │  ♦ Dst Sub-Bass (15–30 Hz) ... felt in the chest, not heard
   │  ♦ Solar Wind (brown noise) .. denser = heavier particle storm
   ▼
   └──────────────────────────────────────────────────────────────▶ TIME
```

| Layer | Data | Sound |
|-------|------|-------|
| **Kp Bass** | Kp-index 0–9 | C2 FM drone — modulation index rises with Kp |
| **GOES Lead** | Flare class A–X | Dissonant dual-osc (C4 + G3), brighter = more dangerous |
| **Dst Sub-Bass** | Ring current (nT) | 15–30 Hz rumble, amplitude = storm depth |
| **CME Siren** | CME speed (km/s) | Two-tone C5↔C6 square wave |
| **Solar Wind** | Proton flux (pfu) | Filtered brown noise, density = particle storm |

### 2. Alerts you already understand

Five threshold-triggered alerts (debounced — fire once per threshold cross):

```
        Kp rises ──────────────▶ 7 ───▶ 🔊 Grid Blackout  (deep minor chord)
        Kp rises ──────────────▶ 6 ───▶ 🔊 GPS + Satellite alerts
        Flare class ───────────▶ M/X ─▶ 🔊 Comms Blackout  (stuttering square)
        CME speed ─────────────▶ 1500 ▶ 🔊 Radiation Risk  (3 noise bursts)
```

> A siren means **"move."** A descending glide means **"falling."** A minor chord means
> **"bad."** The sound *is* the meaning — no legend memorisation needed.

### 3. A cosmic view that matches what you hear

A live canvas wireframe of the solar system — orbits at true AU distances, Parker-spiral
magnetic field lines, a physics-driven CME cone with **real arrival ETA**, magnetosphere,
bow shock and aurora ovals that compress as the storm hits.

Switch to **Earth close-up** and a big, realistic blue-marble Earth fills the view:
ocean depth gradients, rotating continents, drifting clouds, polar ice, atmospheric
halo, and a day/night terminator aligned with the Sun.

```
        ☀️ Sun                    🌍 Earth
      (left)              ┌─────────────────┐
       \                  │  ☁️ clouds      │
        \  ── solar wind ─▶│  🏔 continents  │──▶ magnetosphere,
         \                 │  🧊 ice caps    │    bow shock, aurora
                           │  🌗 terminator  │
                           └─────────────────┘
```

### 4. Honest live + simulation dual mode

- **Live**: real NOAA/NASA data, 20-min cache, manual refresh (rate-limit safe)
- **Simulation**: five documented historical storms replayed through the *identical*
  engine — Carrington 1859, Quebec 1989, Halloween 2003, May 2024, Oct 2024
- Every event carries a **confidence label** (`direct` / `partial` / `historical`) —
  we tell you exactly how trustworthy each data point is. No magic numbers, no
  fake-precision claims.

### 5. Works offline, stays honest

First load caches data in `localStorage` (20 min). When the API is unreachable the app
keeps working and **shows a "cached data" badge** with the cache age — never pretending
to be live.

### 6. Physics, not decoration

CME arrival time is computed, not faked:

```
Distance = 1 AU = 149,600,000 km
ETA (hours) = Distance / CME_Speed / 3600
```

A 1,850 km/s Halloween-class CME shows ≈ **22.5 h to Earth** on the cone label.

### 7. Accessibility first, by design

- `prefers-reduced-motion` → animations pause, **audio keeps you informed**
- Skip-to-content link, `<main>` landmark, `role="alert" aria-live="assertive"` banner
- All controls keyboard-navigable with `:focus-visible` outlines and ARIA labels
- WCAG AA contrast throughout
- Screen-reader-friendly sonification guide at **`/sonification`**
  (3 tabs: Layers / Alerts / Principles)

---

## 📚 Historical Event Library

Five documented storms for guaranteed offline demo:

| Event | Date | CME | Flare | Kp | Dst | Confidence |
|-------|------|-----|-------|----|-----|------------|
| Carrington 1859 | 1–2 Sep 1859 | ~2,000 km/s | X45* | 9 | −1,600 nT | historical |
| Quebec 1989 | 13 Mar 1989 | 2,000 km/s | X15 | 9 | −589 nT | partial |
| Halloween 2003 | 28 Oct–4 Nov 2003 | 1,850 km/s | X17.2 | 9 | −383 nT | direct |
| May 2024 Superstorm | 10–11 May 2024 | 800 km/s | X5.8 | 8 | −412 nT | direct |
| October 2024 Storm | 10–11 Oct 2024 | 1,100 km/s | X9.0 | 8 | −518 nT | direct |

> *Carrington flare class estimated; Dst from ice-core proxies — labelled `historical`
> in-app rather than passing reconstruction off as measurement.

---

## 🚀 Run It

```bash
# Clone & install
git clone https://github.com/CTRLD3FEAT/Heliophon.git
cd Heliophon && npm install

# Optional: NASA API key for DONKI CME data (NOAA endpoints work without)
echo "NEXT_PUBLIC_NASA_API_KEY=your_key" > .env.local

# Run
npm run dev  # http://localhost:3000
```

**Deploy**: push to `main` → Vercel auto-deploys. Add `NEXT_PUBLIC_NASA_API_KEY` in
Vercel settings.

▶ **Play Space Weather** (requires one user gesture to start audio)
📂 **Select a historical storm** in the sidebar for offline replay
📖 **"What you're hearing"** opens the `/sonification` guide

---

## 📡 Data Sources

| Source | What it gives | Endpoint | Docs |
|--------|--------------|----------|------|
| **NASA DONKI** | CME speed, half-angle, direction, active region | `https://api.nasa.gov/DONKI/CME?startDate=…&endDate=…` (API key) | [kauai.ccmc.gsfc.nasa.gov/DONKI](https://kauai.ccmc.gsfc.nasa.gov/DONKI/) · [api.nasa.gov](https://api.nasa.gov/) |
| **NOAA GOES X-ray flux** | Flare class A–X (0.1–0.8 nm, 6 h) | [services.swpc.noaa.gov/json/goes/primary/xrays-6-hour.json](https://services.swpc.noaa.gov/json/goes/primary/xrays-6-hour.json) | [GOES X-ray flux product](https://www.swpc.noaa.gov/products/goes-x-ray-flux) |
| **NOAA Planetary Kp (observed)** | Kp-index 0–9 | [services.swpc.noaa.gov/products/noaa-planetary-k-index.json](https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json) | [Planetary K-index](https://www.swpc.noaa.gov/products/planetary-k-index) |
| **NOAA Planetary Kp (3-day forecast)** | Forecast Kp | [services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json](https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json) | [Kp forecast](https://www.swpc.noaa.gov/products/planetary-k-index-forecast) |
| **Kyoto WDC Dst (NOAA mirror)** | Dst ring-current index (nT) | [services.swpc.noaa.gov/products/kyoto-dst.json](https://services.swpc.noaa.gov/products/kyoto-dst.json) | Produced by [Kyoto WDCG](http://wdc.kugi.kyoto-u.ac.jp/dst_realtime/presentmonth/index.html) |
| **NOAA Solar–Geophysical Event summary** | Flare/probability forecast | [services.swpc.noaa.gov/products/solar-geophysical-event.json](https://services.swpc.noaa.gov/products/solar-geophysical-event.json) | [SWPC products](https://www.swpc.noaa.gov/products) |

**Attribution**: NASA DONKI · NOAA SWPC · Kyoto WDC · Tone.js

---

## 🏗️ Architecture

```
 app/page.tsx ──▶ nasa-api.ts ──▶ src/types/index.ts   (contract: SpaceWeatherEvent)
     │                │
     │                └──▶ 20-min localStorage cache + offline fallbacks
     │
     ├──▶ components/dashboard/Dashboard.tsx   (HUD: details, impacts, alerts)
     ├──▶ components/ui/EventSidebar.tsx       (live feed + historical library)
     ├──▶ components/visual/CosmicAnimation.tsx (canvas: solar system / Earth)
     ├──▶ components/visual/{Audio,Frequency}Visualizer.tsx
     ├──▶ components/audio/AudioEngine.tsx     (5 layers + 5 alerts, Tone.js)
     ├──▶ components/ui/EducationalPanel.tsx   (quick-reference modal)
     └──▶ app/sonification/                    (screen-reader guide, 3 tabs)
```

**Contract-first**: every component consumes the single `SpaceWeatherEvent` interface —
live data, mock data, and historical JSON all speak the same shape.

---

## ♿ Accessibility

- **ARIA live regions** for real-time alerts
- **Keyboard nav** throughout; skip-to-content link as first focusable element
- **Reduced motion**: `prefers-reduced-motion` pauses canvases, audio continues
- **Colour-blind safe**: no red/green sole encoding
- **Screen readers**: all controls labelled; sonification guide is fully navigable
- **WCAG AA** contrast ratios

---

## 🎯 Submission Checklist

- [x] Live app (Vercel)
- [x] README with NASA/NOAA/Kyoto attribution
- [x] 5-event historical library (offline demo)
- [x] Live visualizer + physics-based CME ETA + realistic Earth close-up
- [x] 5-layer sonification + 5 threshold alerts
- [x] Accessibility audit (skip link, contrast, ARIA, reduced motion)
- [x] `/sonification` screen-reader guide
- [ ] 60s demo video
- [ ] 7-slide pitch deck
- [ ] NASA portal submission

---

## 📄 License

MIT — free for any use. Attribution appreciated.

---

*Built for NASA Space Apps Challenge 2026 by Team NRZB —
[code](https://github.com/CTRLD3FEAT/Heliophon).*
