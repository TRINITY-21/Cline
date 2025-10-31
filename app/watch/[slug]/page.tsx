import EmbedGuard from '@/components/EmbedGuard';
import providers from '@/data/providers.json';
import { fetchPageMetadata } from '@/lib/metadata';
import type { ProviderItem } from '@/lib/types';
import Link from 'next/link';

type Params = { slug: string };

export async function generateStaticParams() {
  const list = providers as ProviderItem[];
  return list.map((p) => ({ slug: p.id }));
}

export const revalidate = 600;

export default async function WatchPage({ params }: { params: Params }) {
  const provider = (providers as ProviderItem[]).find((p) => p.id === params.slug);
  if (!provider) {
    return (
      <div>
        <p className="text-white/70">Provider not found.</p>
        <Link href="/" className="underline">Back</Link>
      </div>
    );
  }
  const meta = await fetchPageMetadata(provider.url);
  return (
    <div className="space-y-4">
      <div>
        <Link href="/" className="text-sm text-white/60 underline">← Back</Link>
        <h2 className="text-xl font-semibold mt-2">{provider.name}</h2>
        <p className="text-white/60 text-sm">{meta.title ?? meta.siteName ?? provider.url}</p>
      </div>
      <EmbedGuard meta={meta} />
    </div>
  );
}


