/**
 * Social Sharing Utilities
 * Beautiful share functionality for matches
 */

export interface ShareData {
  title: string;
  text: string;
  url: string;
  team1?: string;
  team2?: string;
  league?: string;
  time?: string;
  isLive?: boolean;
}

/**
 * Check if Web Share API is supported
 */
export function isWebShareSupported(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  return 'share' in navigator;
}

/**
 * Share using Web Share API (native sharing)
 */
export async function shareViaWebShare(data: ShareData): Promise<boolean> {
  if (!isWebShareSupported()) {
    return false;
  }

  try {
    await navigator.share({
      title: data.title,
      text: data.text,
      url: data.url,
    });
    return true;
  } catch (error: any) {
    // User cancelled or error occurred
    if (error.name === 'AbortError') {
      return false; // User cancelled
    }
    console.error('Web Share error:', error);
    return false;
  }
}

/**
 * Generate share URL for WhatsApp
 */
export function getWhatsAppShareUrl(data: ShareData): string {
  const message = encodeURIComponent(`${data.text}\n${data.url}`);
  return `https://wa.me/?text=${message}`;
}

/**
 * Generate share URL for Telegram
 */
export function getTelegramShareUrl(data: ShareData): string {
  const message = encodeURIComponent(`${data.text}\n${data.url}`);
  return `https://t.me/share/url?url=${encodeURIComponent(data.url)}&text=${message}`;
}

/**
 * Generate share URL for Twitter/X
 */
export function getTwitterShareUrl(data: ShareData): string {
  const text = encodeURIComponent(data.text);
  const url = encodeURIComponent(data.url);
  return `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
}

/**
 * Generate share URL for Facebook
 */
export function getFacebookShareUrl(data: ShareData): string {
  const url = encodeURIComponent(data.url);
  return `https://www.facebook.com/sharer/sharer.php?u=${url}`;
}

/**
 * Generate share URL for Copy Link
 */
export function copyToClipboard(text: string): Promise<boolean> {
  if (typeof window === 'undefined' || !navigator.clipboard) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return Promise.resolve(true);
    } catch (err) {
      document.body.removeChild(textArea);
      return Promise.resolve(false);
    }
  }

  return navigator.clipboard.writeText(text).then(
    () => true,
    () => false
  );
}

/**
 * Generate share URL with match data
 */
export function generateShareUrl(data: ShareData, matchId?: string): string {
  if (typeof window === 'undefined') return '';
  
  const baseUrl = window.location.origin;
  const params = new URLSearchParams({
    home: data.team1 || '',
    away: data.team2 || '',
    league: data.league || '',
    time: data.time || '',
    live: data.isLive ? 'true' : 'false',
    sport: 'Football', // Default, can be enhanced
  });
  
  // Use matchId if provided, otherwise generate one
  const shareMatchId = matchId || `${data.team1}-vs-${data.team2}`.toLowerCase().replace(/\s+/g, '-');
  return `${baseUrl}/share/${encodeURIComponent(shareMatchId)}?${params.toString()}`;
}

/**
 * Generate beautiful share text
 */
export function generateShareText(data: ShareData): string {
  const shareUrl = generateShareUrl(data);
  
  if (data.isLive) {
    return `🔴 LIVE NOW: ${data.team1} vs ${data.team2}${data.league ? ` • ${data.league}` : ''}\n\n⚽ Watch the match live on Three Two Live!\n${shareUrl}`;
  } else if (data.time) {
    return `⚽ ${data.team1} vs ${data.team2}${data.league ? ` • ${data.league}` : ''}\n\n⏰ Match starts ${data.time}\n\n🔥 Watch live on Three Two Live!\n${shareUrl}`;
  } else {
    return `⚽ ${data.team1} vs ${data.team2}${data.league ? ` • ${data.league}` : ''}\n\n🔥 Watch live on Three Two Live!\n${shareUrl}`;
  }
}

/**
 * Generate share title
 */
export function generateShareTitle(data: ShareData): string {
  if (data.isLive) {
    return `🔴 LIVE: ${data.team1} vs ${data.team2}`;
  }
  return `${data.team1} vs ${data.team2}${data.league ? ` • ${data.league}` : ''}`;
}

