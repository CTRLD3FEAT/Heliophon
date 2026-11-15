'use client';

import { useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import { SpaceWeatherEvent } from '@/types';

interface AudioEngineProps {
  data: SpaceWeatherEvent;
  isPlaying: boolean;
  volume: number;
  isSimulation: boolean;
  onAudioReady?: () => void;
}

/**
 * AudioEngine — space weather sonification.
 *
 * Continuous layers (always playing when active):
 *   1. Kp Bass Drone      → Kp-index (0-9): fundamental + harmonic intervals (G0-G5 scale)
 *   2. GOES Lead Synth    → GOES X-ray class (A-X): filter cutoff, oscillator type, brightness
 *   3. Dst Sub-Bass       → Dst index (nT): amplitude of ultra-low rumble (felt more than heard)
 *   4. CME Arpeggiator    → CME speed (km/s): note rate, harmonic progression
 *   5. Solar Wind Texture → Proton flux/density: filtered noise density & color
 *
 * Event-triggered layers (one-shot on threshold cross):
 *   - Grid blackout (G3+): deep minor chord
 *   - GPS disruption: high glitchy trills
 *   - Satellite drag: descending glide
 *   - Radiation risk: noise bursts
 *   - Comms blackout: stuttering pattern
 *
 * Audio graph:
 *   KpBass ──┐
 *   GOESLead ┤
 *   DstSub   ├─► MasterGain ──► Destination
 *   CMEArp   ┤
 *   SWNoise  ┘
 */

export function useAudioEngine() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const toggle = () => setIsPlaying(v => !v);
  return { isPlaying, setIsPlaying, volume, setVolume, toggle };
}

