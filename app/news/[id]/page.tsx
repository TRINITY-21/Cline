import BackToNews from 'app/news/BackToNews';
import { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';

type NewsArticle = {
  id: string;
  source: string;
  author?: string;
  title: string;
  description?: string;
  url: string;
  image: string;
  publishedAt: string;
  content?: string;
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// No search; sources are provided by upstream API

function getOriginFromHeaders(): string | null {
  try {
    const h = headers();
    const host = h.get('x-forwarded-host') || h.get('host');
    const proto = h.get('x-forwarded-proto') || 'http';
    if (!host) return null;
    return `${proto}://${host}`;
  } catch {
    return null;
  }
}

async function fetchAllArticles(): Promise<NewsArticle[]> {
  try {
    const origin = getOriginFromHeaders() || process.env.NEXT_PUBLIC_BASE_URL || '';
    if (!origin) return [];
    // Get sources
    const resSources = await fetch(`${origin}/api/news`, { cache: 'no-store' });
    if (!resSources.ok) return [];
    const jsonSources = await resSources.json();
    const sources: string[] = Array.isArray(jsonSources?.sources) ? jsonSources.sources : [];
    if (!sources.length) return [];
    // Fetch each source in parallel (small list)
    const lists = await Promise.all(
      sources.map(async (s) => {
        try {
          const r = await fetch(`${origin}/api/news?source=${encodeURIComponent(s)}`, { cache: 'no-store' });
          if (!r.ok) return [] as NewsArticle[];
          const j = await r.json();
          return (Array.isArray(j?.articles) ? j.articles : []) as NewsArticle[];
        } catch {
          return [] as NewsArticle[];
        }
      })
    );
    return lists.flat();
  } catch {
    return [];
  }
}

async function findArticle(id: string): Promise<NewsArticle | null> {
  const all = await fetchAllArticles();
  const once = decodeURIComponent(id);
  let decoded = once;
  try { decoded = decodeURIComponent(once); } catch {}
  return (
    all.find(a => a.id === id || a.id === once || a.id === decoded) ||
    all.find(a => a.url === decoded) || null
  );
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const once = decodeURIComponent(id);
  let decoded = once;
  try { decoded = decodeURIComponent(once); } catch {}
  const list = await fetchAllArticles();
  const article = list.find(a => a.id === id || a.id === once || a.id === decoded) || list.find(a => a.url === decoded) || null;
  if (!article) {
    return { title: 'News Not Found' };
  }
  return {
    title: `${article.title} - ${article.source}`,
    description: article.description || article.content || '',
  };
}

export default async function NewsDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const decoded = decodeURIComponent(id);
  const list = await fetchAllArticles();
  const article = list.find(a => a.id === id) || list.find(a => a.url === decoded) || null;

  // Article not found - silently handle
  if (!article) {
    // Article not found
  }

  if (!article) {
    return (
      <div className="space-y-4">
        {/* Client logger with null to indicate failure */}
        <NewsConsoleLogger article={null} />
        <Link href="/news" className="text-sm text-white/60 hover:text-white underline inline-flex items-center gap-2">
          <span className="flex items-center justify-center leading-none">←</span>
          <span className="leading-normal">Back to News</span>
        </Link>
        <div className="surface p-8 text-center">
          <h1 className="text-2xl font-bold mb-2">News Not Found</h1>
          <p className="text-white/60">The article you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Client logger to show content in browser console */}
      <NewsConsoleLogger article={article} />
      <BackToNews />

      <section className="surface p-5 md:p-6 hero-glow relative overflow-hidden group">
        <div className="absolute inset-0 opacity-10 group-hover:opacity-15 transition-opacity duration-700">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[rgb(var(--brand-yellow))] rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500 rounded-full blur-3xl animate-pulse delay-300" />
        </div>
        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-2 text-[11px] sm:text-xs">
            <span className="px-2 py-1 rounded bg-white/10 border border-white/15 text-white/80 font-semibold truncate max-w-[50%]">{article.source}</span>
            <span className="text-white/60 font-mono truncate max-w-[50%]">
              {new Date(article.publishedAt).toLocaleDateString()}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold">{article.title}</h1>
          {article.description && <p className="text-white/70">{article.description}</p>}
        </div>
      </section>

      {article.image && (
        <div className="rounded-xl overflow-hidden border border-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={article.image} alt="" className="w-full h-auto object-cover" />
        </div>
      )}

      <article className="surface p-6 leading-relaxed text-white/90">
        {article.description && (
          <p className="text-white/80 mb-4">{article.description}</p>
        )}
        {article.url && (
          <a href={article.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-[rgb(var(--brand-yellow))] text-black font-semibold rounded-lg hover:bg-[rgb(var(--brand-yellow))]/90 transition-colors">
            Read on source ↗
          </a>
        )}
      </article>
    </div>
  );
}

// Client-side component (removed console logging for production)
function NewsConsoleLogger({ article }: { article: NewsArticle | null }) {
  // Component removed - no longer needed
  return null as any;
}

// Simple formatter: paragraphs, bullet lists, and basic URL linking
function renderFormattedContent(raw?: string) {
  const text = (raw || '').trim();
  if (!text) return <p>Full content not provided by the source.</p>;

  // Remove common boilerplate lines from some publishers
  const scrub = (s: string) => s
    .replace(/Please use Chrome browser[^\n]+/gi, '')
    .replace(/Sign up[^\n]+/gi, '')
    .replace(/Subscribe[^\n]+/gi, '')
    .replace(/Play for free[^\n]+/gi, '')
    .replace(/\s+\n/g, '\n')
    .trim();

  const cleaned = scrub(text);

  // Split into blocks by blank lines
  const blocks = cleaned.split(/\n\s*\n/).filter(Boolean);

  const autoLink = (s: string) => {
    return s.replace(/(https?:\/\/[\w\-._~:/?#[\]@!$&'()*+,;=%]+)/g, (m) => `<a href="${m}" target="_blank" rel="noopener noreferrer">${m}</a>`);
  };

  const renderBlock = (block: string, idx: number) => {
    const lines = block.split(/\n/);
    const isList = lines.every(l => /^\s*(\-|\*|•)\s+/.test(l));
    if (isList) {
      return (
        <ul key={idx}>
          {lines.map((l, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: autoLink(l.replace(/^\s*(\-|\*|•)\s+/, '')) }} />
          ))}
        </ul>
      );
    }
    if (/^\s*>\s+/.test(block)) {
      return <blockquote key={idx} dangerouslySetInnerHTML={{ __html: autoLink(block.replace(/^\s*>\s+/, '')) }} />;
    }
    return <p key={idx} dangerouslySetInnerHTML={{ __html: autoLink(block) }} />;
  };

  return <>{blocks.map(renderBlock)}</>;
}


