"use client";

export default function DefaultTeamLogo({ name, size = 48 }: { name: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(s => s[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2) || '?';

  const sizeNum = typeof size === 'number' ? size : 48;
  
  return (
    <div
      style={{ width: sizeNum, height: sizeNum }}
      className="relative rounded-full grid place-items-center overflow-hidden"
    >
      <svg
        width={sizeNum}
        height={sizeNum}
        viewBox="0 0 100 100"
        className="absolute inset-0"
      >
        <defs>
          <linearGradient id="default-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255, 212, 0, 0.4)" />
            <stop offset="50%" stopColor="rgba(255, 212, 0, 0.2)" />
            <stop offset="100%" stopColor="rgba(255, 212, 0, 0.1)" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Outer ring */}
        <circle
          cx="50"
          cy="50"
          r="48"
          fill="url(#default-gradient)"
          stroke="rgba(255, 212, 0, 0.6)"
          strokeWidth="2"
        />
        
        {/* Inner pattern - subtle hexagon */}
        <polygon
          points="50,15 75,35 75,65 50,85 25,65 25,35"
          fill="none"
          stroke="rgba(255, 212, 0, 0.3)"
          strokeWidth="1.5"
        />
        
        {/* Center circle accent */}
        <circle
          cx="50"
          cy="50"
          r="8"
          fill="rgba(255, 212, 0, 0.2)"
        />
      </svg>
      
      {/* Initials text */}
      <span
        className="relative z-10 font-bold text-white/90 drop-shadow-sm"
        style={{
          fontSize: Math.max(12, Math.floor(sizeNum * 0.35)),
          letterSpacing: '0.05em',
        }}
      >
        {initials}
      </span>
    </div>
  );
}

