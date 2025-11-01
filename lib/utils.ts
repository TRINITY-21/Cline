export function sanitizeTeamName(raw: string): string {
  const s = (raw || '').trim();
  // Remove trailing (W) marker indicating women's team
  return s.replace(/\s*\(w\)\s*$/i, '').trim();
}

export function firstNameOf(raw: string): string {
  const noMarker = sanitizeTeamName(raw);
  // Drop anything after an opening parenthesis
  const cut = noMarker.split('(')[0];
  // Split on whitespace, hyphen or slash and take the first token that has letters/digits
  const tokens = cut.split(/[\s\-\/]+/).filter(Boolean);
  const first = tokens.find(t => /[A-Za-z0-9]/.test(t)) || (tokens[0] || cut).trim();
  return first.replace(/[^A-Za-z0-9]+/g, '');
}

export function getDisplayName(name: string, maxLength: number = 12): string {
  const first = firstNameOf(name);
  if (first.length <= maxLength) return first;
  return first.slice(0, maxLength);
}

export function extractTimeLabel(timeStr: string): { isLive: boolean; time?: string } {
  const lower = (timeStr || '').toLowerCase();
  if (lower.includes('live now') || lower.includes('live')) {
    return { isLive: true };
  }
  const match = (timeStr || '').match(/\d{1,2}:\d{2}/);
  return { isLive: false, time: match?.[0] };
}

export function getMatchStatus(timeStr: string): 'live' | 'upcoming' | 'ended' {
  const lower = (timeStr || '').toLowerCase();
  if (lower.includes('live')) return 'live';
  if (lower.includes('tomorrow')) return 'upcoming';
  const m = (timeStr || '').match(/(\d{1,2}):(\d{2})/);
  if (m) {
    const hh = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10);
    if (!Number.isNaN(hh) && !Number.isNaN(mm) && hh < 24 && mm < 60) {
      const now = new Date();
      const when = new Date(now);
      when.setHours(hh, mm, 0, 0);
      if (when.getTime() > now.getTime()) return 'upcoming';
      return 'ended';
    }
  }
  return 'upcoming';
}

/**
 * Check if a match time (format like "05:00") has actually passed.
 * This verifies if a match scheduled for a specific time is currently live.
 * Uses the timeLabel directly as the actual match start time (no timezone conversion).
 * Returns true if the current time is past the match time (with a 5-minute buffer).
 */
export function isMatchTimePassed(timeLabel: string, bufferMinutes: number = 5): boolean {
  if (!timeLabel) return false;
  
  // Extract time from label (format: "05:00" or "HH:MM")
  const m = (timeLabel || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!m) {
    // If it contains "live" text, consider it live
    if ((timeLabel || '').toLowerCase().includes('live')) return true;
    return false;
  }
  
  const hh = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  if (Number.isNaN(hh) || Number.isNaN(mm) || hh >= 24 || mm >= 60) return false;
  
  // Use timeLabel directly as the actual match start time (no timezone conversion)
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0);
  
  // Add buffer minutes (matches usually start a bit after the scheduled time)
  const matchWithBuffer = new Date(today.getTime() + bufferMinutes * 60 * 1000);
  
  // Check if current time is past the match time (with buffer)
  return now.getTime() >= matchWithBuffer.getTime();
}

/**
 * Derive a status based on a live window from kickoff until kickoff + windowMinutes.
 * - Returns 'upcoming' if now < kickoff
 * - Returns 'live' if kickoff <= now < kickoff + windowMinutes
 * - Returns 'ended' if now >= kickoff + windowMinutes
 * 
 * Note: The timeLabel is assumed to be in GMT-1 format (HH:MM). Since matches are filtered
 * as "today" using isTodayFromGmtMinus1, we know this match is scheduled for today.
 * We convert GMT-1 time to the user's local timezone for accurate comparison.
 */
export function statusFromLiveWindow(timeLabel: string, windowMinutes: number = 120): 'live' | 'upcoming' | 'ended' {
  const { time } = extractTimeLabel((timeLabel || '').trim());
  if (!time) return 'upcoming';
  const m = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return 'upcoming';
  const hh = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  if (Number.isNaN(hh) || Number.isNaN(mm) || hh >= 24 || mm >= 60) return 'upcoming';
  
  const now = new Date();
  
  // Convert GMT-1 time to local time for comparison
  // GMT-1 means UTC-1, so to get UTC time we add 1 hour
  // Then JavaScript Date automatically converts UTC to local timezone
  const utcYear = now.getUTCFullYear();
  const utcMonth = now.getUTCMonth();
  const utcDate = now.getUTCDate();
  
  // Create UTC date representing GMT-1 time: UTC = GMT-1 + 1 hour
  // When we create a Date from UTC, it will be automatically converted to local timezone
  const utcKickoffMs = Date.UTC(utcYear, utcMonth, utcDate, hh + 1, mm, 0, 0);
  const localKickoff = new Date(utcKickoffMs);
  
  // Compare current local time with kickoff time (also in local timezone)
  // First, check if now is before kickoff (match hasn't started)
  if (now.getTime() < localKickoff.getTime()) {
    return 'upcoming';
  }
  
  // Calculate end time (kickoff + window)
  const end = new Date(localKickoff.getTime() + Math.max(0, windowMinutes) * 60 * 1000);
  
  // If now is before end time, match is live
  if (now.getTime() < end.getTime()) {
    return 'live';
  }
  
  // Otherwise, match has ended
  return 'ended';
}

