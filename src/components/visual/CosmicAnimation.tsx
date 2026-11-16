'use client';

import { useEffect, useRef } from 'react';
import { SpaceWeatherEvent } from '@/types';

// Module-level mutable state for animation particles (avoids window global type issues)
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type?: 'solar-wind' | 'cme' | 'aurora' | 'magnetosphere';
  hitMagnetosphere?: boolean;
}

let solarWindParticles: Particle[] = [];
let cmeParticles: Particle[] = [];
let lastCmeSpawn = 0;
let magnetosphereHit = false;

interface CosmicAnimationProps {
  data: SpaceWeatherEvent;
  isSimulation: boolean;
  reducedMotion: boolean;
  viewMode?: 'solar-system' | 'earth-closeup';
  showOrbits?: boolean;
  showCmeCone?: boolean;
  showMagnetosphere?: boolean;
  showLabels?: boolean;
  isPaused?: boolean;
  animationSpeed?: number;
}

interface CelestialBody {
  x: number;
  y: number;
  radius: number;
  angle: number;
  distance: number;
  speed: number;
  color: string;
  glowColor: string;
}

// Add color/glowColor to sun

export function CosmicAnimation({
  data,
  isSimulation,
  reducedMotion,
  viewMode = 'solar-system',
  showOrbits = true,
  showCmeCone = true,
  showMagnetosphere = true,
  showLabels = true,
  isPaused = false,
  animationSpeed = 1
}: CosmicAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationIdRef = useRef<number | null>(null);
  const timeRef = useRef(0);

  // Realistic planet data (Earth = 1 AU = 185px, radius 9px baseline)
  const EARTH_DISTANCE = 185;
  const EARTH_RADIUS = 9;
  const BASE_SPEED = 0.000375; // Earth angular velocity (slowed for visual)

  // Mutable animation state — held in a ref so the canvas loop can update positions
  const bodiesRef = useRef<Record<'sun' | 'earth' | 'mercury' | 'venus' | 'mars', CelestialBody>>({
    sun: {
      x: 0,
      y: 0,
      radius: 38,
      angle: 0,
      distance: 0,
      speed: 0,
      color: '#FF4400',       // Bright orange-red (photosphere)
      glowColor: '#FF0000',   // Intense red glow (chromosphere/corona)
    },
    earth: {
      x: 0,
      y: 0,
      radius: EARTH_RADIUS,
      angle: 0,
      distance: EARTH_DISTANCE,                    // 1.00 AU
      speed: BASE_SPEED * 1.0,                     // 365 days
      color: '#4A90E2',       // Blue-white (oceans)
      glowColor: '#1E3A5F',
    },
    mercury: {
      x: 0,
      y: 0,
      radius: Math.round(EARTH_RADIUS * 0.38),     // 0.38 Earth radii
      angle: 0,
      distance: Math.round(EARTH_DISTANCE * 0.39), // 0.39 AU
      speed: BASE_SPEED * 4.15,                    // 88 days
      color: '#A0A0A0',       // Dark gray
      glowColor: '#606060',
    },
    venus: {
      x: 0,
      y: 0,
      radius: Math.round(EARTH_RADIUS * 0.95),     // 0.95 Earth radii
      angle: 0,
      distance: Math.round(EARTH_DISTANCE * 0.72), // 0.72 AU
      speed: BASE_SPEED * 1.63,                    // 225 days
      color: '#E6C87A',       // Yellowish-white (clouds)
      glowColor: '#B8954A',
    },
    mars: {
      x: 0,
      y: 0,
      radius: Math.round(EARTH_RADIUS * 0.53),     // 0.53 Earth radii
      angle: 0,
      distance: Math.round(EARTH_DISTANCE * 1.52), // 1.52 AU
      speed: BASE_SPEED * 0.53,                    // 687 days
      color: '#D94A2B',       // Red-orange
      glowColor: '#8B2A1A',
    },
  });
  const { sun, earth, mercury, venus, mars } = bodiesRef.current;

  const stormIntensity = data.stormIntensity;
  const cmeSpeed = data.cmeSpeed;
  const kpIndex = data.kpIndex;
  const isBlackoutRisk = data.isBlackoutRisk;

  const cmeVisualSpeed = 0.5 + (cmeSpeed / 2000) * 3;
  const solarWindDensity = 0.3 + stormIntensity * 1.5;
  const magnetosphereCompression = 1 + stormIntensity * 0.8;
  const auroraIntensity = stormIntensity;

  // Initialize particles
  useEffect(() => {
    solarWindParticles = [];
    cmeParticles = [];
    for (let i = 0; i < 80; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = sun.radius + 20 + Math.random() * 200;
      solarWindParticles.push({
        x: sun.x + Math.cos(angle) * distance,
        y: sun.y + Math.sin(angle) * distance,
        vx: Math.cos(angle) * (0.3 + Math.random() * 0.5) * solarWindDensity,
        vy: Math.sin(angle) * (0.3 + Math.random() * 0.5) * solarWindDensity,
        life: Math.random() * 100,
        maxLife: 100 + Math.random() * 200,
        size: 1 + Math.random() * 2,
        color: `rgba(29, 78, 216, ${0.3 + Math.random() * 0.4})`,
        type: 'solar-wind',
      });
    }
  }, [solarWindDensity]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        ctx.scale(dpr, dpr);
      }
    };

    resize();
    window.addEventListener('resize', resize);

    // Initial positions
    const updatePositions = () => {
      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);
      sun.x = w / 2;
      sun.y = h / 2;

      // Earth position (wireframe: at ~585, 260 which is right of center)
      // The wireframe shows Earth at angle ~0 (to the right of Sun)
      earth.x = sun.x + Math.cos(earth.angle) * earth.distance;
      earth.y = sun.y + Math.sin(earth.angle) * earth.distance;

      mercury.x = sun.x + Math.cos(mercury.angle) * mercury.distance;
      mercury.y = sun.y + Math.sin(mercury.angle) * mercury.distance;

      venus.x = sun.x + Math.cos(venus.angle) * venus.distance;
      venus.y = sun.y + Math.sin(venus.angle) * venus.distance;

      mars.x = sun.x + Math.cos(mars.angle) * mars.distance;
      mars.y = sun.y + Math.sin(mars.angle) * mars.distance;
    };

    updatePositions();

    const animate = (timestamp: number) => {
      if (reducedMotion) {
        animationIdRef.current = requestAnimationFrame(animate);
        return;
      }

      if (isPaused) {
        animationIdRef.current = requestAnimationFrame(animate);
        return;
      }

      const dt = (timestamp - timeRef.current) * animationSpeed;
      timeRef.current = timestamp;

      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);
      ctx.clearRect(0, 0, w, h);

      // Background
      ctx.fillStyle = '#E9E9E5';
      ctx.fillRect(0, 0, w, h);

      const cx = sun.x;
      const cy = sun.y;

      if (viewMode === 'solar-system') {
        // Update planet positions
        earth.angle += earth.speed * dt;
        earth.x = cx + Math.cos(earth.angle) * earth.distance;
        earth.y = cy + Math.sin(earth.angle) * earth.distance;

        mercury.angle += mercury.speed * dt;
        mercury.x = cx + Math.cos(mercury.angle) * mercury.distance;
        mercury.y = cy + Math.sin(mercury.angle) * mercury.distance;

        venus.angle += venus.speed * dt;
        venus.x = cx + Math.cos(venus.angle) * venus.distance;
        venus.y = cy + Math.sin(venus.angle) * venus.distance;

        mars.angle += mars.speed * dt;
        mars.x = cx + Math.cos(mars.angle) * mars.distance;
        mars.y = cy + Math.sin(mars.angle) * mars.distance;

        // Draw orbits at actual planet distances
        if (showOrbits) {
          const orbitRadii = [
            mercury.distance,  // ~72px (0.39 AU)
            venus.distance,    // ~133px (0.72 AU)
            earth.distance,    // 185px (1.00 AU)
            mars.distance      // ~281px (1.52 AU)
          ];
          ctx.strokeStyle = '#8A8A85';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 5]);
          orbitRadii.forEach(r => {
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.stroke();
          });
          ctx.setLineDash([]);
        }

        // Draw Parker spiral (magnetic field lines)
        if (showMagnetosphere) {
          const lineCount = 8;
          const maxRadius = 350;
          for (let i = 0; i < lineCount; i++) {
            const startAngle = (i / lineCount) * Math.PI * 2 + timestamp * 0.00005;
            const rotationSpeed = 0.3;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            for (let r = 60; r < maxRadius; r += 2) {
              const angle = startAngle + (r - 60) * rotationSpeed * 0.01;
              const x = cx + Math.cos(angle) * r;
              const y = cy + Math.sin(angle) * r;
              ctx.lineTo(x, y);
            }
            const alpha = 0.03 + solarWindDensity * 0.04;
            ctx.strokeStyle = `rgba(29, 78, 216, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }

        // Draw Sun with realistic color
        drawSunWireframe(ctx, cx, cy, timestamp, stormIntensity, isBlackoutRisk, sun.color, sun.glowColor);

        // Draw planets with dynamic labels
        drawPlanet(ctx, mercury, showLabels, 'Mercury');
        drawPlanet(ctx, venus, showLabels, 'Venus');
        drawPlanet(ctx, earth, showLabels, 'Earth');
        drawPlanet(ctx, mars, showLabels, 'Mars');

        // Draw CME cone
        if (showCmeCone && cmeSpeed > 300) {
          drawCMECone(ctx, cx, cy, earth, timestamp, stormIntensity, cmeVisualSpeed, cmeSpeed, showLabels);
        }

        // Draw solar wind particles
        drawSolarWind(ctx, dt, cx, cy, earth, magnetosphereCompression);

        // Draw CME particles
        drawCME(ctx, dt, cx, cy, earth, cmeVisualSpeed, stormIntensity, isBlackoutRisk);

        // Draw Earth magnetosphere & aurora
        if (showMagnetosphere) {
          drawEarthMagnetosphere(ctx, earth, timestamp, magnetosphereCompression, auroraIntensity, magnetosphereHit);
        }

        // Draw labels
        if (showLabels) {
          drawLabels(ctx, cx, cy, isSimulation, timestamp);
        }
      } else {
        // Earth close-up view — big realistic Earth
        earth.x = w * 0.55;
        earth.y = h * 0.55;
        earth.angle += earth.speed * dt;

        const savedEarthRadius = earth.radius;
        earth.radius = Math.min(w, h) * 0.3; // Large Earth for close-up

        drawSunWireframe(ctx, w * 0.1, cy, timestamp, stormIntensity, isBlackoutRisk);
        drawSolarWind(ctx, dt, cx, cy, earth, magnetosphereCompression);
        drawEarthMagnetosphere(ctx, earth, timestamp, magnetosphereCompression, auroraIntensity, magnetosphereHit, true);

        earth.radius = savedEarthRadius;

        if (showLabels) {
          ctx.font = 'bold 14px "Inter", sans-serif';
          ctx.fillStyle = '#1D4ED8';
          ctx.textAlign = 'center';
          ctx.fillText('EARTH CLOSE-UP', cx, 30);
        }
      }

      animationIdRef.current = requestAnimationFrame(animate);
    };

    animationIdRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
    };
  }, [reducedMotion, stormIntensity, cmeSpeed, kpIndex, isBlackoutRisk, isSimulation, data, viewMode, showOrbits, showCmeCone, showMagnetosphere, showLabels, isPaused, animationSpeed]);

  return (
    <div style={{position: 'relative', width: '100%', height: '100%', minHeight: '420px'}}>
      <canvas
        ref={canvasRef}
        style={{width: '100%', height: '100%', display: 'block'}}
        aria-hidden="true"
        role="img"
        aria-label={`Wireframe of the solar system: Sun at centre, four orbit rings, a CME cone travelling from the Sun toward Earth`}
      />
    </div>
  );
}

function drawSunWireframe(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  timestamp: number,
  stormIntensity: number,
  isBlackoutRisk: boolean,
  sunColor: string = '#FF4400',
  sunGlowColor: string = '#FF0000'
) {
  // Sun circle with gradient - bright white center, orange-red photosphere, red corona
  const sunGradient = ctx.createRadialGradient(
    cx - 38 * 0.3, cy - 38 * 0.3, 0,
    cx, cy, 38
  );
  sunGradient.addColorStop(0, '#FFFFFF');     // Bright white center (core)
  sunGradient.addColorStop(0.3, '#FFF8E7');   // Near-white inner
  sunGradient.addColorStop(0.6, sunColor);    // Orange-red photosphere
  sunGradient.addColorStop(1, sunGlowColor);  // Red corona edge

  ctx.beginPath();
  ctx.arc(cx, cy, 38, 0, Math.PI * 2);
  ctx.fillStyle = sunGradient;
  ctx.fill();
  ctx.strokeStyle = '#1A1A1A';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Sun corona/pulse effect for storms - red/orange flare
  if (stormIntensity > 0.3 || isBlackoutRisk) {
    const pulseScale = 1 + Math.sin(timestamp * 0.002) * 0.05 + stormIntensity * 0.15;
    const radius = 38 * pulseScale;

    const coronaGradient = ctx.createRadialGradient(cx, cy, 38, cx, cy, radius * 2);
    const intensity = 0.1 + stormIntensity * 0.2;
    coronaGradient.addColorStop(0, `rgba(255, 68, 0, ${intensity})`);
    coronaGradient.addColorStop(0.5, `rgba(255, 0, 0, ${intensity * 0.4})`);
    coronaGradient.addColorStop(1, 'rgba(255, 0, 0, 0)');

    ctx.beginPath();
    ctx.arc(cx, cy, radius * 2, 0, Math.PI * 2);
    ctx.fillStyle = coronaGradient;
    ctx.fill();
  }

  // Blackout risk alert ring
  if (isBlackoutRisk) {
    const alertPulse = 1 + Math.sin(timestamp * 0.01) * 0.15;
    ctx.beginPath();
    ctx.arc(cx, cy, 38 * 3 * alertPulse, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(180, 35, 24, ${0.3 + Math.sin(timestamp * 0.01) * 0.2})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawPlanet(
  ctx: CanvasRenderingContext2D,
  planet: { x: number; y: number; radius: number; color?: string; glowColor?: string },
  showLabels: boolean,
  name: string
) {
  // Planet body with gradient
  const gradient = ctx.createRadialGradient(
    planet.x - planet.radius * 0.3, planet.y - planet.radius * 0.3, 0,
    planet.x, planet.y, planet.radius
  );
  gradient.addColorStop(0, '#fff');
  gradient.addColorStop(0.5, planet.color || '#fff');
  gradient.addColorStop(1, planet.glowColor || '#888');

  ctx.beginPath();
  ctx.arc(planet.x, planet.y, planet.radius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.strokeStyle = '#1A1A1A';
  ctx.lineWidth = planet.radius >= 8 ? 2 : 1.5; // Earth has thicker stroke
  ctx.stroke();

  if (showLabels) {
    // Position label dynamically: offset from planet, avoid overlap
    const offsetX = planet.radius + 14;
    const offsetY = planet.radius + 4;
    ctx.font = '11px "Inter", sans-serif';
    ctx.fillStyle = '#444';
    ctx.textAlign = 'left';
    ctx.fillText(name, planet.x + offsetX, planet.y + offsetY);
  }
}

function drawCMECone(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  earth: { x: number; y: number; radius: number },
  timestamp: number,
  stormIntensity: number,
  cmeVisualSpeed: number,
  cmeSpeed: number,
  showLabels: boolean
) {
  // Calculate CME front position (traveling from Sun to Earth)
  const earthAngle = Math.atan2(earth.y - cy, earth.x - cx);
  const sunToEarthDist = Math.sqrt((earth.x - cx) ** 2 + (earth.y - cy) ** 2);

  // Real CME travel time: 1 AU = 149.6M km at cmeSpeed km/s
  // Travel time in hours = 149.6e6 / cmeSpeed / 3600
  const travelTimeHours = 149.6e6 / Math.max(300, cmeSpeed) / 3600; // hours

  // Animation speed factor: 1 hour of real travel = X seconds of animation
  // Default: 1 real hour = 2 animation seconds (30x speedup)
  const animSpeedFactor = cmeVisualSpeed; // adjustable, default 2
  const travelTimeMs = travelTimeHours * 3600 * 1000 / animSpeedFactor; // animation milliseconds

  // Progress based on animation cycle time (loops continuously)
  // Use a reference time to make it consistent
  const cycleStartRef = Math.floor(Date.now() / travelTimeMs) * travelTimeMs;
  const progress = Math.min(1, (Date.now() - cycleStartRef) / travelTimeMs);
  const cmeFrontDist = 38 + progress * (sunToEarthDist - 38);

  const cmeFrontX = cx + Math.cos(earthAngle) * cmeFrontDist;
  const cmeFrontY = cy + Math.sin(earthAngle) * cmeFrontDist;

  // CME cone (polygon from wireframe: points="436,240 660,150 660,370 436,280")
  // Adapted to current positions
  const coneWidth = cmeFrontDist * 0.4;
  const coneBaseX = cx + Math.cos(earthAngle) * 38;
  const coneBaseY = cy + Math.sin(earthAngle) * 38;

  const perpAngle = earthAngle + Math.PI / 2;
  const baseHalfWidth = 38 * 0.5;
  const frontHalfWidth = coneWidth;

  ctx.beginPath();
  ctx.moveTo(
    coneBaseX + Math.cos(perpAngle) * baseHalfWidth,
    coneBaseY + Math.sin(perpAngle) * baseHalfWidth
  );
  ctx.lineTo(
    cmeFrontX + Math.cos(perpAngle) * frontHalfWidth,
    cmeFrontY + Math.sin(perpAngle) * frontHalfWidth
  );
  ctx.lineTo(
    cmeFrontX - Math.cos(perpAngle) * frontHalfWidth,
    cmeFrontY - Math.sin(perpAngle) * frontHalfWidth
  );
  ctx.lineTo(
    coneBaseX - Math.cos(perpAngle) * baseHalfWidth,
    coneBaseY - Math.sin(perpAngle) * baseHalfWidth
  );
  ctx.closePath();

  ctx.fillStyle = 'rgba(29, 78, 216, 0.12)';
  ctx.fill();
  ctx.strokeStyle = '#1D4ED8';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.stroke();
  ctx.setLineDash([]);

  // CME front arc (wireframe: path d="M545 200 Q572 260 545 320")
  ctx.beginPath();
  const arcRadius = frontHalfWidth;
  ctx.moveTo(cmeFrontX - Math.cos(earthAngle) * arcRadius * 0.5, cmeFrontY - Math.sin(earthAngle) * arcRadius * 0.5);
  ctx.quadraticCurveTo(
    cmeFrontX + Math.cos(earthAngle) * arcRadius,
    cmeFrontY + Math.sin(earthAngle) * arcRadius,
    cmeFrontX - Math.cos(earthAngle) * arcRadius * 0.5,
    cmeFrontY - Math.sin(earthAngle) * arcRadius * 0.5
  );
  ctx.strokeStyle = '#1D4ED8';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Arrival time label - shows real estimated time based on CME speed
  if (showLabels && cmeSpeed > 300) {
    const travelTimeHours = 149.6e6 / Math.max(300, cmeSpeed) / 3600; // hours
    const etaHours = travelTimeHours * (1 - progress);
    const etaMinutes = Math.max(1, Math.round(etaHours * 60));
    const etaLabel = etaHours >= 1
      ? `${Math.floor(etaHours)}h ${etaMinutes % 60}m`
      : `${etaMinutes}m`;
    ctx.font = '11px "Inter", sans-serif';
    ctx.fillStyle = '#1D4ED8';
    ctx.textAlign = 'left';
    const labelX = cmeFrontX + 20;
    const labelY = cmeFrontY - 30;
    ctx.fillText(`CME front · arrival in ${etaLabel}`, labelX, labelY);
  }
}

function drawSolarWind(
  ctx: CanvasRenderingContext2D,
  dt: number,
  cx: number,
  cy: number,
  earth: { x: number; y: number; radius: number },
  magnetosphereCompression: number
) {
  const particles = solarWindParticles;
  if (particles.length === 0) return;

  const magnetosphereRadius = earth.radius * magnetosphereCompression;

  particles.forEach((p) => {
    p.x += p.vx * dt * 0.02;
    p.y += p.vy * dt * 0.02;
    p.life += dt * 0.01;

    const dx = p.x - earth.x;
    const dy = p.y - earth.y;
    const distToEarth = Math.sqrt(dx * dx + dy * dy);

    if (distToEarth < magnetosphereRadius * 1.5) {
      const force = (magnetosphereRadius * 1.5 - distToEarth) * 0.001;
      const angle = Math.atan2(dy, dx);
      p.vx += Math.cos(angle) * force * dt * 0.02;
      p.vy += Math.sin(angle) * force * dt * 0.02;
      p.color = `rgba(34, 211, 232, ${0.3 + Math.random() * 0.3})`;
    } else {
      p.color = `rgba(29, 78, 216, ${0.2 + Math.random() * 0.3})`;
    }

    const distFromSun = Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2);
    if (distFromSun > 400 || p.life > p.maxLife) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 50 + Math.random() * 100;
      p.x = cx + Math.cos(angle) * distance;
      p.y = cy + Math.sin(angle) * distance;
      p.vx = Math.cos(angle) * (0.3 + Math.random() * 0.5);
      p.vy = Math.sin(angle) * (0.3 + Math.random() * 0.5);
      p.life = 0;
      p.maxLife = 100 + Math.random() * 200;
    }

    const alpha = (1 - p.life / p.maxLife) * 0.4;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = p.color.replace(/[\d.]+\)/, `${alpha})`);
    ctx.fill();
  });
}

function drawCME(
  ctx: CanvasRenderingContext2D,
  dt: number,
  cx: number,
  cy: number,
  earth: { x: number; y: number; radius: number },
  cmeVisualSpeed: number,
  stormIntensity: number,
  isBlackoutRisk: boolean
) {
  if (cmeParticles.length === 0) cmeParticles = [];
  const now = Date.now();

  if (now - (lastCmeSpawn || 0) > 3000 / cmeVisualSpeed) {
    lastCmeSpawn = now;
    const earthAngle = Math.atan2(earth.y - cy, earth.x - cx);
    const spawnAngle = earthAngle + (Math.random() - 0.5) * 1.2;

    for (let i = 0; i < 15; i++) {
      const particleAngle = spawnAngle + (Math.random() - 0.5) * 0.4;
      const speed = (2 + Math.random() * 3) * cmeVisualSpeed;
      cmeParticles.push({
        x: cx + Math.cos(particleAngle) * 50,
        y: cy + Math.sin(particleAngle) * 50,
        vx: Math.cos(particleAngle) * speed,
        vy: Math.sin(particleAngle) * speed,
        life: 0,
        maxLife: 150 + Math.random() * 100,
        size: 3 + Math.random() * 4,
        color: `rgba(251, 146, 60, `,
        hitMagnetosphere: false,
      });
    }
  }

  const magnetosphereRadius = earth.radius * (1 + stormIntensity * 0.8);

  cmeParticles.forEach((p, idx: number) => {
    p.x += p.vx * dt * 0.02;
    p.y += p.vy * dt * 0.02;
    p.life += dt * 0.01;

    const dx = p.x - earth.x;
    const dy = p.y - earth.y;
    const distToEarth = Math.sqrt(dx * dx + dy * dy);

    if (distToEarth < magnetosphereRadius && !p.hitMagnetosphere) {
      p.hitMagnetosphere = true;
      p.color = `rgba(34, 211, 232, `;
      p.vx *= -0.3;
      p.vy *= -0.3;
      magnetosphereHit = true;
      setTimeout(() => { magnetosphereHit = false; }, 500);
    }

    const alpha = (1 - p.life / p.maxLife) * 0.7;
    const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
    gradient.addColorStop(0, p.color + `${alpha})`);
    gradient.addColorStop(1, p.color + `0)`);

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (1 + p.life / p.maxLife * 0.5), 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    if (p.life > p.maxLife || Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2) > 500) {
      cmeParticles.splice(idx, 1);
    }
  });
}

function drawEarthMagnetosphere(
  ctx: CanvasRenderingContext2D,
  earth: { x: number; y: number; radius: number; angle: number },
  timestamp: number,
  magnetosphereCompression: number,
  auroraIntensity: number,
  magnetosphereHit: boolean,
  realisticEarth: boolean = false
) {
  const { x, y, radius } = earth;
  const magRadius = radius * magnetosphereCompression;

  // Magnetosphere glow
  const magGradient = ctx.createRadialGradient(x, y, radius * 1.2, x, y, magRadius * 1.3);
  magGradient.addColorStop(0, 'rgba(34, 211, 232, 0)');
  magGradient.addColorStop(0.5, `rgba(34, 211, 232, ${0.08 + auroraIntensity * 0.1})`);
  magGradient.addColorStop(0.8, `rgba(34, 211, 232, ${0.15 + auroraIntensity * 0.15})`);
  magGradient.addColorStop(1, 'rgba(34, 211, 232, 0)');

  ctx.beginPath();
  ctx.arc(x, y, magRadius * 1.3, 0, Math.PI * 2);
  ctx.fillStyle = magGradient;
  ctx.fill();

  // Magnetopause (solid)
  ctx.beginPath();
  ctx.arc(x, y, magRadius, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(34, 211, 232, ${0.4 + auroraIntensity * 0.3})`;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Magnetopause (dashed - inner)
  ctx.beginPath();
  ctx.arc(x, y, magRadius * 0.85, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(34, 211, 232, ${0.3 + auroraIntensity * 0.2})`;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Bow shock (wireframe style)
  const bowShockDist = magRadius * 1.5;
  const sunDirection = Math.atan2(-y + x, -x + y); // Approximate sun direction
  ctx.beginPath();
  ctx.ellipse(
    x + Math.cos(sunDirection) * bowShockDist * 0.3,
    y + Math.sin(sunDirection) * bowShockDist * 0.3,
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

  // Magnetosphere hit flash
  if (magnetosphereHit) {
    ctx.beginPath();
    ctx.arc(x, y, magRadius * 1.5, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 255, 255, 0.8)`;
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // Aurora ovals
  if (auroraIntensity > 0.1) {
    const colors = [
      'rgba(34, 197, 94, ',
      'rgba(168, 85, 247, ',
      'rgba(236, 72, 153, ',
      'rgba(34, 211, 232, ',
    ];

    for (let hemisphere = -1; hemisphere <= 1; hemisphere += 2) {
      const ovalRadius = radius * 1.15;
      const ovalWidth = radius * 0.8;
      const centerOffset = hemisphere * radius * 0.3;

      for (let layer = 0; layer < 3; layer++) {
        const color = colors[layer % colors.length];
        const alpha = auroraIntensity * (0.12 + layer * 0.06);
        const wavePhase = timestamp * 0.002 + layer * 2;

        ctx.beginPath();
        for (let angle = -Math.PI * 0.6; angle < Math.PI * 0.6; angle += 0.05) {
          const wave = Math.sin(angle * 4 + wavePhase) * 0.15 * auroraIntensity;
          const r = ovalRadius + wave * radius;
          const px = x + Math.cos(angle + earth.angle) * r;
          const py = y + hemisphere * (centerOffset + Math.sin(angle + earth.angle) * ovalWidth * (1 + wave));

          if (angle === -Math.PI * 0.6) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }

        for (let angle = Math.PI * 0.6; angle > -Math.PI * 0.6; angle -= 0.05) {
          const r = ovalRadius * 0.8;
          const px = x + Math.cos(angle + earth.angle) * r;
          const py = y + hemisphere * (centerOffset * 0.5 + Math.sin(angle + earth.angle) * ovalWidth * 0.6);
          ctx.lineTo(px, py);
        }
        ctx.closePath();

        const gradient = ctx.createRadialGradient(x, y + centerOffset, 0, x, y + centerOffset, ovalRadius);
        gradient.addColorStop(0, color + `${alpha})`);
        gradient.addColorStop(1, color + `0)`);
        ctx.fillStyle = gradient;
        ctx.fill();
      }
    }
  }

  // Earth
  if (realisticEarth) {
    drawRealisticEarth(ctx, x, y, radius, earth.angle, timestamp);
  } else {
  const earthGradient = ctx.createRadialGradient(
    x - radius * 0.3, y - radius * 0.3, 0,
    x, y, radius
  );
  earthGradient.addColorStop(0, '#fff');
  earthGradient.addColorStop(0.5, '#e0e0e0');
  earthGradient.addColorStop(1, '#ccc');

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = earthGradient;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.strokeStyle = '#1A1A1A';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Continents
  ctx.fillStyle = 'rgba(34, 197, 94, 0.5)';
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
      const angle = Math.atan2(pt.ay, pt.ax) + earth.angle;
      const dist = Math.sqrt(pt.ax * pt.ax + pt.ay * pt.ay) * radius * 0.9;
      const px = x + Math.cos(angle) * dist;
      const py = y + Math.sin(angle) * dist;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fill();
  });

  // Night side
  const nightGradient = ctx.createRadialGradient(
    x + Math.cos(earth.angle) * radius * 0.5,
    y + Math.sin(earth.angle) * radius * 0.5,
    0,
    x, y, radius
  );
  nightGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
  nightGradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.2)');
  nightGradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)');

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = nightGradient;
  ctx.fill();
  }

  // Aurora ellipses (wireframe style - matching the SVG)
  if (!realisticEarth) {
    ctx.beginPath();
    ctx.ellipse(x, y - radius * 0.4, radius * 0.45, radius * 0.15, 0, 0, Math.PI * 2);
    ctx.strokeStyle = '#1A1A1A';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(x, y + radius * 0.4, radius * 0.45, radius * 0.15, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// Ultra-realistic blue-marble Earth for the close-up view
// Light comes from the LEFT (the Sun sits on the left edge in this view).
function drawRealisticEarth(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  angle: number,
  timestamp: number
) {
  const R = radius;

  // ---------- 1. ATMOSPHERE SCATTERING (outside the disc) ----------
  // Wide Rayleigh halo (deep blue, fades far out)
  const haloWide = ctx.createRadialGradient(x, y, R * 0.96, x, y, R * 1.55);
  haloWide.addColorStop(0, 'rgba(80, 130, 240, 0.30)');
  haloWide.addColorStop(0.35, 'rgba(90, 150, 250, 0.14)');
  haloWide.addColorStop(1, 'rgba(90, 150, 250, 0)');
  ctx.beginPath();
  ctx.arc(x, y, R * 1.55, 0, Math.PI * 2);
  ctx.fillStyle = haloWide;
  ctx.fill();

  // Dense scattering layer hugging the limb
  const haloDense = ctx.createRadialGradient(x, y, R * 0.98, x, y, R * 1.18);
  haloDense.addColorStop(0, 'rgba(150, 200, 255, 0.42)');
  haloDense.addColorStop(0.55, 'rgba(110, 170, 255, 0.18)');
  haloDense.addColorStop(1, 'rgba(110, 170, 255, 0)');
  ctx.beginPath();
  ctx.arc(x, y, R * 1.18, 0, Math.PI * 2);
  ctx.fillStyle = haloDense;
  ctx.fill();

  // Forward-scatter warmth on the sun-facing (left) rim
  const fwdScatter = ctx.createRadialGradient(
    x - R * 0.92, y, 0,
    x - R * 0.92, y, R * 0.75
  );
  fwdScatter.addColorStop(0, 'rgba(255, 190, 120, 0.28)');
  fwdScatter.addColorStop(0.5, 'rgba(255, 170, 90, 0.10)');
  fwdScatter.addColorStop(1, 'rgba(255, 170, 90, 0)');
  ctx.beginPath();
  ctx.arc(x - R * 0.92, y, R * 0.75, 0, Math.PI * 2);
  ctx.fillStyle = fwdScatter;
  ctx.fill();

  // Bright Rayleigh rim arc on the sunlit side (soft, then crisp)
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(x, y, R * 1.01, Math.PI * 0.62, Math.PI * 1.38);
  ctx.strokeStyle = 'rgba(180, 215, 255, 0.35)';
  ctx.lineWidth = R * 0.09;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, R * 1.0, Math.PI * 0.68, Math.PI * 1.32);
  ctx.strokeStyle = 'rgba(220, 240, 255, 0.85)';
  ctx.lineWidth = R * 0.022;
  ctx.stroke();

  // ---------- 2. OCEAN ----------
  const ocean = ctx.createRadialGradient(
    x - R * 0.35, y - R * 0.35, R * 0.1,
    x, y, R
  );
  ocean.addColorStop(0, '#8ed4fa');
  ocean.addColorStop(0.35, '#3a8ede');
  ocean.addColorStop(0.65, '#2067bb');
  ocean.addColorStop(0.88, '#133f86');
  ocean.addColorStop(1, '#0a2a5e');
  ctx.beginPath();
  ctx.arc(x, y, R, 0, Math.PI * 2);
  ctx.fillStyle = ocean;
  ctx.fill();

  // ---------- 3. SURFACE (clipped) ----------
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, R * 0.995, 0, Math.PI * 2);
  ctx.clip();

  const project = (ax: number, ay: number, rot: number, scale = 0.92) => {
    const ptAngle = Math.atan2(ay, ax) + rot;
    const dist = Math.sqrt(ax * ax + ay * ay) * R * scale;
    return {
      px: x + Math.cos(ptAngle) * dist,
      py: y + Math.sin(ptAngle) * dist,
      ux: Math.cos(ptAngle) * Math.sqrt(ax * ax + ay * ay) * scale, // -1 (sun side) .. +1 (night side)
    };
  };

  // Detailed continents (unit-disc coordinates, rotating with the surface)
  const continents: Array<Array<{ ax: number; ay: number }>> = [
    [ // North America
      { ax: -0.72, ay: -0.18 }, { ax: -0.62, ay: -0.34 }, { ax: -0.44, ay: -0.46 },
      { ax: -0.24, ay: -0.52 }, { ax: -0.02, ay: -0.46 }, { ax: 0.06, ay: -0.32 },
      { ax: -0.04, ay: -0.18 }, { ax: -0.10, ay: 0.02 }, { ax: -0.22, ay: 0.10 },
      { ax: -0.40, ay: 0.06 }, { ax: -0.58, ay: -0.02 },
    ],
    [ // Central America bridge
      { ax: -0.18, ay: 0.10 }, { ax: -0.06, ay: 0.14 }, { ax: -0.02, ay: 0.24 },
      { ax: -0.12, ay: 0.26 },
    ],
    [ // South America
      { ax: -0.10, ay: 0.28 }, { ax: 0.06, ay: 0.30 }, { ax: 0.10, ay: 0.46 },
      { ax: 0.04, ay: 0.64 }, { ax: -0.06, ay: 0.74 }, { ax: -0.14, ay: 0.62 },
      { ax: -0.16, ay: 0.44 },
    ],
    [ // Greenland
      { ax: -0.30, ay: -0.72 }, { ax: -0.12, ay: -0.80 }, { ax: 0.04, ay: -0.74 },
      { ax: -0.04, ay: -0.64 }, { ax: -0.22, ay: -0.62 },
    ],
    [ // Europe
      { ax: 0.30, ay: -0.52 }, { ax: 0.46, ay: -0.58 }, { ax: 0.58, ay: -0.48 },
      { ax: 0.54, ay: -0.36 }, { ax: 0.40, ay: -0.36 }, { ax: 0.32, ay: -0.42 },
    ],
    [ // Africa
      { ax: 0.34, ay: -0.30 }, { ax: 0.52, ay: -0.28 }, { ax: 0.62, ay: -0.14 },
      { ax: 0.60, ay: 0.06 }, { ax: 0.52, ay: 0.24 }, { ax: 0.42, ay: 0.34 },
      { ax: 0.34, ay: 0.24 }, { ax: 0.30, ay: 0.06 }, { ax: 0.26, ay: -0.12 },
    ],
    [ // Asia
      { ax: 0.44, ay: -0.60 }, { ax: 0.66, ay: -0.68 }, { ax: 0.86, ay: -0.60 },
      { ax: 0.94, ay: -0.42 }, { ax: 0.86, ay: -0.24 }, { ax: 0.70, ay: -0.16 },
      { ax: 0.58, ay: -0.30 }, { ax: 0.50, ay: -0.44 },
    ],
    [ // India
      { ax: 0.68, ay: -0.10 }, { ax: 0.78, ay: -0.14 }, { ax: 0.74, ay: 0.06 },
      { ax: 0.66, ay: 0.10 },
    ],
    [ // SE Asia archipelago
      { ax: 0.78, ay: 0.22 }, { ax: 0.88, ay: 0.26 }, { ax: 0.84, ay: 0.36 },
      { ax: 0.76, ay: 0.32 },
    ],
    [ // Australia
      { ax: 0.58, ay: 0.46 }, { ax: 0.74, ay: 0.42 }, { ax: 0.80, ay: 0.56 },
      { ax: 0.68, ay: 0.64 }, { ax: 0.56, ay: 0.58 },
    ],
  ];

  continents.forEach(continent => {
    ctx.beginPath();
    continent.forEach((pt, i) => {
      const p = project(pt.ax, pt.ay, angle);
      if (i === 0) ctx.moveTo(p.px, p.py);
      else ctx.lineTo(p.px, p.py);
    });
    ctx.closePath();
    // Two-tone land: warm green sunlit face -> deep olive night face
    const land = ctx.createLinearGradient(x - R, y, x + R, y);
    land.addColorStop(0, '#4d9448');
    land.addColorStop(0.45, '#357c35');
    land.addColorStop(0.75, '#27592a');
    land.addColorStop(1, '#183519');
    ctx.fillStyle = land;
    ctx.fill();
    ctx.strokeStyle = 'rgba(16, 50, 24, 0.5)';
    ctx.lineWidth = Math.max(1, R * 0.01);
    ctx.stroke();
  });

  // Desert belt highlights on sunlit land (Sahara / Australia tone)
  ctx.globalAlpha = 0.5;
  [{ ax: 0.46, ay: -0.08, r: 0.13 }, { ax: 0.68, ay: 0.52, r: 0.09 }].forEach(d => {
    const p = project(d.ax, d.ay, angle);
    const g = ctx.createRadialGradient(p.px, p.py, 0, p.px, p.py, d.r * R);
    g.addColorStop(0, 'rgba(212, 178, 106, 0.75)');
    g.addColorStop(1, 'rgba(212, 178, 106, 0)');
    ctx.beginPath();
    ctx.arc(p.px, p.py, d.r * R, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  // Polar ice caps — soft white hugging the poles
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = '#f4f9ff';
  ctx.beginPath();
  ctx.ellipse(x, y - R * 0.9, R * 0.18, R * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x, y + R * 0.92, R * 0.2, R * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Clouds — translucent swirls drifting slightly faster than the surface
  const cloudDrift = angle * 1.35 + timestamp * 0.00012;
  const clouds = [
    { ax: -0.5, ay: -0.25, r: 0.22 },
    { ax: 0.0, ay: -0.45, r: 0.26 },
    { ax: 0.3, ay: -0.1, r: 0.2 },
    { ax: 0.05, ay: 0.2, r: 0.3 },
    { ax: -0.35, ay: 0.35, r: 0.24 },
    { ax: 0.55, ay: 0.35, r: 0.2 },
    { ax: 0.7, ay: -0.45, r: 0.16 },
    { ax: -0.62, ay: -0.6, r: 0.18 },
  ];
  clouds.forEach(cloud => {
    const cAngle = Math.atan2(cloud.ay, cloud.ax) + cloudDrift;
    const dist = Math.sqrt(cloud.ax * cloud.ax + cloud.ay * cloud.ay) * R * 0.9;
    const px = x + Math.cos(cAngle) * dist;
    const py = y + Math.sin(cAngle) * dist;
    const cloudGrad = ctx.createRadialGradient(px, py, 0, px, py, cloud.r * R);
    cloudGrad.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
    cloudGrad.addColorStop(0.6, 'rgba(255, 255, 255, 0.28)');
    cloudGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.beginPath();
    ctx.arc(px, py, cloud.r * R, 0, Math.PI * 2);
    ctx.fillStyle = cloudGrad;
    ctx.fill();
  });

  // ---------- 4. NIGHT SHADING ----------
  const night = ctx.createRadialGradient(
    x + R * 0.62, y, R * 0.25,
    x, y, R
  );
  night.addColorStop(0, 'rgba(2, 3, 14, 0.72)');
  night.addColorStop(0.45, 'rgba(2, 3, 14, 0.4)');
  night.addColorStop(1, 'rgba(2, 3, 14, 0)');
  ctx.beginPath();
  ctx.arc(x, y, R, 0, Math.PI * 2);
  ctx.fillStyle = night;
  ctx.fill();

  // ---------- 5. CITY LIGHTS (night side only) ----------
  const cities: Array<{ ax: number; ay: number; n: number }> = [
    { ax: -0.30, ay: 0.02, n: 5 },   // US east coast
    { ax: -0.52, ay: -0.14, n: 4 },  // US west coast
    { ax: -0.06, ay: 0.48, n: 4 },   // Brazil
    { ax: 0.38, ay: -0.42, n: 5 },   // Europe
    { ax: 0.52, ay: -0.16, n: 3 },   // Nile / Middle East
    { ax: 0.70, ay: -0.02, n: 5 },   // India
    { ax: 0.84, ay: -0.30, n: 4 },   // East Asia
    { ax: 0.70, ay: 0.54, n: 3 },    // Australia
  ];
  cities.forEach((city, ci) => {
    for (let i = 0; i < city.n; i++) {
      // Deterministic jitter (stable across frames — no flicker)
      const seed = Math.sin(i * 127.1 + ci * 311.7) * 43758.5453;
      const frac = seed - Math.floor(seed);
      const seed2 = Math.sin(i * 269.5 + ci * 183.3) * 24634.6345;
      const frac2 = seed2 - Math.floor(seed2);
      const jx = city.ax + (frac - 0.5) * 0.1;
      const jy = city.ay + (frac2 - 0.5) * 0.12;
      const p = project(jx, jy, angle);
      // Darkness factor: -1 = fully lit, +1 = full night
      const dark = Math.max(0, Math.min(1, (p.ux + 0.25) / 0.85));
      if (dark < 0.25) continue;
      const a = dark * 0.9;
      const rr = R * 0.012;
      // warm glow
      const glow = ctx.createRadialGradient(p.px, p.py, 0, p.px, p.py, rr * 3);
      glow.addColorStop(0, `rgba(255, 214, 130, ${a * 0.5})`);
      glow.addColorStop(1, 'rgba(255, 214, 130, 0)');
      ctx.beginPath();
      ctx.arc(p.px, p.py, rr * 3, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();
      // core dot
      ctx.beginPath();
      ctx.arc(p.px, p.py, rr, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 226, 160, ${a})`;
      ctx.fill();
    }
  });

  // ---------- 6. TWILIGHT GLOW (warm band at the terminator) ----------
  const twilight = ctx.createLinearGradient(x - R, 0, x + R, 0);
  twilight.addColorStop(0, 'rgba(255, 150, 60, 0)');
  twilight.addColorStop(0.28, 'rgba(255, 165, 70, 0.10)');
  twilight.addColorStop(0.44, 'rgba(255, 140, 50, 0.28)');
  twilight.addColorStop(0.58, 'rgba(255, 110, 40, 0.16)');
  twilight.addColorStop(0.78, 'rgba(255, 110, 40, 0)');
  ctx.beginPath();
  ctx.arc(x, y, R, 0, Math.PI * 2);
  ctx.fillStyle = twilight;
  ctx.fill();

  ctx.restore();

  // ---------- 7. SUNLIT HIGHLIGHTS ----------
  // Specular ocean glint on the sunlit side
  const glint = ctx.createRadialGradient(
    x - R * 0.45, y - R * 0.4, 0,
    x - R * 0.45, y - R * 0.4, R * 0.35
  );
  glint.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
  glint.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, R * 0.99, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = glint;
  ctx.fillRect(x - R, y - R, R * 2, R * 2);
  ctx.restore();

  // Inner limb haze (atmosphere seen from orbit, above the surface)
  const haze = ctx.createRadialGradient(x, y, R * 0.82, x, y, R);
  haze.addColorStop(0, 'rgba(140, 195, 255, 0)');
  haze.addColorStop(1, 'rgba(140, 195, 255, 0.22)');
  ctx.beginPath();
  ctx.arc(x, y, R, 0, Math.PI * 2);
  ctx.fillStyle = haze;
  ctx.fill();

  // Crisp outline
  ctx.beginPath();
  ctx.arc(x, y, R, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(10, 30, 60, 0.6)';
  ctx.lineWidth = Math.max(1, R * 0.012);
  ctx.stroke();
}

function drawLabels(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  isSimulation: boolean,
  timestamp: number
) {
  const w = ctx.canvas.width / (window.devicePixelRatio || 1);
  const h = ctx.canvas.height / (window.devicePixelRatio || 1);

  // Title
  ctx.font = 'bold 14px "Inter", sans-serif';
  ctx.fillStyle = '#1D4ED8';
  ctx.textAlign = 'left';
  ctx.fillText('HELIOPHON — COSMIC VIEW', 16, 28);

  // Mode badge
  ctx.font = '11px "Inter", sans-serif';
  const badgeText = isSimulation ? 'HISTORICAL SIMULATION' : 'LIVE TELEMETRY';
  const badgeColor = isSimulation ? '#f59e0b' : '#22c55e';
  ctx.fillStyle = badgeColor;
  ctx.fillText(badgeText, 16, 48);

  // "Not to scale"
  ctx.font = '11px "Inter", sans-serif';
  ctx.fillStyle = '#444';
  ctx.fillText('Not to scale', 14, h - 14);
}