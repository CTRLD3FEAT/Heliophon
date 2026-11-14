'use client';

import { useState, useEffect } from 'react';
import { SpaceWeatherEvent } from '@/types';
import { FrequencyVisualizer } from '@/components/visual/FrequencyVisualizer';
import { AudioEngine, useAudioEngine } from '@/components/audio/AudioEngine';
import { clsx } from 'clsx';

interface DashboardProps {
  data: SpaceWeatherEvent;
  isSimulation: boolean;
  isCached: boolean;
  onToggleSimulation: () => void;
}

export function Dashboard({
  data,
  isSimulation,
  isCached,
  onToggleSimulation
}: DashboardProps) {
  const { isPlaying, setIsPlaying, volume, setVolume, toggle } = useAudioEngine();
  const [isReady, setIsReady] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Update last updated timestamp when data changes
  useEffect(() => {
    setLastUpdated(new Date());
  }, [data.timestamp]);

  // Handle audio context activation (requires user gesture)
  const handlePlayClick = () => {
    if (!isReady) {
      setIsReady(true);
    }
    toggle();
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }) + ' UTC';
  };

  const getFlareColor = (flareClass: string) => {
    const cls = flareClass[0];
    switch (cls) {
      case 'X': return 'text-red-400 bg-red-500/20';
      case 'M': return 'text-orange-400 bg-orange-500/20';
      case 'C': return 'text-yellow-400 bg-yellow-500/20';
      default: return 'text-slate-400 bg-slate-500/20';
    }
  };

  const getKPSeverity = (kp: number) => {
    if (kp >= 7) return { label: 'SEVERE', color: 'text-red-400 bg-red-500/20' };
    if (kp >= 5) return { label: 'STORM', color: 'text-orange-400 bg-orange-500/20' };
    if (kp >= 3) return { label: 'UNSETTLED', color: 'text-yellow-400 bg-yellow-500/20' };
    return { label: 'QUIET', color: 'text-green-400 bg-green-500/20' };
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-mono">
      {/* Audio Engine (headless) */}
      <AudioEngine
        data={data}
        isPlaying={isPlaying}
        volume={volume}
        isSimulation={isSimulation}
        onAudioReady={() => setIsReady(true)}
      />

      {/* Main Layout */}
      <main className="max-w-6xl mx-auto p-4 md:p-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-400">
                SOLAR JUKEBOX
              </h1>
              <p className="text-slate-400 mt-1 text-sm">
                Accessible Space Weather Sonification — Ground-Impact Focus
              </p>
            </div>

            {/* Status Badges */}
            <div className="flex flex-wrap gap-2">
              <span className={clsx('px-3 py-1 rounded-full text-xs font-medium', data.isBlackoutRisk ? 'text-red-300 bg-red-500/20 animate-pulse' : 'text-green-300 bg-green-500/20')}>
                {data.isBlackoutRisk ? '⚠ GRID BLACKOUT RISK' : '✓ GRID STABLE'}
              </span>
              <span className={clsx('px-3 py-1 rounded-full text-xs font-medium', getKPSeverity(data.kpIndex).color)}>
                Kp: {data.kpIndex.toFixed(1)} - {getKPSeverity(data.kpIndex).label}
              </span>
              {isSimulation && (
                <span className="px-3 py-1 rounded-full text-xs font-medium text-purple-300 bg-purple-500/20">
                  🧪 SIMULATION MODE
                </span>
              )}
              {isCached && (
                <span className="px-3 py-1 rounded-full text-xs font-medium text-yellow-300 bg-yellow-500/20">
                  📼 CACHED DATA
                </span>
              )}
            </div>
          </div>

          {/* Simulation Toggle */}
          <div className="flex items-center gap-4">
            <button
              onClick={onToggleSimulation}
              className={clsx(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                isSimulation
                  ? 'bg-purple-600 text-white hover:bg-purple-500'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              )}
            >
              {isSimulation ? 'Exit Simulation' : 'Simulate 1989 Quebec Storm'}
            </button>

            <div className="text-xs text-slate-500">
              Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : '—'}
            </div>
          </div>
        </header>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel: Visualization */}
          <div className="lg:col-span-2 space-y-6">
            {/* Frequency Visualizer */}
            <section className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-cyan-300">Live Frequency Spectrum</h2>
                <div className="flex items-center gap-2">
                  <span
                    className={clsx(
                      'w-2 h-2 rounded-full',
                      isReady ? 'bg-green-400' : 'bg-slate-500'
                    )}
                  />
                  <span className="text-xs text-slate-400">
                    {isPlaying ? '🔊 Live Sonification Active' : '🔇 Audio Standby'}
                  </span>
                </div>
              </div>

              <FrequencyVisualizer
                data={data}
                isPlaying={isPlaying}
                className="w-full"
              />

              {/* Audio Controls */}
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-800">
                <button
                  onClick={handlePlayClick}
                  className={clsx(
                    'flex items-center gap-2 px-6 py-3 rounded-lg text-lg font-semibold transition-all',
                    isPlaying
                      ? 'bg-red-600 text-white hover:bg-red-500'
                      : 'bg-cyan-600 text-white hover:bg-cyan-500'
                  )}
                  aria-label={isPlaying ? 'Stop sonification' : 'Start sonification'}
                  disabled={isPlaying && !isReady}
                >
                  {isPlaying && !isReady ? (
                    <>⏳ Starting…</>
                  ) : isPlaying ? (
                    '⏸ Stop'
                  ) : (
                    '▶ Play Space Weather'
                  )}
                </button>

                <div className="flex-1 max-w-xs">
                  <label className="block text-xs text-slate-400 mb-1">Master Volume</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={e => setVolume(Number(e.target.value))}
                    className="w-full h-2 appearance-none bg-slate-800 rounded-lg accent-cyan-500"
                    aria-label="Master volume"
                  />
                </div>
              </div>
            </section>

            {/* Risk Assessment */}
            <section className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
              <h2 className="text-lg font-semibold text-cyan-300 mb-4">Infrastructure Impact Assessment</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <ImpactCard
                  title="Power Grid"
                  severity={data.kpIndex >= 7 ? 'critical' : data.kpIndex >= 5 ? 'warning' : 'nominal'}
                  details={
                    data.kpIndex >= 7
                      ? 'GICs probable at high latitudes. NOAA G4+ storm warning in effect.'
                      : data.kpIndex >= 5
                        ? 'Elevated geomagnetic currents. NOAA G1-G3 watch.'
                        : 'No geomagnetic storm watch in effect.'
                  }
                />
                <ImpactCard
                  title="GPS / GNSS"
                  severity={data.kpIndex >= 5 ? 'warning' : 'nominal'}
                  details={
                    data.kpIndex >= 5
                      ? 'Ionospheric scintillation possible. Reduced positioning integrity likely.'
                      : 'Standard positioning accuracy expected.'
                  }
                />
                <ImpactCard
                  title="Satellites (LEO)"
                  severity={data.kpIndex >= 5 ? 'warning' : 'nominal'}
                  details={
                    data.kpIndex >= 5
                      ? 'Increased atmospheric drag. Enhanced orbit-decay risk for LEO.'
                      : 'Standard drag environment.'
                  }
                />
                <ImpactCard
                  title="HF Radio / Aviation"
                  severity={data.flareClass[0] === 'X' || data.flareClass[0] === 'M' ? 'warning' : 'nominal'}
                  details={
                    data.flareClass[0] === 'X' || data.flareClass[0] === 'M'
                      ? 'HF radio blackout on sunlit side. Polar route comms degraded.'
                      : 'Standard HF propagation.'
                  }
                />
              </div>
            </section>
          </div>

          {/* Right Panel: Telemetry */}
          <div className="space-y-6">
            {/* Key Metrics */}
            <section className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
              <h2 className="text-lg font-semibold text-cyan-300 mb-4">Real-Time Telemetry</h2>

              <div className="space-y-4">
                <MetricCard
                  label="CME Speed"
                  value={`${data.cmeSpeed.toLocaleString()} km/s`}
                  trend={data.cmeSpeed > 1000 ? 'high' : data.cmeSpeed > 500 ? 'moderate' : 'low'}
                  icon="🌞"
                />
                <MetricCard
                  label="Solar Flare Class"
                  value={data.flareClass}
                  trend={['X', 'M'].includes(data.flareClass[0]) ? 'high' : 'low'}
                  icon="⚡"
                  trendColor={getFlareColor(data.flareClass)}
                />
                <MetricCard
                  label="Kp Index"
                  value={data.kpIndex.toFixed(1)}
                  trend={data.kpIndex >= 7 ? 'high' : data.kpIndex >= 5 ? 'moderate' : 'low'}
                  icon="🧭"
                />
                <MetricCard
                  label="Storm Intensity"
                  value={`${Math.round(data.stormIntensity * 100)}%`}
                  trend={data.stormIntensity > 0.7 ? 'high' : data.stormIntensity > 0.3 ? 'moderate' : 'low'}
                  icon="📊"
                />
              </div>
            </section>

            {/* Alert Banner */}
            {data.isBlackoutRisk && (
              <section className="bg-red-900/30 border border-red-500/50 rounded-xl p-4 animate-pulse">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">🚨</span>
                  <div>
                    <h3 className="text-red-300 font-bold text-lg">BLACKOUT RISK DETECTED</h3>
                    <p className="text-red-200 mt-1 text-sm">
                      Geomagnetic conditions exceed safe thresholds for high-latitude power infrastructure.
                      Grid operators advised to enter conservative operations mode immediately.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Educational Context */}
            <section className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
              <h2 className="text-lg font-semibold text-cyan-300 mb-3">What You're Hearing</h2>
              <div className="space-y-2 text-sm text-slate-300">
                <p><strong>Low Hum:</strong> Calm conditions (Kp ≤ 3, no Earth-directed CME)</p>
                <p><strong>Rising Pitch &amp; Pulsing:</strong> Growing storm energy — higher Kp, faster CME, stronger flare</p>
                <p><strong>Red Alert Motif:</strong> NOAA G3+ geomagnetic storm watch in effect</p>
                <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-800">
                  Audio is a perceptual sonification — a design choice, not a physical measurement.
                  We communicate NOAA SWPC data; we do not issue alerts.
                </p>
              </div>
            </section>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-8 pt-6 border-t border-slate-800 text-center text-xs text-slate-500">
          <p>Data Sources: NASA DONKI API • NOAA SWPC • Real-time space weather telemetry</p>
          <p className="mt-1">Built for NASA Space Apps Challenge 2026 • The Earth Information Jukebox</p>
        </footer>
      </main>
    </div>
  );
}

