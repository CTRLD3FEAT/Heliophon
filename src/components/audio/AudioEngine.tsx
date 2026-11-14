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
  const lastAlertRef = useRef(false);
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

        // Alert motif synth
        alertSynthRef.current = new Tone.Synth({
          oscillator: { type: 'square' },
          envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 1 }
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
       filterRef, masterGainRef, alertSynthRef].forEach(r => {
        try { r.current?.dispose(); } catch (_) {}
      });
    };
  }, [isPlaying]);

  // Update sonic parameters when telemetry or volume changes
  useEffect(() => {
    if (!isPlaying) return;

    const { stormIntensity, cmeSpeed, kpIndex, isBlackoutRisk } = data;

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
      // Set LFO depth directly — using rampTo on a number property can click
      lfoRef.current.max = lfoDepth;
    }
    if (filterRef.current) filterRef.current.frequency.rampTo(filterFreq, 0.5);

    // Master volume
    if (masterGainRef.current) masterGainRef.current.gain.rampTo(volume, 0.2);

    // Alert motif on G3+ transition (false → true)
    if (isBlackoutRisk && !lastAlertRef.current && alertSynthRef.current) {
      const notes = ['C5', 'E5', 'G5', 'C6'];
      const t = Tone.now();
      notes.forEach((note, i) => {
        alertSynthRef.current?.triggerAttackRelease(note, '16n', t + i * 0.15);
      });
    }
    lastAlertRef.current = isBlackoutRisk;
  }, [data, isPlaying, volume]);

  return (
    <div className="sr-only" aria-live={data.isBlackoutRisk ? 'assertive' : 'polite'}>
      {error && <p role="alert">{error}</p>}
      <p>
        Space weather audio: {isPlaying ? '🔊 Playing' : '🔇 Paused'}.
        Storm intensity: {Math.round(data.stormIntensity * 100)}%.
        {data.isBlackoutRisk && ' BLACKOUT ALERT ACTIVE.'}
      </p>
      <p>
        Data source: {isSimulation
          ? 'Quebec 1989 historical reconstruction'
          : 'NASA DONKI and NOAA SWPC live telemetry'}.
      </p>
    </div>
  );
}