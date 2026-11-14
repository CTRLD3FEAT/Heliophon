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

// Disaster probability thresholds for distinct audio cues
interface DisasterProbabilities {
  gridBlackout: number;      // G3+ geomagnetic storm
  gpsDisruption: number;     // Ionospheric scintillation
  satelliteDrag: number;     // Enhanced atmospheric drag
  radiationRisk: number;     // SEP / proton events
  commsBlackout: number;     // HF radio blackout (flare)
}

/**
 * AudioEngine — space weather sonification.
 *
 * Audio graph:
 *   mainOsc (triangle) ──┐
 *                         ├─ mainGain (LFO-modulated) ─┐
 *   droneOsc (sine) ──────┘                            ├─ filter ── masterGain ── Destination
 *   alertSynth (square) ────────────────────────────────┘
 *
 * All parameter changes use rampTo for smooth, click-free transitions.
 */

/** Hook exposing audio state. Keep this hook separate from the component so the
 *  dashboard can read play/volume state without re-creating the audio graph. */
export function useAudioEngine() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const toggle = () => setIsPlaying(v => !v);
  return { isPlaying, setIsPlaying, volume, setVolume, toggle };
}

export function AudioEngine({ data, isPlaying, volume, isSimulation, onAudioReady }: AudioEngineProps) {
  const mainOscRef = useRef<Tone.Oscillator | null>(null);
  const droneOscRef = useRef<Tone.Oscillator | null>(null);
  const lfoRef = useRef<Tone.LFO | null>(null);
  const mainGainRef = useRef<Tone.Gain | null>(null);
  const droneGainRef = useRef<Tone.Gain | null>(null);
  const filterRef = useRef<Tone.Filter | null>(null);
  const masterGainRef = useRef<Tone.Gain | null>(null);
  const alertSynthRef = useRef<Tone.Synth | null>(null);

  // Disaster-specific audio nodes
  const gridAlertSynthRef = useRef<Tone.PolySynth | null>(null);       // Deep, ominous
  const gpsAlertSynthRef = useRef<Tone.Synth | null>(null);            // High, glitchy
  const satelliteAlertSynthRef = useRef<Tone.Synth | null>(null);      // Descending tone
  const radiationAlertSynthRef = useRef<Tone.NoiseSynth | null>(null); // Noise burst
  const commsAlertSynthRef = useRef<Tone.Synth | null>(null);          // Stuttering

  const lastAlertRef = useRef({
    grid: false,
    gps: false,
    satellite: false,
    radiation: false,
    comms: false,
  });
  const [error, setError] = useState<string | null>(null);

  // Initialize audio on first Play click (user gesture required for Tone.start)
  useEffect(() => {
    if (!isPlaying) return;

    let mounted = true;
    const init = async () => {
      try {
        await Tone.start();

        // Master gain → speakers
        masterGainRef.current = new Tone.Gain(volume).toDestination();

        // Lowpass filter for warm tone
        filterRef.current = new Tone.Filter({
          type: 'lowpass',
          frequency: 2000,
          Q: 2
        }).connect(masterGainRef.current);

        // Main storm tone: triangle osc, amplitude-modulated by LFO
        mainOscRef.current = new Tone.Oscillator({
          frequency: 200,
          type: 'triangle'
        });

        lfoRef.current = new Tone.LFO({
          frequency: 1,
          min: 0.05,
          max: 1
        }).start();

        mainGainRef.current = new Tone.Gain(0.3);
        lfoRef.current.connect(mainGainRef.current.gain);
        mainOscRef.current.connect(mainGainRef.current);
        mainGainRef.current.connect(filterRef.current);
        mainOscRef.current.start();

        // Ambient drone: sine osc, low volume
        droneOscRef.current = new Tone.Oscillator({
          frequency: 100,
          type: 'sine'
        });
        droneGainRef.current = new Tone.Gain(0.08);
        droneOscRef.current.connect(droneGainRef.current);
        droneGainRef.current.connect(filterRef.current);
        droneOscRef.current.start();

        // Alert motif synth (legacy - kept for backward compatibility)
        alertSynthRef.current = new Tone.Synth({
          oscillator: { type: 'square' },
          envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 1 }
        }).connect(masterGainRef.current);

        // Disaster-specific alert synths
        // Grid blackout: deep minor chord, slow decay
        gridAlertSynthRef.current = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'triangle' },
          envelope: { attack: 0.1, decay: 1.5, sustain: 0.1, release: 2 }
        }).connect(masterGainRef.current);

        // GPS disruption: high-pitched glitchy FM tones
        gpsAlertSynthRef.current = new Tone.Synth({
          oscillator: { type: 'sine' },
          envelope: { attack: 0.005, decay: 0.1, sustain: 0, release: 0.2 }
        }).connect(masterGainRef.current);

        // Satellite drag: descending frequency glide
        satelliteAlertSynthRef.current = new Tone.Synth({
          oscillator: { type: 'sawtooth' },
          envelope: { attack: 0.05, decay: 1, sustain: 0.2, release: 1.5 }
        }).connect(masterGainRef.current);

        // Radiation risk: filtered noise bursts
        radiationAlertSynthRef.current = new Tone.NoiseSynth({
          noise: { type: 'brown' },
          envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.5 }
        }).connect(masterGainRef.current);

        // Comms blackout: stuttering square wave
        commsAlertSynthRef.current = new Tone.Synth({
          oscillator: { type: 'square' },
          envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.1 }
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

    // Resume AudioContext when tab becomes visible (browsers suspend it in background)
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
      [mainOscRef, droneOscRef, lfoRef, mainGainRef, droneGainRef,
       filterRef, masterGainRef, alertSynthRef,
       gridAlertSynthRef, gpsAlertSynthRef, satelliteAlertSynthRef,
       radiationAlertSynthRef, commsAlertSynthRef].forEach(r => {
        try { r.current?.dispose(); } catch (_) {}
      });
    };
  }, [isPlaying]);

  // Compute disaster probabilities from data
  const computeDisasterProbabilities = (data: SpaceWeatherEvent): DisasterProbabilities => {
    const { kpIndex, flareClass, stormIntensity, cmeSpeed } = data;

    // Grid blackout: G3+ (Kp >= 7) geomagnetic storm
    const gridBlackout = kpIndex >= 7 ? Math.min(1, (kpIndex - 6) / 3) : 0;

    // GPS disruption: ionospheric scintillation at G2+ (Kp >= 6) or strong flares
    const flarePrefix = flareClass[0];
    const gpsDisruption = kpIndex >= 6
      ? Math.min(1, (kpIndex - 5) / 4)
      : (flarePrefix === 'X' || flarePrefix === 'M') ? 0.4 : 0;

    // Satellite drag: enhanced atmospheric drag at G2+ (Kp >= 6)
    const satelliteDrag = kpIndex >= 6 ? Math.min(1, (kpIndex - 5) / 4) : 0;

    // Radiation risk: SEP/proton events from X-class flares or fast CMEs
    const radiationRisk = (flarePrefix === 'X' ? 0.6 : flarePrefix === 'M' ? 0.2 : 0) +
                         (cmeSpeed > 1500 ? 0.3 : cmeSpeed > 1000 ? 0.15 : 0);

    // Comms blackout: HF radio blackout from M/X-class flares on sunlit side
    const commsBlackout = flarePrefix === 'X' ? 0.8 : flarePrefix === 'M' ? 0.5 : 0;

    return { gridBlackout, gpsDisruption, satelliteDrag, radiationRisk, commsBlackout };
  };

  // Update sonic parameters when telemetry or volume changes
  useEffect(() => {
    if (!isPlaying) return;

    const { stormIntensity, cmeSpeed, kpIndex, isBlackoutRisk } = data;
    const disasterProbs = computeDisasterProbabilities(data);

    // --- Perceptual sonification. Each dimension maps to a distinct sonic axis ---
    // Pitch (exponential)  : storm energy — 100 Hz quiet → 800 Hz extreme
    // Tempo / pulse rate   : CME speed — slow (0.1 Hz) → rapid (10 Hz)
    // Filter openness      : NOAA G-scale — muffled → bright, with dissonance
    const baseFreq = 100 * Math.pow(8, stormIntensity);          // 100–800 Hz, exponential
    const pulseRate = 0.1 + (cmeSpeed / 2000) * 9.9;             // 0.1–10 Hz
    const filterFreq = 200 + (kpIndex / 9) * 3800;               // 200–4000 Hz
    const lfoDepth = 0.1 + (kpIndex / 9) * 0.9;                  // pulsing strength

    if (mainOscRef.current) mainOscRef.current.frequency.rampTo(baseFreq, 0.5);
    if (droneOscRef.current) droneOscRef.current.frequency.rampTo(baseFreq * 0.5, 0.5);
    if (lfoRef.current) {
      lfoRef.current.frequency.rampTo(pulseRate, 0.3);
      lfoRef.current.max = lfoDepth;
    }
    if (filterRef.current) filterRef.current.frequency.rampTo(filterFreq, 0.5);

    // Master volume
    if (masterGainRef.current) masterGainRef.current.gain.rampTo(volume, 0.2);

    // Legacy alert motif on G3+ transition
    if (isBlackoutRisk && !lastAlertRef.current.grid && alertSynthRef.current) {
      const notes = ['C5', 'E5', 'G5', 'C6'];
      const t = Tone.now();
      notes.forEach((note, i) => {
        alertSynthRef.current?.triggerAttackRelease(note, '16n', t + i * 0.15);
      });
    }
    lastAlertRef.current.grid = isBlackoutRisk;

    // --- Disaster-specific audio cues ---
    const t = Tone.now();

    // Grid blackout: deep minor chord (C3-Eb3-G3-C4) - ominous, slow
    if (disasterProbs.gridBlackout > 0.5 && !lastAlertRef.current.grid && gridAlertSynthRef.current) {
      const notes = ['C3', 'Eb3', 'G3', 'C4'];
      notes.forEach((note, i) => {
        gridAlertSynthRef.current?.triggerAttackRelease(note, '2n', t + i * 0.3);
      });
    }

    // GPS disruption: high-pitched glitchy FM trills (C7-D7-E7-F7-G7)
    if (disasterProbs.gpsDisruption > 0.4 && !lastAlertRef.current.gps && gpsAlertSynthRef.current) {
      const notes = ['C7', 'D7', 'E7', 'F7', 'G7'];
      notes.forEach((note, i) => {
        gpsAlertSynthRef.current?.triggerAttackRelease(note, '64n', t + i * 0.05);
      });
    }

    // Satellite drag: descending sawtooth glide (G5 down to C4)
    if (disasterProbs.satelliteDrag > 0.4 && !lastAlertRef.current.satellite && satelliteAlertSynthRef.current) {
      satelliteAlertSynthRef.current?.triggerAttackRelease('G5', '2n', t);
      satelliteAlertSynthRef.current?.oscillator?.frequency?.rampTo(261.63, 1.5, t + 0.1); // C4
    }

    // Radiation risk: brown noise bursts
    if (disasterProbs.radiationRisk > 0.3 && !lastAlertRef.current.radiation && radiationAlertSynthRef.current) {
      radiationAlertSynthRef.current?.triggerAttackRelease('8n', t);
      radiationAlertSynthRef.current?.triggerAttackRelease('8n', t + 0.3);
      radiationAlertSynthRef.current?.triggerAttackRelease('8n', t + 0.6);
    }

    // Comms blackout: stuttering square wave pattern
    if (disasterProbs.commsBlackout > 0.4 && !lastAlertRef.current.comms && commsAlertSynthRef.current) {
      for (let i = 0; i < 8; i++) {
        commsAlertSynthRef.current?.triggerAttackRelease('A5', '32n', t + i * 0.12);
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
  }, [data, isPlaying, volume]);

  // Audio engine is headless — no visible UI. Storm intensity and blackout
  // alerts are surfaced visually by the player's live audio visualizer,
  // so this component renders nothing to the DOM.
  return null;
}