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

| Sound | What It Means |
|-------|---------------|
| Low hum | Calm conditions (Kp ≤ 3, no Earth-directed CME) |
| Rising pitch & pulsing | Growing storm energy — higher Kp, faster CME, stronger flare |
| Red alert motif | NOAA G3+ geomagnetic storm watch in effect |

**Audio graph** (Tone.js):

```
mainOsc (triangle) ──┐
                       ├─ mainGain (LFO-modulated) ─┐
droneOsc (sine) ──────┘                            ├─ filter ── masterGain ── Destination
alertSynth (square) ────────────────────────────────┘
```

- **Pitch** maps to storm energy (exponential, 100–800 Hz).
- **Pulse rate** maps to CME speed (0.1–10 Hz).
- **Dissonance / filter openness** maps to NOAA G-scale level.
- A 4-note alert motif (`C5–E5–G5–C6`) fires when a G3+ watch begins.

## 🚀 Run It

```bash
npm install
npm run dev
# open http://localhost:3000
```

Click **▶ Play Space Weather** to start audio (browser requires a user gesture).
Select any of the five historical storms in the left sidebar to replay them offline — this guarantees a reliable demo even when the live APIs are down.

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

- [x] Live app running (Vercel deploy pending)
- [x] README with NASA/NOAA attribution + Quebec 1989 story
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