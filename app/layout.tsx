import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Three Two • Live',
  description: 'Beautiful multi-sport streaming hub. Official sources only.',
  metadataBase: new URL('http://localhost:3000'),
  icons: {
    icon: '/three-two-logo.svg',
    shortcut: '/three-two-logo.svg',
    apple: '/three-two-logo.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Google Fonts - Inter */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        {/* Google tag (gtag.js) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-8ZS3H6BW5N" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-8ZS3H6BW5N');
            `,
          }}
        />
        {/* Google AdSense */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7225325372988376"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-screen antialiased flex flex-col">
        <header className="relative border-b border-white/10 hero-glow backdrop-blur-sm bg-black/40">
          {/* Subtle animated background gradient */}
          <div className="absolute inset-0 opacity-30 pointer-events-none overflow-hidden">
            <div className="absolute top-0 left-0 w-64 h-64 bg-[rgb(var(--brand-yellow))] rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" 
                 style={{ animation: 'pulse 6s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
          </div>
          
          <div className="container-narrow relative z-10 flex items-center gap-3 md:gap-4 py-4 md:py-5">
            {/* Logo with enhanced styling */}
            <a href="/" className="flex items-center gap-3 md:gap-4 group">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src="/three-two-logo.svg" 
                  alt="Three Two logo" 
                  className="w-10 h-10 md:w-12 md:h-12 transition-transform duration-300 group-hover:scale-110 drop-shadow-[0_0_8px_rgba(255,212,0,0.4)]" 
                />
                {/* Glow effect on hover */}
                <div className="absolute inset-0 w-10 h-10 md:w-12 md:h-12 bg-[rgb(var(--brand-yellow))] rounded-lg blur-md opacity-0 group-hover:opacity-30 transition-opacity duration-300 -z-10" />
              </div>
              
              {/* Brand name with enhanced styling */}
              <div className="flex items-center gap-2 md:gap-3">
                <span
                  className="text-xl md:text-2xl lg:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-[#FFD400] via-[#FFF2A6] to-[#FFD400] bg-clip-text text-transparent bg-[length:200%_auto]"
                  style={{ 
                    textShadow: '0 0 20px rgba(255,212,0,0.3)',
                    filter: 'drop-shadow(0 2px 4px rgba(255,212,0,0.2))',
                    animation: 'shimmer-gradient 3s linear infinite'
                  }}
                >
                  Three Two
                </span>
                <span className="relative px-2.5 py-1 md:px-3 md:py-1.5 rounded-full bg-gradient-to-r from-[rgb(var(--brand-yellow))] to-[#FFE066] text-black text-xs md:text-sm font-bold shadow-lg shadow-[rgb(var(--brand-yellow))]/30 hover:shadow-[rgb(var(--brand-yellow))]/50 transition-all duration-300 hover:scale-105">
                  <span className="relative z-10">Live</span>
                  {/* Pulsing animation for Live badge */}
                  <span className="absolute inset-0 rounded-full bg-[rgb(var(--brand-yellow))] animate-ping opacity-20" />
                </span>
              </div>
            </a>
            
            {/* Navigation and controls */}
            <div className="ml-auto flex items-center gap-3 md:gap-6">
              <nav className="hidden md:flex items-center gap-1 md:gap-2">
                <a 
                  href="/" 
                  className="relative px-4 py-2 rounded-lg text-sm font-medium text-white/70 hover:text-white transition-all duration-200 hover:bg-white/5 group"
                >
                  Live
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[rgb(var(--brand-yellow))] scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left" />
                </a>
                <a 
                  href="/predictions" 
                  className="relative px-4 py-2 rounded-lg text-sm font-medium text-white/70 hover:text-white transition-all duration-200 hover:bg-white/5 group"
                >
                  Predictions
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[rgb(var(--brand-yellow))] scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left" />
                </a>
              </nav>
              
              {/* Language selector with enhanced styling */}
              <button className="px-3 py-1.5 md:px-4 md:py-2 rounded-lg bg-white/5 border border-white/10 text-xs md:text-sm font-medium text-white/80 hover:bg-white/10 hover:border-white/20 hover:text-white transition-all duration-200 backdrop-blur-sm shadow-sm">
                EN
              </button>
            </div>
          </div>
        </header>
        <main className="container-narrow py-6 flex-1">{children}</main>
        <footer className="border-t border-white/10 mt-auto">
          <div className="container-narrow py-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/three-two-logo.svg" alt="Three Two logo" className="w-8 h-8 opacity-80" />
                <span className="text-white/60 text-sm">
                  Copyright © 2025 Three Two Live
                </span>
              </div>
              <div className="text-white/60 text-xs flex items-center gap-4">
                <span className="text-white/40">Your ultimate sports streaming destination</span>
                <a href="/legal" className="underline hover:text-white">Legal Notice</a>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}


