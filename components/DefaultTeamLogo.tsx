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
      className="relative rounded-full grid place-items-center overflow-hidden bg-[rgb(20,20,25)]"
    >
      {/* Initials text - white on dark gray background */}
      <span
        className="relative z-10 font-medium text-white"
        style={{
          fontSize: Math.max(10, Math.floor(sizeNum * 0.32)),
          letterSpacing: '0.02em',
          fontWeight: 500,
        }}
      >
        {initials}
      </span>
    </div>
  );
}

