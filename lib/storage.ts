import { initFirebaseAdmin } from '@/lib/firebase';
import fs from 'fs';
import path from 'path';

export type VideoSrcStatus = 'pending' | 'ready' | 'error';

export interface VideoSrcRecord {
  matchId: string;
  kickoff?: string | null; // ISO string if known
  videoSrc?: string;
  source?: string;
  status: VideoSrcStatus;
  errorMessage?: string;
  expiresAt?: string | null; // ISO string
  updatedAt: string; // ISO
}

export interface MatchItem {
  id: string;
  sport?: string | null;
  league?: string | null;
  home?: { name: string };
  away?: { name: string };
  status?: string;
  timeLabel?: string | null;
  startTime?: string | null; // ISO string if available
  videoSrc?: string;
}

export interface StorageAdapter {
  get(matchId: string): Promise<VideoSrcRecord | null>;
  set(matchId: string, record: Omit<VideoSrcRecord, 'updatedAt'>): Promise<void>;
  upsert(matchId: string, update: Partial<VideoSrcRecord> & { matchId: string }): Promise<void>;
  list(): Promise<VideoSrcRecord[]>;
}

// JSON adapter (local default)
class JsonStorageAdapter implements StorageAdapter {
  private filePath: string;

  constructor(filePath?: string) {
    this.filePath = filePath ?? path.join(process.cwd(), 'data', 'videosrc.json');
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(this.filePath)) fs.writeFileSync(this.filePath, '[]', 'utf8');
  }

  private readAll(): VideoSrcRecord[] {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf8');
      return JSON.parse(raw) as VideoSrcRecord[];
    } catch {
      return [];
    }
  }

  private writeAll(items: VideoSrcRecord[]): void {
    fs.writeFileSync(this.filePath, JSON.stringify(items, null, 2), 'utf8');
  }

  async get(matchId: string): Promise<VideoSrcRecord | null> {
    const items = this.readAll();
    return items.find(i => i.matchId === matchId) ?? null;
  }

  async set(matchId: string, record: Omit<VideoSrcRecord, 'updatedAt'>): Promise<void> {
    const items = this.readAll();
    const now = new Date().toISOString();
    const idx = items.findIndex(i => i.matchId === matchId);
    const finalRec: VideoSrcRecord = { ...record, matchId, updatedAt: now };
    if (idx >= 0) items[idx] = finalRec; else items.push(finalRec);
    this.writeAll(items);
  }

  async upsert(matchId: string, update: Partial<VideoSrcRecord> & { matchId: string }): Promise<void> {
    const existing = await this.get(matchId);
    const merged: Omit<VideoSrcRecord, 'updatedAt'> = {
      kickoff: existing?.kickoff ?? null,
      videoSrc: existing?.videoSrc,
      source: existing?.source,
      status: existing?.status ?? 'pending',
      errorMessage: undefined,
      expiresAt: existing?.expiresAt ?? null,
      ...update,
      matchId,
    };
    await this.set(matchId, merged);
  }

  async list(): Promise<VideoSrcRecord[]> {
    return this.readAll();
  }
}

// Firestore adapter stub (upgrade path)
class FirestoreStorageAdapter implements StorageAdapter {
  private collectionName = process.env.NEXT_PUBLIC_VIDEOSRC_COLLECTION || 'videosrc';
  private db: any;

  constructor() {
    // Reuse the same admin initialization and credentials used across the app
    const admin = initFirebaseAdmin();
    this.db = admin.firestore();
  }

  private col() {
    return this.db.collection(this.collectionName);
  }

  async get(matchId: string): Promise<VideoSrcRecord | null> {
    const snap = await this.col().doc(matchId).get();
    if (!snap.exists) return null;
    const data = snap.data() || {};
    return {
      matchId,
      kickoff: data.kickoff ?? null,
      videoSrc: data.videoSrc,
      source: data.source,
      status: data.status || 'pending',
      errorMessage: data.errorMessage,
      expiresAt: data.expiresAt ?? null,
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
  }

  async set(matchId: string, record: Omit<VideoSrcRecord, 'updatedAt'>): Promise<void> {
    const now = new Date().toISOString();
    await this.col().doc(matchId).set({ ...record, updatedAt: now }, { merge: false });
  }

  async upsert(matchId: string, update: Partial<VideoSrcRecord> & { matchId: string }): Promise<void> {
    const now = new Date().toISOString();
    const payload: Record<string, any> = { ...update, matchId, updatedAt: now };
    // Remove undefined fields to avoid Firestore errors
    Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);
    await this.col().doc(matchId).set(payload, { merge: true });
  }

  async list(): Promise<VideoSrcRecord[]> {
    const qs = await this.col().limit(2000).get();
    return qs.docs.map((d: any) => {
      const data = d.data() || {};
      return {
        matchId: d.id,
        kickoff: data.kickoff ?? null,
        videoSrc: data.videoSrc,
        source: data.source,
        status: data.status || 'pending',
        errorMessage: data.errorMessage,
        expiresAt: data.expiresAt ?? null,
        updatedAt: data.updatedAt || new Date().toISOString(),
      } as VideoSrcRecord;
    });
  }
}

export function getStorageAdapter(): StorageAdapter {
  const backend = process.env.NEXT_PUBLIC_VIDEOSRC_STORAGE ?? 'json';
  if (backend === 'firestore') return new FirestoreStorageAdapter();
  return new JsonStorageAdapter();
}

// Utilities to read matches and find kickoffs in a window
const UNIFIED_MATCHES_PATH = path.join(process.cwd(), 'data', 'unified_matches.json');

export async function readUnifiedMatches(): Promise<MatchItem[]> {
  try {
    const raw = fs.readFileSync(UNIFIED_MATCHES_PATH, 'utf8');
    return JSON.parse(raw) as MatchItem[];
  } catch {
    return [];
  }
}

function parseKickoffIso(match: MatchItem): string | null {
  // Prefer explicit startTime if present
  if (match.startTime) return match.startTime;
  // Optionally derive from timeLabel if needed; for now, return null
  return null;
}

export async function findKickoffsInWindow(startIso: string, endIso: string): Promise<MatchItem[]> {
  const matches = await readUnifiedMatches();
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  return matches.filter(m => {
    const k = parseKickoffIso(m);
    if (!k) return false;
    const t = new Date(k).getTime();
    return t >= start && t <= end;
  });
}

export function isExpired(expiresAt?: string | null): boolean {
  if (!expiresAt) return false;
  return Date.now() >= new Date(expiresAt).getTime();
}

export function defaultTtlMsForSource(source?: string): number {
  // Basic defaults; tune per provider later
  if (!source) return 60 * 60 * 1000; // 60m
  return 60 * 60 * 1000;
}


