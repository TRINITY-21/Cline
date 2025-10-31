import { promises as fs } from 'fs';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';

export const revalidate = 0;

function auth(req: NextRequest): boolean {
  const token = req.headers.get('x-internal-token');
  const expected = process.env.NEXT_PUBLIC_INTERNAL_UPDATE_TOKEN;
  return !!expected && token === expected;
}

function safeIdPart(input?: string): string {
  return String(input || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

const TEAMS_JSON = path.join(process.cwd(), 'data', 'teams.json');
const LOGOS_DIR = path.join(process.cwd(), 'public', 'logos');

async function readTeams(): Promise<any[]> {
  try {
    const raw = await fs.readFile(TEAMS_JSON, 'utf8');
    const data = JSON.parse(raw || '[]');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function writeTeams(list: any[]) {
  await fs.writeFile(TEAMS_JSON, JSON.stringify(list, null, 2), 'utf8');
}

export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const form = await req.formData();
  const name = String(form.get('name') || '').trim();
  const sport = String(form.get('sport') || 'Football');
  const customId = String(form.get('id') || '').trim();
  const file = form.get('logo') as File | null;
  if (!name || !file) {
    return NextResponse.json({ error: 'Missing name or file' }, { status: 400 });
  }

  const arrayBuf = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuf);
  const extGuess = (file.type || '').includes('svg')
    ? 'svg'
    : (file.type || '').includes('png')
    ? 'png'
    : (file.type || '').includes('jpeg') || (file.type || '').includes('jpg')
    ? 'jpg'
    : path.extname(file.name || '').replace('.', '').toLowerCase() || 'png';

  const baseId = safeIdPart(customId || name);
  const filename = `${baseId}.${extGuess}`;
  await fs.mkdir(LOGOS_DIR, { recursive: true });
  const outPath = path.join(LOGOS_DIR, filename);
  await fs.writeFile(outPath, buffer);
  const publicUrl = `/logos/${filename}`;

  const teams = await readTeams();
  const idx = teams.findIndex((t) => safeIdPart(t?.name) === safeIdPart(name));
  const updated = {
    id: baseId,
    sport,
    name,
    logo: publicUrl,
    aliases: Array.isArray(teams[idx]?.aliases) ? teams[idx].aliases : [],
  };
  if (idx >= 0) teams[idx] = { ...teams[idx], ...updated };
  else teams.push(updated);
  await writeTeams(teams);

  return NextResponse.json({ ok: true, saved: updated });
}


