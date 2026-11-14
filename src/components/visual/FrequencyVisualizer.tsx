'use client';

import { useEffect, useRef } from 'react';
import { SpaceWeatherEvent } from '@/types';

// Helper: detect prefers-reduced-motion preference
const prefersReducedMotion = typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

interface FrequencyVisualizerProps {
  data: SpaceWeatherEvent;
  isPlaying: boolean;
  className?: string;
}

export function FrequencyVisualizer({
  data,
  isPlaying,
  className = ''
}: FrequencyVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size for high DPI
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    const { stormIntensity, isBlackoutRisk, kpIndex } = data;

    const animate = () => {
      if (!ctx) return;

      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);

      // Clear with fade effect for trail
      ctx.fillStyle = 'rgba(15, 15, 25, 0.15)';
      ctx.fillRect(0, 0, width, height);

      // Reduced motion: advance time only when audio is playing,
      // and skip pulsing — static frame is enough to convey state
      timeRef.current += prefersReducedMotion ? (isPlaying ? 0.01 : 0) : 0.02;

      // Draw frequency wave
      const centerY = height / 2;
      const amplitude = (30 + stormIntensity * 80) * (isPlaying ? 1 : 0.3);
      const frequency = 0.015 + stormIntensity * 0.035;
      const speed = 0.5 + stormIntensity * 2;

      // Draw multiple wave layers for depth
      const layers = [
        { color: 'rgba(34, 211, 238, 0.6)', phase: 0, width: 2 },
        { color: 'rgba(168, 85, 247, 0.4)', phase: Math.PI / 3, width: 1.5 },
        { color: 'rgba(236, 72, 153, 0.3)', phase: Math.PI * 2 / 3, width: 1 }
      ];

      if (isBlackoutRisk) {
        layers.push({ color: 'rgba(239, 68, 68, 0.8)', phase: 0, width: 3 });
      }

      layers.forEach(layer => {
        ctx.beginPath();
        ctx.strokeStyle = layer.color;
        ctx.lineWidth = layer.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (let x = 0; x < width; x += 2) {
          const y = centerY + Math.sin(x * frequency + timeRef.current * speed + layer.phase) * amplitude *
            Math.exp(-Math.abs(x - width / 2) / (width / 3));
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      });

      // Draw center line
      ctx.beginPath();
      ctx.strokeStyle = isBlackoutRisk ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 211, 238, 0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Pulsing center circle — skipped under reduced motion
      if (!prefersReducedMotion) {
        const pulseSize = 10 + Math.sin(timeRef.current * 5) * 5 + stormIntensity * 20;
        const pulseAlpha = 0.3 + stormIntensity * 0.5;
        ctx.beginPath();
        ctx.arc(width / 2, centerY, pulseSize, 0, Math.PI * 2);
        ctx.fillStyle = isBlackoutRisk
          ? `rgba(239, 68, 68, ${pulseAlpha})`
          : `rgba(34, 211, 238, ${pulseAlpha})`;
        ctx.fill();

        // Outer ring
        ctx.beginPath();
        ctx.arc(width / 2, centerY, pulseSize * 1.5, 0, Math.PI * 2);
        ctx.strokeStyle = isBlackoutRisk
          ? `rgba(239, 68, 68, ${pulseAlpha * 0.5})`
          : `rgba(34, 211, 238, ${pulseAlpha * 0.5})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [data.stormIntensity, data.isBlackoutRisk, isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-64 md:h-80 rounded-xl bg-slate-950/50 border border-slate-800 ${className}`}
      aria-label="Real-time space weather frequency visualization"
      role="img"
      aria-roledescription="Animated frequency waveform showing solar storm intensity"
    />
  );
}