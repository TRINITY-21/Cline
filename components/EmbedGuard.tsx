"use client";

import type { PageMetadata } from '@/lib/types';
import { useMemo } from 'react';

export default function EmbedGuard({ meta }: { meta: PageMetadata }) {
  const src = useMemo(() => meta.url, [meta.url]);

  if (!meta.canFrame) {
    return (
      <div className="p-4 border border-yellow-300/30 bg-yellow-300/10 rounded">
        <div className="font-medium mb-2">Embedding is disabled by the provider.</div>
        <a className="underline" href={meta.url} target="_blank" rel="noreferrer">
          Open the official stream in a new tab
        </a>
      </div>
    );
  }

  return (
    <div className="w-full aspect-video bg-black">
      <iframe
        title={meta.title ?? 'Embedded stream'}
        src={src}
        allow="autoplay; fullscreen; picture-in-picture"
        className="w-full h-full"
      />
    </div>
  );
}


