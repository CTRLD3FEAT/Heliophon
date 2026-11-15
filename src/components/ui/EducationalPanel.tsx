'use client';

import { useEffect, useRef, useState } from 'react';
import { SpaceWeatherEvent } from '@/types';
import { clsx } from 'clsx';

interface EducationalPanelProps {
  data: SpaceWeatherEvent;
  isPlaying: boolean;
  isSimulation: boolean;
  onClose: () => void;
}

export function EducationalPanel({ data, isPlaying, isSimulation, onClose }: EducationalPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [activeLayer, setActiveLayer] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const layers = [
    {
      id: 'kp-bass',
      name: 'Kp Bass Drone',
      icon: '🎵',
      parameter: 'Kp Index',
      value: data.kpIndex.toFixed(1),
      description: 'Fundamental C2 drone. Modulation index increases with Kp (0→10), adding odd harmonics for tension. No melodic changes — pure timbral warning.',
      color: 'from-cyan-500 to-blue-500',
      active: data.kpIndex > 0,
      intensity: Math.min(1, data.kpIndex / 9),
      frequency: '65 Hz (C2)',
      timbre: data.kpIndex <= 3 ? 'Pure sine' : data.kpIndex <= 6 ? 'FM: 2-5 harmonics' : 'FM: 6-10 harmonics (harsh)',
    },
    {
      id: 'goes-lead',
      name: 'GOES Lead Synth',
      icon: '⚡',
      parameter: 'X-ray Flare Class',
      value: data.flareClass,
      description: 'Dual FM voices (C4 + G3 minor 7th). Oscillator type and filter cutoff track flare class: A=sine/400Hz → X=square/5000Hz. Brightness = danger.',
      color: 'from-yellow-500 via-orange-500 to-red-500',
      active: ['C', 'M', 'X'].includes(data.flareClass[0]),
      intensity: { A: 0.1, B: 0.2, C: 0.4, M: 0.7, X: 1 }[data.flareClass[0]] || 0,
      frequency: '262 Hz (C4) + 196 Hz (G3)',
      timbre: { A: 'Sine (soft)', B: 'Sine', C: 'Triangle', M: 'Sawtooth', X: 'Square (harsh)' }[data.flareClass[0]] || 'Sine',
    },
    {
      id: 'dst-sub',
      name: 'Dst Sub-Bass',
      icon: '🌊',
      parameter: 'Dst Index',
      value: data.dst !== undefined ? `${data.dst} nT` : 'N/A',
      description: 'Ultra-low rumble at 15-30 Hz (felt more than heard). Amplitude maps to |Dst| storm depth: quiet at -20 nT, max at -500 nT. Subwoofer recommended.',
      color: 'from-indigo-500 to-purple-500',
      active: data.dst !== undefined && data.dst < -20,
      intensity: data.dst !== undefined ? Math.min(1, Math.abs(data.dst) / 500) : 0,
      frequency: '15-30 Hz (sub-audible)',
      timbre: 'Pure sine (sub-bass)',
    },
    {
      id: 'cme-arp',
      name: 'CME Arpeggiator',
      icon: '☄️',
      parameter: 'CME Speed',
      value: `${data.cmeSpeed.toLocaleString()} km/s`,
      description: 'Classic two-tone siren (C6↔C5 square wave) — European emergency vehicle pattern. Rate scales 0.2→4 Hz (300→2000 km/s). Harsh, unmistakable warning.',
      color: 'from-blue-500 to-cyan-500',
      active: data.cmeSpeed > 300,
      intensity: Math.min(1, data.cmeSpeed / 2000),
      frequency: '523 Hz (C5) ↔ 1047 Hz (C6)',
      timbre: 'Square wave (alarm timbre)',
    },
    {
      id: 'solar-wind',
      name: 'Solar Wind Texture',
      icon: '☀️',
      parameter: 'Proton Flux',
      value: `${data.protonFlux || 1} pfu`,
      description: 'Filtered brown noise. Bandpass center frequency 200→2200 Hz, gain 0.01→0.05 tracks proton flux (log scale). Density = particle storm intensity.',
      color: 'from-amber-500 to-orange-500',
      active: (data.protonFlux || 1) > 10,
      intensity: Math.min(1, Math.log10(data.protonFlux || 1) / 3),
      frequency: '200-2200 Hz (bandpass noise)',
      timbre: 'Brown noise (filtered)',
    },
  ];

  const alerts = [
    {
      id: 'grid-blackout',
      name: 'Grid Blackout',
      icon: '⚡',
      trigger: 'Kp ≥ 7 (G3+)',
      active: data.kpIndex >= 7,
      probability: data.kpIndex >= 7 ? Math.min(1, (data.kpIndex - 6) / 3) : 0,
      sound: 'Deep minor chord (C2-E♭2-G2-C3-E♭3-G3), 6 voices, slow attack',
      impact: 'Transformer GIC damage risk. High-latitude power grids.',
      severity: 'critical',
    },
    {
      id: 'gps-disruption',
      name: 'GPS Disruption',
      icon: '📍',
      trigger: 'Kp ≥ 6 (G2+) or M/X flare',
      active: data.kpIndex >= 6 || ['M', 'X'].includes(data.flareClass[0]),
      probability: data.kpIndex >= 6 ? Math.min(1, (data.kpIndex - 5) / 4) : (['M', 'X'].includes(data.flareClass[0]) ? 0.4 : 0),
      sound: 'Glitchy FM trills C7→C8, 8 notes at 64th-note rate',
      impact: 'Ionospheric scintillation. GNSS positioning degraded.',
      severity: 'warning',
    },
    {
      id: 'satellite-drag',
      name: 'Satellite Drag',
      icon: '🛰️',
      trigger: 'Kp ≥ 6 (G2+)',
      active: data.kpIndex >= 6,
      probability: data.kpIndex >= 6 ? Math.min(1, (data.kpIndex - 5) / 4) : 0,
      sound: 'Descending glide G5→C4 over 1.5s, sawtooth timbre',
      impact: 'Thermospheric expansion. LEO orbit decay risk.',
      severity: 'warning',
    },
    {
      id: 'radiation-risk',
      name: 'Radiation Risk',
      icon: '☢️',
      trigger: 'X-flare or CME >1500 km/s',
      active: data.flareClass[0] === 'X' || data.cmeSpeed > 1500,
      probability: (data.flareClass[0] === 'X' ? 0.6 : data.flareClass[0] === 'M' ? 0.2 : 0) + (data.cmeSpeed > 1500 ? 0.3 : data.cmeSpeed > 1000 ? 0.15 : 0),
      sound: 'Three brown noise bursts (quarter notes, 0.5s apart)',
      impact: 'Solar energetic particles (SEP). Astronaut/aviation hazard.',
      severity: 'critical',
    },
    {
      id: 'comms-blackout',
      name: 'Comms Blackout',
      icon: '📻',
      trigger: 'M/X flare',
      active: ['M', 'X'].includes(data.flareClass[0]),
      probability: data.flareClass[0] === 'X' ? 0.8 : data.flareClass[0] === 'M' ? 0.5 : 0,
      sound: 'Stuttering square wave A5, 12 hits at 32nd-note rate',
      impact: 'HF radio blackout on sunlit side. Polar aviation comms lost.',
      severity: 'warning',
    },
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-400 bg-red-500/20 border-red-500/30';
      case 'warning': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      default: return 'text-green-400 bg-green-500/20 border-green-500/30';
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'critical': return 'CRITICAL';
      case 'warning': return 'WATCH';
      default: return 'NOMINAL';
    }
  };

  const renderIntensityBar = (intensity: number, color: string) => (
    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{
          width: `${intensity * 100}%`,
          background: `linear-gradient(90deg, ${color})`,
        }}
      />
    </div>
  );

  return (
    <div
      ref={panelRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="educational-panel-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden bg-slate-950 border border-slate-700 rounded-2xl shadow-2xl animate-slide-up">
        {/* Header */}
        <header className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
              <span className="text-xl">🎧</span>
            </div>
            <div>
              <h2 id="educational-panel-title" className="text-lg font-bold text-white">
                What You&apos;re Hearing
              </h2>
              <p className="text-xs text-slate-400">
                Real-time sonification mapping • {isSimulation ? 'Historical Simulation' : 'Live Data'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
            aria-label="Close panel"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 5l10 10M15 5l-10 10" />
            </svg>
          </button>
        </header>

        {/* Content */}
        <div className="flex h-[calc(90vh-80px)] overflow-hidden">
          {/* Sidebar Navigation */}
          <nav className="w-48 border-r border-slate-800 bg-slate-900/50 p-3 overflow-y-auto flex-shrink-0">
            <div className="space-y-1">
              <h3 className="px-2 py-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                Continuous Layers
              </h3>
              {layers.map((layer) => (
                <button
                  key={layer.id}
                  onClick={() => setActiveLayer(layer.id)}
                  className={clsx(
                    'w-full text-left px-3 py-2 rounded-lg text-sm transition-all',
                    activeLayer === layer.id
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{layer.icon}</span>
                    <span className="font-medium truncate">{layer.name}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-1">
                    <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${layer.intensity * 100}%`,
                          background: `linear-gradient(90deg, ${layer.color.split(' ')[0].replace('from-', '').replace('to-', '')})`,
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 w-12 text-right">
                      {Math.round(layer.intensity * 100)}%
                    </span>
                  </div>
                </button>
              ))}

              <h3 className="px-2 py-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-4">
                Event Alerts
              </h3>
              {alerts.map((alert) => (
                <button
                  key={alert.id}
                  onClick={() => setActiveLayer(alert.id)}
                  className={clsx(
                    'w-full text-left px-3 py-2 rounded-lg text-sm transition-all',
                    activeLayer === alert.id
                      ? `bg-slate-700 text-white border ${getSeverityColor(alert.severity)}`
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{alert.icon}</span>
                    <span className="font-medium truncate">{alert.name}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-1">
                    <span className={clsx('text-[9px] font-bold px-1.5 py-0.5 rounded', getSeverityColor(alert.severity))}>
                      {getSeverityLabel(alert.severity)}
                    </span>
                    <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(1, alert.probability) * 100}%`,
                          background: alert.severity === 'critical'
                            ? 'linear-gradient(90deg, #EF4444)'
                            : 'linear-gradient(90deg, #F59E0B)',
                        }}
                      />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </nav>

          {/* Detail Panel */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {(() => {
              const selectedLayer = layers.find(l => l.id === activeLayer);
              const selectedAlert = alerts.find(a => a.id === activeLayer);
              const item = selectedLayer || selectedAlert;

              if (!item) {
                return (
                  <div className="text-center py-12 text-slate-500">
                    <span className="text-4xl mb-4 block">👈</span>
                    <p className="text-lg font-medium">Select a layer or alert</p>
                    <p className="text-sm mt-1">Click any item on the left to see its real-time mapping</p>
                  </div>
                );
              }

              if (selectedLayer) {
                return (
                  <div className="space-y-6 animate-fade-in">
                    {/* Layer Header */}
                    <div className="flex items-start gap-4 p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
                      <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl bg-gradient-to-br" style={{ background: selectedLayer.color }}>
                        {selectedLayer.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-bold text-white">{selectedLayer.name}</h3>
                        <p className="text-slate-400 mt-1">{selectedLayer.description}</p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          <span className={clsx('px-2 py-0.5 rounded text-[10px] font-medium', `bg-gradient-to-r ${selectedLayer.color} text-white`)}>
                            Active: {selectedLayer.active ? 'YES' : 'NO'}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300">
                            {selectedLayer.parameter}: {selectedLayer.value}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Technical Specs */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Frequency / Pitch</h4>
                        <p className="text-lg font-mono text-cyan-300">{selectedLayer.frequency}</p>
                      </div>
                      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Timbre / Texture</h4>
                        <p className="text-lg font-mono text-cyan-300">{selectedLayer.timbre}</p>
                      </div>
                      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Current Intensity</h4>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${selectedLayer.intensity * 100}%`,
                                background: `linear-gradient(90deg, ${selectedLayer.color})`,
                              }}
                            />
                          </div>
                          <span className="text-lg font-mono font-bold text-cyan-400 w-16 text-right">
                            {Math.round(selectedLayer.intensity * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Mapping Explanation */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: selectedLayer.color.split(' ')[0].replace('from-', '') }} />
                        Parameter → Audio Mapping
                      </h4>
                      <div className="space-y-2 text-sm text-slate-300">
                        {selectedLayer.id === 'kp-bass' && (
                          <>
                            <p><strong>Kp 0-3:</strong> Pure sine wave (modulation index = 0). Calm, unobtrusive hum.</p>
                            <p><strong>Kp 4-6:</strong> FM modulation index 1.5-4.5. Odd harmonics emerge — growing tension.</p>
                            <p><strong>Kp 7-9:</strong> FM modulation index 6-10. Rich, harsh timbre — unmistakable warning.</p>
                            <p className="text-slate-500 text-xs mt-2"><em>Note: Pitch never changes (fixed C2). Only harmonic content evolves.</em></p>
                          </>
                        )}
                        {selectedLayer.id === 'goes-lead' && (
                          <>
                            <p><strong>Class A-B:</strong> Sine wave, lowpass 400-600 Hz. Soft, barely audible.</p>
                            <p><strong>Class C:</strong> Triangle wave, lowpass 1 kHz. Distinct but not alarming.</p>
                            <p><strong>Class M:</strong> Sawtooth, lowpass 2.5 kHz. Bright, cutting — &quot;pay attention&quot;.</p>
                            <p><strong>Class X:</strong> Square wave, lowpass 5 kHz. Harsh, siren-like — immediate action.</p>
                            <p className="text-slate-500 text-xs mt-2"><em>Dual voice: C4 (fundamental) + G3 (minor 7th) for constant dissonance.</em></p>
                          </>
                        )}
                        {selectedLayer.id === 'dst-sub' && (
                          <>
                            <p><strong>Dst greater than -20 nT:</strong> Silence. No storm.</p>
                            <p><strong>Dst -20 to -100 nT:</strong> Sub-bass emerges at 15 Hz, barely audible.</p>
                            <p><strong>Dst -100 to -300 nT:</strong> Frequency rises to 22 Hz, amplitude grows. Felt in chest.</p>
                            <p><strong>Dst less than -300 nT:</strong> 30 Hz at full amplitude. Physical pressure sensation.</p>
                            <p className="text-slate-500 text-xs mt-2"><em>Requires subwoofer or quality headphones. Laptop speakers won&apos;t reproduce.</em></p>
                          </>
                        )}
                        {selectedLayer.id === 'cme-arp' && (
                          <>
                            <p><strong>300 km/s:</strong> 0.2 Hz (one note every 5 seconds). Distant threat.</p>
                            <p><strong>800 km/s:</strong> 1 Hz (two notes/second). Approaching fast.</p>
                            <p><strong>1500 km/s:</strong> 2.5 Hz. Imminent impact.</p>
                            <p><strong>2000+ km/s:</strong> 4 Hz. Maximum urgency — classic emergency siren rate.</p>
                            <p className="text-slate-500 text-xs mt-2"><em>Two-tone pattern (C6↔C5) mimics European emergency vehicles. Universally recognized as &quot;warning&quot;.</em></p>
                          </>
                        )}
                        {selectedLayer.id === 'solar-wind' && (
                          <>
                            <p><strong>1-10 pfu:</strong> Filter at 200 Hz, gain -40 dB. Near silence.</p>
                            <p><strong>10-100 pfu:</strong> Filter opens to 800 Hz, gain -30 dB. Steady hiss.</p>
                            <p><strong>100-1000 pfu:</strong> Filter at 1.5 kHz, gain -20 dB. Dense texture.</p>
                            <p><strong>{'>'} 1000 pfu:</strong> Filter at 2.2 kHz, gain -13 dB. Intense particle storm roar.</p>
                            <p className="text-slate-500 text-xs mt-2"><em>Logarithmic scale. Brown noise = natural solar wind spectrum.</em></p>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Design Principle */}
                    <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4">
                      <h4 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                        💡 Design Principle
                      </h4>
                      <p className="text-sm text-cyan-300">
                        {selectedLayer.id === 'kp-bass' && 'Each layer owns a distinct sonic dimension: Kp = harmonic richness (timbre). No melodic changes — the brain tracks timbre effortlessly while working.'}
                        {selectedLayer.id === 'goes-lead' && 'GOES = brightness + dissonance (spectral centroid + interval). Dual voice creates beating that signals "artificial/engineered" = warning.'}
                        {selectedLayer.id === 'dst-sub' && 'Dst = sub-bass amplitude (physical sensation). Felt more than heard — bypasses cognitive processing, triggers visceral response.'}
                        {selectedLayer.id === 'cme-arp' && 'CME = rhythm + interval (temporal pattern). Two-tone siren is culturally universal "emergency" — no learning required.'}
                        {selectedLayer.id === 'solar-wind' && 'Solar Wind = texture density (statistical roughness). Brown noise maps to particle flux distribution — naturalistic, not synthetic.'}
                      </p>
                    </div>
                  </div>
                );
              }

              // Alert detail - guard against undefined
              if (!selectedAlert) {
                return (
                  <div className="text-center py-12 text-slate-500">
                    <p className="text-lg font-medium">Select an alert to see details</p>
                  </div>
                );
              }

              // Alert detail
              return (
                <div className="space-y-6 animate-fade-in">
                  {/* Alert Header */}
                  <div className={clsx('flex items-start gap-4 p-4 bg-slate-900/50 border rounded-xl', `border-${selectedAlert.severity === 'critical' ? 'red' : 'yellow'}-500/30`)}>
                    <div className={clsx('w-14 h-14 rounded-xl flex items-center justify-center text-2xl', `bg-gradient-to-br ${selectedAlert.severity === 'critical' ? 'from-red-500 to-red-600' : 'from-yellow-500 to-orange-500'}`)}>
                      {selectedAlert.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold text-white">{selectedAlert.name}</h3>
                      <p className="text-slate-400 mt-1">{selectedAlert.impact}</p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <span className={clsx('px-2 py-0.5 rounded text-[10px] font-bold', getSeverityColor(selectedAlert.severity))}>
                          {getSeverityLabel(selectedAlert.severity)}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300">
                          Trigger: {selectedAlert.trigger}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono text-cyan-400 bg-slate-800">
                          Probability: {Math.round(selectedAlert.probability * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Alert Sound */}
                  <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-yellow-500" />
                      Alert Sound Signature
                    </h4>
                    <div className="bg-slate-800/50 rounded-lg p-3 font-mono text-sm text-slate-300 border border-slate-700">
                      {selectedAlert.sound}
                    </div>
                    <p className="text-slate-500 text-xs mt-2">
                      Fires once per threshold cross (debounced). Will not re-trigger until condition clears and crosses again.
                    </p>
                  </div>

                  {/* Threshold Logic */}
                  <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: selectedAlert.severity === 'critical' ? '#EF4444' : '#F59E0B' }} />
                      Threshold Logic
                    </h4>
                    <div className="space-y-2 text-sm text-slate-300">
                      {selectedAlert.id === 'grid-blackout' && (
                        <>
                          <p><strong>Primary:</strong> Kp ≥ 7 (NOAA G3-G5)</p>
                          <p><strong>Probability curve:</strong> Linear from 0 at Kp=6 to 1.0 at Kp=9</p>
                          <p><strong>Debounce:</strong> 5 minutes (prevents flicker at boundary)</p>
                          <p className="text-red-400 text-xs mt-2"><em>Most consequential alert. GICs can destroy transformers in minutes.</em></p>
                        </>
                      )}
                      {selectedAlert.id === 'gps-disruption' && (
                        <>
                          <p><strong>Primary:</strong> Kp ≥ 6 (G2+)</p>
                          <p><strong>Secondary:</strong> M-class or X-class flare (ionospheric disturbance)</p>
                          <p><strong>Probability:</strong> Kp-based linear + flare bonus (0.4 for M/X)</p>
                          <p className="text-yellow-400 text-xs mt-2"><em>Scintillation can cause 10-50m positioning errors instantly.</em></p>
                        </>
                      )}
                      {selectedAlert.id === 'satellite-drag' && (
                        <>
                          <p><strong>Primary:</strong> Kp ≥ 6 (G2+)</p>
                          <p><strong>Mechanism:</strong> Joule heating → thermospheric expansion → density increase at LEO</p>
                          <p><strong>Probability:</strong> Linear from 0 at Kp=5 to 1.0 at Kp=9</p>
                          <p className="text-yellow-400 text-xs mt-2"><em>Drag increases exponentially. Starlink lost 40 satellites in Feb 2022 (G1 storm).</em></p>
                        </>
                      )}
                      {selectedAlert.id === 'radiation-risk' && (
                        <>
                          <p><strong>Primary:</strong> X-class flare (SEP proxy)</p>
                          <p><strong>Secondary:</strong> CME {'>'} 1500 km/s (shock acceleration)</p>
                          <p><strong>Probability:</strong> X-flare=0.6, M-flare=0.2, Fast CME=0.3, Med CME=0.15</p>
                          <p className="text-red-400 text-xs mt-2"><em>SEP events arrive 10min-2hrs post-flare. Astronauts: seek shelter immediately.</em></p>
                        </>
                      )}
                      {selectedAlert.id === 'comms-blackout' && (
                        <>
                          <p><strong>Primary:</strong> X-class flare (R3+ blackout)</p>
                          <p><strong>Secondary:</strong> M-class flare (R1-R2 blackout)</p>
                          <p><strong>Probability:</strong> X=0.8, M=0.5</p>
                          <p className="text-yellow-400 text-xs mt-2"><em>HF (3-30 MHz) absorbed on sunlit hemisphere. Polar routes most affected.</em></p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Design Principle */}
                  <div className={clsx('rounded-xl p-4 border', selectedAlert.severity === 'critical' ? 'bg-red-500/10 border-red-500/30' : 'bg-yellow-500/10 border-yellow-500/30')}>
                    <h4 className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1">
                      {selectedAlert.severity === 'critical' ? '🚨' : '⚠️'} Design Principle
                    </h4>
                    <p className="text-sm" style={{ color: selectedAlert.severity === 'critical' ? '#F87171' : '#FBBF24' }}>
                      {selectedAlert.id === 'grid-blackout' && 'Deep minor chord = sadness/loss + harmonic gravity. Six voices = transformer phases. Slow attack = inevitable, not sudden.'}
                      {selectedAlert.id === 'gps-disruption' && 'Glitchy FM trills = digital corruption. High register (C7-C8) = "above" (satellites). Fast 64th notes = data loss rate.'}
                      {selectedAlert.id === 'satellite-drag' && 'Descending glide = orbital decay. Sawtooth = atmospheric friction. G5→C4 = altitude loss (high→low pitch = up→down metaphor).'}
                      {selectedAlert.id === 'radiation-risk' && 'Brown noise bursts = particle impacts. Three pulses = "attention" pattern. Quarter-note spacing = human reaction time (~500ms).'}
                      {selectedAlert.id === 'comms-blackout' && 'Stuttering square = broken carrier wave. A5 = aviation band reference. 12 hits = "message not received" repetition.'}
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}