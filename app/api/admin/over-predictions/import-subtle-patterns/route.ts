import { initFirebaseAdmin } from '@/lib/firebase';
import { exec } from 'child_process';
import fs from 'fs/promises';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

function auth(req: NextRequest): boolean {
  const token = req.headers.get('x-internal-token');
  const expected = process.env.NEXT_PUBLIC_INTERNAL_UPDATE_TOKEN;
  return !!expected && token === expected;
}

/**
 * Get date ID from a date string (format: DD-MM-YYYY)
 */
function getDateId(dateStr: string | Date | undefined): string {
  try {
    if (!dateStr) {
      const today = new Date();
      const dd = String(today.getDate()).padStart(2, '0');
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const yyyy = today.getFullYear();
      return `${dd}-${mm}-${yyyy}`;
    }
    
    const date = parseDate(dateStr);
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  } catch {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  }
}

/**
 * Get week ID from a date (format: DD-DD-MM-YYYY)
 */
function getWeekId(dateStr: string | Date | undefined): string {
  let date: Date;
  
  try {
    if (!dateStr) {
      date = new Date();
    } else {
      date = parseDate(dateStr);
    }
  } catch {
    date = new Date();
  }
  
  const dayOfWeek = date.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(date);
  monday.setDate(date.getDate() + mondayOffset);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  const mondayDD = String(monday.getDate()).padStart(2, '0');
  const sundayDD = String(sunday.getDate()).padStart(2, '0');
  const mm = String(monday.getMonth() + 1).padStart(2, '0');
  const yyyy = monday.getFullYear();
  
  return `${mondayDD}-${sundayDD}-${mm}-${yyyy}`;
}

/**
 * Parse date string to Date object
 */
function parseDate(dateStr: string | Date): Date {
  if (dateStr instanceof Date) {
    return dateStr;
  }
  
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    
    // If YYYY-MM-DD format
    if (parts[0].length === 4) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    
    // If DD-MM-YYYY format
    if (parts[2] && parts[2].length === 4) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
  }
  
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return new Date();
  }
  return date;
}

/**
 * Get day of week name
 */
function getDayOfWeek(dateStr: string | Date | undefined): string {
  try {
    if (!dateStr) {
      const today = new Date();
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return days[today.getDay()];
    }
    
    const date = parseDate(dateStr);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  } catch {
    return 'Monday';
  }
}

/**
 * Generate a unique ID for a prediction
 */
function generatePredictionId(home: string, away: string, timeLabel: string): string {
  const h_norm = home.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const a_norm = away.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const time_norm = (timeLabel || '00:00').replace(':', '-');
  return `${h_norm}-vs-${a_norm}-${time_norm}`;
}

/**
 * Transform subtle pattern match to Firebase prediction format
 */
