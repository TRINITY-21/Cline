import { readFileSync } from 'fs';
import { NextResponse } from 'next/server';
import path from 'path';

async function getAllMatches(): Promise<any[]> {
  // Read from enriched JSON file
  const filePath = path.join(process.cwd(), 'data', 'scraped-highlights-enriched.json');
  
  try {
    const fileContent = readFileSync(filePath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (fileError) {
    console.error('Error reading scraped-highlights-enriched.json:', fileError);
    // Fallback to basic file if enriched doesn't exist
    const fallbackPath = path.join(process.cwd(), 'data', 'scraped-highlights.json');
    try {
      const fileContent = readFileSync(fallbackPath, 'utf-8');
      return JSON.parse(fileContent);
    } catch (fallbackError) {
      console.error('Error reading scraped-highlights.json:', fallbackError);
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
  } catch (error) {
    console.error('Error fetching match:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

