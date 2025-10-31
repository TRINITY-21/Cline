import { promises as fs } from 'fs';
import { NextResponse } from 'next/server';
import path from 'path';

export const revalidate = 0;

// Always return matches from the local JSON file, regardless of env switches
export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'unified_matches.json');
    const raw = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(raw || '[]');
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to read matches JSON' }, { status: 500 });
  }
}