function transformMatchToPrediction(match: any, dateStr: string): any {
  const dateId = getDateId(dateStr);
  const matchDate = parseDate(dateStr);
  
  // Map status: "won" -> "won", "lost" -> "failed", "pending" -> null
  let status: 'won' | 'failed' | null = null;
  if (match.status === 'won') {
    status = 'won';
  } else if (match.status === 'lost') {
    status = 'failed';
  }
  
  return {
    id: generatePredictionId(match.home_team || '', match.away_team || '', match.match_time || ''),
    home: (match.home_team || '').trim(),
    away: (match.away_team || '').trim(),
    league: (match.league || '').trim(),
    timeLabel: (match.match_time || '00:00').trim(),
    matchDate: dateId,
    matchDateISO: matchDate.toISOString(),
    dayOfWeek: getDayOfWeek(dateStr),
    predictedScoreDisplay: null,
    msbs: match.pattern_type || 'Over 2.5 Goals', // BTTS Yes or Over 2.5 Goals
    actualScore: match.match_result || null,
    status: status,
    sport: 'Football',
    // Additional fields from subtle patterns
    pattern_description: match.pattern_description || null,
    bet_odds: match.bet_odds || null,
    confidence: match.confidence || null,
    ms1: match.ms1 || null,
    ms0: match.ms0 || null,
    ms2: match.ms2 || null,
    actual_outcome: match.actual_outcome || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * POST: Run get_subtle_patterns_json.py and import to over_predictions collection
 * Body: { date: "DD-MM-YYYY", type: "predictions" | "results" }
 */
export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  try {
    const body = await req.json().catch(() => ({}));
    const { date, type = 'predictions' } = body;
    
    if (!date) {
      return NextResponse.json({ 
        error: 'Missing required field: date (format: DD-MM-YYYY)' 
      }, { status: 400 });
    }
    
    if (type !== 'predictions' && type !== 'results') {
      return NextResponse.json({ 
        error: 'Invalid type. Must be "predictions" or "results"' 
      }, { status: 400 });
    }
    
    // Validate date format (DD-MM-YYYY)
    const dateRegex = /^\d{2}-\d{2}-\d{4}$/;
    if (!dateRegex.test(date)) {
      return NextResponse.json({ 
        error: 'Invalid date format. Use DD-MM-YYYY (e.g., 08-11-2025)' 
      }, { status: 400 });
    }
    
    // Get script path
    const projectRoot = process.cwd();
    const scriptPath = path.join(projectRoot, 'scripts', 'get_subtle_patterns_json.py');
    
    // Check if script exists
    try {
      await fs.access(scriptPath);
    } catch {
      return NextResponse.json({ 
        error: 'Script not found. Ensure get_subtle_patterns_json.py exists in scripts/ directory' 
      }, { status: 404 });
    }
    
    // Run Python script
    const command = `python3 "${scriptPath}" --date "${date}" --type "${type}"`;
    
    let stdout: string;
    let stderr: string;
    
    try {
      const result = await execAsync(command, {
        cwd: projectRoot,
        timeout: 300000, // 5 minutes timeout
      });
      stdout = result.stdout;
      stderr = result.stderr;
    } catch (error: any) {
      return NextResponse.json({ 
        error: 'Failed to run Python script',
        details: error.message || String(error),
        stderr: error.stderr || '',
      }, { status: 500 });
    }
    
    // Parse JSON output
    let scriptOutput: any;
    try {
      // Extract JSON from stdout (may have stderr mixed in)
      const jsonMatch = stdout.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return NextResponse.json({ 
          error: 'No JSON output from script',
          stdout: stdout.substring(0, 500),
          stderr: stderr.substring(0, 500),
        }, { status: 500 });
      }
      
      scriptOutput = JSON.parse(jsonMatch[0]);
    } catch (parseError: any) {
      return NextResponse.json({ 
        error: 'Failed to parse script output as JSON',
        details: parseError.message || String(parseError),
        stdout: stdout.substring(0, 500),
      }, { status: 500 });
    }
    
    if (!scriptOutput.matches || !Array.isArray(scriptOutput.matches)) {
      return NextResponse.json({ 
        error: 'Invalid script output format. Expected { matches: [...] }',
        output: scriptOutput,
      }, { status: 500 });
    }
    
    if (scriptOutput.matches.length === 0) {
      return NextResponse.json({ 
        message: 'No matches found for the specified date and type',
        date,
        type,
        total_matches: 0,
      });
    }
    
    // Initialize Firebase
    const admin = initFirebaseAdmin();
    const dateId = getDateId(date);
    const weekId = getWeekId(date);
    const dayOfWeek = getDayOfWeek(date);
    
    // Get or create date document
    const weekDoc = admin.firestore().collection('over_predictions').doc(weekId);
    const dayCol = weekDoc.collection(dayOfWeek);
    const dateDoc = dayCol.doc(dateId);
    
    const dateDocSnap = await dateDoc.get();
    const existingData = dateDocSnap.exists ? dateDocSnap.data() : {};
    const existingPredictions = Array.isArray(existingData?.predictions) ? existingData.predictions : [];
    
    // Create a map of existing predictions by ID for deduplication
    const existingMap = new Map<string, number>();
    existingPredictions.forEach((pred: any, index: number) => {
      const key = pred.id || generatePredictionId(pred.home || '', pred.away || '', pred.timeLabel || '');
      existingMap.set(key, index);
    });
    
    const now = new Date().toISOString();
    let imported = 0;
    let updated = 0;
    let skipped = 0;
    
    // Transform and import matches
    for (const match of scriptOutput.matches) {
      const prediction = transformMatchToPrediction(match, date);
      const predId = prediction.id;
      
      const existingIndex = existingMap.get(predId);
      
      if (existingIndex !== undefined) {
        // Update existing prediction
        existingPredictions[existingIndex] = {
          ...prediction,
          createdAt: existingPredictions[existingIndex].createdAt || now,
          updatedAt: now,
        };
        updated++;
      } else {
        // Add new prediction
        existingPredictions.push(prediction);
        existingMap.set(predId, existingPredictions.length - 1);
        imported++;
      }
    }
    
    // Save to Firebase
    await dateDoc.set({
      id: dateId,
      date: dateId,
      weekId: weekId,
      dayOfWeek: dayOfWeek,
      predictions: existingPredictions,
      updatedAt: now,
      createdAt: existingData?.createdAt || now,
    }, { merge: true });
    
    // Create week document if it doesn't exist
    await weekDoc.set({ id: weekId, createdAt: now }, { merge: true });
    
    return NextResponse.json({ 
      ok: true,
      date,
      type,
      total_matches: scriptOutput.matches.length,
      imported,
      updated,
      skipped,
      path: `${weekId}/${dayOfWeek}/${dateId}`,
    });
    
  } catch (err: any) {
    return NextResponse.json({ 
      error: 'Failed to import subtle patterns', 
      details: err?.message || String(err) 
    }, { status: 500 });
  }
}
