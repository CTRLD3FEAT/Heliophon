'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { EventSidebar } from '@/components/ui/EventSidebar';
import { CosmicAnimation } from '@/components/visual/CosmicAnimation';
import { fetchSpaceVitals, getMockSpaceVitals, fetchSpaceWeatherForecast, getMockForecast } from '@/lib/nasa-api';
import { SpaceWeatherEvent } from '@/types';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { AudioEngine, useAudioEngine } from '@/components/audio/AudioEngine';
import { AudioVisualizer } from '@/components/visual/AudioVisualizer';
import { clsx } from 'clsx';

// Import all historical events
import carrington1859 from '@/data/carrington-1859.json';
import halloween2003 from '@/data/halloween-2003.json';
import may2024 from '@/data/may-2024.json';
import oct2024 from '@/data/oct-2024.json';
import quebec1989 from '@/data/quebec-1989.json';

const HISTORICAL_EVENTS = [
  carrington1859,
  halloween2003,
  may2024,
  oct2024,
  quebec1989,
] as const;

export default function Home() {
  const [selectedEvent, setSelectedEvent] = useState<SpaceWeatherEvent | null>(null);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [liveData, setLiveData] = useState<SpaceWeatherEvent | null>(null);
  const [isLoadingLive, setIsLoadingLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forecast, setForecast] = useState<any>(null);
  const [showDashboard, setShowDashboard] = useState(true);
  const reducedMotion = useReducedMotion();

  // View controls
  const [viewMode, setViewMode] = useState<'solar-system' | 'earth-closeup'>('solar-system');
  const [showOrbits, setShowOrbits] = useState(true);
  const [showCmeCone, setShowCmeCone] = useState(true);
  const [showMagnetosphere, setShowMagnetosphere] = useState(true);
  const [showLabels, setShowLabels] = useState(true);

  // Animation controls
  const [isPaused, setIsPaused] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [timelineProgress, setTimelineProgress] = useState(55);

  // Audio state (for AudioEngine)
  const { isPlaying, setIsPlaying, volume, setVolume, toggle } = useAudioEngine();
  const [isReady, setIsReady] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [showWhatYoureHearing, setShowWhatYoureHearing] = useState(false);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sync playback progress when audio is playing
  useEffect(() => {
    if (isPlaying) {
      progressIntervalRef.current = setInterval(() => {
        setPlaybackProgress(prev => {
          const next = prev + 0.5;
          return next >= 100 ? 0 : next;
        });
      }, 500);
    } else {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    }
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [isPlaying]);

  const handlePlayClick = () => {
    if (!isReady) {
      setIsReady(true);
    }
    toggle();
  };

  const formatTime = (percent: number) => {
    const totalSec = 300;
    const currentSec = Math.floor((percent / 100) * totalSec);
    const mm = String(Math.floor(currentSec / 60)).padStart(2, '0');
    const ss = String(currentSec % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  };

  // Load mock data immediately for local dev
  useEffect(() => {
    const mockData = getMockSpaceVitals();
    const mockForecast = getMockForecast();
    setSelectedEvent({ ...mockData, forecast: mockForecast });
    setError('Cached data — live API unavailable (local dev)');
    setForecast(mockForecast);
  }, []);

  // Fetch live data when live mode is enabled
  const fetchLiveData = useCallback(async () => {
    setIsLoadingLive(true);
    setError(null);
    try {
      const [vitals, forecastData] = await Promise.all([
        fetchSpaceVitals(),
        fetchSpaceWeatherForecast(),
      ]);
      setLiveData(vitals);
      setForecast(forecastData);
      if (isLiveMode) {
        setSelectedEvent({ ...vitals, forecast: forecastData });
      }
    } catch (err) {
      console.warn('Live API failed:', err);
      setError('Live API unavailable — using cached data');
      const mockData = getMockSpaceVitals();
      const mockForecast = getMockForecast();
      setLiveData(mockData);
      setForecast(mockForecast);
      if (isLiveMode) {
        setSelectedEvent({ ...mockData, forecast: mockForecast });
      }
    } finally {
      setIsLoadingLive(false);
    }
  }, [isLiveMode]);

  useEffect(() => {
    if (isLiveMode) {
      fetchLiveData();
      const interval = setInterval(fetchLiveData, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [isLiveMode, fetchLiveData]);

  const handleSelectEvent = (event: SpaceWeatherEvent) => {
    const historicalEvent = event as any;
    const eventWithForecast = historicalEvent._meta
      ? { ...event, forecast: getMockForecast() }
      : event;
    setSelectedEvent(eventWithForecast);
    setIsLiveMode(false);
  };

  const handleToggleLiveMode = () => {
    const next = !isLiveMode;
    setIsLiveMode(next);
    if (next) {
      fetchLiveData();
    }
  };

  // Default to first historical event if nothing selected
  if (!selectedEvent && HISTORICAL_EVENTS.length > 0) {
    const firstEvent = HISTORICAL_EVENTS[0] as any;
    const firstWithForecast = firstEvent._meta
      ? { ...firstEvent, forecast: getMockForecast() }
      : firstEvent;
    setSelectedEvent(firstWithForecast);
  }

  const isSimulation = HISTORICAL_EVENTS.some(e => e.timestamp === selectedEvent?.timestamp);

  if (!selectedEvent) {
    return (
      <div style={{minHeight: '900px', display: 'flex', flexDirection: 'column', background: '#F3F3F1', fontFamily: 'Inter,system-ui,sans-serif', color: '#1A1A1A'}}>
        <div className="text-center" style={{flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <div style={{width: '64px', height: '64px', border: '4px solid rgba(29,78,216,0.3)', borderTopColor: '#1D4ED8', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px'}} />
          <p style={{color: '#555'}}>Loading space weather data...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{minHeight: '900px', display: 'flex', flexDirection: 'column', background: '#F3F3F1', fontFamily: 'Inter,system-ui,sans-serif', color: '#1A1A1A'}}>
      {/* Header */}
      <header style={{minHeight: '56px', display: 'flex', alignItems: 'center', justifyContent: 'spaceBetween', flexWrap: 'wrap', gap: '8px', padding: '6px 20px', borderBottom: '1px solid #BDBDB8', background: '#fff'}}>
        <div className="row">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#1A1A1A" strokeWidth="1.5" aria-hidden="true">
            <circle cx="14" cy="14" r="5"/>
            <path d="M14 2v4M14 22v4M2 14h4M22 14h4M5.5 5.5l2.8 2.8M19.7 19.7l2.8 2.8M5.5 22.5l2.8-2.8M19.7 8.3l2.8-2.8"/>
          </svg>
          <strong style={{fontSize: '16px'}}>Solar Jukebox</strong>
        </div>
        <div className="row">
          <span className="tag">Data: live · updated [hh:mm UTC]</span>
          <span className="tag" style={{borderStyle: 'dashed'}}>Cached data badge (offline only)</span>
        </div>
        <div className="row">
          <button className={clsx('btn', isLiveMode ? 'on' : '')} aria-pressed={isLiveMode} onClick={handleToggleLiveMode}>
            Live
          </button>
          <button className={clsx('btn', !isLiveMode ? 'on' : '')} aria-pressed={!isLiveMode} onClick={handleToggleLiveMode}>
            Simulation
          </button>
          <button className="btn" aria-label="Help and legend">?</button>
        </div>
      </header>

      {/* Alert Banner */}
      {selectedEvent.isBlackoutRisk && (
        <div role="alert" aria-live="assertive" style={{margin: '8px 16px 0', padding: '8px 12px', border: '1px dashed #B42318', borderRadius: '4px', background: '#fff', color: '#B42318', fontSize: '13px'}}>
          ⚠ Alert banner — appears only for G3+ watches · Geomagnetic storm watch in effect
        </div>
      )}

      {/* Main Layout - 3 columns */}
      <div className="main" style={{gap: 0, marginTop: '8px'}}>
        {/* Left Sidebar - Event Selector */}
        <aside aria-label="Event selector" style={{borderRight: '1px solid #BDBDB8', borderTop: '1px solid #BDBDB8', background: '#fff', display: 'flex', flexDirection: 'column', minHeight: 0}}>
          <div className="sec">
            <h2 className="h">Events</h2>
            <div className="row">
              <button className={clsx('btn', isLiveMode ? 'on' : '')} aria-pressed={isLiveMode} onClick={handleToggleLiveMode} style={{flex: 1}}>
                Live feed
              </button>
              <button className={clsx('btn', !isLiveMode ? 'on' : '')} aria-pressed={!isLiveMode} onClick={handleToggleLiveMode} style={{flex: 1}}>
                Historical
              </button>
            </div>
            <div className="row" style={{flexWrap: 'wrap'}}>
              <button className="btn on" aria-pressed={true}>CME</button>
              <button className="btn on" aria-pressed={true}>Flare</button>
              <button className="btn on" aria-pressed={true}>Storm</button>
            </div>
            <input type="search" aria-label="Search events" placeholder="Search events" className="btn" style={{width: '100%', padding: '0 10px'}} />
          </div>
          <div style={{overflow: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1}}>
            <p className="h">Live feed</p>
            {liveData && !isLoadingLive && (
              <button
                className={clsx('ev', isLiveMode && selectedEvent?.timestamp === liveData.timestamp ? 'on' : '')}
                aria-current={isLiveMode && selectedEvent?.timestamp === liveData.timestamp ? 'true' : undefined}
                onClick={() => handleSelectEvent(liveData)}
              >
                <span className="row sp">
                  <span className="tag">CME</span>
                  <span className="muted" style={{fontSize: '12px'}}>{new Date(liveData.timestamp).toISOString().slice(0, 16).replace('T', ' ')} UTC</span>
                </span>
                <strong>[Earth-directed CME]</strong>
                <span className="row">
                  <span className="tag">G{Math.round((liveData as any).kpIndex || 0)}</span>
                  <span className="tag">direct</span>
                </span>
              </button>
            )}
            {isLoadingLive && (
              <button className="ev" disabled>
                <span className="row sp">
                  <span className="tag">Loading...</span>
                </span>
              </button>
            )}
            <p className="h" style={{marginTop: '8px'}}>Historical library</p>
            {HISTORICAL_EVENTS.map((event) => {
              const historicalEvent = event as any;
              const selected = selectedEvent?.timestamp === event.timestamp;
              return (
                <button
                  key={event.timestamp}
                  className={clsx('ev', selected ? 'on' : '')}
                  onClick={() => handleSelectEvent(event)}
                >
                  <span className="row sp">
                    <span className="tag">Storm</span>
                    <span className="muted" style={{fontSize: '12px'}}>{historicalEvent._meta?.date || 'Unknown'}</span>
                  </span>
                  <strong>{historicalEvent._meta?.name || 'Unknown Event'}</strong>
                  <span className="row">
                    <span className="tag">Kp {Math.round(historicalEvent.kpIndex || 0)}</span>
                    <span className="tag">{historicalEvent._meta?.confidence || 'historical'}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Center - Solar System View */}
        <section aria-label="Solar system view" style={{borderTop: '1px solid #BDBDB8', display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0}}>
          <div className="row sp" style={{flexWrap: 'wrap', padding: '8px 16px', background: '#fff', borderBottom: '1px solid #BDBDB8'}}>
            <div className="row" style={{flexWrap: 'wrap', fontSize: '13px'}}>
              <label className="row" style={{minHeight: '44px'}}>
                <input type="checkbox" checked={showOrbits} onChange={e => setShowOrbits(e.target.checked)} /> Orbits
              </label>
              <label className="row" style={{minHeight: '44px'}}>
                <input type="checkbox" checked={showCmeCone} onChange={e => setShowCmeCone(e.target.checked)} /> CME cone
              </label>
              <label className="row" style={{minHeight: '44px'}}>
                <input type="checkbox" checked={showMagnetosphere} onChange={e => setShowMagnetosphere(e.target.checked)} /> Magnetosphere
              </label>
              <label className="row" style={{minHeight: '44px'}}>
                <input type="checkbox" checked={showLabels} onChange={e => setShowLabels(e.target.checked)} /> Labels
              </label>
            </div>
            <div className="row">
              <button className={clsx('btn', viewMode === 'solar-system' ? 'on' : '')} aria-pressed={viewMode === 'solar-system'} onClick={() => setViewMode('solar-system')}>
                Solar system
              </button>
              <button className={clsx('btn', viewMode === 'earth-closeup' ? 'on' : '')} aria-pressed={viewMode === 'earth-closeup'} onClick={() => setViewMode('earth-closeup')}>
                Earth close-up
              </button>
            </div>
          </div>

          <div style={{position: 'relative', flex: 1, minHeight: '420px', background: '#E9E9E5'}}>
            <CosmicAnimation
              data={selectedEvent}
              isSimulation={isSimulation}
              reducedMotion={reducedMotion}
              viewMode={viewMode}
              showOrbits={showOrbits}
              showCmeCone={showCmeCone}
              showMagnetosphere={showMagnetosphere}
              showLabels={showLabels}
              isPaused={isPaused}
              animationSpeed={animationSpeed}
            />

            {/* Earth impact inset */}
            <div style={{position: 'absolute', right: '12px', bottom: '12px', width: '220px', background: '#fff', border: '1px solid #8A8A85', borderRadius: '6px', padding: '8px'}}>
              <p className="h" style={{marginBottom: '4px'}}>Earth impact inset</p>
              <EarthInset
                data={selectedEvent}
                isSimulation={isSimulation}
                kpIndex={selectedEvent.kpIndex}
              />
              <p className="muted" style={{fontSize: '11px', margin: '4px 0 0'}}>Magnetosphere + aurora ovals · Kp {selectedEvent.kpIndex.toFixed(1)}</p>
            </div>
          </div>

          {/* Animation controls */}
          <div className="row" style={{flexWrap: 'wrap', padding: '8px 16px', background: '#fff', borderTop: '1px solid #BDBDB8'}}>
            <button className="btn" aria-label={isPaused ? "Resume orbit animation" : "Pause orbit animation"} style={{minWidth: '44px'}} onClick={() => setIsPaused(!isPaused)}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#1A1A1A" strokeWidth="1.8" aria-hidden="true">
                {isPaused ? (
                  <path d="M4 3v10M13 3L6 8l7 5z"/>
                ) : (
                  <path d="M5 3v10M11 3v10"/>
                )}
              </svg>
            </button>
            <span className="muted" style={{fontSize: '12px'}}>[start]</span>
            <input type="range" aria-label="Timeline" min="0" max="100" value={timelineProgress} onChange={e => setTimelineProgress(Number(e.target.value))} style={{flex: 1, minWidth: '160px'}} />
            <span className="muted" style={{fontSize: '12px'}}>[arrival]</span>
            <label className="row" style={{fontSize: '12px'}}>
              Speed
              <select aria-label="Animation speed" className="btn" style={{minHeight: '44px'}} value={animationSpeed} onChange={e => setAnimationSpeed(Number(e.target.value))}>
                <option value={1}>1×</option>
                <option value={10}>10×</option>
                <option value={100}>100×</option>
              </select>
            </label>
          </div>
        </section>

        {/* Right Sidebar - Event Details */}
        <aside aria-label="Event details" style={{borderLeft: '1px solid #BDBDB8', borderTop: '1px solid #BDBDB8', background: '#fff', overflow: 'auto', minHeight: 0}}>
          <div className="sec">
            <h2 className="h">Details</h2>
            <strong style={{fontSize: '18px'}}>{(selectedEvent as any)._meta?.name || (isSimulation ? 'Historical Simulation' : 'Live Space Weather')}</strong>
            <div className="row" style={{flexWrap: 'wrap'}}>
              <span className="tag">CME</span>
              <span className="tag">G{Math.round(selectedEvent.kpIndex)}</span>
              <span className="tag">{(selectedEvent as any)._meta?.confidence || 'direct'}</span>
            </div>
            <span className="muted" style={{fontSize: '12px'}}>{(selectedEvent as any)._meta?.date || 'Live data'} UTC</span>
            {/* Show live-data degradation banner if any source failed */}
            {selectedEvent._sourceErrors && selectedEvent._sourceErrors.length > 0 && (
              <div style={{marginTop: '8px', padding: '8px 12px', background: '#FFF3CD', border: '1px solid #FFC107', borderRadius: '4px', fontSize: '12px', color: '#856404'}}>
                <strong>⚠ Live data degraded:</strong> {selectedEvent._sourceErrors.join('; ')}
              </div>
            )}
          </div>
          <div className="sec">
            <h3 className="h">Coronal mass ejection</h3>
            <dl className="kv">
              <dt className="muted">Speed</dt><dd>{selectedEvent.cmeSpeed.toLocaleString()} km/s</dd>
              <dt className="muted">Half-angle</dt><dd>{selectedEvent.cmeHalfAngle !== undefined ? `${selectedEvent.cmeHalfAngle}°` : 'N/A'}</dd>
              <dt className="muted">Direction</dt><dd>{selectedEvent.cmeDirection || 'N/A'}</dd>
              <dt className="muted">Est. arrival</dt><dd>{(selectedEvent as any)._meta?.estimatedArrival || 'N/A'}</dd>
              <dt className="muted">Earth-directed</dt><dd>{selectedEvent.cmeDirection === 'Earth-directed' ? 'Yes' : 'N/A'}</dd>
            </dl>
          </div>
          <div className="sec">
            <h3 className="h">Solar flare</h3>
            <dl className="kv">
              <dt className="muted">Class</dt><dd>{selectedEvent.flareClass}</dd>
              <dt className="muted">Peak time</dt><dd>{selectedEvent.flarePeakTime || 'N/A'}</dd>
              <dt className="muted">Active region</dt><dd>{selectedEvent.activeRegion || 'N/A'}</dd>
            </dl>
          </div>
          <div className="sec">
            <h3 className="h">Geomagnetic</h3>
            <dl className="kv">
              <dt className="muted">Kp index</dt><dd>{selectedEvent.kpIndex.toFixed(1)}</dd>
              <dt className="muted">G-scale</dt><dd>G{Math.round(selectedEvent.kpIndex)}</dd>
              <dt className="muted">Dst</dt><dd>{(selectedEvent as any)._meta?.dst || 'N/A'} nT</dd>
            </dl>
          </div>
          <div className="sec">
            <h3 className="h">Ground impacts</h3>
            <div className="row sp" style={{fontSize: '13px'}}><span>Power grids <span className="muted">(GICs)</span></span><span><div className="bar" style={{'--bar-width': `${Math.min(100, selectedEvent.kpIndex * 12)}%`} as React.CSSProperties} /></span></div>
            <div className="row sp" style={{fontSize: '13px'}}><span>Satellites <span className="muted">(drag)</span></span><span><div className="bar" style={{'--bar-width': `${Math.min(100, selectedEvent.kpIndex * 10)}%`} as React.CSSProperties} /></span></div>
            <div className="row sp" style={{fontSize: '13px'}}><span>GPS <span className="muted">(scintillation)</span></span><span><div className="bar" style={{'--bar-width': `${Math.min(100, selectedEvent.kpIndex * 11)}%`} as React.CSSProperties} /></span></div>
            <div className="row sp" style={{fontSize: '13px'}}><span>Aviation <span className="muted">(HF blackout)</span></span><span><div className="bar" style={{'--bar-width': `${['X', 'M'].includes(selectedEvent.flareClass[0]) ? 80 : 20}%`} as React.CSSProperties} /></span></div>
          </div>
          <div className="sec" style={{borderBottom: 0}}>
            <p className="muted" style={{fontSize: '12px', margin: 0}}>Sources: NASA DONKI · NOAA SWPC. The sound is a perceptual design choice, not a measurement. Not an official warning.</p>
          </div>
        </aside>
      </div>

      {/* Footer - Sonification Player + Credit */}
      <footer className="foot" aria-label="Sonification player" style={{minHeight: '104px', background: '#fff', borderTop: '1px solid #1A1A1A', padding: '8px 16px'}}>
        {/* Left: Event info + waveform */}
        <div className="row">
          <div style={{width: '56px', height: '56px', border: '1px solid #8A8A85', borderRadius: '4px', background: '#E6E6E2', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <svg width="40" height="24" viewBox="0 0 40 24" fill="none" stroke="#1A1A1A" strokeWidth="1.5" aria-hidden="true">
              <path d="M2 12h4l3-8 4 16 4-12 3 6 3-4h6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div style={{minWidth: 0}}>
            <div style={{fontSize: '14px', fontWeight: 600}}>Now sonifying</div>
            <div className="muted" style={{fontSize: '12px'}}>{(selectedEvent as any)._meta?.name || (isSimulation ? 'Historical Simulation' : 'Live Space Weather')} </div>
          </div>
        </div>

        {/* Center: Live audio visualizer + Playback controls */}
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '0 16px', minWidth: 0}}>
          {/* Live audio visualizer — surfaces storm intensity + blackout alerts */}
          <div className="row" style={{width: '100%', maxWidth: '640px', height: '28px', background: '#FFFFFF', borderRadius: '4px', overflow: 'hidden', border: '1px solid #BDBDB8'}}>
            <AudioVisualizer data={selectedEvent} isPlaying={isPlaying} className="h-full" />
          </div>
          <div className="row" style={{width: '100%', maxWidth: '640px', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px'}}>
            <span className="muted" style={{fontSize: '11px', color: selectedEvent.isBlackoutRisk ? '#B42318' : undefined, fontWeight: selectedEvent.isBlackoutRisk ? 600 : 400}}>
              {selectedEvent.isBlackoutRisk && (
                <>
                  <span
                    style={{
                      display: 'inline-block',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#B42318',
                      marginRight: '6px',
                      animation: 'pulse-red 0.8s ease-in-out infinite',
                    }}
                    aria-hidden="true"
                  />
                  BLACKOUT ALERT ACTIVE
                </>
              )}
              {!selectedEvent.isBlackoutRisk && (
                <>
                  Storm intensity: {Math.round(selectedEvent.stormIntensity * 100)}%
                </>
              )}
            </span>
            <span className="muted" style={{fontSize: '11px'}}>{formatTime(0)}</span>
          </div>
          <div className="row">
            <button className="btn" aria-label="Previous event" style={{minWidth: '44px'}}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#1A1A1A" strokeWidth="1.8" aria-hidden="true">
                <path d="M4 3v10M13 3L6 8l7 5z"/>
              </svg>
            </button>
            <button
              onClick={handlePlayClick}
              aria-label={isPlaying ? 'Stop sonification' : 'Play space weather'}
              disabled={isPlaying && !isReady}
              style={{width: '48px', height: '48px', borderRadius: '50%', border: '2px solid #1A1A1A', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center'}}
            >
              {isPlaying && !isReady ? (
                <div style={{width: '16px', height: '16px', border: '2px solid #1A1A1A', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite'}} />
              ) : isPlaying ? (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="#1A1A1A" aria-hidden="true">
                  <path d="M5 3h3v12H5V3zm8 0h3v12h-3V3z"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="#1A1A1A" aria-hidden="true">
                  <path d="M5 3l10 6-10 6z"/>
                </svg>
              )}
            </button>
            <button className="btn" aria-label="Next event" style={{minWidth: '44px'}}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#1A1A1A" strokeWidth="1.8" aria-hidden="true">
                <path d="M12 3v10M3 3l7 5-7 5z"/>
              </svg>
            </button>
          </div>
          <div className="row" style={{width: '100%', maxWidth: '640px'}}>
            <span className="muted" style={{fontSize: '12px'}}>{formatTime(0)}</span>
            <div style={{flex: 1, minWidth: 0}}>
              <input type="range" aria-label="Playback position" min="0" max="100" value={playbackProgress} onChange={e => setPlaybackProgress(Number(e.target.value))} style={{display: 'block', width: '100%', margin: 0}} />
            </div>
            <span className="muted" style={{fontSize: '12px'}}>LIVE</span>
          </div>
        </div>

        {/* Right: Volume + What you're hearing + Queue */}
        <div className="row" style={{justifyContent: 'flex-end', flexWrap: 'wrap'}}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#1A1A1A" strokeWidth="1.6" aria-hidden="true">
            <path d="M3 7h3l4-3v10l-4-3H3zM13 6.5a4 4 0 010 5"/>
          </svg>
          <input type="range" aria-label="Master volume" min="0" max="1" step="0.05" value={volume} onChange={e => setVolume(Number(e.target.value))} style={{width: '110px'}} />
          <span className="muted" style={{fontSize: '12px'}} aria-hidden="true">{Math.round(volume * 100)}%</span>
          <button className="btn" onClick={() => setShowWhatYoureHearing(!showWhatYoureHearing)}>
            What you're hearing
          </button>
          <button className="btn" aria-label="Up next queue" style={{minWidth: '44px'}}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#1A1A1A" strokeWidth="1.6" aria-hidden="true">
              <path d="M2 4h12M2 8h12M2 12h7"/>
            </svg>
          </button>
        </div>

        {/* Copyright notice */}
        <div style={{gridColumn: '1 / -1', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #E6E6E2', display: 'flex', justifyContent: 'center', width: '100%'}}>
          <p className="muted" style={{fontSize: '11px', margin: 0, textAlign: 'center'}}>
            An independent project developed by TEAM NRZB for the NASA Space Apps Challenge 2026. </p>
        </div>
      </footer>

      {/* Audio Engine (headless) */}
      <AudioEngine
        data={selectedEvent}
        isPlaying={isPlaying}
        volume={volume}
        isSimulation={isSimulation}
        onAudioReady={() => setIsReady(true)}
      />
    </div>
  );
}

// Earth Inset Component
function EarthInset({ data, isSimulation, kpIndex }: { data: SpaceWeatherEvent; isSimulation: boolean; kpIndex: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationIdRef = useRef<number | null>(null);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    const animate = (timestamp: number) => {
      const dt = timestamp - timeRef.current;
      timeRef.current = timestamp;

      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);
      ctx.clearRect(0, 0, w, h);

      // Background
      ctx.fillStyle = '#F3F3F1';
      ctx.fillRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const earthRadius = Math.min(w, h) * 0.3;
      const magnetosphereCompression = 1 + (data.stormIntensity * 0.8);
      const magRadius = earthRadius * magnetosphereCompression;
      const auroraIntensity = data.stormIntensity;

      // Magnetosphere glow
      const magGradient = ctx.createRadialGradient(cx, cy, earthRadius * 1.2, cx, cy, magRadius * 1.3);
      magGradient.addColorStop(0, 'rgba(34, 211, 232, 0)');
      magGradient.addColorStop(0.5, `rgba(34, 211, 232, ${0.08 + auroraIntensity * 0.1})`);
      magGradient.addColorStop(0.8, `rgba(34, 211, 232, ${0.15 + auroraIntensity * 0.15})`);
      magGradient.addColorStop(1, 'rgba(34, 211, 232, 0)');
      ctx.beginPath();
      ctx.arc(cx, cy, magRadius * 1.3, 0, Math.PI * 2);
      ctx.fillStyle = magGradient;
      ctx.fill();

      // Magnetopause (solid)
      ctx.beginPath();
      ctx.arc(cx, cy, magRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(34, 211, 232, ${0.4 + auroraIntensity * 0.3})`;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Magnetopause (dashed - inner)
      ctx.beginPath();
      ctx.arc(cx, cy, magRadius * 0.85, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(34, 211, 232, ${0.3 + auroraIntensity * 0.2})`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Bow shock
      const bowShockDist = magRadius * 1.5;
      const sunDirection = Math.PI;
      ctx.beginPath();
      ctx.ellipse(
        cx + Math.cos(sunDirection) * bowShockDist * 0.3,
        cy + Math.sin(sunDirection) * bowShockDist * 0.3,
        bowShockDist * 0.7,
        bowShockDist,
        sunDirection,
        -Math.PI * 0.6,
        Math.PI * 0.6
      );
      ctx.strokeStyle = `rgba(138, 138, 133, ${0.4 + auroraIntensity * 0.2})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Aurora ovals
      if (auroraIntensity > 0.1) {
        const colors = [
          'rgba(34, 197, 94, ',
          'rgba(168, 85, 247, ',
          'rgba(236, 72, 153, ',
          'rgba(34, 211, 232, ',
        ];

        for (let hemisphere = -1; hemisphere <= 1; hemisphere += 2) {
          const ovalRadius = earthRadius * 1.15;
          const ovalWidth = earthRadius * 0.8;
          const centerOffset = hemisphere * earthRadius * 0.3;

          for (let layer = 0; layer < 3; layer++) {
            const color = colors[layer % colors.length];
            const alpha = auroraIntensity * (0.15 + layer * 0.08);
            const wavePhase = timestamp * 0.002 + layer * 2;

            ctx.beginPath();
            for (let angle = -Math.PI * 0.6; angle < Math.PI * 0.6; angle += 0.05) {
              const wave = Math.sin(angle * 4 + wavePhase) * 0.15 * auroraIntensity;
              const r = ovalRadius + wave * earthRadius;
              const px = cx + Math.cos(angle) * r;
              const py = cy + hemisphere * (centerOffset + Math.sin(angle) * ovalWidth * (1 + wave));

              if (angle === -Math.PI * 0.6) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }

            for (let angle = Math.PI * 0.6; angle > -Math.PI * 0.6; angle -= 0.05) {
              const r = ovalRadius * 0.8;
              const px = cx + Math.cos(angle) * r;
              const py = cy + hemisphere * (centerOffset * 0.5 + Math.sin(angle) * ovalWidth * 0.6);
              ctx.lineTo(px, py);
            }
            ctx.closePath();

            const gradient = ctx.createRadialGradient(cx, cy + centerOffset, 0, cx, cy + centerOffset, ovalRadius);
            gradient.addColorStop(0, color + `${alpha})`);
            gradient.addColorStop(1, color + `0)`);
            ctx.fillStyle = gradient;
            ctx.fill();
          }
        }
      }

      // Earth
      const earthGradient = ctx.createRadialGradient(
        cx - earthRadius * 0.3, cy - earthRadius * 0.3, 0,
        cx, cy, earthRadius
      );
      earthGradient.addColorStop(0, '#67e8f9');
      earthGradient.addColorStop(0.4, '#22d3ee');
      earthGradient.addColorStop(0.7, '#06b6d4');
      earthGradient.addColorStop(1, '#0e7490');

      ctx.beginPath();
      ctx.arc(cx, cy, earthRadius, 0, Math.PI * 2);
      ctx.fillStyle = earthGradient;
      ctx.fill();

      // Earth stroke
      ctx.beginPath();
      ctx.arc(cx, cy, earthRadius, 0, Math.PI * 2);
      ctx.strokeStyle = '#1A1A1A';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Continents
      ctx.fillStyle = 'rgba(34, 197, 94, 0.6)';
      const continents = [
        [{ ax: -0.3, ay: -0.4 }, { ax: 0.1, ay: -0.4 }, { ax: 0.2, ay: 0 }, { ax: -0.1, ay: 0.3 }, { ax: -0.4, ay: 0.1 }],
        [{ ax: -0.1, ay: 0.3 }, { ax: 0.1, ay: 0.4 }, { ax: 0, ay: 0.8 }, { ax: -0.2, ay: 0.7 }],
        [{ ax: 0.3, ay: -0.2 }, { ax: 0.5, ay: -0.1 }, { ax: 0.4, ay: 0.4 }, { ax: 0.2, ay: 0.3 }],
        [{ ax: 0.5, ay: -0.4 }, { ax: 0.7, ay: -0.3 }, { ax: 0.6, ay: 0.2 }, { ax: 0.4, ay: 0.1 }],
        [{ ax: 0.3, ay: 0.5 }, { ax: 0.5, ay: 0.5 }, { ax: 0.4, ay: 0.7 }, { ax: 0.2, ay: 0.7 }],
      ];

      continents.forEach(continent => {
        ctx.beginPath();
        continent.forEach((pt, i) => {
          const angle = Math.atan2(pt.ay, pt.ax);
          const dist = Math.sqrt(pt.ax * pt.ax + pt.ay * pt.ay) * earthRadius * 0.9;
          const px = cx + Math.cos(angle) * dist;
          const py = cy + Math.sin(angle) * dist;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.closePath();
        ctx.fill();
      });

      // Aurora ellipses (simplified wireframe style)
      ctx.beginPath();
      ctx.ellipse(cx, cy - earthRadius * 0.35, earthRadius * 0.45, earthRadius * 0.15, 0, 0, Math.PI * 2);
      ctx.strokeStyle = '#1A1A1A';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(cx, cy + earthRadius * 0.35, earthRadius * 0.45, earthRadius * 0.15, 0, 0, Math.PI * 2);
      ctx.stroke();

      animationIdRef.current = requestAnimationFrame(animate);
    };

    animationIdRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
    };
  }, [data.stormIntensity, data.kpIndex, isSimulation]);

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={120}
      style={{width: '100%', height: 'auto', background: '#F3F3F1'}}
      role="img"
      aria-label="Earth with magnetosphere arcs and aurora ovals"
    />
  );
}