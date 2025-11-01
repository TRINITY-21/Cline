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
      <body className="min-h-screen antialiased">
        <header className="border-b border-white/10 hero-glow">
          <div className="container-narrow flex items-center gap-2 py-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/three-two-logo.svg" alt="Three Two logo" className="w-10 h-10 md:w-12 md:h-12" />
            <a href="/" className="flex items-center gap-2 text-xl md:text-2xl font-extrabold tracking-tight hover:opacity-90 transition-opacity">
              <span
                className="bg-gradient-to-r from-[#FFD400] to-[#FFF2A6] bg-clip-text text-transparent"
                style={{ textShadow: '0 0 10px rgba(255,212,0,0.25)' }}
              >
                Three Two
              </span>
              <span className="px-2 py-0.5 md:px-3 md:py-1 rounded-full bg-[rgb(var(--brand-yellow))] text-black text-sm md:text-base font-bold">
                Live
              </span>
            </a>
            <div className="ml-auto flex items-center gap-4">
              <nav className="hidden md:flex items-center gap-4">
                <a href="/" className="text-sm text-white/70 hover:text-white transition-colors">Live</a>
                <a href="/highlight" className="text-sm text-white/70 hover:text-white transition-colors">Highlights</a>
                <a href="/predictions" className="text-sm text-white/70 hover:text-white transition-colors">Predictions</a>
              </nav>
              <button className="pill pill-muted">EN</button>
            </div>
          </div>
        </header>
        <main className="container-narrow py-6">{children}</main>
        <footer className="border-t border-white/10 mt-12">
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


