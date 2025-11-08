import InstallPrompt from '@/components/InstallPrompt';
import Navigation from '@/components/Navigation';
import NotificationPermission from '@/components/NotificationPermission';
import type { Metadata } from 'next';
import './globals.css';
import ServiceWorkerRegister from './sw-register';

export const metadata: Metadata = {
  title: 'Three Two • Live',
  description: 'Beautiful multi-sport streaming hub. Official sources only.',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL || 
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
    (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` :
    'http://localhost:3000'))
  ),
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
        {/* Google Fonts - Inter + Orbitron for brand */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Orbitron:wght@700;800;900&display=swap" rel="stylesheet" />
        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#FFD400" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Three Two Live" />
        <link rel="apple-touch-icon" href="/three-two-logo.svg" />
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
        <header className="relative border-b border-white/10 backdrop-blur-sm bg-black/40">
          <div className="container-narrow mx-auto relative z-10 flex items-center gap-2 sm:gap-2.5 py-2.5 sm:py-3">
            {/* Logo with enhanced styling */}
            <a href="/" className="flex items-center gap-2 sm:gap-2.5 group flex-shrink-0">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src="/three-two-logo.svg" 
                  alt="Three Two logo" 
                  className="w-7 h-7 sm:w-8 sm:h-8 transition-transform duration-300 group-hover:scale-105" 
                />
              </div>
              
              {/* Brand name with enhanced styling */}
              <div className="flex items-baseline gap-1.5 sm:gap-2">
                <span
                  className="text-base sm:text-lg md:text-xl font-extrabold tracking-tight bg-gradient-to-r from-[#FFD400] via-[#FFF2A6] to-[#FFD400] bg-clip-text text-transparent bg-[length:200%_auto] leading-none"
                  style={{ 
                    fontFamily: '"Orbitron", sans-serif',
                    fontWeight: 900,
                    letterSpacing: '0.05em',
                    textShadow: '0 0 15px rgba(255,212,0,0.25)',
                    filter: 'drop-shadow(0 1px 2px rgba(255,212,0,0.15))',
                    animation: 'shimmer-gradient 3s linear infinite'
                  }}
                >
                  Three Two
                </span>
                <span className="relative px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full bg-gradient-to-r from-[rgb(var(--brand-yellow))] to-[#FFE066] text-black text-[9px] sm:text-[10px] font-bold shadow-lg shadow-[rgb(var(--brand-yellow))]/30 hover:shadow-[rgb(var(--brand-yellow))]/50 transition-all duration-300 leading-none">
                  <span className="relative z-10">Live</span>
                  {/* Pulsing/blinking animation */}
                  <span className="absolute inset-0 rounded-full bg-[rgb(var(--brand-yellow))] animate-ping opacity-20" />
                </span>
              </div>
            </a>
            
            {/* Navigation and controls */}
            <div className="ml-auto flex items-center gap-1.5 sm:gap-2 md:gap-4">
              <Navigation />
              
              {/* Language selector - hidden on mobile */}
              <button className="hidden lg:flex px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-medium text-white/80 hover:bg-white/10 hover:border-white/20 hover:text-white transition-all duration-200">
                EN
              </button>
            </div>
          </div>
        </header>
        <main className="w-full max-w-6xl mx-auto px-3 sm:px-4 md:px-4">
          <div className="py-4 sm:py-5 md:py-6 flex-1">{children}</div>
        </main>
        <InstallPrompt />
        <NotificationPermission />
        <ServiceWorkerRegister />

        <footer className="border-t border-white/10 mt-auto">
          <div className="container-narrow mx-auto py-4 sm:py-5 md:py-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-2 flex-wrap justify-center md:justify-start">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/three-two-logo.svg" alt="Three Two logo" className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 opacity-80" />
                <span className="text-white/60 text-xs sm:text-sm">
                  Copyright © 2025 Three Two Live
                </span>
              </div>
              <div className="text-white/60 text-xs flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center md:text-left">
                <span className="text-white/40 hidden sm:inline">Your ultimate sports streaming destination</span>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}


