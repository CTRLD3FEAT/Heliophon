'use client';

import { useState, useEffect } from 'react';
import { SpaceWeatherEvent } from '@/types';
import { fetchSpaceVitals, getMockSpaceVitals } from '@/lib/nasa-api';

// Import all historical events
import carrington1859 from '@/data/carrington-1859.json';
import halloween2003 from '@/data/halloween-2003.json';
import may2024 from '@/data/may-2024.json';
import oct2024 from '@/data/oct-2024.json';
import quebec1989 from '@/data/quebec-1989.json';

interface HistoricalEvent extends SpaceWeatherEvent {
  _meta: {
    name: string;
    date: string;
    confidence: 'direct' | 'partial' | 'historical';
    notes: string;
    dst?: number;
    impact: string;
  };
}

interface EventSidebarProps {
  selectedEvent: SpaceWeatherEvent | null;
  onSelectEvent: (event: SpaceWeatherEvent) => void;
  isLiveMode: boolean;
  onToggleLiveMode: () => void;
  liveData: SpaceWeatherEvent | null;
  isLoadingLive: boolean;
}

const HISTORICAL_EVENTS: HistoricalEvent[] = [
  carrington1859 as HistoricalEvent,
  halloween2003 as HistoricalEvent,
  may2024 as HistoricalEvent,
  oct2024 as HistoricalEvent,
  quebec1989 as HistoricalEvent,
];

const CONFIDENCE_LABELS = {
  direct: { label: 'Direct Measurement', color: 'text-green-400', bg: 'bg-green-500/20' },
  partial: { label: 'Partial Reconstruction', color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  historical: { label: 'Historical Estimate', color: 'text-orange-400', bg: 'bg-orange-500/20' },
};

const FLARE_CLASSES = {
  X: { color: 'text-red-400', bg: 'bg-red-500/20', label: 'Extreme' },
  M: { color: 'text-orange-400', bg: 'bg-orange-500/20', label: 'Strong' },
  C: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'Moderate' },
  B: { color: 'text-cyan-400', bg: 'bg-cyan-500/20', label: 'Minor' },
  A: { color: 'text-slate-400', bg: 'bg-slate-500/20', label: 'Quiet' },
};

function getFlareStyle(flareClass: string) {
  const prefix = flareClass.charAt(0).toUpperCase();
  return FLARE_CLASSES[prefix as keyof typeof FLARE_CLASSES] || FLARE_CLASSES.A;
}