export function AudioEngine({ data, isPlaying, volume, isSimulation, onAudioReady }: AudioEngineProps) {
  // Continuous layer refs
  const kpBassRef = useRef<Tone.Synth | null>(null);
  const kpGainRef = useRef<Tone.Gain | null>(null);
  const goesLeadRef = useRef<Tone.Synth | null>(null);
  const goesGainRef = useRef<Tone.Gain | null>(null);
  const goesFilterRef = useRef<Tone.Filter | null>(null);
  const dstSubRef = useRef<Tone.Synth | null>(null);
  const dstGainRef = useRef<Tone.Gain | null>(null);
  const cmeArpRef = useRef<Tone.Loop | null>(null);
  const cmeSynthRef = useRef<Tone.PolySynth | null>(null);
  const cmeGainRef = useRef<Tone.Gain | null>(null);
  const swNoiseRef = useRef<Tone.NoiseSynth | null>(null);
  const swGainRef = useRef<Tone.Gain | null>(null);
  const swFilterRef = useRef<Tone.Filter | null>(null);
  const masterGainRef = useRef<Tone.Gain | null>(null);

  // Event-triggered alert refs
  const gridAlertRef = useRef<Tone.PolySynth | null>(null);
  const gpsAlertRef = useRef<Tone.Synth | null>(null);
  const satelliteAlertRef = useRef<Tone.Synth | null>(null);
  const radiationAlertRef = useRef<Tone.NoiseSynth | null>(null);
  const commsAlertRef = useRef<Tone.Synth | null>(null);

  const lastAlertRef = useRef({
    grid: false,
    gps: false,
    satellite: false,
    radiation: false,
    comms: false,
  });
  const [error, setError] = useState<string | null>(null);

  // Kp-index → Musical scale mapping (G0-G5)
  // G0=Kp0-3: Root (C2), G1=Kp4: +2nd (D2), G2=Kp5: +3rd (E2),
  // G3=Kp6: +4th (F2), G4=Kp7: +5th (G2), G5=Kp8-9: +6th (A2)
  const KP_SCALE = ['C2', 'D2', 'E2', 'F2', 'G2', 'A2'];

  // GOES class → oscillator type & filter
  type OscillatorType = 'sine' | 'square' | 'sawtooth' | 'triangle' | 'pwm' | 'pulse' | 'fmsawtooth' | 'fmsquare' | 'fmtriangle' | 'fmsine' | 'am';
  const GOES_CONFIG: Record<string, { type: OscillatorType; filterFreq: number; filterQ: number; gain: number }> = {
    A: { type: 'sine', filterFreq: 400, filterQ: 1, gain: 0.05 },
    B: { type: 'sine', filterFreq: 600, filterQ: 1.5, gain: 0.08 },
    C: { type: 'triangle', filterFreq: 1000, filterQ: 2, gain: 0.12 },
    M: { type: 'sawtooth', filterFreq: 2500, filterQ: 3, gain: 0.18 },
    X: { type: 'square', filterFreq: 5000, filterQ: 4, gain: 0.25 },
  };

  // Initialize audio on first Play click (user gesture required for Tone.start)
  useEffect(() => {
    if (!isPlaying) return;

    let mounted = true;
    const init = async () => {
      try {
        await Tone.start();

        // Master gain - increased to ensure audibility
        masterGainRef.current = new Tone.Gain(Math.min(1.5, volume * 2.5)).toDestination();

        // ==================== LAYER 1: Kp Bass Drone ====================
        // Continuous fundamental + harmonic based on Kp-index
        kpBassRef.current = new Tone.Synth({
          oscillator: { type: 'sine' },
          envelope: { attack: 2, decay: 0, sustain: 1, release: 2 },
        });
        kpGainRef.current = new Tone.Gain(0.25); // Increased from 0.15 for audibility
        kpBassRef.current.connect(kpGainRef.current);
        kpGainRef.current.connect(masterGainRef.current);
        kpBassRef.current.triggerAttack('C2'); // Start with root note

        // ==================== LAYER 2: GOES Lead Synth ====================
        // Brightness/timbre tracks GOES X-ray class
        goesLeadRef.current = new Tone.Synth({
          oscillator: { type: 'sine' },
          envelope: { attack: 0.5, decay: 1, sustain: 0.3, release: 1 },
        });
        goesFilterRef.current = new Tone.Filter({ type: 'lowpass', frequency: 400, Q: 1 });
        goesGainRef.current = new Tone.Gain(0.05);
        goesLeadRef.current.chain(goesFilterRef.current, goesGainRef.current, masterGainRef.current);
        goesLeadRef.current.triggerAttack('C4');

        // ==================== LAYER 3: Dst Sub-Bass ====================
        // Ultra-low rumble (15-30Hz), amplitude tracks |Dst|
        dstSubRef.current = new Tone.Synth({
          oscillator: { type: 'sine' },
          envelope: { attack: 5, decay: 0, sustain: 1, release: 5 },
        });
        dstGainRef.current = new Tone.Gain(0.2); // Increased from 0 to 0.2 for audibility
        dstSubRef.current.connect(dstGainRef.current);
        dstGainRef.current.connect(masterGainRef.current);
        dstSubRef.current.triggerAttack('C0'); // ~16Hz

        // ==================== LAYER 4: CME Arpeggiator ====================
        // Arpeggio rate tracks CME speed
        cmeSynthRef.current = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'triangle' },
          envelope: { attack: 0.05, decay: 0.3, sustain: 0, release: 0.5 },
        });
        cmeGainRef.current = new Tone.Gain(0.15); // Increased from 0.08
        cmeSynthRef.current.connect(cmeGainRef.current);
        cmeGainRef.current.connect(masterGainRef.current);

        // Arpeggio loop
        const cmeNotes = ['C4', 'E4', 'G4', 'C5', 'E5', 'G5'];
        let cmeNoteIndex = 0;
        cmeArpRef.current = new Tone.Loop((time) => {
          const note = cmeNotes[cmeNoteIndex % cmeNotes.length];
          cmeSynthRef.current?.triggerAttackRelease(note, '16n', time);
          cmeNoteIndex++;
        }, '4n').start(0);

        // ==================== LAYER 5: Solar Wind Noise ====================
        // Filtered noise, density tracks proton flux
        swNoiseRef.current = new Tone.NoiseSynth({
          noise: { type: 'brown' },
          envelope: { attack: 0.1, decay: 0.5, sustain: 0.3, release: 1 },
        });
        swFilterRef.current = new Tone.Filter({ type: 'bandpass', frequency: 500, Q: 5 });
        swGainRef.current = new Tone.Gain(0.08); // Increased from 0.03
        swNoiseRef.current.chain(swFilterRef.current, swGainRef.current, masterGainRef.current);

        // Start continuous noise loop
        const swLoop = new Tone.Loop((time) => {
          swNoiseRef.current?.triggerAttackRelease('8n', time);
        }, '2n').start(0);

        // ==================== EVENT ALERT SYNTHS ====================
        // Grid blackout: deep minor chord
        gridAlertRef.current = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'triangle' },
          envelope: { attack: 0.1, decay: 1.5, sustain: 0.1, release: 2 },
        }).connect(masterGainRef.current);

        // GPS disruption: high glitchy FM
        gpsAlertRef.current = new Tone.Synth({
          oscillator: { type: 'sine' },
          envelope: { attack: 0.005, decay: 0.1, sustain: 0, release: 0.2 },
        }).connect(masterGainRef.current);

        // Satellite drag: descending glide
        satelliteAlertRef.current = new Tone.Synth({
          oscillator: { type: 'sawtooth' },
          envelope: { attack: 0.05, decay: 1, sustain: 0.2, release: 1.5 },
        }).connect(masterGainRef.current);

        // Radiation risk: noise bursts
        radiationAlertRef.current = new Tone.NoiseSynth({
          noise: { type: 'brown' },
          envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.5 },
        }).connect(masterGainRef.current);

        // Comms blackout: stuttering square
        commsAlertRef.current = new Tone.Synth({
          oscillator: { type: 'square' },
          envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.1 },
        }).connect(masterGainRef.current);

      } catch (e) {
        console.error('Audio init failed:', e);
        if (mounted) {
          setError('Audio failed to start. Click Play again.');
          return;
        }
      }
      if (mounted) onAudioReady?.();
    };
    init();

    // Resume AudioContext when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && Tone.context.state === 'suspended') {
        Tone.start();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      mounted = false;
      // Dispose all nodes
      [kpBassRef, kpGainRef, goesLeadRef, goesGainRef, goesFilterRef,
       dstSubRef, dstGainRef, cmeArpRef, cmeSynthRef, cmeGainRef,
       swNoiseRef, swGainRef, swFilterRef, masterGainRef,
       gridAlertRef, gpsAlertRef, satelliteAlertRef, radiationAlertRef, commsAlertRef]
        .forEach(r => { try { r.current?.dispose(); } catch (_) {} });
    };
  }, [isPlaying]);

  // Update continuous layers when telemetry changes
  useEffect(() => {
    if (!isPlaying) return;

    const { kpIndex, flareClass, dst, cmeSpeed, protonFlux } = data;

    // ---- LAYER 1: Kp Bass ----
    // Map Kp 0-9 to scale degrees (0-3=G0, 4=G1, 5=G2, 6=G3, 7=G4, 8-9=G5)
    let kpScaleIndex = 0;
    if (kpIndex >= 8) kpScaleIndex = 5;      // G5
    else if (kpIndex >= 7) kpScaleIndex = 4; // G4
    else if (kpIndex >= 6) kpScaleIndex = 3; // G3
    else if (kpIndex >= 5) kpScaleIndex = 2; // G2
    else if (kpIndex >= 4) kpScaleIndex = 1; // G1
    // Update note based on current Kp scale index
    if (kpBassRef.current) {
      kpBassRef.current.setNote(KP_SCALE[kpScaleIndex]);
    }
    // else 0 = G0 (root)

    // Update harmonic richness at higher Kp levels
    if (kpGainRef.current) kpGainRef.current.gain.rampTo(0.1 + kpIndex * 0.015, 1);

    // ---- LAYER 2: GOES Lead ----
    const flarePrefix = flareClass?.[0] || 'A';
    const goesCfg = GOES_CONFIG[flarePrefix] || GOES_CONFIG.A;
    if (goesLeadRef.current) {
      (goesLeadRef.current as any).set({ oscillator: { type: goesCfg.type } });
      goesLeadRef.current.volume.rampTo(goesCfg.gain, 0.5);
    }
    if (goesFilterRef.current) {
      goesFilterRef.current.frequency.rampTo(goesCfg.filterFreq, 0.5);
      goesFilterRef.current.Q.rampTo(goesCfg.filterQ, 0.5);
    }

    // ---- LAYER 3: Dst Sub-Bass ----
    // Dst in nT (negative = storm). Map -20→0, -500→1 amplitude
    const dstAbs = Math.abs(dst || 0);
    const dstAmp = Math.min(1, Math.max(0, (dstAbs - 20) / 480));
    if (dstSubRef.current) dstSubRef.current.frequency.rampTo(15 + dstAmp * 15, 2); // 15-30Hz
    if (dstGainRef.current) dstGainRef.current.gain.rampTo(dstAmp * 0.2, 2);

    // ---- LAYER 4: CME Arpeggiator ----
    // Rate: 300km/s=0.2Hz (10s/note) → 2000km/s=4Hz (0.25s/note)
    const cmeRate = 0.2 + (Math.min(2000, cmeSpeed) / 2000) * 3.8;
    const cmeInterval = 1 / cmeRate; // seconds per note
    if (cmeArpRef.current) {
      cmeArpRef.current.interval = `${cmeInterval}s`;
    }
    // Harmonic complexity increases with speed
    if (cmeGainRef.current) cmeGainRef.current.gain.rampTo(0.05 + (cmeSpeed / 2000) * 0.05, 1);

    // ---- LAYER 5: Solar Wind Noise ----
    // Proton flux (pfu): 1→quiet, 1000→dense
    const flux = protonFlux || 1;
    const fluxNorm = Math.min(1, Math.log10(flux) / 3); // log scale
    if (swFilterRef.current) swFilterRef.current.frequency.rampTo(200 + fluxNorm * 2000, 1);
    if (swGainRef.current) swGainRef.current.gain.rampTo(0.01 + fluxNorm * 0.04, 1);

    // Master volume
    if (masterGainRef.current) masterGainRef.current.gain.rampTo(volume, 0.2);

  }, [data, isPlaying, volume]);

  // Event-triggered alerts (one-shot on threshold cross)
  useEffect(() => {
    if (!isPlaying) return;

    const { kpIndex, flareClass, dst, cmeSpeed } = data;
    const disasterProbs = computeDisasterProbabilities(data);
    const t = Tone.now();

    // Grid blackout: G3+ (Kp >= 7)
    if (disasterProbs.gridBlackout > 0.5 && !lastAlertRef.current.grid && gridAlertRef.current) {
      const notes = ['C2', 'Eb2', 'G2', 'C3', 'Eb3', 'G3'];
      notes.forEach((note, i) => gridAlertRef.current?.triggerAttackRelease(note, '2n', t + i * 0.25));
    }

    // GPS disruption: G2+ (Kp >= 6) or M/X flare
    if (disasterProbs.gpsDisruption > 0.4 && !lastAlertRef.current.gps && gpsAlertRef.current) {
      const notes = ['C7', 'D7', 'E7', 'F7', 'G7', 'A7', 'B7', 'C8'];
      notes.forEach((note, i) => gpsAlertRef.current?.triggerAttackRelease(note, '64n', t + i * 0.04));
    }

    // Satellite drag: G2+ (Kp >= 6)
    if (disasterProbs.satelliteDrag > 0.4 && !lastAlertRef.current.satellite && satelliteAlertRef.current) {
      satelliteAlertRef.current?.triggerAttackRelease('G5', '2n', t);
      satelliteAlertRef.current?.oscillator?.frequency?.rampTo(261.63, 1.5, t + 0.1); // C4
    }

    // Radiation risk: X-flare or fast CME
    if (disasterProbs.radiationRisk > 0.3 && !lastAlertRef.current.radiation && radiationAlertRef.current) {
      radiationAlertRef.current?.triggerAttackRelease('4n', t);
      radiationAlertRef.current?.triggerAttackRelease('4n', t + 0.5);
      radiationAlertRef.current?.triggerAttackRelease('4n', t + 1.0);
    }

    // Comms blackout: M/X flare
    if (disasterProbs.commsBlackout > 0.4 && !lastAlertRef.current.comms && commsAlertRef.current) {
      for (let i = 0; i < 12; i++) {
        commsAlertRef.current?.triggerAttackRelease('A5', '32n', t + i * 0.08);
      }
    }

    // Update last alert state
    lastAlertRef.current = {
      grid: disasterProbs.gridBlackout > 0.5,
      gps: disasterProbs.gpsDisruption > 0.4,
      satellite: disasterProbs.satelliteDrag > 0.4,
      radiation: disasterProbs.radiationRisk > 0.3,
      comms: disasterProbs.commsBlackout > 0.4,
    };
  }, [data, isPlaying]);

  return null;
}

