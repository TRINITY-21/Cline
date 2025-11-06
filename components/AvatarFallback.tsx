"use client";

export default function AvatarFallback({ name, size = 16, className = "" }: { name: string; size?: number; className?: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(s => s[0]?.toUpperCase() ?? '')
    .join('');
  
  // If className includes w- or h-, use className for sizing, otherwise use inline style
  const useClassName = className && (className.includes('w-') || className.includes('h-') || className.includes('w-full') || className.includes('h-full'));
  const px = `${size}px`;
  
  return (
    <div
      style={useClassName ? undefined : { width: px, height: px }}
      className={`relative rounded-full grid place-items-center text-[10px] font-bold ${className}`}
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            'radial-gradient(120% 120% at 0% 0%, rgba(255,212,0,0.35), rgba(255,212,0,0.1))',
          border: '1px solid rgba(255,212,0,0.5)'
        }}
      />
      <span className="z-10" style={{ fontSize: useClassName ? 'clamp(10px, 2.5vw, 24px)' : Math.max(10, Math.floor(size * 0.45)) }}>
        {initials}
      </span>
    </div>
  );
}