function getKpLevel(kp: number): { label: string; color: string; bg: string } {
  if (kp >= 9) return { label: 'G5 — Extreme', color: 'text-red-300', bg: 'bg-red-500/30' };
  if (kp >= 8) return { label: 'G4 — Severe', color: 'text-red-400', bg: 'bg-red-500/20' };
  if (kp >= 7) return { label: 'G3 — Strong', color: 'text-orange-400', bg: 'bg-orange-500/20' };
  if (kp >= 6) return { label: 'G2 — Moderate', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
  if (kp >= 5) return { label: 'G1 — Minor', color: 'text-lime-400', bg: 'bg-lime-500/20' };
  return { label: 'G0 — Quiet', color: 'text-cyan-400', bg: 'bg-cyan-500/20' };
}

export function EventSidebar({
  selectedEvent,
  onSelectEvent,
  isLiveMode,
  onToggleLiveMode,
  liveData,
  isLoadingLive,
}: EventSidebarProps) {
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  const isSelected = (event: HistoricalEvent) => {
    if (!selectedEvent) return false;
    return selectedEvent.timestamp === event.timestamp;
  };

  const isLiveSelected = () => {
    if (!selectedEvent || !liveData) return false;
    return selectedEvent.timestamp === liveData.timestamp;
  };

  return (
    <aside className="w-72 flex-shrink-0 bg-slate-900/50 border-r border-slate-700/50 flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-mono text-cyan-400 tracking-wider">Event Catalog</h2>
          <button
            onClick={onToggleLiveMode}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              isLiveMode
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'bg-slate-800 text-slate-300 border border-slate-600 hover:border-cyan-500/50'
            }`}
            aria-pressed={isLiveMode}
          >
            {isLiveMode ? '🛰 Live' : '📡 Live Mode'}
          </button>
        </div>

        {/* Live Data Section */}
        <div className="mb-4 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-2 h-2 rounded-full ${isLoadingLive ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`} />
            <span className="text-sm font-medium text-slate-200">NASA/NOAA Live Feed</span>
          </div>
          {liveData && !isLoadingLive && (
            <div className="text-xs text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Kp Index</span>
                <span className="font-mono text-cyan-400">{liveData.kpIndex.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span>CME Speed</span>
                <span className="font-mono text-cyan-400">{liveData.cmeSpeed} km/s</span>
              </div>
              <div className="flex justify-between">
                <span>Flare Class</span>
                <span className="font-mono text-red-400">{liveData.flareClass}</span>
              </div>
              <div className="flex justify-between">
                <span>Storm Level</span>
                <span className={`font-mono ${getKpLevel(liveData.kpIndex).color}`}>{getKpLevel(liveData.kpIndex).label}</span>
              </div>
            </div>
          )}
          {isLoadingLive && (
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
              Fetching live telemetry...
            </div>
          )}
          {!liveData && !isLoadingLive && (
            <div className="text-xs text-slate-500">No live data available</div>
          )}
        </div>
      </div>

      {/* Historical Events */}
      <nav className="flex-1 p-3 space-y-2" aria-label="Historical space weather events">
        {HISTORICAL_EVENTS.map((event) => {
          const selected = isSelected(event);
          const flareStyle = getFlareStyle(event.flareClass);
          const kpLevel = getKpLevel(event.kpIndex);
          const confidence = CONFIDENCE_LABELS[event._meta?.confidence || 'historical'];

          return (
            <div
              key={event.timestamp}
              className={`group relative overflow-hidden rounded-lg border transition-all duration-200 ${
                selected
                  ? 'border-cyan-500/50 bg-cyan-500/10 shadow-lg shadow-cyan-500/10'
                  : 'border-slate-700/50 bg-slate-800/50 hover:border-cyan-500/30 hover:bg-slate-800'
              }`}
            >
              <button
                onClick={() => onSelectEvent(event)}
                className="w-full text-left p-3 flex items-start gap-3"
                aria-pressed={selected}
                aria-expanded={expandedEvent === event.timestamp}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-slate-100 truncate">{event._meta.name}</h3>
                    {selected && <span className="text-cyan-400">▸</span>}
                  </div>
                  <p className="text-xs text-slate-500">{event._meta.date}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-mono ${flareStyle.bg} ${flareStyle.color}`}
                    >
                      {event.flareClass}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-mono ${kpLevel.bg} ${kpLevel.color}`}
                    >
                      {kpLevel.label}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${confidence.bg} ${confidence.color}`}
                    >
                      {confidence.label}
                    </span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-slate-500">CME</p>
                  <p className="font-mono text-cyan-400 text-sm">{event.cmeSpeed.toLocaleString()} km/s</p>
                </div>
              </button>

              {/* Expanded Details */}
              {expandedEvent === event.timestamp && (
                <div className="border-t border-slate-700/50 p-3 bg-slate-900/50 animate-slide-in">
                  <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded bg-slate-800/50">
                        <p className="text-slate-500">Storm Intensity</p>
                        <p className="font-mono text-cyan-400">{(event.stormIntensity * 100).toFixed(0)}%</p>
                      </div>
                      <div className="p-2 rounded bg-slate-800/50">
                        <p className="text-slate-500">Blackout Risk</p>
                        <p className="font-mono">{event.isBlackoutRisk ? '⚠ YES' : '✓ No'}</p>
                      </div>
                      <div className="p-2 rounded bg-slate-800/50">
                        <p className="text-slate-500">Dst Index</p>
                        <p className="font-mono text-yellow-400">{event._meta.dst ? `${event._meta.dst} nT` : 'N/A'}</p>
                      </div>
                      <div className="p-2 rounded bg-slate-800/50">
                        <p className="text-slate-500">Confidence</p>
                        <p className="font-mono capitalize">{event._meta.confidence}</p>
                      </div>
                    </div>
                    <div className="p-2 rounded bg-slate-800/50 border border-slate-700/50">
                      <p className="text-slate-400 text-xs mb-1">Impact Summary</p>
                      <p className="text-slate-200">{event._meta.impact}</p>
                    </div>
                    <div className="p-2 rounded bg-slate-800/50 border border-slate-700/50">
                      <p className="text-slate-400 text-xs mb-1">Notes</p>
                      <p className="text-slate-300">{event._meta.notes}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Live Data as Selectable Event */}
        {liveData && !isLoadingLive && (
          <div
            className={`group relative overflow-hidden rounded-lg border transition-all duration-200 ${
              isLiveSelected()
                ? 'border-cyan-500/50 bg-cyan-500/10 shadow-lg shadow-cyan-500/10'
                : 'border-slate-700/50 bg-slate-800/50 hover:border-cyan-500/30 hover:bg-slate-800'
            }`}
          >
            <button
              onClick={() => onSelectEvent(liveData)}
              className="w-full text-left p-3 flex items-start gap-3"
              aria-pressed={isLiveSelected()}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-green-400" />
                  <h3 className="font-medium text-slate-100">Live Space Weather Now</h3>
                  {isLiveSelected() && <span className="text-cyan-400">▸</span>}
                </div>
                <p className="text-xs text-slate-500">Real-time NASA DONKI + NOAA SWPC</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="px-2 py-0.5 rounded text-xs font-mono bg-red-500/20 text-red-400">
                    {liveData.flareClass}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-mono ${getKpLevel(liveData.kpIndex).bg} ${getKpLevel(liveData.kpIndex).color}`}>
                    {getKpLevel(liveData.kpIndex).label}
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-400">
                    Live
                  </span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-slate-500">CME</p>
                <p className="font-mono text-cyan-400 text-sm">{liveData.cmeSpeed.toLocaleString()} km/s</p>
              </div>
            </button>
          </div>
        )}
      </nav>

      {/* Legend */}
      <div className="p-3 border-t border-slate-700/50">
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Flare Classes</p>
        <div className="flex flex-wrap gap-1">
          {Object.entries(FLARE_CLASSES).map(([key, style]) => (
            <span
              key={key}
              className={`px-2 py-0.5 rounded text-xs ${style.bg} ${style.color}`}
            >
              {key}-class
            </span>
          ))}
        </div>
        <p className="text-xs text-slate-500 uppercase tracking-wider mt-3 mb-2">NOAA G-Scale</p>
        <div className="space-y-1 text-xs">
          {[
            { level: 'G5', label: 'Extreme', color: 'text-red-300' },
            { level: 'G4', label: 'Severe', color: 'text-red-400' },
            { level: 'G3', label: 'Strong', color: 'text-orange-400' },
            { level: 'G2', label: 'Moderate', color: 'text-yellow-400' },
            { level: 'G1', label: 'Minor', color: 'text-lime-400' },
            { level: 'G0', label: 'Quiet', color: 'text-cyan-400' },
          ].map(({ level, label, color }) => (
            <div key={level} className="flex justify-between">
              <span className="font-mono">{level}</span>
              <span className={color}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}