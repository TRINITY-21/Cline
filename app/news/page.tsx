"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';

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

export default function NewsPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [sources, setSources] = useState<string[]>([]);
  const [source, setSource] = useState<string>('');
  const [filtersOpen, setFiltersOpen] = useState<boolean>(true);
  const [sourceDropdownOpen, setSourceDropdownOpen] = useState<boolean>(false);

  // Load sources
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/news`, { cache: 'no-store' });
        const json = await res.json();
        const list: string[] = Array.isArray(json?.sources) ? json.sources : [];
        if (!cancelled) {
          setSources(list);
          if (list.length && !source) setSource(list[0]);
        }
      } catch {
        if (!cancelled) setSources([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Load articles for selected source
  useEffect(() => {
    if (!source) return;
    let cancelled = false;
    const controller = new AbortController();
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/news?source=${encodeURIComponent(source)}`, { cache: 'no-store', signal: controller.signal });
        const json = await res.json();
        if (!cancelled) setArticles(Array.isArray(json?.articles) ? json.articles : []);
      } catch {
        if (!cancelled) setArticles([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; controller.abort(); };
  }, [source]);

  return (
    <div className="space-y-6 sm:space-y-8 md:space-y-10">
      {/* Header */}
      <section className="surface p-3 sm:p-5 md:p-6 hero-glow relative overflow-hidden group min-h-[160px] md:min-h-[200px]">
        <div className="absolute inset-0 opacity-10 group-hover:opacity-15 transition-opacity duration-700">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[rgb(var(--brand-yellow))] rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500 rounded-full blur-3xl animate-pulse delay-300" />
        </div>
        <div className="relative z-10 space-y-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/60">Football &amp; Sports</div>
            <h2 className="text-2xl md:text-3xl font-extrabold mt-1">
              Latest <span className="text-[rgb(var(--brand-yellow))]">News</span>
            </h2>
            <p className="text-white/70 mt-2 max-w-prose">Curated from trusted outlets via our sources list.</p>
          </div>

          {/* Mobile/Tablet filters panel */}
          <div className="lg:hidden relative z-10">
            <div className="bg-white/5 border border-white/10 rounded-xl overflow-visible">
              <button
                onClick={() => setFiltersOpen(!filtersOpen)}
                className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/10 transition-colors touch-manipulation rounded-t-xl"
              >
                <span className="text-white font-medium text-sm">Filters</span>
                <svg
                  className={`w-4 h-4 text-white/60 transition-transform duration-200 ${filtersOpen ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {filtersOpen && (
                <div className="px-4 pb-4 pt-2 space-y-3">
                  <div className="relative" data-dropdown>
                    <button
                      onClick={() => setSourceDropdownOpen(!sourceDropdownOpen)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors touch-manipulation"
                    >
                      <span className="text-white text-sm font-medium">{source || 'Select Source'}</span>
                      <svg className={`w-4 h-4 text-white/60 transition-transform duration-200 ${sourceDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {sourceDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-[rgb(15,15,20)] border border-white/10 rounded-lg shadow-xl max-h-64 overflow-y-auto z-20">
                        {sources.map(s => (
                          <button
                            key={s}
                            onClick={() => { setSource(s); setSourceDropdownOpen(false); }}
                            className={(s === source ? 'bg-[rgb(var(--brand-yellow))]/10 text-[rgb(var(--brand-yellow))]' : 'text-white/80') + ' w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors touch-manipulation border-b border-white/5 last:border-b-0'}
                          >
                            <span className="font-medium text-sm">{s}</span>
                            {s === source && (
                              <svg className="w-4 h-4 text-[rgb(var(--brand-yellow))]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Desktop chip row */}
          <div className="hidden md:block">
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar scroll-x-only min-w-0 min-h-[40px] sm:min-h-[44px]">
              {sources.map(s => (
                <button
                  key={s}
                  onClick={() => setSource(s)}
                  className={
                    "px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-[11px] sm:text-xs md:text-sm transition-all duration-200 touch-manipulation min-h-[36px] sm:min-h-[40px] whitespace-nowrap flex-shrink-0 " +
                    (source === s
                      ? 'bg-[rgb(var(--brand-yellow))] text-black shadow-lg shadow-[rgb(var(--brand-yellow))]/20'
                      : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20')
                  }
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="skeleton h-56 rounded-xl" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && articles.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="surface p-12 text-center col-span-1 md:col-span-2 lg:col-span-3">
            <div className="text-6xl mb-4">🗞️</div>
            <div className="text-white/80 text-lg font-semibold mb-2">No sports news found</div>
            <div className="text-white/60">Try a different source</div>
          </div>
        </div>
      )}

      {/* Grid */}
      {!loading && articles.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {articles.map(article => (
            <Link key={article.id} href={`/news/${article.id}`} className="group surface overflow-hidden rounded-xl border border-white/10 hover:border-[rgb(var(--brand-yellow))]/30 transition-all hover:-translate-y-1">
              <div className="relative aspect-video bg-white/5 rounded-t-xl overflow-hidden">
                {article.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={article.image} alt="" loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-4xl opacity-40">📰</div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-black/10" />
                <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3 flex items-center justify-between gap-2 text-[10px] sm:text-xs">
                  <span className="px-2 py-0.5 sm:py-1 rounded bg-black/40 backdrop-blur-sm border border-white/15 text-white/80 font-semibold truncate max-w-[45%]">{article.source}</span>
                  <span className="text-white/70 font-mono truncate max-w-[55%]">
                    <span className="sm:hidden">{new Date(article.publishedAt).toLocaleDateString()}</span>
                    <span className="hidden sm:inline">{new Date(article.publishedAt).toLocaleString()}</span>
                  </span>
                </div>
              </div>
              <div className="p-4 space-y-2">
                <h3 className="text-white font-bold leading-snug group-hover:text-[rgb(var(--brand-yellow))] transition-colors line-clamp-2 text-sm sm:text-base">{article.title}</h3>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Source credit */}
      <div className="text-xs text-white/50">Sources via cline-news</div>
    </div>
  );
}


