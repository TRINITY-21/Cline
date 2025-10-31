import type { PageMetadata } from '@/lib/types';
import Link from 'next/link';

export default function StreamCard({
  slug,
  providerName,
  metadata
}: {
  slug: string;
  providerName: string;
  metadata: PageMetadata;
}) {
  return (
    <div className="rounded-lg overflow-hidden bg-white/5 border border-white/10">
      <div className="relative aspect-video bg-white/5">
        {metadata.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={metadata.image} alt={metadata.title ?? providerName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full grid place-items-center text-white/40 text-sm">No preview</div>
        )}
      </div>
      <div className="p-4">
        <div className="text-sm text-white/60">{providerName}</div>
        <div className="text-base font-medium mt-1 line-clamp-2">{metadata.title ?? metadata.siteName ?? providerName}</div>
        <div className="mt-3 flex gap-2">
          <Link href={`/watch/${slug}`} className="px-3 py-1.5 rounded bg-white text-black text-sm font-medium">
            {metadata.canFrame ? 'Watch here' : 'Open official site'}
          </Link>
          {!metadata.canFrame && (
            <a
              href={metadata.url}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded border border-white/20 text-sm"
            >
              Visit source
            </a>
          )}
        </div>
      </div>
    </div>
  );
}


