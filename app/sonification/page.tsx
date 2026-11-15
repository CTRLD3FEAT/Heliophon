import { SpaceWeatherEvent } from '@/types';
import { fetchSpaceVitals, getMockSpaceVitals, fetchSpaceWeatherForecast, getMockForecast } from '@/lib/nasa-api';
import { SonificationGuideClient } from './SonificationGuideClient';

function buildGuideProps(data: SpaceWeatherEvent, isPlaying: boolean, isSimulation: boolean) {
  const flarePrefix = data.flareClass?.[0] || 'A';
  const isFlareMX = ['M', 'X'].includes(flarePrefix);
  const isKpHigh = data.kpIndex >= 6;
  const isKpVeryHigh = data.kpIndex >= 7;
  const isFastCME = data.cmeSpeed > 1500;
  const isMedCME = data.cmeSpeed > 1000;

  // Current readings
  const readings = [
    { label: "Kp index", value: data.kpIndex.toFixed(1) },
    { label: "Flare class", value: data.flareClass },
    { label: "CME speed", value: data.cmeSpeed.toLocaleString(), unit: "km/s" },
    { label: "Dst", value: data.dst !== undefined ? data.dst.toString() : "N/A", unit: "nT" },
    { label: "Proton flux", value: (data.protonFlux || 1).toString(), unit: "pfu" },
  ];

  // Continuous layers
  const layers = [
    {
      name: "Kp bass drone",
      active: data.kpIndex > 0,
      description:
        "A continuous tone at C2 (65 Hz). The modulation index rises from 0 to 10 with Kp, adding odd harmonics for tension. The pitch never changes, so the warning is carried by timbre alone.",
      intensity: Math.round(Math.min(100, (data.kpIndex / 9) * 100)),
      frequency: "65 Hz (C2 fundamental)",
      timbre: data.kpIndex <= 3 ? "Pure sine (calm)" : data.kpIndex <= 6 ? "FM: 2–5 harmonics (tension)" : "FM: 6–10 harmonics (harsh warning)",
    },
    {
      name: "GOES lead synth",
      active: ['C', 'M', 'X'].includes(flarePrefix),
      description:
        "Dual FM voices: C4 (262 Hz) + G3 (196 Hz, minor 7th) for constant dissonance. Oscillator type and filter cutoff track flare class — brightness = danger.",
      intensity: Math.round(({ A: 10, B: 20, C: 40, M: 70, X: 100 }[flarePrefix] || 0)),
      frequency: "262 Hz (C4) + 196 Hz (G3)",
      timbre: { A: "Sine (soft)", B: "Sine", C: "Triangle", M: "Sawtooth", X: "Square (harsh)" }[flarePrefix] || "Sine",
    },
    {
      name: "Dst sub-bass",
      active: data.dst !== undefined && data.dst < -20,
      description:
        "Ultra-low rumble at 15–30 Hz (felt more than heard). Amplitude maps to |Dst| storm depth. Subwoofer or quality headphones recommended.",
      intensity: data.dst !== undefined ? Math.round(Math.min(100, Math.abs(data.dst) / 5)) : 0,
      frequency: "15–30 Hz (sub-audible)",
      timbre: "Pure sine (sub-bass)",
    },
    {
      name: "CME arpeggiator",
      active: data.cmeSpeed > 300,
      description:
        "Classic two-tone siren (C6↔C5 square wave) — European emergency vehicle pattern. Rate scales 0.2→4 Hz (300→2000 km/s). Harsh, unmistakable warning.",
      intensity: Math.round(Math.min(100, (data.cmeSpeed / 2000) * 100)),
      frequency: "523 Hz (C5) ↔ 1,047 Hz (C6)",
      timbre: "Square wave (alarm timbre)",
    },
    {
      name: "Solar wind texture",
      active: (data.protonFlux || 1) > 10,
      description:
        "Filtered brown noise. Bandpass center frequency 200→2,200 Hz, gain -40→-13 dB tracks proton flux (log scale). Density = particle storm intensity.",
      intensity: Math.round(Math.min(100, Math.log10(data.protonFlux || 1) / 3 * 100)),
      frequency: "200–2,200 Hz (bandpass noise)",
      timbre: "Brown noise (filtered)",
    },
  ];

  // Parameter → Sound mapping table
  const mappings = [
    {
      parameter: "Kp index (0–9)",
      sound: "Modulation index (odd harmonics on C2 drone)",
      range: "Kp 0–3 → index 0; Kp 4–6 → 1.5–4.5; Kp 7–9 → 6–10",
    },
    {
      parameter: "GOES flare class (A–X)",
      sound: "Oscillator type + lowpass filter cutoff + gain",
      range: "A: sine/400Hz/0.05; B: sine/600Hz/0.08; C: triangle/1kHz/0.12; M: sawtooth/2.5kHz/0.18; X: square/5kHz/0.25",
    },
    {
      parameter: "Dst (nT, negative = storm)",
      sound: "Sub-bass amplitude + frequency (15→30 Hz)",
      range: "Dst > -20 → silent; -20 to -100 → 15 Hz; -100 to -300 → 22 Hz; < -300 → 30 Hz @ full gain",
    },
    {
      parameter: "CME speed (km/s)",
      sound: "Two-tone siren rate (C5↔C6 square wave)",
      range: "300 km/s → 0.2 Hz (5s/note); 800 → 1 Hz; 1500 → 2.5 Hz; 2000+ → 4 Hz (emergency siren rate)",
    },
    {
      parameter: "Proton flux (pfu)",
      sound: "Bandpass noise center freq + gain",
      range: "1–10 pfu → 200 Hz/-40 dB; 10–100 → 800 Hz/-30 dB; 100–1k → 1.5 kHz/-20 dB; >1k → 2.2 kHz/-13 dB",
    },
  ];

  // Event alerts
  const alerts = [
    {
      title: "Grid blackout (G3+)",
      description:
        `Trigger: Kp ≥ 7 (NOAA G3–G5). Probability rises linearly from 0 at Kp=6 to 1.0 at Kp=9. Debounced 5 min. Sound: deep minor chord (C2–E♭2–G2–C3–E♭3–G3), 6 voices, slow attack (0.1 s), long release (2 s). Impact: Geomagnetically induced currents can damage/destroy high-voltage transformers. High-latitude grids at risk.`,
    },
    {
      title: "GPS disruption (G2+ or M/X flare)",
      description:
        `Trigger: Kp ≥ 6 (G2+) OR M/X-class flare. Kp probability linear from 0 at Kp=5 to 1.0 at Kp=9; flare adds 0.4. Sound: glitchy FM trills C7→C8, 8 notes at 64th-note rate (~25 ms each). Impact: Ionospheric scintillation causes rapid signal fading; GNSS positioning errors of 10–50 m instantly.`,
    },
    {
      title: "Satellite drag (G2+)",
      description:
        `Trigger: Kp ≥ 6 (G2+). Probability linear from 0 at Kp=5 to 1.0 at Kp=9. Sound: descending glide G5→C4 over 1.5 s, sawtooth timbre. Impact: Joule heating expands thermosphere → density increase at LEO; orbit decay accelerates exponentially. Starlink lost 40 satellites in Feb 2022 (G1 storm).`,
    },
    {
      title: "Radiation risk / SEP event",
      description:
        `Trigger: X-class flare OR CME > 1,500 km/s. Probability: X-flare=0.6, M-flare=0.2, fast CME=0.3, med CME=0.15 (additive). Sound: three brown-noise bursts (quarter notes, 0.5 s apart). Impact: Solar energetic particles arrive 10 min–2 hrs post-flare. Astronaut/aviation radiation hazard; polar routes most affected.`,
    },
    {
      title: "Comms blackout / HF absorption (R1–R3)",
      description:
        `Trigger: M/X-class flare. Probability: X=0.8, M=0.5. Sound: stuttering square wave A5, 12 hits at 32nd-note rate (~12.5 ms each). Impact: HF radio (3–30 MHz) absorbed on sunlit hemisphere; polar aviation comms lost. NOAA R1–R3 scale.`,
    },
  ];

  // Design principles
  const principles = [
    {
      title: "Parallel, distinct dimensions",
      description:
        "Five continuous layers each own a unique sonic dimension: Kp = harmonic richness (timbre), GOES = brightness + dissonance (spectral centroid + interval), Dst = sub-bass amplitude (physical sensation), CME = rhythm + interval (temporal pattern), Solar Wind = texture density (statistical roughness). The auditory system separates them automatically — no cognitive overload.",
    },
    {
      title: "No learning required",
      description:
        "Two-tone siren (CME), descending glide (drag), minor chord (grid) use universal auditory metaphors. Operators understand instantly without training. The sounds mean what they sound like.",
    },
    {
      title: "Visceral over cognitive",
      description:
        "Sub-bass (Dst) bypasses hearing, triggers somatic response. FM harshness (Kp) triggers amygdala threat detection. Alerts are designed to be felt, not just interpreted.",
    },
    {
      title: "Continuous + event-driven",
      description:
        "Layers provide constant situational awareness (eyes-free monitoring). Alerts fire only on threshold cross — debounced to prevent flicker — so there's no alert fatigue.",
    },
    {
      title: "Data integrity",
      description:
        "Every parameter maps to a specific audio attribute. No arbitrary artistic choices. The sound IS the data. This is a perceptual warning system, not a music player.",
    },
    {
      title: "Why this sounds like a warning system (not a melody)",
      description:
        "We avoid: musical scales (implies 'song'), major chords (connotes safety), pleasant timbres (lowers urgency), melodic development (distracts), harmonic resolution (signals 'all clear'). We use: fixed drone + tension, dissonant intervals (minor 7th, tritone), harsh timbres (square, sawtooth, FM), rhythmic urgency (siren rates, glitches), physical sensation (sub-bass, noise bursts).",
    },
    {
      title: "Accessibility & operational notes",
      description:
        "Sub-bass (Dst) requires subwoofer or quality headphones — laptop speakers won't reproduce 15–30 Hz. Respects prefers-reduced-motion (animation pauses, audio continues). Not an official NOAA warning — perceptual design only. Always verify with official SWPC products. Sources: NASA DONKI (CME), NOAA SWPC (Kp), NOAA GOES (X-ray), Kyoto WDC (Dst).",
    },
  ];

  return {
    mode: isSimulation ? "Simulation" as const : "Live" as const,
    audio: isPlaying ? "Playing" as const : "Standby" as const,
    updatedAt: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC",
    readings,
    layers,
    mappings,
    alerts,
    principles,
  };
}

export default async function SonificationGuidePage() {
  // Fetch live data for initial render
  let initialData: SpaceWeatherEvent;

  try {
    const [vitals, forecastData] = await Promise.all([
      fetchSpaceVitals(),
      fetchSpaceWeatherForecast(),
    ]);
    initialData = { ...vitals, forecast: forecastData };
  } catch {
    // Fallback to mock data
    initialData = getMockSpaceVitals();
  }

  const guideProps = buildGuideProps(initialData, false, true);

  return <SonificationGuideClient {...guideProps} />;
}