/* Helper Components */

function ImpactCard({
  title,
  severity,
  details
}: {
  title: string;
  severity: 'nominal' | 'warning' | 'critical';
  details: string;
}) {
  const colors = {
    nominal: 'text-green-400 bg-green-500/10 border-green-500/20',
    warning: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    critical: 'text-red-400 bg-red-500/10 border-red-500/20'
  };

  const labels = {
    nominal: 'NOMINAL',
    warning: 'WATCH',
    critical: 'CRITICAL'
  };

  return (
    <div className={clsx('rounded-lg p-4 border', colors[severity])}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-slate-300">{title}</span>
        <span className={clsx('text-xs font-bold px-2 py-0.5 rounded', colors[severity])}>
          {labels[severity]}
        </span>
      </div>
      <p className="text-sm text-slate-400">{details}</p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  trend,
  icon,
  trendColor
}: {
  label: string;
  value: string;
  trend: 'low' | 'moderate' | 'high';
  icon: string;
  trendColor?: string;
}) {
  const trendColors = {
    low: 'text-green-400',
    moderate: 'text-yellow-400',
    high: 'text-red-400'
  };

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">{icon}</span>
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <div className="flex items-baseline justify-between">
        <span className="text-2xl font-mono font-bold text-white">{value}</span>
        <span className={clsx('text-xs font-medium px-2 py-0.5 rounded', trendColors[trend], trendColor)}>
          {trend.toUpperCase()}
        </span>
      </div>
    </div>
  );
}