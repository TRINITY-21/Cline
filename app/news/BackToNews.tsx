"use client";

import Link from 'next/link';

export default function BackToNews() {
  return (
    <Link
      href="/news"
      className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-all duration-300 hover:gap-3 group"
      aria-label="Back to News"
    >
      <span className="transform group-hover:-translate-x-1 transition-transform">←</span>
      <span>Back to News</span>
    </Link>
  );
}


export function BackToHighlight() {
  return (
    <Link
      href="/highlight"
      className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-all duration-300 hover:gap-3 group"
      aria-label="Back to Highlights"
    >
      <span className="transform group-hover:-translate-x-1 transition-transform">←</span>
      <span>Back to Highlights</span>
    </Link>
  );
}



