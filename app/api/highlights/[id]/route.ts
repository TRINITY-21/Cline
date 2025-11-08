import { readFileSync } from 'fs';
import { NextResponse } from 'next/server';
import path from 'path';

interface HighlightMatch {
  id?: string;
  url?: string;
  homeTeam?: string;
  awayTeam?: string;
  [key: string]: unknown;
}

async function getAllMatches(): Promise<HighlightMatch[]> {
  // Read from enriched JSON file
  const filePath = path.join(process.cwd(), 'data', 'scraped-highlights-enriched.json');
  
  try {
    const fileContent = readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(fileContent);
    return Array.isArray(parsed) ? parsed as HighlightMatch[] : [];
  } catch (fileError) {
    // Fallback to basic file if enriched doesn't exist
    const fallbackPath = path.join(process.cwd(), 'data', 'scraped-highlights.json');
    try {
      const fileContent = readFileSync(fallbackPath, 'utf-8');
      const parsed = JSON.parse(fileContent);
      return Array.isArray(parsed) ? parsed as HighlightMatch[] : [];
    } catch (fallbackError) {
      return [];
    }
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const matches = await getAllMatches();
    
    // Try multiple matching strategies
    const match = matches.find(m => 
      m.id === id || 
      m.id === decodeURIComponent(id) ||
      m.id?.includes(id) ||
      m.url?.includes(id) ||
      (m.homeTeam && m.awayTeam && 
       `${m.homeTeam.toLowerCase().replace(/\s+/g, '-')}-vs-${m.awayTeam.toLowerCase().replace(/\s+/g, '-')}`.includes(id.toLowerCase()))
    );
    
    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }
    
    return NextResponse.json({ match });
  } catch (error: unknown) {
    console.error('Error fetching highlight:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

