# Solar Jukebox — Team Handoff Instructions

This document assigns concrete tasks to each role. The solo-built **Engine** (data pipeline, audio core, dashboard) is complete. The team refines the **Experience**.

---

## Role 1: Researcher — Historical Event Library

**Goal:** Expand the simulation dropdown from 1 event (Quebec 1989) to at least 4 well-documented historical storms.

**Files to modify:**
- `src/data/` — add new `.json` files following the `SpaceWeatherEvent` shape
- `app/page.tsx` — add new imports and a selector UI (dropdown/radio group)
- `src/types/index.ts` — if you need to add new fields (e.g., `eventName`, `description`, `confidence`)

**Events to add (with documented parameters):**
| Event | Date | CME Speed | Flare | Kp | Dst | Source |
|-------|------|-----------|-------|----|-----|--------|
| Carrington 1859 | 1–2 Sep 1859 | ~2000 km/s | ~X45 | 9 | -1600 nT | Ice-core / historical |
| Halloween 2003 | 28 Oct–4 Nov 2003 | 1850 km/s | X17.2+X10 | 9 | -383 nT | Direct measurement |
| May 2024 Superstorm | 10–11 May 2024 | 800 km/s | X5.8+X3.9 | 9 | -412 nT | Direct measurement |
| Oct 2024 Storm | 10–11 Oct 2024 | 1100 km/s | X9.0 | 9 | -518 nT | Direct measurement |

**Deliverable:** Each event as a `.json` in `src/data/` with an extra `_meta` field:
```json
{
  "cmeSpeed": 800,
  "flareClass": "X5.8",
  "kpIndex": 9,
  "stormIntensity": 1.0,
  "isBlackoutRisk": true,
  "timestamp": "2024-05-10T12:00:00.000Z",
  "_meta": {
    "name": "May 2024 Superstorm",
    "confidence": "direct",
    "notes": "First G5 since 2003. Caused widespread aurora to low latitudes."
  }
}
```

**Important:** Label each event's confidence: `"direct"` (spacecraft), `"partial"` (reconstructed), `"historical"` (ice-core/record). This honesty is a differentiator vs. SON and SolarShield.

---

## Role 2: UI / Accessibility — Audit & Polish

**Goal:** Make the app usable by blind/low-vision users and pass WCAG AA.

**Files to modify:**
- `app/globals.css` — contrast fixes, `prefers-reduced-motion` media query
- `src/components/dashboard/Dashboard.tsx` — ARIA labels, focus states, skip link
- `src/components/visual/FrequencyVisualizer.tsx` — already has reduced-motion support (see line ~15)
- `src/components/audio/AudioEngine.tsx` — already has `aria-live` regions

**Specific tasks:**

1. **Contrast audit** — current failures:
   - `text-slate-500` on `bg-slate-950` in footer = ~3.9:1 (fails AA for normal text). Fix: use `text-slate-400` or lighter.
   - Gradient title has no solid fallback — add `text-slate-100` as fallback before `text-transparent`.

2. **Add skip-to-content link** at top of `Dashboard.tsx`:
   ```tsx
   <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 px-4 py-2 bg-cyan-600 text-white rounded">
     Skip to main content
   </a>
   <main id="main-content">...</main>
   ```

3. **Volume slider** — add visible value readout + `aria-valuenow`:
   ```tsx
   <input
     type="range"
     min="0" max="1" step="0.05"
     value={volume}
     onChange={e => setVolume(Number(e.target.value))}
     aria-label="Master volume"
     aria-valuenow={Math.round(volume * 100)}
   />
   <span className="text-xs text-slate-400 ml-2" aria-hidden="true">{Math.round(volume * 100)}%</span>
   ```

4. **Alert banner** — add `role="alert" aria-live="assertive"` to the red blackout banner.

5. **Focus indicators** — verify all interactive elements have visible `:focus-visible` styles (globals.css already has this).

6. **Test with screen reader** (NVDA/VoiceOver) — confirm:
   - Play/Stop button announces state change
   - Volume slider announces value
   - Blackout alert announces via `aria-live`
   - Simulation toggle announces mode change
   - "What You're Hearing" legend is navigable

---

## Role 3: Storyteller — NASA Portal Entry + Pitch Deck

**Goal:** Write the submission materials. Deadline: tomorrow 23:59.

**Deliverables:**