// Compute disaster probabilities from data
function computeDisasterProbabilities(data: SpaceWeatherEvent) {
  const { kpIndex, flareClass, stormIntensity, cmeSpeed } = data;
  const flarePrefix = flareClass?.[0] || 'A';

  // Grid blackout: G3+ (Kp >= 7)
  const gridBlackout = kpIndex >= 7 ? Math.min(1, (kpIndex - 6) / 3) : 0;

  // GPS disruption: G2+ (Kp >= 6) or strong flares
  const gpsDisruption = kpIndex >= 6
    ? Math.min(1, (kpIndex - 5) / 4)
    : (flarePrefix === 'X' || flarePrefix === 'M') ? 0.4 : 0;

  // Satellite drag: G2+ (Kp >= 6)
  const satelliteDrag = kpIndex >= 6 ? Math.min(1, (kpIndex - 5) / 4) : 0;

  // Radiation risk: SEP/proton from X-flares or fast CMEs
  const radiationRisk = (flarePrefix === 'X' ? 0.6 : flarePrefix === 'M' ? 0.2 : 0) +
                       (cmeSpeed > 1500 ? 0.3 : cmeSpeed > 1000 ? 0.15 : 0);

  // Comms blackout: HF radio blackout from M/X flares
  const commsBlackout = flarePrefix === 'X' ? 0.8 : flarePrefix === 'M' ? 0.5 : 0;

  return { gridBlackout, gpsDisruption, satelliteDrag, radiationRisk, commsBlackout };
}