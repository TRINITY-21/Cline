/**
 * Video optimization utilities for better streaming performance
 */

export interface ConnectionQuality {
  speed: 'fast' | 'medium' | 'slow';
  bandwidth: number; // in Mbps (estimated)
  latency: number; // in ms
}

/**
 * Detect connection quality using Network Information API and fetch timing
 */
export async function detectConnectionQuality(): Promise<ConnectionQuality> {
  // Use Network Information API if available (Chrome/Edge)
  const connection = (navigator as any).connection || 
                     (navigator as any).mozConnection || 
                     (navigator as any).webkitConnection;

  let bandwidth = 10; // Default to 10 Mbps
  let latency = 50; // Default to 50ms
  let speed: 'fast' | 'medium' | 'slow' = 'medium';

  if (connection) {
    // Use effectiveType if available (Chrome 63+)
    if (connection.effectiveType) {
      switch (connection.effectiveType) {
        case '4g':
          speed = 'fast';
          bandwidth = 25;
          latency = 20;
          break;
        case '3g':
          speed = 'medium';
          bandwidth = 5;
          latency = 100;
          break;
        case '2g':
        case 'slow-2g':
          speed = 'slow';
          bandwidth = 1;
          latency = 300;
          break;
        default:
          speed = 'medium';
      }
    }

    // Use downlink if available (more accurate)
    if (connection.downlink) {
      bandwidth = connection.downlink;
      if (bandwidth >= 10) speed = 'fast';
      else if (bandwidth >= 3) speed = 'medium';
      else speed = 'slow';
    }

    if (connection.rtt) {
      latency = connection.rtt;
    }
  } else {
    // Fallback: Measure fetch timing to a small resource
    try {
      const startTime = performance.now();
      await fetch('/api/metadata', { 
        method: 'HEAD',
        cache: 'no-store',
        signal: AbortSignal.timeout(2000)
      });
      const duration = performance.now() - startTime;
      latency = duration;
      
      // Estimate bandwidth based on latency (rough heuristic)
      if (duration < 100) {
        speed = 'fast';
        bandwidth = 25;
      } else if (duration < 300) {
        speed = 'medium';
        bandwidth = 5;
      } else {
        speed = 'slow';
        bandwidth = 1;
      }
    } catch {
      // If fetch fails, use conservative defaults
      speed = 'medium';
      bandwidth = 5;
      latency = 100;
    }
  }

  return { speed, bandwidth, latency };
}

/**
 * Get recommended preload strategy based on connection quality
 */
export function getPreloadStrategy(quality: ConnectionQuality): 'none' | 'metadata' | 'auto' {
  if (quality.speed === 'fast') {
    return 'auto'; // Preload full video on fast connections
  } else if (quality.speed === 'medium') {
    return 'metadata'; // Only preload metadata on medium connections
  }
  return 'none'; // No preload on slow connections
}

/**
 * Monitor video buffer health and return buffer status
 */
export function monitorBufferHealth(video: HTMLVideoElement): {
  isHealthy: boolean;
  bufferLevel: number; // seconds of buffered content
  bufferPercentage: number; // percentage of video buffered
  shouldSwitchSource: boolean;
} {
  const buffered = video.buffered;
  const currentTime = video.currentTime;
  const duration = video.duration || 0;

  let bufferLevel = 0;
  let bufferPercentage = 0;

  if (buffered.length > 0) {
    // Find the buffer range that contains currentTime
    for (let i = 0; i < buffered.length; i++) {
      if (currentTime >= buffered.start(i) && currentTime <= buffered.end(i)) {
        bufferLevel = buffered.end(i) - currentTime;
        break;
      }
    }

    // Calculate total buffered percentage
    let totalBuffered = 0;
    for (let i = 0; i < buffered.length; i++) {
      totalBuffered += buffered.end(i) - buffered.start(i);
    }
    bufferPercentage = duration > 0 ? (totalBuffered / duration) * 100 : 0;
  }

  // Buffer is unhealthy if:
  // - Less than 5 seconds of buffer ahead
  // - Less than 10% of video buffered
  // - Video is stalled
  const isHealthy = bufferLevel >= 5 && bufferPercentage >= 10 && !video.paused && video.readyState >= 3;
  
  // Should switch source if buffer is critically low
  const shouldSwitchSource = bufferLevel < 3 && video.readyState < 3;

  return {
    isHealthy,
    bufferLevel,
    bufferPercentage,
    shouldSwitchSource,
  };
}

/**
 * Preconnect to video domains for faster loading
 */
export function preconnectToVideoDomains(domains: string[]): void {
  if (typeof document === 'undefined') return;

  domains.forEach(domain => {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = `https://${domain}`;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);

    // Also add dns-prefetch as fallback
    const dnsLink = document.createElement('link');
    dnsLink.rel = 'dns-prefetch';
    dnsLink.href = `https://${domain}`;
    document.head.appendChild(dnsLink);
  });
}

/**
 * Extract domain from URL for preconnect
 */
export function extractDomain(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return null;
  }
}

/**
 * Cache video URLs in sessionStorage for faster switching
 */
const CACHE_PREFIX = 'video_url_cache_';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CachedUrl {
  url: string;
  timestamp: number;
}

export function cacheVideoUrl(sourceId: string, url: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const cache: CachedUrl = {
      url,
      timestamp: Date.now(),
    };
    sessionStorage.setItem(`${CACHE_PREFIX}${sourceId}`, JSON.stringify(cache));
  } catch {
    // Ignore storage errors
  }
}

export function getCachedVideoUrl(sourceId: string): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = sessionStorage.getItem(`${CACHE_PREFIX}${sourceId}`);
    if (!cached) return null;
    
    const cache: CachedUrl = JSON.parse(cached);
    const age = Date.now() - cache.timestamp;
    
    if (age > CACHE_TTL) {
      sessionStorage.removeItem(`${CACHE_PREFIX}${sourceId}`);
      return null;
    }
    
    return cache.url;
  } catch {
    return null;
  }
}

/**
 * Clear expired cache entries
 */
export function clearExpiredCache(): void {
  if (typeof window === 'undefined') return;
  
  try {
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        const cached = sessionStorage.getItem(key);
        if (cached) {
          try {
            const cache: CachedUrl = JSON.parse(cached);
            const age = Date.now() - cache.timestamp;
            if (age > CACHE_TTL) {
              sessionStorage.removeItem(key);
            }
          } catch {
            sessionStorage.removeItem(key);
          }
        }
      }
    });
  } catch {
    // Ignore errors
  }
}