### 1. NASA Portal Entry (text, ~500 words)
- **Problem:** Space weather impacts Earth infrastructure (grid, GPS, aviation, satellites). Current warnings are visual/text-only — inaccessible to blind operators, and hard to monitor at a glance.
- **Solution:** Solar Jukebox sonifies NASA DONKI + NOAA SWPC data in real time. Each sonic dimension maps to a physical driver (pitch=energy, tempo=CME speed, filter=G-scale). An alert motif fires on G3+ watches.
- **Accessibility:** Audio on-demand, screen-reader friendly, reduced-motion support, WCAG AA contrast.
- **Ground-impact framing:** We don't "predict" — we translate NOAA's official watches/warnings into sound so no one misses them.
- **Historical case study:** Quebec 1989 reconstruction demonstrates the system at max intensity.
- **Tech stack:** Next.js 15, Tone.js, TypeScript, Tailwind v4, deployed on Vercel.

### 2. 7-Slide Pitch Deck (PDF or Google Slides)
1. **Title** — "Solar Jukebox: Hear the Grid Before It Fails"
2. **The Problem** — $150M+/satellite incident, grid blackouts, GPS errors; warnings are visual-only
3. **The Insight** — Auditory processing is 10× faster than visual (~25ms vs ~250ms). Sound conveys urgency instantly.
4. **The Solution** — Live sonification of NOAA G-scale + NASA CME/flare data. Three dimensions: pitch (energy), tempo (CME arrival), dissonance (storm level).
5. **Accessibility First** — Audio on-demand, ARIA live regions, reduced motion, WCAG AA. "So no one is left out of the warning."
6. **Historical Validation** — Quebec 1989 reconstruction (Kp 9, X15, 2000 km/s). The sound at max intensity = what operators would have heard if this existed.
7. **Call to Action** — Deploy to ops centers, add forecast layer, expand event library. Open to collaboration.

---

## Role 4: Demo Producer — 60-Second Video + Submit

**Goal:** Record a clean demo and hit "Submit" on the NASA portal.

**Recording script (60 seconds):**
1. **0–5s:** Open app, show live data (likely calm). "This is real-time space weather from NASA and NOAA."
2. **5–10s:** Click **▶ Play Space Weather**. "Audio on demand — click to start."
3. **10–15s:** "Low hum = calm. Pitch = storm energy. Pulsing = CME speed."
4. **15–25s:** Click **🧪 Simulate 1989 Quebec Storm**. "Historical reconstruction — Kp 9, X-class, 2000 km/s."
5. **25–35s:** Show alert motif firing, red banner, audio intensifies. "G3+ watch triggers alert motif."
6. **35–45s:** Point to Impact cards. "Ground effects: grid (GICs), GPS (scintillation), satellites (drag), aviation (HF blackout)."
7. **45–55s:** Toggle back to live. "Cached data badge shows when we're offline. Honest about sources."
8. **55–60s:** "Solar Jukebox. So no one is left out of the warning." Show URL.

**Technical:**
- Record at 1080p, 30fps (OBS, Loom, or QuickTime)
- System audio ON (capture the sonification)
- No background noise
- Export as MP4, <100 MB

**Submit:** NASA Space Apps portal → project URL + GitHub repo + deck + video.

---

## Quick Reference: Key Files

| Area | File |
|------|------|
| Data pipeline | `src/lib/nasa-api.ts` |
| Audio engine | `src/components/audio/AudioEngine.tsx` |
| Visualization | `src/components/visual/FrequencyVisualizer.tsx` |
| Dashboard UI | `src/components/dashboard/Dashboard.tsx` |
| Main page | `app/page.tsx` |
| Types | `src/types/index.ts` |
| Historical events | `src/data/*.json` |
| Styles | `app/globals.css` |
| Metadata/manifest | `app/layout.tsx`, `public/manifest.webmanifest`, `public/favicon.svg` |

---

## Things NOT to Do (Anti-Patterns)

- ❌ Don't add "AI-slop" claims (99.7% accuracy, "early warning system" without qualification)
- ❌ Don't present the sonification as physical measurement — it's a perceptual design choice
- ❌ Don't hardcode API keys (use `NEXT_PUBLIC_NASA_API_KEY` env var)
- ❌ Don't skip `prefers-reduced-motion` — vestibular disorders are real
- ❌ Don't let a constant drone fight screen readers — audio must be on-demand
- ❌ Don't use unsourced numbers in Impact cards (all current text is sourced from NOAA scale definitions)

---

## Contact / Escalation

If blocked, ping the lead engineer. The repo is at `github.com/your-org/solar-jukebox` (update this).
Vercel preview deployments auto-create on push to main.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
