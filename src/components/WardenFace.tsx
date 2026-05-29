import React from 'react';
import { motion } from 'motion/react';

interface WardenFaceProps {
  className?: string;
}

export default function WardenFace({ className = 'w-12 h-12' }: WardenFaceProps) {
  // 16x16 grid coordinates matching the authentic Warden pixel face image
  const GRID = [
    // Row 0
    [2, 2, 1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1],
    // Row 1
    [1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 4, 1, 1], // Cyan block on col 13
    // Row 2
    [1, 1, 4, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 1], // Cyan block on col 2
    // Row 3
    [0, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], // Cyan block on col 1
    // Row 4
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    // Row 5
    [0, 0, 2, 2, 0, 0, 2, 2, 2, 2, 0, 0, 2, 2, 0, 0],
    // Row 6
    [0, 0, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 0, 0],
    // Row 7
    [0, 0, 1, 1, 3, 3, 3, 3, 3, 3, 3, 3, 1, 1, 0, 0],
    // Row 8
    [0, 1, 1, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 1, 1, 0], // Big open mouth mouth (6 value)
    // Row 9
    [0, 1, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 1, 0],
    // Row 10
    [0, 1, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 1, 0],
    // Row 11
    [0, 1, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 1, 0],
    // Row 12
    [0, 1, 1, 4, 4, 1, 1, 6, 6, 1, 1, 4, 4, 1, 1, 0], // Glowing row
    // Row 13
    [0, 0, 1, 1, 4, 4, 4, 4, 4, 4, 4, 4, 1, 1, 0, 0], // Glowing row
    // Row 14
    [0, 0, 0, 1, 1, 2, 4, 4, 4, 4, 2, 1, 1, 0, 0, 0], // Glowing row
    // Row 15
    [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0]
  ];

  // Map indexes to hexadecimal/RGB color values matching Warden design
  const getColor = (val: number, isGlowActive: boolean) => {
    switch (val) {
      case 0: return '#03080a'; // Deepest transparent/dark bg
      case 1: return '#08171d'; // Sculk deep blue-teal
      case 2: return '#102730'; // Medium sculk blue
      case 3: return '#15313d'; // Lighter sculk grey-teal
      case 4: return isGlowActive ? '#0cedf7' : '#0a8894'; // Glowing active cyan (animated)
      case 5: return isGlowActive ? '#7dfcfd' : '#14abb5'; // Brighter cyan highlight 
      case 6: return '#010304'; // Cavity mouth void (almost jet black)
      default: return '#03080a';
    }
  };

  // State to drive custom heart-beat style organic sculk glow transitions
  const [pulse, setPulse] = React.useState(false);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setPulse(p => !p);
    }, 1400); // Rhythmic organic pulse loop (soul beat)
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`relative select-none ${className}`}>
      {/* Outer ambient glow behind the Warden's face */}
      <div className="absolute inset-0.5 rounded-lg bg-cyan-500/10 blur-md animate-pulse pointer-events-none" />
      
      {/* Primary SVG Canvas */}
      <svg 
        className="w-full h-full rounded-lg border border-teal-500/10 shadow-[0_0_15px_rgba(6,182,212,0.15)] bg-[#03080a]" 
        viewBox="0 0 16 16"
        shapeRendering="crispEdges"
      >
        {GRID.map((row, rIdx) => 
          row.map((val, cIdx) => {
            const color = getColor(val, pulse);
            const isGlowElem = val === 4 || val === 5;
            
            return (
              <rect
                key={`${rIdx}-${cIdx}`}
                x={cIdx}
                y={rIdx}
                width="1"
                height="1"
                fill={color}
                className={isGlowElem ? 'transition-all duration-[1200ms] cubic-bezier(0.4, 0, 0.2, 1)' : 'transition-colors duration-300'}
                style={{
                  filter: isGlowElem ? `drop-shadow(0 0 0.8px ${color})` : 'none'
                }}
              />
            );
          })
        )}
      </svg>
      
      {/* Subtle organic sci-fi energy sparks overlay */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg opacity-40">
        <span className="absolute top-[10%] left-[20%] w-[1.5px] h-[1.5px] bg-cyan-300 rounded-full animate-ping" style={{ animationDuration: '3s', animationDelay: '0.2s' }} />
        <span className="absolute bottom-[20%] right-[30%] w-[1px] h-[1px] bg-sky-200 rounded-full animate-ping" style={{ animationDuration: '4.5s', animationDelay: '1.5s' }} />
      </div>
    </div>
  );
}