/**
 * Convert a scraped time label from the source timezone (GMT-1) to the user's local time.
 * - Accepts strings like "3:30", returns localized time like "10:30 AM" per the user's locale.
 * - If the input is invalid or missing, returns the original string.
 * - Does not adjust the date; only converts the clock time from GMT-1 to local.
 */
export function convertGmtMinus1ToLocal(
  timeLabel: string,
  opts?: Intl.DateTimeFormatOptions & { locale?: string }
): string {
  const m = (timeLabel || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return timeLabel || '';
  const hh = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  if (Number.isNaN(hh) || Number.isNaN(mm) || hh >= 24 || mm >= 60) return timeLabel;

  // Build a Date that represents today at HH:MM in GMT-1, then display in the user's local tz
  const now = new Date();
  // Get the current UTC date parts
  const utcYear = now.getUTCFullYear();
  const utcMonth = now.getUTCMonth();
  const utcDate = now.getUTCDate();

  // Create a date that is in UTC corresponding to GMT-1 clock time: UTC = GMT-1 + 1 hour
  const dateUtc = new Date(Date.UTC(utcYear, utcMonth, utcDate, hh + 1, mm, 0, 0));

  const { locale, ...fmtOpts } = opts || {};
  const formatter = new Intl.DateTimeFormat(locale || undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    ...fmtOpts,
  });
  return formatter.format(dateUtc);
}

// Convert a source time label HH:MM to GMT+2 clock (fixed +2 hours)
export function convertToGmtPlus2(
  timeLabel: string,
  opts?: Intl.DateTimeFormatOptions & { locale?: string }
): string {
  const m = (timeLabel || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return timeLabel || '';
  let hh = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  if (Number.isNaN(hh) || Number.isNaN(mm) || hh >= 24 || mm >= 60) return timeLabel;
  hh = (hh + 2) % 24;
  const now = new Date();
  const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0);
  const { locale, ...fmtOpts } = opts || {};
  const formatter = new Intl.DateTimeFormat(locale || undefined, {
    hour: 'numeric', minute: '2-digit', hour12: true, ...fmtOpts,
  });
  return formatter.format(dt);
}

export function isTodayFromGmtMinus1(timeLabel: string): boolean {
  const m = (timeLabel || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return false;
  const hh = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  if (Number.isNaN(hh) || Number.isNaN(mm) || hh >= 24 || mm >= 60) return false;
  const nowLocal = new Date();
  const utcY = nowLocal.getUTCFullYear();
  const utcM = nowLocal.getUTCMonth();
  const utcD = nowLocal.getUTCDate();
  // GMT-1 -> UTC is +1 hour
  const dateUtc = new Date(Date.UTC(utcY, utcM, utcD, hh + 1, mm, 0, 0));
  // Compare local calendar date
  const localFromSource = new Date(dateUtc.getTime());
  return (
    localFromSource.getFullYear() === nowLocal.getFullYear() &&
    localFromSource.getMonth() === nowLocal.getMonth() &&
    localFromSource.getDate() === nowLocal.getDate()
  );
}

export function isTodayFromStartTimeIso(startIso?: string | null): boolean {
  if (!startIso) return false;
  const dt = new Date(startIso);
  if (isNaN(dt.getTime())) return false;
  const now = new Date();
  return (
    dt.getFullYear() === now.getFullYear() &&
    dt.getMonth() === now.getMonth() &&
    dt.getDate() === now.getDate()
  );
}

export function formatLocalTimeFromIso(startIso?: string | null, opts?: Intl.DateTimeFormatOptions & { locale?: string }) {
  if (!startIso) return '';
  const dt = new Date(startIso);
  if (isNaN(dt.getTime())) return '';
  const { locale, ...fmtOpts } = opts || {};
  const formatter = new Intl.DateTimeFormat(locale || undefined, {
    hour: 'numeric', minute: '2-digit', hour12: true, ...fmtOpts,
  });
  return formatter.format(dt);
}

