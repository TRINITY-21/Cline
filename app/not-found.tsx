import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '404 - Page Not Found | Three Two Live',
  description: 'The page you\'re looking for doesn\'t exist. Return to Three Two Live for sports streaming, highlights, and more.',
};

export default function NotFound() {
  return (
    <div className="space-y-6 sm:space-y-8 md:space-y-10 w-full max-w-full overflow-x-hidden box-border">
      <section className="surface p-3 sm:p-5 md:p-6 hero-glow relative overflow-hidden group min-h-[60vh] flex items-center justify-center">
        {/* Animated background gradient */}
        <div className="absolute inset-0 opacity-10 group-hover:opacity-15 transition-opacity duration-700">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[rgb(var(--brand-yellow))] rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        </div>
        
        <div className="relative z-10 text-center max-w-2xl mx-auto px-4">
          {/* 404 Number */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-8xl sm:text-9xl md:text-[12rem] font-extrabold bg-gradient-to-r from-[rgb(var(--brand-yellow))] via-[#FFF2A6] to-[rgb(var(--brand-yellow))] bg-clip-text text-transparent bg-[length:200%_auto] leading-none"
                style={{ 
                  fontFamily: '"Orbitron", sans-serif',
                  fontWeight: 900,
                  animation: 'shimmer-gradient 3s linear infinite'
                }}>
              404
            </h1>
          </div>

          {/* Error Message */}
          <div className="space-y-4 sm:space-y-6 mb-8 sm:mb-10">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white">
              Page <span className="text-[rgb(var(--brand-yellow))]">Not Found</span>
            </h2>
            <p className="text-white/70 text-base sm:text-lg md:text-xl leading-relaxed max-w-lg mx-auto">
              The page you're looking for doesn't exist or has been moved. 
              Let's get you back to the action.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Link
              href="/"
              className="btn btn-primary px-6 sm:px-8 py-3 sm:py-3.5 text-sm sm:text-base font-semibold hover:scale-105 transition-transform shadow-lg shadow-[rgb(var(--brand-yellow))]/20 hover:shadow-[rgb(var(--brand-yellow))]/40 w-full sm:w-auto"
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Go Home
              </span>
            </Link>
            
            <Link
              href="/highlight"
              className="btn btn-ghost px-6 sm:px-8 py-3 sm:py-3.5 text-sm sm:text-base font-semibold hover:bg-white/10 transition-all w-full sm:w-auto"
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.868v4.264a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Watch Highlights
              </span>
            </Link>
          </div>

          {/* Quick Links */}
          <div className="mt-10 sm:mt-12 pt-6 sm:pt-8 border-t border-white/[0.08]">
            
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              <Link
                href="/"
                className="group relative px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg bg-white/[0.02] border border-white/[0.08] backdrop-blur-sm hover:bg-white/[0.05] hover:border-white/[0.15] transition-all duration-200 text-sm sm:text-base font-medium text-white/80 hover:text-white"
              >
                <span className="flex items-center gap-2 sm:gap-2.5">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white/60 group-hover:text-[rgb(var(--brand-yellow))] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>Live Streams</span>
                </span>
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[rgb(var(--brand-yellow))] scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-center rounded-full" />
              </Link>
              
              <Link
                href="/highlight"
                className="group relative px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg bg-white/[0.02] border border-white/[0.08] backdrop-blur-sm hover:bg-white/[0.05] hover:border-white/[0.15] transition-all duration-200 text-sm sm:text-base font-medium text-white/80 hover:text-white"
              >
                <span className="flex items-center gap-2 sm:gap-2.5">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white/60 group-hover:text-[rgb(var(--brand-yellow))] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.868v4.264a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Highlights</span>
                </span>
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[rgb(var(--brand-yellow))] scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-center rounded-full" />
              </Link>
              
              <Link
                href="/news"
                className="group relative px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg bg-white/[0.02] border border-white/[0.08] backdrop-blur-sm hover:bg-white/[0.05] hover:border-white/[0.15] transition-all duration-200 text-sm sm:text-base font-medium text-white/80 hover:text-white"
              >
                <span className="flex items-center gap-2 sm:gap-2.5">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white/60 group-hover:text-[rgb(var(--brand-yellow))] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V7a2 2 0 012-2h10l4 4v9a2 2 0 01-2 2z" />
                  </svg>
                  <span>News</span>
                </span>
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[rgb(var(--brand-yellow))] scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-center rounded-full" />
              </Link>
              
              <Link
                href="/predictions"
                className="group relative px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg bg-white/[0.02] border border-white/[0.08] backdrop-blur-sm hover:bg-white/[0.05] hover:border-white/[0.15] transition-all duration-200 text-sm sm:text-base font-medium text-white/80 hover:text-white"
              >
                <span className="flex items-center gap-2 sm:gap-2.5">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white/60 group-hover:text-[rgb(var(--brand-yellow))] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Predictions</span>
                </span>
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[rgb(var(--brand-yellow))] scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-center rounded-full" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

