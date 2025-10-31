import { initFirebaseAdmin } from '@/lib/firebase';
import { NextRequest, NextResponse } from 'next/server';

function auth(req: NextRequest): boolean {
  const token = req.headers.get('x-internal-token');
  const expected = process.env.NEXT_PUBLIC_INTERNAL_UPDATE_TOKEN;
  return !!expected && token === expected;
}

function norm_team_name(name: string): string {
  return name
    .toLowerCase()
    .replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g')
    .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ı/g, 'i')
    .replace(/İ/g, 'i')
    .replace(/\(w\)$/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function generate_pred_id(home: string, away: string, timeLabel: string): string {
  const h_norm = norm_team_name(home).replace(/ /g, '-');
  const a_norm = norm_team_name(away).replace(/ /g, '-');
  const time_norm = (timeLabel || '00:00').replace(':', '-');
  return `${h_norm}-vs-${a_norm}-${time_norm}`;
}

// POST: Update predictions with match results
export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  try {
    const admin = initFirebaseAdmin();
    const dailyCol = admin.firestore().collection(
      process.env.DAILY_PREDICTIONS_COLLECTION || process.env.NEXT_PUBLIC_DAILY_PREDICTIONS_COLLECTION || 'daily_predictions'
    );
    
    const body = await req.json().catch(() => ({}));
    const results = Array.isArray(body.results) ? body.results : [];
    
    if (results.length === 0) {
      return NextResponse.json({ error: 'No results provided' }, { status: 400 });
    }
    
    console.log(`🔄 Processing ${results.length} match result(s)`);
    
    // Check predictions for the last 7 days (matches might finish on different days)
    const now = new Date();
    const updated_by_date: Record<string, number> = {};
    let totalUpdated = 0;
    const now_iso = new Date().toISOString();
    
    // Check last 7 days for predictions
    for (let daysBack = 0; daysBack < 7; daysBack++) {
      const targetDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
      const gmtPlus3 = new Date(targetDate.getTime() + 3 * 60 * 60 * 1000);
      const dateId = `${gmtPlus3.getFullYear()}-${String(gmtPlus3.getMonth() + 1).padStart(2, '0')}-${String(gmtPlus3.getDate()).padStart(2, '0')}`;
      
      const dateRef = dailyCol.doc(dateId);
      const dateDoc = await dateRef.get();
      
      if (!dateDoc.exists) {
        continue;
      }
      
      const data = dateDoc.data();
      const predictions: any[] = Array.isArray(data?.predictions) ? data.predictions : [];
      
      if (predictions.length === 0) {
        continue;
      }
      
      let dateUpdatedCount = 0;
      
      // Match results to predictions for this date
      for (const result of results) {
        const result_home = result.home?.trim();
        const result_away = result.away?.trim();
        const result_score = result.result || '';
        const result_winner = result.winner || '';
        
        if (!result_home || !result_away || !result_score) {
          continue;
        }
        
        // Try to find matching prediction
        for (let i = 0; i < predictions.length; i++) {
          const pred = predictions[i];
          const pred_home = pred.home?.trim();
          const pred_away = pred.away?.trim();
          
          if (!pred_home || !pred_away) continue;
          
          // Normalize team names for comparison
          const pred_h_norm = norm_team_name(pred_home);
          const pred_a_norm = norm_team_name(pred_away);
          const result_h_norm = norm_team_name(result_home);
          const result_a_norm = norm_team_name(result_away);
          
          // Check if teams match (exact or swapped)
          const teams_match = (pred_h_norm === result_h_norm && pred_a_norm === result_a_norm) ||
                             (pred_h_norm === result_a_norm && pred_a_norm === result_h_norm);
          
          if (teams_match) {
            // Found matching prediction - update with result
            const pred_msbs_winner = (pred.msbsWinner || '').trim().toLowerCase();
            const result_winner_norm = (result_winner || '').trim().toLowerCase();
            
            // Compare predicted winner with actual winner
            let pred_status: 'won' | 'failed' | null = null;
            
            if (pred_msbs_winner && result_winner_norm) {
              // Normalize for comparison (handle variations like "Draw" vs "draw")
              if (pred_msbs_winner === result_winner_norm) {
                pred_status = 'won';
              } else {
                // Check if winner names match (normalized)
                const norm_pred_winner = norm_team_name(pred_msbs_winner);
                const norm_result_winner = norm_team_name(result_winner_norm);
                
                if (norm_pred_winner === norm_result_winner) {
                  pred_status = 'won';
                } else {
                  pred_status = 'failed';
                }
              }
            }
            
            // Only update if status changed or result is new
            const hadStatus = pred.status === 'won' || pred.status === 'failed';
            const needsUpdate = !hadStatus || pred.result !== result_score;
            
            if (needsUpdate) {
              predictions[i] = {
                ...pred,
                result: result_score,
                status: pred_status,
                actualWinner: result_winner,
                updatedAt: now_iso,
                resultUpdatedAt: now_iso,
              };
              
              dateUpdatedCount++;
              totalUpdated++;
              
              const statusEmoji = pred_status === 'won' ? '✅' : pred_status === 'failed' ? '❌' : '⚠️';
              console.log(`${statusEmoji} Updated (${dateId}): ${pred_home} vs ${pred_away} → ${result_score} (${pred_status || 'no status'})`);
            } else {
              console.log(`⏭️  Skipped (already updated): ${pred_home} vs ${pred_away}`);
            }
            break;
          }
        }
      }
      
      // Save updated predictions for this date if any were updated
      if (dateUpdatedCount > 0) {
        await dateRef.set({
          id: dateId,
          predictions,
          updatedAt: now_iso,
        }, { merge: true });
        
        updated_by_date[dateId] = dateUpdatedCount;
      }
    }
    
    // Calculate summary stats
    const statsSummary = {
      total_updated: totalUpdated,
      updated_by_date: updated_by_date,
      message: totalUpdated > 0 
        ? `✅ Updated ${totalUpdated} prediction(s) with results. Stats will be recalculated when predictions are fetched.`
        : 'ℹ️ No predictions were updated (either no matches found or already updated)'
    };
    
    console.log(`📊 Summary: ${statsSummary.message}`);
    
    return NextResponse.json({ 
      ok: true, 
      updated: totalUpdated,
      updated_by_date: updated_by_date,
      summary: statsSummary
    });
    
  } catch (err: any) {
    console.error('Failed to update predictions with results:', err);
    return NextResponse.json({ 
      error: 'Failed to update predictions', 
      details: err?.message || String(err) 
    }, { status: 500 });
  }
}

