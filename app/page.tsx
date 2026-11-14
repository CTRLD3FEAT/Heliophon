'use client';

import { useState, useEffect } from 'react';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { fetchSpaceVitals, getMockSpaceVitals } from '@/lib/nasa-api';
import quebec1989 from '@/data/quebec-1989.json';
import { SpaceWeatherEvent } from '@/types';

export default function Home() {
  const [data, setData] = useState<SpaceWeatherEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSimulation, setIsSimulation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);

  // Local dev: use mock data immediately so the UI is visible.
  // The 3s timeout for live API was too slow for dev. Vercel prod will fetch server-side.
  useEffect(() => {
    const mockData = getMockSpaceVitals();
    setData(mockData);
    setError('Cached data — live API unavailable (local dev)');
    setIsCached(true);
    setIsLoading(false);
  }, []);

  // Handle simulation mode
  const handleToggleSimulation = () => {
    setIsSimulation(prev => {
      const next = !prev;
      if (next) {
        setData(quebec1989 as SpaceWeatherEvent);
      } else {
        // Reload live data when exiting simulation
        fetchSpaceVitals().then(v => setData(v)).catch(() => setData(getMockSpaceVitals()));
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Connecting to NASA telemetry...</p>
          <p className="text-xs text-slate-500 mt-2">Fetching live space weather data</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center text-red-400">
          <p>Failed to load space weather data</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="fixed top-4 right-4 z-50 bg-yellow-900/30 border border-yellow-500/50 text-yellow-300 px-4 py-2 rounded-lg text-sm animate-slide-in">
          ⚠ {error}
        </div>
      )}
      <Dashboard
        data={data}
        isSimulation={isSimulation}
        isCached={isCached}
        onToggleSimulation={handleToggleSimulation}
      />
    </>
  );
}