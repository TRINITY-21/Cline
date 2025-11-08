"use client";

import Link from 'next/link';

export default function BackToNews() {
  return (
    <div className="relative z-10">
      <Link
        href="/news"
        className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-all duration-300 hover:gap-3 group py-2 px-2 -mx-2 touch-manipulation relative z-10 cursor-pointer"
        aria-label="Back to News"
      >
        <span className="transform group-hover:-translate-x-1 transition-transform pointer-events-none">←</span>
        <span className="pointer-events-none">Back to News</span>
      </Link>
    </div>
  );
}


export function BackToHighlight() {
  return (
    <div className="relative z-10">
      <Link
        href="/highlight"
        className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-all duration-300 hover:gap-3 group py-2 px-2 -mx-2 touch-manipulation relative z-10 cursor-pointer"
        aria-label="Back to Highlights"
      >
        <span className="transform group-hover:-translate-x-1 transition-transform pointer-events-none">←</span>
        <span className="pointer-events-none">Back to Highlights</span>
      </Link>
    </div>
  );
}



