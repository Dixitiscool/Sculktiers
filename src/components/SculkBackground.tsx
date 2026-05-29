import React, { useEffect, useState } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  delay: number;
}

export default function SculkBackground() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    // Generate organic particles drifting left to right - optimized density
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const count = isMobile ? 15 : 30; // Fewer elements on mobile prevents composite lag
    
    const initialParticles: Particle[] = Array.from({ length: count }).map((_, i) => ({
      id: i,
      x: Math.random() * 100, // starting % horizontally
      y: Math.random() * 100, // starting % vertically
      size: Math.random() * 3 + 1.5, // 1.5px - 4.5px (sharper, modern look)
      speed: Math.random() * 1.4 + 0.5, // gentle speeds
      opacity: Math.random() * 0.45 + 0.15,
      delay: Math.random() * -20, // Negative delay spreads them evenly from the start
    }));
    setParticles(initialParticles);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Immersive radial glow gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-cyan-950/20 blur-[130px] sculk-pulse-bg-1" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] rounded-full bg-emerald-950/15 blur-[150px] sculk-pulse-bg-2" />
      <div className="absolute top-[40%] left-[30%] w-[50%] h-[50%] rounded-full bg-teal-950/20 blur-[120px] sculk-pulse-bg-1" />

      {/* Grid overlay for gaming website style */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0c313d10_1px,transparent_1px),linear-gradient(to_bottom,#0c313d10_1px,transparent_1px)] bg-[size:4rem_4rem]" />

      {/* Flowing background light sweep lines moving left to right */}
      <div className="absolute inset-x-0 top-1/4 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent animate-pulse" />
      <div className="absolute inset-x-0 bottom-1/3 h-[1px] bg-gradient-to-r from-transparent via-teal-500/10 to-transparent animate-pulse [animation-delay:2s]" />

      {/* Floating particles flowing left-to-right */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-cyan-400/30 mix-blend-screen"
          style={{
            top: `${p.y}%`,
            left: `${p.x}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            opacity: p.opacity,
            boxShadow: '0 0 5px rgba(13, 255, 226, 0.3)',
            animation: `flyLeftToRight ${16 / p.speed}s linear infinite`,
            animationDelay: `${p.delay}s`,
            willChange: 'transform, opacity'
          }}
        />
      ))}

      {/* Ambient sculk mist drifting */}
      <div className="absolute inset-0 bg-radial-gradient from-transparent to-[#02070a]/90 pointer-events-none" />
    </div>
  );
}
