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
  const [prevTimestamp, setPrevTimestamp] = useState(data.timestamp);

  // Update last updated timestamp when data changes (adjust state during render)
  if (prevTimestamp !== data.timestamp) {
    setPrevTimestamp(data.timestamp);
    setLastUpdated(new Date());
  }

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
    <div className="h-full flex flex-col overflow-hidden bg-slate-950 text-slate-100 font-mono">
      {/* Audio Engine (headless) */}
      <AudioEngine
        data={data}
        isPlaying={isPlaying}
        volume={volume}
        isSimulation={isSimulation}
        onAudioReady={() => setIsReady(true)}
      />

      {/* Main Content - compact for sidebar */}
      <main className="flex-1 overflow-y-auto p-3 lg:p-4 space-y-4">
        {/* Header */}
        <header className="flex-shrink-0 border-b border-slate-800/50 pb-3">
          <div className="flex flex-col gap-3 mb-3">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-400">
                SOLAR JUKEBOX
              </h1>
              <p className="text-slate-400 mt-0.5 text-xs">
                Space Weather Sonification
              </p>
            </div>

            {/* Status Badges */}
            <div className="flex flex-wrap gap-1.5">
              <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-medium', data.isBlackoutRisk ? 'text-red-300 bg-red-500/20 animate-pulse' : 'text-green-300 bg-green-500/20')}>
                {data.isBlackoutRisk ? '⚠ GRID RISK' : '✓ GRID OK'}
              </span>
              <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-medium', getKPSeverity(data.kpIndex).color)}>
                Kp {data.kpIndex.toFixed(1)} {getKPSeverity(data.kpIndex).label}
              </span>
              {isSimulation && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium text-purple-300 bg-purple-500/20">
                  🧪 SIM
                </span>
              )}
              {isCached && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium text-yellow-300 bg-yellow-500/20">
                  📼 CACHED
                </span>
              )}
            </div>
          </div>

          {/* Simulation Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleSimulation}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-1',
                isSimulation
                  ? 'bg-purple-600 text-white hover:bg-purple-500'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              )}
            >
              {isSimulation ? 'Exit Simulation' : 'Simulate 1989 Quebec Storm'}
            </button>

            <div className="text-[10px] text-slate-400 whitespace-nowrap">
              Updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : '—'}
            </div>
          </div>
        </header>

        {/* Frequency Visualizer */}
        <section className="flex-shrink-0 bg-slate-900/50 border border-slate-800 rounded-xl p-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-cyan-300">Live Frequency Spectrum</h2>
            <div className="flex items-center gap-1.5">
              <span
                className={clsx(
                  'w-1.5 h-1.5 rounded-full',
                  isReady ? 'bg-green-400' : 'bg-slate-500'
                )}
              />
              <span className="text-[10px] text-slate-400">
                {isPlaying ? '🔊 Active' : '🔇 Standby'}
              </span>
            </div>
          </div>

          <FrequencyVisualizer
            data={data}
            isPlaying={isPlaying}
            className="w-full"
          />

          {/* Audio Controls */}
          <div className="flex flex-col gap-3 mt-3 pt-3 border-t border-slate-800">
            <button
              onClick={handlePlayClick}
              className={clsx(
                'flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all w-full',
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
                '⏸ Stop Sonification'
              ) : (
                '▶ Play Space Weather'
              )}
            </button>

            <div>
              <label className="block text-[10px] text-slate-400 mb-1">Master Volume</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={e => setVolume(Number(e.target.value))}
                className="w-full h-1.5 appearance-none bg-slate-800 rounded-lg accent-cyan-500"
                aria-label="Master volume"
              />
            </div>
          </div>
        </section>

        {/* Risk Assessment */}
        <section className="flex-shrink-0 bg-slate-900/50 border border-slate-800 rounded-xl p-3">
          <h2 className="text-sm font-semibold text-cyan-300 mb-3">Infrastructure Impact</h2>
          <div className="grid grid-cols-2 gap-2">
            <ImpactCard
              title="Power Grid"
              severity={data.kpIndex >= 7 ? 'critical' : data.kpIndex >= 5 ? 'warning' : 'nominal'}
              details={
                data.kpIndex >= 7
                  ? 'GICs probable at high latitudes. NOAA G4+ storm warning.'
                  : data.kpIndex >= 5
                    ? 'Elevated geomagnetic currents. NOAA G1-G3 watch.'
                    : 'No geomagnetic storm watch.'
              }
            />
            <ImpactCard
              title="GPS / GNSS"
              severity={data.kpIndex >= 5 ? 'warning' : 'nominal'}
              details={
                data.kpIndex >= 5
                  ? 'Ionospheric scintillation possible. Positioning degraded.'
                  : 'Standard accuracy expected.'
              }
            />
            <ImpactCard
              title="Satellites (LEO)"
              severity={data.kpIndex >= 5 ? 'warning' : 'nominal'}
              details={
                data.kpIndex >= 5
                  ? 'Increased atmospheric drag. Orbit-decay risk.'
                  : 'Standard drag environment.'
              }
            />
            <ImpactCard
              title="HF Radio / Aviation"
              severity={data.flareClass[0] === 'X' || data.flareClass[0] === 'M' ? 'warning' : 'nominal'}
              details={
                data.flareClass[0] === 'X' || data.flareClass[0] === 'M'
                  ? 'HF blackout on sunlit side. Polar comms degraded.'
                  : 'Standard HF propagation.'
              }
            />
          </div>
        </section>

        {/* Key Metrics */}
        <section className="flex-shrink-0 bg-slate-900/50 border border-slate-800 rounded-xl p-3">
          <h2 className="text-sm font-semibold text-cyan-300 mb-3">Real-Time Telemetry</h2>

          <div className="space-y-2">
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
          <section className="flex-shrink-0 bg-red-900/30 border border-red-500/50 rounded-xl p-3 animate-pulse">
            <div className="flex items-start gap-2">
              <span className="text-xl">🚨</span>
              <div className="min-w-0">
                <h3 className="text-red-300 font-bold text-sm">BLACKOUT RISK</h3>
                <p className="text-red-200 mt-0.5 text-[11px]">
                  Geomagnetic conditions exceed safe thresholds for high-latitude power infrastructure.
                  Grid operators advised to enter conservative operations mode immediately.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Disaster Probability Forecast */}
        {(data.forecast?.overallDisasterProbability || 0) > 0 && (
          <section className="flex-shrink-0 bg-slate-900/50 border border-slate-800 rounded-xl p-3">
            <h2 className="text-sm font-semibold text-cyan-300 mb-2">Disaster Probability Forecast</h2>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-300 w-24">Overall Risk</span>
                <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-500"
                    style={{ width: `${(data.forecast?.overallDisasterProbability || 0) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-mono font-bold text-cyan-400 w-12 text-right">
                  {Math.round((data.forecast?.overallDisasterProbability || 0) * 100)}%
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2">
                {data.forecast?.cmeForecasts && data.forecast.cmeForecasts.length > 0 && data.forecast.cmeForecasts.map((cme, idx) => (
                  <div key={idx} className="bg-slate-800/50 rounded-lg p-2 border border-slate-700/50">
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className="text-slate-400">CME Arrival</span>
                      <span className="font-mono text-cyan-400">
                        {Math.round(cme.arrivalProbability * 100)}%
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className="text-slate-400">Est. Kp</span>
                      <span className="font-mono text-orange-400">
                        G{Math.round(cme.estimatedKpImpact)}
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-400">Confidence</span>
                      <span className={`font-mono ${cme.confidence === 'high' ? 'text-green-400' : cme.confidence === 'medium' ? 'text-yellow-400' : 'text-orange-400'}`}>
                        {cme.confidence.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}

                {data.forecast?.flareForecast && (
                  <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700/50">
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className="text-slate-400">X-Class Flare</span>
                      <span className="font-mono text-red-400">
                        {Math.round((data.forecast.flareForecast.probabilityXClass || 0) * 100)}%
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className="text-slate-400">Proton Event (SEP)</span>
                      <span className="font-mono text-purple-400">
                        {Math.round((data.forecast.flareForecast.probabilityProtonEvent || 0) * 100)}%
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-400">Active Region</span>
                      <span className="font-mono text-cyan-400">
                        {data.forecast.flareForecast.activeRegion}
                      </span>
                    </div>
                  </div>
                )}

                {data.forecast?.geomagneticForecast && (
                  <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700/50">
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className="text-slate-400">Day 1 Kp</span>
                      <span className="font-mono text-cyan-400">
                        {data.forecast.geomagneticForecast.day1.kp} ({Math.round(data.forecast.geomagneticForecast.day1.probability * 100)}%)
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className="text-slate-400">Day 2 Kp</span>
                      <span className="font-mono text-yellow-400">
                        {data.forecast.geomagneticForecast.day2.kp} ({Math.round(data.forecast.geomagneticForecast.day2.probability * 100)}%)
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-400">Day 3 Kp</span>
                      <span className="font-mono text-green-400">
                        {data.forecast.geomagneticForecast.day3.kp} ({Math.round(data.forecast.geomagneticForecast.day3.probability * 100)}%)
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Educational Context */}
        <section className="flex-shrink-0 bg-slate-900/50 border border-slate-800 rounded-xl p-3">
          <h2 className="text-sm font-semibold text-cyan-300 mb-2">What You&apos;re Hearing</h2>
          <div className="space-y-1 text-[11px] text-slate-300">
            <p><strong>Low Hum:</strong> Calm conditions (Kp ≤ 3, no Earth-directed CME)</p>
            <p><strong>Rising Pitch & Pulsing:</strong> Growing storm energy</p>
            <p><strong>Red Alert Motif:</strong> NOAA G3+ geomagnetic storm watch</p>
            <p className="text-[10px] text-slate-400 mt-1 pt-1 border-t border-slate-800">
              Audio is a perceptual sonification — a design choice, not a physical measurement.
              We communicate NOAA SWPC data; we do not issue alerts.
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="flex-shrink-0 mt-auto pt-3 border-t border-slate-800 text-center text-[10px] text-slate-400">
          <p>Data: NASA DONKI • NOAA SWPC</p>
          <p className="mt-0.5">NASA Space Apps Challenge 2026</p>
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
    <div className={clsx('rounded-lg p-2.5 border', colors[severity])}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-medium text-slate-300 text-xs">{title}</span>
        <span className={clsx('text-[9px] font-bold px-1.5 py-0.5 rounded', colors[severity])}>
          {labels[severity]}
        </span>
      </div>
      <p className="text-[10px] text-slate-400 leading-tight">{details}</p>
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
    <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-base">{icon}</span>
        <span className="text-[10px] text-slate-400">{label}</span>
      </div>
      <div className="flex items-baseline justify-between">
        <span className="text-lg font-mono font-bold text-white">{value}</span>
        <span className={clsx('text-[9px] font-medium px-1.5 py-0.5 rounded', trendColors[trend], trendColor)}>
          {trend.toUpperCase()}
        </span>
      </div>
    </div>
  );
}