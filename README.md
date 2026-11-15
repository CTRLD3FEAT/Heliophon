# Solar Jukebox

An **accessible space weather sonification** built for the **NASA Space Apps Challenge 2026** — *The Earth Information Jukebox* track.

We turn NASA and NOAA space weather data into sound so operators can *hear* the state of the grid before something goes wrong. The story is told from the ground up: what reaches the power grid, the satellites, and the GPS you depend on.

## 🗺️ Regional Impact

A **regional impact map** is planned but not yet built — this is a known MVP gap. For now, regional consequences are surfaced two ways:

- **Historical events** (left sidebar) each carry a documented `_meta.impact` string (e.g. "Complete grid collapse in Quebec, transformer damage in NJ/US").
- **Ground impacts** panel (right sidebar) shows aggregate severity bars for power grids (GICs), satellites (drag), GPS (scintillation), and aviation (HF blackout), derived from the live Kp-index and flare class.

## 📚 Historical Event Library

Five documented storms are available in the sidebar for offline replay:

| Event | Date | CME Speed | Flare | Kp | Dst | Confidence |
|-------|------|-----------|-------|----|-----|------------|
| Carrington 1859 | 1–2 Sep 1859 | ~2,000 km/s | X45 | 9 | −1,600 nT | historical |
| Quebec 1989 | 13 Mar 1989 | 2,000 km/s | X15 | 9.0 | −589 nT | direct |
| Halloween 2003 | 28 Oct–4 Nov 2003 | 1,850 km/s | X17.2 | 9 | −383 nT | direct |
| May 2024 | 10–11 May 2024 | 800 km/s | X5.8 | 9 | −412 nT | direct |
| October 2024 | 10–11 Oct 2024 | 1,100 km/s | X9.0 | 9 | −518 nT | direct |

## 🎵 What You're Hearing

The sound is a **perceptual sonification** — a documented design choice, not a physical measurement. We do not issue alerts; we communicate NOAA SWPC data.

### Continuous Layers (5-layer sonification)

| Layer | What It Maps To | Sound Character |
|-------|----------------|-----------------|
| **Kp Bass Drone** | Kp-index 0–9 | Fundamental + harmonic (G0–G5 scale), low hum |
| **GOES Lead Synth** | X-ray flare class (A–X) | Filter brightness, oscillator type, mid-range tone |
| **Dst Sub-Bass** | Dst index (nT) | Ultra-low rumble (15–30 Hz), felt more than heard |
| **CME Arpeggiator** | CME speed (km/s) | Arpeggio rate, harmonic complexity |
| **Solar Wind Texture** | Proton flux (pfu) | Filtered noise density & color |

### Event-Triggered Alerts (threshold-cross)

| Alert | Trigger | Sound |
|-------|---------|-------|
| **Grid Blackout** | G3+ (Kp ≥ 7) | Deep minor chord |
| **GPS Disruption** | G2+ (Kp ≥ 6) or M/X flare | High glitchy trills |
| **Satellite Drag** | G2+ (Kp ≥ 6) | Descending glide |
| **Radiation Risk** | X-flare or fast CME | Noise bursts |
| **Comms Blackout** | M/X flare | Stuttering square |

**Audio graph** (Tone.js):

```
KpBass ──┐
GOESLead ┤
DstSub   ├─► MasterGain ──► Destination
CMEArp   ┤
SWNoise  ┘
```

- **Kp Bass** maps to storm energy (G0–G5 scale).
- **GOES Lead** brightness maps to X-ray flare class.
- **Dst Sub-Bass** amplitude maps to |Dst| storm depth.
- **CME Arp** rate maps to CME speed.
- **Solar Wind** density maps to proton flux.
- Alerts fire once per threshold cross (debounced).

## 🚀 Run It

```bash
npm install
npm run dev
# open http://localhost:3000
```

Click **▶ Play Space Weather** to start audio (browser requires a user gesture).
Select any of the five historical storms in the left sidebar to replay them offline — this guarantees a reliable demo even when the live APIs are down.

**Deploy:** push to `main` and Vercel auto-deploys. The app reads `NEXT_PUBLIC_DEPLOY_URL` for the shareable link; if unset it falls back to `localhost:3000`.

## 📡 Data Sources

- **NASA DONKI API** — CME (coronal mass ejection) and FLS (solar flare) data.
- **NOAA SWPC** — Planetary Kp-index and G-scale geomagnetic storm warnings.

The app degrades gracefully: if either API fails, it falls back to `src/data/mock-storm.json` and shows a **"Cached data"** notice. In simulation mode it uses `src/data/quebec-1989.json`.

## 📖 The Quebec 1989 Story

On March 13, 1989, a CME struck Earth and drove the Hydro-Québec grid into collapse within seconds — 6 million people lost power for ~9 hours. The storm was so intense it tripped transformers from Canada to the southern United States and was visible as far south as Florida.

Our Quebec simulation is a **reconstruction from documented values** (Kp 9.0, X15-class flare, 2000 km/s CME), not a DONKI archive entry — DONKI's catalog does not reach that far back. We label it as such in-app so the demo stays honest.

## 🏗️ Architecture

```
src/
├── app/page.tsx                 # Entry: data fetch, simulation toggle, loading/error states
├── components/
│   ├── audio/AudioEngine.tsx    # Tone.js synthesis + useAudioEngine hook
│   ├── visual/
│   │   ├── AudioVisualizer.tsx  # Player-bar live waveform visualizer
│   │   ├── CosmicAnimation.tsx  # Sun-Earth canvas (CME, magnetosphere, aurora)
│   │   └── FrequencyVisualizer.tsx  # Dashboard frequency spectrum
│   ├── dashboard/Dashboard.tsx  # Telemetry cards, risk grid, audio controls
│   └── ui/
│       └── EventSidebar.tsx     # Historical event selector + expanded details
├── hooks/
│   └── useReducedMotion.ts      # prefers-reduced-motion media-query hook
├── lib/nasa-api.ts              # DONKI + NOAA fetchers, G-scale scoring, fallbacks
├── types/index.ts               # SpaceWeatherEvent contract
└── data/                        # mock-storm.json + 5 historical events
```

**Contract-first design**: `SpaceWeatherEvent` is the single interface every component consumes. Teams can work in parallel against this contract.

## 🎯 Submission Checklist

- [x] Live app running (Vercel deploy pending — set `NEXT_PUBLIC_DEPLOY_URL` and push to `main`)
- [x] README with NASA/NOAA attribution + Quebec 1989 story
- [x] 5-event historical library (offline demo guaranteed)
- [x] Live visualizer + blackout alert in player bar
- [ ] 60-second demo video
- [ ] 7-slide pitch deck
- [ ] NASA portal submission (URL + repo + deck)

## 🛠️ Team Handoff

See `AGENTS.md` for per-role build instructions. The solo-built **Engine** (data pipeline, audio core, dashboard) is complete. The team refines the **Experience**:

1. **Researcher** — deepen historical event data (Quebec 1989, Carrington 1859, Halloween 2003).
2. **UI/Accessibility** — audit contrast, ARIA labels, screen-reader support, reduced-motion support.
3. **Storyteller** — write the NASA portal entry + pitch deck.
4. **Demo Producer** — record the 60-second video and submit the final package.

## Attribution

- NASA DONKI API: https://api.nasa.gov/
- NOAA SWPC: https://www.swpc.noaa.gov/
- Tone.js: https://tonejs.github.io/