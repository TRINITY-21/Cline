"use client";

export default function AvatarFallback({ name, size = 16 }: { name: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(s => s[0]?.toUpperCase() ?? '')
    .join('');
  const px = `${size}px`;
  return (
    <div
      style={{ width: px, height: px }}
      className="relative rounded-full grid place-items-center text-[10px] font-bold"
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            'radial-gradient(120% 120% at 0% 0%, rgba(255,212,0,0.35), rgba(255,212,0,0.1))',
          border: '1px solid rgba(255,212,0,0.5)'
        }}
      />
      <span className="z-10" style={{ fontSize: Math.max(10, Math.floor(size * 0.45)) }}>
        {initials}
      </span>
    </div>
  );
}


