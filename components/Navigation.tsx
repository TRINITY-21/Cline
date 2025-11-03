"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export default function Navigation() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const menuDropdownRef = useRef<HTMLDivElement>(null);
  
  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname?.startsWith(path);
  };

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  // Close menu when clicking outside or when route changes
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-mobile-menu]')) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMobileMenuOpen]);

  // Close menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden lg:flex items-center gap-1 lg:gap-2">
        <Link 
          href="/" 
          className={`relative px-3 md:px-4 lg:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-200 group touch-manipulation ${
            isActive('/')
              ? 'bg-[rgb(var(--brand-yellow))] text-black shadow-lg shadow-[rgb(var(--brand-yellow))]/30'
              : 'text-white/70 hover:text-white hover:bg-white/5'
          }`}
        >
          Live
          {!isActive('/') && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[rgb(var(--brand-yellow))] scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left" />
          )}
        </Link>
        <Link 
          href="/predictions" 
          className={`relative px-3 md:px-4 lg:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-200 group touch-manipulation ${
            isActive('/predictions')
              ? 'bg-[rgb(var(--brand-yellow))] text-black shadow-lg shadow-[rgb(var(--brand-yellow))]/30'
              : 'text-white/70 hover:text-white hover:bg-white/5'
          }`}
        >
          Predictions
          {!isActive('/predictions') && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[rgb(var(--brand-yellow))] scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left" />
          )}
        </Link>
        <Link 
          href="/my-teams" 
          className={`relative px-3 md:px-4 lg:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-200 group touch-manipulation ${
            isActive('/my-teams')
              ? 'bg-[rgb(var(--brand-yellow))] text-black shadow-lg shadow-[rgb(var(--brand-yellow))]/30'
              : 'text-white/70 hover:text-white hover:bg-white/5'
          }`}
        >
          My Teams
          {!isActive('/my-teams') && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[rgb(var(--brand-yellow))] scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left" />
          )}
        </Link>
      </nav>

      {/* Mobile Hamburger Button */}
      <div className="lg:hidden relative z-[1000]" data-mobile-menu>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-lg bg-black/40 hover:bg-black/60 active:bg-black/80 border border-white/20 transition-all duration-200 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Toggle menu"
        >
          <div className="w-5 h-5 flex flex-col justify-center gap-1.5">
            <span
              className={`block h-0.5 w-full bg-white opacity-100 transition-all duration-300 ${
                isMobileMenuOpen ? 'rotate-45 translate-y-2' : ''
              }`}
            />
            <span
              className={`block h-0.5 w-full bg-white opacity-100 transition-all duration-300 ${
                isMobileMenuOpen ? 'opacity-0' : ''
              }`}
            />
            <span
              className={`block h-0.5 w-full bg-white opacity-100 transition-all duration-300 ${
                isMobileMenuOpen ? '-rotate-45 -translate-y-2' : ''
              }`}
            />
          </div>
        </button>

        {/* Mobile Menu Dropdown - Matching TodayMatches filter style */}
        {isMobileMenuOpen && (
          <div 
            ref={menuDropdownRef}
            className="absolute top-full right-0 mt-2 w-[280px] sm:w-[320px] bg-[rgb(15,15,20)] border border-white/10 rounded-xl shadow-xl z-[1001] overflow-hidden"
          >
            {/* Menu Links */}
            <div className="p-2">
              <Link
                href="/"
                onClick={closeMobileMenu}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 touch-manipulation mb-1 ${
                  isActive('/')
                    ? 'bg-[rgb(var(--brand-yellow))]/10 text-[rgb(var(--brand-yellow))] border border-[rgb(var(--brand-yellow))]/30'
                    : 'text-white/80 hover:bg-white/5 border border-transparent hover:border-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>Live</span>
                </div>
                {isActive('/') && (
                  <svg className="w-4 h-4 text-[rgb(var(--brand-yellow))] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </Link>
              <Link
                href="/predictions"
                onClick={closeMobileMenu}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 touch-manipulation mb-1 ${
                  isActive('/predictions')
                    ? 'bg-[rgb(var(--brand-yellow))]/10 text-[rgb(var(--brand-yellow))] border border-[rgb(var(--brand-yellow))]/30'
                    : 'text-white/80 hover:bg-white/5 border border-transparent hover:border-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Predictions</span>
                </div>
                {isActive('/predictions') && (
                  <svg className="w-4 h-4 text-[rgb(var(--brand-yellow))] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </Link>
              <Link
                href="/my-teams"
                onClick={closeMobileMenu}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 touch-manipulation ${
                  isActive('/my-teams')
                    ? 'bg-[rgb(var(--brand-yellow))]/10 text-[rgb(var(--brand-yellow))] border border-[rgb(var(--brand-yellow))]/30'
                    : 'text-white/80 hover:bg-white/5 border border-transparent hover:border-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <span>My Teams</span>
                </div>
                {isActive('/my-teams') && (
                  <svg className="w-4 h-4 text-[rgb(var(--brand-yellow))] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

