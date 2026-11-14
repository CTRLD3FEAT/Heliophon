'use client';

import { useEffect, useRef } from 'react';
import { SpaceWeatherEvent } from '@/types';

// Helper: detect prefers-reduced-motion preference
const prefersReducedMotion = typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

interface AudioVisualizerProps {
  data: SpaceWeatherEvent;
  isPlaying: boolean;
  className?: string;
}

/**
 * Compact live audio visualizer for the sonification player bar.
 *
 * Surfaces the same telemetry the old sr-only announcement exposed:
 *   - Storm intensity  → waveform amplitude / brightness
 *   - Blackout risk    → red pulsing alert ring
 *   - IsPlaying        → motion only when audio is active
 *
 * Renders nothing under prefers-reduced-motion.
 */
export function AudioVisualizer({
  data,
  isPlaying,
  className = ''
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const { stormIntensity, isBlackoutRisk } = data;

    const animate = () => {
      const width = canvas.getBoundingClientRect().width;
      const height = canvas.getBoundingClientRect().height;

      // Clear fully each frame — a solid fill avoids the alpha-accumulation
      // bug that a semi-transparent fade trail produces (muddy bar).
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      // Under reduced motion, only draw when audio is playing and keep it static
      if (prefersReducedMotion && !isPlaying) return;

      timeRef.current += prefersReducedMotion ? 0.01 : 0.02;

      const centerY = height / 2;
      const amplitude = (4 + stormIntensity * 14) * (isPlaying ? 1 : 0.25);
      const frequency = 0.08 + stormIntensity * 0.18;
      const speed = 0.5 + stormIntensity * 2;

      // Steady red waveform when blackout risk, otherwise blue
      const strokeStyle = isBlackoutRisk ? '#EF4444' : '#1D4ED8';

      // Base waveform
      ctx.beginPath();
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = isBlackoutRisk ? 2.5 : 1.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let x = 0; x < width; x += 2) {
        const y = centerY + Math.sin(x * frequency + timeRef.current * speed) * amplitude;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

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
      className={`block w-full h-8 rounded ${className}`}
      aria-label="Live audio visualizer showing storm intensity and blackout alerts"
      role="img"
      aria-roledescription="Animated waveform representing sonification output"
    />
  );
}