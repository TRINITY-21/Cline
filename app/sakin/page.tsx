"use client";

import type { UnifiedMatch } from '@/lib/types';
import { useEffect, useMemo, useState } from 'react';

function todayId(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

type Toast = {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
};

type MatchWithMeta = UnifiedMatch & {
  approved?: boolean;
  trending?: boolean;
  isTrending?: boolean;
  inStore?: boolean;
};

function AdminLoginGuard({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if already authenticated (from localStorage)
    const authKey = 'admin_auth_token';
    const stored = typeof window !== 'undefined' ? localStorage.getItem(authKey) : null;
    // Password should be set via environment variable, but we'll check localStorage first
    if (stored) {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Verify password via API endpoint
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      
      if (res.ok) {
        const authKey = 'admin_auth_token';
        if (typeof window !== 'undefined') {
          localStorage.setItem(authKey, 'authenticated');
        }
        setIsAuthenticated(true);
        setPassword('');
      } else {
        setError('Incorrect password. Access denied.');
        setPassword('');
      }
    } catch (err) {
      setError('Failed to verify password. Please try again.');
      setPassword('');
    }
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('admin_auth_token');
    }
    setIsAuthenticated(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-white/60">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="w-full max-w-md p-8">
          <div className="surface rounded-lg p-8 hero-glow border border-white/10">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-extrabold mb-2">Admin Access</h1>
              <p className="text-white/60 text-sm">Enter password to access admin dashboard</p>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-2 text-white/80">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[rgb(var(--brand-yellow))] focus:border-transparent"
                  placeholder="Enter admin password"
                  autoFocus
                  required
                />
              </div>
              
              {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-100 text-sm">
                  {error}
                </div>
              )}
              
              <button
                type="submit"
                className="w-full btn btn-primary"
              >
                Access Dashboard
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={handleLogout}
          className="btn btn-ghost text-sm bg-white/5 hover:bg-white/10"
          title="Logout"
        >
          Logout
        </button>
      </div>
      {children}
    </div>
  );
}

function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-[2000] space-y-2">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`min-w-[280px] max-w-md rounded-lg border shadow-lg p-4 backdrop-blur-sm animate-in slide-in-from-right ${
            t.type === 'success'
              ? 'bg-green-500/20 border-green-500/50 text-green-100'
              : t.type === 'error'
              ? 'bg-red-500/20 border-red-500/50 text-red-100'
              : 'bg-blue-500/20 border-blue-500/50 text-blue-100'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">{t.message}</p>
            <button
              onClick={() => removeToast(t.id)}
              className="text-current opacity-70 hover:opacity-100 transition-opacity"
            >
              ✕
            </button>
          </div>
      </div>
      ))}
    </div>
  );
}

function AdminPageContent() {
  const [storeMatches, setStoreMatches] = useState<MatchWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [editMatch, setEditMatch] = useState<{ id: string; videoSrc: string } | null>(null);
  const [previewMatch, setPreviewMatch] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showTeamLogo, setShowTeamLogo] = useState(false);
  const [teamLogoData, setTeamLogoData] = useState({ name: '', sport: 'Football', file: null as File | null });
  const [activeTab, setActiveTab] = useState<'store' | 'approved' | 'trending' | 'predictions' | 'highlights' | 'approved-highlights'>('store');
  const [trendingRows, setTrendingRows] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loadingPredictions, setLoadingPredictions] = useState(false);
  const [selectedPredictions, setSelectedPredictions] = useState<Record<string, boolean>>({});
  const [highlights, setHighlights] = useState<any[]>([]);
  const [loadingHighlights, setLoadingHighlights] = useState(false);
  const [editHighlight, setEditHighlight] = useState<{ id: string; videoSrc: string; date: string } | null>(null);
  const [previewHighlight, setPreviewHighlight] = useState<string | null>(null);
  const [selectedHighlights, setSelectedHighlights] = useState<Record<string, boolean>>({});
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  const token = process.env.NEXT_PUBLIC_INTERNAL_UPDATE_TOKEN || '';

  function addToast(message: string, type: Toast['type'] = 'success') {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 4000);
  }

  function removeToast(id: string) {
    setToasts(prev => prev.filter(t => t.id !== id));
  }


  async function loadStore(date?: string) {
    const targetDate = date || selectedDate;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/moderate/matches?date=${encodeURIComponent(targetDate)}`, {
        cache: 'no-store',
        headers: { 'x-internal-token': token },
      });
      const data = await res.json();
      const matches = Array.isArray(data.rows) ? data.rows : [];
      setStoreMatches(matches);
      addToast(`Loaded ${matches.length} match(es) for ${targetDate}`, 'success');
    } catch (err) {
      console.error('Failed to load store:', err);
      addToast('Failed to load stored matches', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function updateMatchStatuses() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/matches/update-status-batch', {
        method: 'POST',
        headers: { 'x-internal-token': token },
      });
      if (!res.ok) throw new Error('Failed to update');
      const data = await res.json();
      addToast(`Updated ${data.updated || 0} match status(es)`, 'success');
      await Promise.all([loadStore(), loadTrending()]);
    } catch (err: any) {
      addToast(`Failed to update statuses: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function loadTrending() {
    try {
      const res = await fetch('/api/trending', { cache: 'no-store' });
      const data = await res.json();
      setTrendingRows(Array.isArray(data) ? data : []);
    } catch {
      setTrendingRows([]);
    }
  }

  async function loadHighlights(date?: string | null) {
    setLoadingHighlights(true);
    try {
      let targetDate: string | null = null;
      if (date === null || date === 'all') {
        targetDate = null; // Load all
      } else if (date) {
        targetDate = date; // Use provided date
      } else {
        targetDate = selectedDate; // Use selectedDate (defaults to today)
      }
      
      const url = targetDate 
        ? `/api/admin/moderate/highlights?date=${encodeURIComponent(targetDate)}`
        : '/api/admin/moderate/highlights';
      
      const res = await fetch(url, {
        cache: 'no-store',
        headers: { 'x-internal-token': token },
      });
      
      if (!res.ok) {
        throw new Error('Failed to load highlights');
      }
      
      const data = await res.json();
      const loadedHighlights = Array.isArray(data.rows) ? data.rows : [];
      setHighlights(loadedHighlights);
      addToast(`Loaded ${loadedHighlights.length} highlight(s)`, 'success');
    } catch (err: any) {
      console.error('Failed to load highlights:', err);
      addToast(`Failed to load highlights: ${err.message}`, 'error');
      setHighlights([]);
    } finally {
      setLoadingHighlights(false);
    }
  }

  async function updateHighlightVideoSrc(highlightId: string, videoSrc: string, date: string) {
    try {
      const res = await fetch('/api/admin/moderate/highlights', {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          'x-internal-token': token,
        },
        body: JSON.stringify({ highlightId, videoSrc, date }),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || errorData.message || 'Failed to update highlight');
      }
      
      addToast('Video source updated successfully', 'success');
      setEditHighlight(null);
      await loadHighlights(selectedDate);
    } catch (err: any) {
      console.error('Failed to update highlight:', err);
      addToast(`Failed to update highlight: ${err.message}`, 'error');
    }
  }

  async function updateHighlightApproval(highlightIds: string[], approved: boolean, date?: string) {
    setLoadingHighlights(true);
    try {
      // Group highlights by document date
      const highlightsByDate: Record<string, string[]> = {};
      
      highlightIds.forEach(id => {
        const highlight = highlights.find(h => h.id === id);
        const docDate = highlight?._documentDate || date || selectedDate;
        if (!highlightsByDate[docDate]) {
          highlightsByDate[docDate] = [];
        }
        highlightsByDate[docDate].push(id);
      });
      
      // Update each date document separately
      const promises = Object.entries(highlightsByDate).map(([docDate, ids]) => {
        return fetch('/api/admin/highlights/update-status', {
          method: 'PATCH',
          headers: {
            'content-type': 'application/json',
            'x-internal-token': token,
          },
          body: JSON.stringify({ highlightIds: ids, approved, date: docDate }),
        });
      });
      
      const results = await Promise.all(promises);
      const failed = results.filter(r => !r.ok);
      
      if (failed.length > 0) {
        const errorData = await failed[0].json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || errorData.message || 'Failed to update highlight approval');
      }
      
      const action = approved ? 'approved' : 'unapproved';
      addToast(`${highlightIds.length} highlight(s) ${action}`, 'success');
      setSelectedHighlights({});
      await loadHighlights(selectedDate);
    } catch (err: any) {
      console.error('Failed to update highlight approval:', err);
      addToast(`Failed to update approval: ${err.message}`, 'error');
    } finally {
      setLoadingHighlights(false);
    }
  }

  function toggleHighlightSelection(highlightId: string, checked: boolean) {
    setSelectedHighlights(prev => ({ ...prev, [highlightId]: checked }));
  }

  function toggleAllHighlights(checked: boolean) {
    const next: Record<string, boolean> = {};
    if (checked) {
      highlights.forEach(h => { next[h.id] = true; });
    }
    setSelectedHighlights(next);
  }

  async function loadPredictions(date?: string | null) {
    setLoadingPredictions(true);
    try {
      // If date is explicitly null or 'all', load all predictions
      // Otherwise use the provided date or selectedDate
      let targetDate: string | null = null;
      if (date === null || date === 'all') {
        targetDate = null; // Load all
      } else if (date) {
        targetDate = date; // Use provided date
      } else {
        targetDate = selectedDate; // Use selectedDate (defaults to today)
      }
      
      const url = targetDate 
        ? `/api/admin/over-predictions?date=${encodeURIComponent(targetDate)}`
        : '/api/admin/over-predictions';
      
      const res = await fetch(url, {
        cache: 'no-store',
        headers: { 'x-internal-token': token },
      });
      const data = await res.json();
      const predictionsData = Array.isArray(data.rows) ? data.rows : [];
      setPredictions(predictionsData);
      
      const message = targetDate 
        ? `Loaded ${predictionsData.length} prediction(s) for ${targetDate}`
        : `Loaded ${predictionsData.length} prediction(s) from all dates`;
      addToast(message, 'success');
    } catch (err) {
      console.error('Failed to load predictions:', err);
      addToast('Failed to load predictions', 'error');
      setPredictions([]);
    } finally {
      setLoadingPredictions(false);
    }
  }
  
  function handleDateChange(date: string) {
    setSelectedDate(date);
  }
  
  function handleFetchForDate() {
    if (activeTab === 'predictions') {
      loadPredictions(selectedDate);
    } else if (activeTab === 'highlights') {
      loadHighlights(selectedDate);
    } else {
      loadStore(selectedDate);
    }
  }

  // Status updates are now automatic via results scraper - no manual updates needed

  async function updatePredictionApproval(predictionId: string, approved: boolean, reload: boolean = true) {
    try {
      const res = await fetch(`/api/admin/moderate/predictions/${encodeURIComponent(predictionId)}`, {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          'x-internal-token': token,
        },
        body: JSON.stringify({ approved }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Approval failed:', { predictionId, status: res.status, error: errorData });
        throw new Error(errorData.message || errorData.error || `Failed to update (${res.status})`);
      }
      
      if (reload) {
        addToast(`Prediction ${approved ? 'approved' : 'unapproved'}`, 'success');
        await loadPredictions();
      }
    } catch (err: any) {
      console.error('updatePredictionApproval error:', err);
      addToast(`Failed to update prediction: ${err.message}`, 'error');
      throw err;
    }
  }

  async function approveSelectedPredictions() {
    const selectedIds = Object.keys(selectedPredictions).filter(id => selectedPredictions[id]);
    if (selectedIds.length === 0) {
      addToast('No predictions selected', 'info');
      return;
    }
    
    setLoadingPredictions(true);
    try {
      // Approve each prediction (without reloading individually)
      const promises = selectedIds.map(id => 
        updatePredictionApproval(id, true, false).catch(err => {
          console.error(`Failed to approve prediction ${id}:`, err);
          return null;
        })
      );
      
      await Promise.all(promises);
      addToast(`Approved ${selectedIds.length} prediction(s)`, 'success');
      setSelectedPredictions({});
      await loadPredictions();
    } catch (err: any) {
      addToast(`Failed to approve predictions: ${err.message}`, 'error');
    } finally {
      setLoadingPredictions(false);
    }
  }

  function togglePredictionSelection(id: string, checked?: boolean) {
    setSelectedPredictions(prev => ({ ...prev, [id]: checked ?? !prev[id] }));
  }

  const [editPrediction, setEditPrediction] = useState<any | null>(null);
  const [showPredictionForm, setShowPredictionForm] = useState(false);

  async function savePrediction(predictionData: any) {
    try {
      // Check if this is an edit (has id) or new (no id)
      const isEdit = editPrediction && editPrediction.id;
      
      // If editing, include the path information
      if (isEdit && editPrediction._path) {
        predictionData._path = editPrediction._path;
      }
      
      const url = isEdit
        ? `/api/admin/over-predictions/${encodeURIComponent(editPrediction.id)}`
        : '/api/admin/over-predictions';
      
      const method = isEdit ? 'PATCH' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: {
          'content-type': 'application/json',
          'x-internal-token': token,
        },
        body: JSON.stringify(predictionData),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || errorData.message || `Failed to ${isEdit ? 'update' : 'create'} prediction`);
      }
      
      addToast(`Prediction ${isEdit ? 'updated' : 'created'} successfully`, 'success');
      setEditPrediction(null);
      setShowPredictionForm(false);
      await loadPredictions();
    } catch (err: any) {
      console.error('Failed to save prediction:', err);
      addToast(`Failed to save prediction: ${err.message}`, 'error');
    }
  }

  async function deletePrediction(predictionId: string, predictionPath?: string) {
    if (!confirm('Are you sure you want to delete this prediction?')) return;
    
    try {
      // Use path if available, otherwise just use the ID
      const urlId = predictionPath || predictionId;
      
      const res = await fetch(`/api/admin/over-predictions/${encodeURIComponent(urlId)}`, {
        method: 'DELETE',
        headers: {
          'content-type': 'application/json',
          'x-internal-token': token,
        },
        body: JSON.stringify({
          _path: predictionPath,
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || errorData.message || 'Failed to delete prediction');
      }
      
      addToast('Prediction deleted successfully', 'success');
      await loadPredictions();
    } catch (err: any) {
      console.error('Failed to delete prediction:', err);
      addToast(`Failed to delete prediction: ${err.message}`, 'error');
    }
  }

  function handleEditPrediction(pred: any) {
    setEditPrediction(pred);
    setShowPredictionForm(true);
  }

  function handleNewPrediction() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const defaultDate = `${yyyy}-${mm}-${dd}`;
    
    setEditPrediction({
      home: '',
      away: '',
      league: '',
      timeLabel: '',
      matchDate: defaultDate,
      predictedScoreDisplay: '',
      msbs: 'Over 1.5',
      actualScore: '',
      status: null,
    });
    setShowPredictionForm(true);
  }

  function toggleAllPredictions(checked: boolean) {
    const next: Record<string, boolean> = {};
    if (checked) {
      predictions.forEach(p => { next[p.id] = true; });
    }
    setSelectedPredictions(next);
  }

  useEffect(() => {
    if (activeTab === 'predictions') {
      loadPredictions();
    } else if (activeTab === 'highlights' || activeTab === 'approved-highlights') {
      loadHighlights();
    } else {
      loadStore();
    }
    loadTrending();
  }, [activeTab]);

  // Auto-update match statuses every 5 minutes
  useEffect(() => {
    // Only run auto-update if admin page is open and token is available
    if (!token) return;
    
    const interval = setInterval(() => {
      updateMatchStatuses();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const storeMatchIds = useMemo(() => new Set(storeMatches.map(m => m.id)), [storeMatches]);
  const approvedMatches = useMemo(() => storeMatches.filter(m => m.approved), [storeMatches]);
  const unapprovedMatches = useMemo(() => {
    const approvedIds = new Set(approvedMatches.map(m => m.id));
    return storeMatches.filter(m => !approvedIds.has(m.id) && m.status !== 'ended');
  }, [storeMatches, approvedMatches]);
  const approvedHighlights = useMemo(() => highlights.filter(h => h.approved === true), [highlights]);
  // In Store highlights: All highlights from Firestore for the selected date (regardless of approval)
  const inStoreHighlights = useMemo(() => highlights, [highlights]);
  // Trending matches: Use directly from Firestore API (only matches with isTrending == true)
  // Filter out ended matches - only show upcoming or live trending matches
  const trendingMatches = useMemo(() => trendingRows.filter((m: any) => m && m.id && m.status !== 'ended'), [trendingRows]);

  const matchesByTab = useMemo(() => {
    let matches: any[] = [];
    switch (activeTab) {
      case 'store':
        // Show all store matches, but prioritize unapproved ones at the top
        matches = [...unapprovedMatches, ...approvedMatches.filter(m => !unapprovedMatches.some(u => u.id === m.id))];
        break;
      case 'approved':
        matches = approvedMatches;
        break;
      case 'trending':
        // Only show matches that are explicitly marked as trending in Firestore
        matches = trendingMatches;
        break;
      default:
        matches = storeMatches;
    }
    
    // Filter out ended matches - only show upcoming or live matches for approval
    return matches.filter(m => m.status !== 'ended');
  }, [activeTab, storeMatches, approvedMatches, trendingMatches, unapprovedMatches]);

  const filtered = useMemo(() => {
    const needle = q.toLowerCase().trim();
    return matchesByTab.filter(m => {
      if (!needle) return true;
      const homeName = m.home?.name || '';
      const awayName = m.away?.name || '';
      const leagueName = m.league?.name || '';
      return (
        homeName.toLowerCase().includes(needle) ||
        awayName.toLowerCase().includes(needle) ||
        leagueName.toLowerCase().includes(needle) ||
        m.id.toLowerCase().includes(needle)
      );
    });
  }, [matchesByTab, q]);


  async function updateStatus(matchIds: string[], approved?: boolean, trending?: boolean) {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/matches/update-status', {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          'x-internal-token': token,
        },
        body: JSON.stringify({ matchIds, approved, isTrending: trending }),
      });
      if (!res.ok) throw new Error('Failed to update');
      const action = approved !== undefined
        ? (approved ? 'approved' : 'unapproved')
        : (trending ? 'marked as trending' : 'unmarked from trending');
      addToast(`${matchIds.length} match(es) ${action}`, 'success');
      setSelected({});
      await Promise.all([loadStore(), loadTrending()]);
    } catch (err: any) {
      addToast(`Failed to update: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function saveVideoSrc(matchId: string, videoSrc: string) {
    try {
      // Update directly in daily_matches via API
      const res = await fetch(`/api/admin/moderate/matches/${encodeURIComponent(matchId)}`, {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          'x-internal-token': token,
        },
        body: JSON.stringify({ override: { videoSrc } }),
      });
      if (!res.ok) throw new Error('Failed to update');
      addToast('Video source updated', 'success');
      setEditMatch(null);
      await loadStore();
    } catch (err: any) {
      addToast(`Failed to save video: ${err.message}`, 'error');
    }
  }

  function toggleSelection(id: string, checked?: boolean) {
    setSelected(prev => ({ ...prev, [id]: checked ?? !prev[id] }));
  }

  function toggleAll(checked: boolean) {
    const next: Record<string, boolean> = {};
    if (checked) {
      filtered.forEach(m => { next[m.id] = true; });
    }
    setSelected(next);
  }

  async function uploadTeamLogo() {
    if (!teamLogoData.name || !teamLogoData.file) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.set('name', teamLogoData.name);
      fd.set('sport', teamLogoData.sport);
      fd.set('logo', teamLogoData.file);
      const res = await fetch('/api/admin/teams/upload', {
        method: 'POST',
        headers: { 'x-internal-token': token },
        body: fd,
      });
      if (!res.ok) throw new Error('Upload failed');
      addToast('Team logo uploaded successfully', 'success');
      setTeamLogoData({ name: '', sport: 'Football', file: null });
      setShowTeamLogo(false);
    } catch (err: any) {
      addToast(`Failed to upload: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }

  const selectedIds = Object.keys(selected).filter(id => selected[id]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[rgb(11,11,14)] via-[rgb(15,15,18)] to-[rgb(11,11,14)]">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="space-y-4">
          {/* Title Section */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-[rgb(255,212,0)] to-[rgb(255,244,180)] bg-clip-text text-transparent">
                Admin Dashboard
              </h1>
              <p className="text-white/60 mt-1">Matches & Predictions Management</p>
            </div>
            <div className="text-right">
              <div className="text-xs text-white/50 uppercase tracking-wide mb-1">Current View</div>
              <div className="text-lg font-semibold text-white/90">
                {selectedDate === todayId() ? (
                  <span className="text-[rgb(var(--brand-yellow))]">Today</span>
                ) : (
                  <span>{selectedDate}</span>
                )}
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="surface p-4 rounded-lg border border-white/10">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Date Controls */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <label htmlFor="date-picker" className="text-sm font-medium text-white/80 whitespace-nowrap">
                    Select Date:
                  </label>
                  <input
                    id="date-picker"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-[rgb(255,212,0)] focus:border-transparent transition-all"
                    max={todayId()}
                  />
                </div>
                <button
                  onClick={handleFetchForDate}
                  disabled={loading || loadingPredictions || loadingHighlights}
                  className="pill pill-active disabled:opacity-50 whitespace-nowrap"
                >
                  {loading || loadingPredictions || loadingHighlights ? (
                    <>
                      <span className="inline-block animate-spin mr-2">⏳</span>
                      Loading...
                    </>
                  ) : (
                    'Fetch Data'
                  )}
                </button>
                {selectedDate !== todayId() && (
                  <button
                    onClick={() => {
                      const today = todayId();
                      setSelectedDate(today);
                      if (activeTab === 'predictions') {
                        loadPredictions(today);
                      } else if (activeTab === 'highlights') {
                        loadHighlights(today);
                      } else {
                        loadStore(today);
                      }
                    }}
                    className="pill pill-muted hover:pill-active transition-all whitespace-nowrap"
                    title="Reset to today"
                  >
                    ← Today
                  </button>
                )}
              </div>

              {/* Utility Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setShowTeamLogo(!showTeamLogo)}
                  className={`pill transition-all whitespace-nowrap ${
                    showTeamLogo ? 'pill-active' : 'pill-muted hover:pill-active'
                  }`}
                >
                  {showTeamLogo ? '✓' : ''} Team Logos
                </button>
                <button
                  onClick={() => loadStore()}
                  disabled={loading}
                  className="pill pill-muted hover:pill-active transition-all disabled:opacity-50 whitespace-nowrap"
                >
                  {loading ? '⏳' : '↻'} Refresh
                </button>
                <button
                  onClick={updateMatchStatuses}
                  disabled={loading}
                  className="pill pill-active disabled:opacity-50 whitespace-nowrap"
                  title="Update match statuses based on time (ended matches)"
                >
                  ⚡ Update Statuses
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="surface p-4">
            <div className="text-sm text-white/60 mb-1">In Store (Upcoming/Live)</div>
            <div className="text-2xl font-bold text-blue-400">{storeMatches.filter(m => m.status !== 'ended').length}</div>
          </div>
          <div className="surface p-4">
            <div className="text-sm text-white/60 mb-1">Approved (On Web)</div>
            <div className="text-2xl font-bold text-green-400">{approvedMatches.filter(m => m.status !== 'ended').length}</div>
          </div>
          <div className="surface p-4">
            <div className="text-sm text-white/60 mb-1">Pending Approval</div>
            <div className={`text-2xl font-bold ${unapprovedMatches.length > 0 ? 'text-orange-400' : 'text-white/40'}`}>
              {unapprovedMatches.length}
            </div>
          </div>
          <div className="surface p-4">
            <div className="text-sm text-white/60 mb-1">Trending</div>
            <div className="text-2xl font-bold text-purple-400">{trendingMatches.filter((m: any) => m && m.id && m.status !== 'ended').length}</div>
          </div>
        </div>

        {/* Pending Approval Banner - Show if there are unapproved matches */}
        {unapprovedMatches.length > 0 && (
          <div className="surface p-6 border-l-4 border-orange-400 bg-orange-400/5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-orange-400 text-xl">⚠️</span>
                  <h3 className="text-lg font-semibold text-white">
                    {unapprovedMatches.length} Match{unapprovedMatches.length !== 1 ? 'es' : ''} Need Approval
                  </h3>
                </div>
                <p className="text-sm text-white/70 mb-3">
                  These matches are in the store but not yet approved. Approve them to make them visible on the website.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      const unapprovedIds = unapprovedMatches.map(m => m.id);
                      updateStatus(unapprovedIds, true);
                    }}
                    className="pill pill-active"
                  >
                    Approve All ({unapprovedMatches.length})
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('store');
                      setQ(''); // Clear search to show all
                      // Scroll to table
                      setTimeout(() => {
                        document.querySelector('.surface.overflow-hidden')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                      }, 100);
                    }}
                    className="pill pill-muted"
                  >
                    View in Store Tab
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Team Logo Upload */}
        {showTeamLogo && (
          <div className="surface p-6 space-y-4">
            <div className="text-lg font-semibold mb-4">Upload Team Logo</div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <input
                className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-[rgb(255,212,0)]"
                placeholder="Team name"
                value={teamLogoData.name}
                onChange={e => setTeamLogoData({ ...teamLogoData, name: e.target.value })}
              />
              <select
                className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-[rgb(255,212,0)]"
                value={teamLogoData.sport}
                onChange={e => setTeamLogoData({ ...teamLogoData, sport: e.target.value })}
              >
                <option>Football</option>
                <option>Hockey</option>
                <option>Volleyball</option>
                <option>Basketball</option>
                <option>Tennis</option>
              </select>
              <input
                type="file"
                accept="image/*"
                className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-[rgb(255,212,0)]"
                onChange={e => setTeamLogoData({ ...teamLogoData, file: e.target.files?.[0] || null })}
              />
              <button
                className="pill pill-active disabled:opacity-50"
                disabled={loading || !teamLogoData.name || !teamLogoData.file}
                onClick={uploadTeamLogo}
              >
                Upload Logo
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-white/10">
          <button
            onClick={() => setActiveTab('store')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 relative ${
              activeTab === 'store'
                ? 'border-blue-400 text-blue-400'
                : 'border-transparent text-white/60 hover:text-white/80'
            }`}
          >
            In Store ({storeMatches.filter(m => m.status !== 'ended').length})
            {unapprovedMatches.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-orange-400 text-xs font-bold text-white">
                {unapprovedMatches.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'approved'
                ? 'border-green-400 text-green-400'
                : 'border-transparent text-white/60 hover:text-white/80'
            }`}
          >
            On Web ({approvedMatches.filter(m => m.status !== 'ended').length})
          </button>
          <button
            onClick={() => setActiveTab('trending')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'trending'
                ? 'border-purple-400 text-purple-400'
                : 'border-transparent text-white/60 hover:text-white/80'
            }`}
          >
            Trending ({trendingMatches.length})
          </button>
          <button
            onClick={() => setActiveTab('predictions')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'predictions'
                ? 'border-orange-400 text-orange-400'
                : 'border-transparent text-white/60 hover:text-white/80'
            }`}
          >
            Predictions ({predictions.length})
          </button>
          <button
            onClick={() => setActiveTab('highlights')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'highlights'
                ? 'border-yellow-400 text-yellow-400'
                : 'border-transparent text-white/60 hover:text-white/80'
            }`}
          >
            Highlights In Store ({inStoreHighlights.length})
          </button>
          <button
            onClick={() => setActiveTab('approved-highlights')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'approved-highlights'
                ? 'border-yellow-400 text-yellow-400'
                : 'border-transparent text-white/60 hover:text-white/80'
            }`}
          >
            Highlights On Web ({approvedHighlights.length})
          </button>
      </div>

        {/* Search and Bulk Actions - Only show for matches tabs */}
        {activeTab !== 'predictions' && activeTab !== 'highlights' && activeTab !== 'approved-highlights' && (
          <div className="flex flex-wrap items-center gap-4">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
            placeholder="Search by team name, league, or match ID..."
            className="flex-1 min-w-[300px] px-4 py-2 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-[rgb(255,212,0)]"
          />
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-white/70">{selectedIds.length} selected</span>
              <button
                onClick={() => updateStatus(selectedIds, true)}
                className="pill pill-active"
              >
                Approve Selected
              </button>
              <button
                onClick={() => updateStatus(selectedIds, false)}
                className="pill pill-muted"
              >
                Unapprove Selected
              </button>
              <button
                onClick={() => updateStatus(selectedIds, undefined, true)}
                className="pill pill-active"
              >
                Mark Trending
              </button>
              <button
                onClick={() => updateStatus(selectedIds, undefined, false)}
                className="pill pill-muted"
              >
                Unmark Trending
              </button>
        </div>
          )}
      </div>
        )}

        {/* Matches Table - Only show for store, approved, and trending tabs */}
        {activeTab !== 'predictions' && activeTab !== 'highlights' && activeTab !== 'approved-highlights' && (
          <div className="surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="text-left p-4 w-12">
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && filtered.every(m => selected[m.id])}
                      onChange={e => toggleAll(e.currentTarget.checked)}
                      className="rounded border-white/20"
                    />
                  </th>
                  <th className="text-left p-4 text-sm font-semibold text-white/80">Time</th>
                  <th className="text-left p-4 text-sm font-semibold text-white/80">Match</th>
                  <th className="text-left p-4 text-sm font-semibold text-white/80">League</th>
                  <th className="text-center p-4 text-sm font-semibold text-white/80">Status</th>
                  <th className="text-center p-4 text-sm font-semibold text-white/80">In Store</th>
                  <th className="text-center p-4 text-sm font-semibold text-white/80">Approved</th>
                  <th className="text-center p-4 text-sm font-semibold text-white/80">Trending</th>
                  <th className="text-left p-4 text-sm font-semibold text-white/80">Actions</th>
            </tr>
          </thead>
          <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-12">
                      <div className="flex flex-col items-center justify-center space-y-4 text-center">
                        {activeTab === 'store' && !q ? (
                          <>
                            <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                              <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                              </svg>
                            </div>
                            <div className="space-y-2">
                              <h3 className="text-lg font-semibold text-white/80">No matches in store</h3>
                              <p className="text-sm text-white/50 max-w-md">
                                Matches are automatically added to Firestore&apos;s <code className="px-2 py-1 rounded bg-white/5 text-blue-400">daily_matches</code> collection via the hourly scrape-and-update cron job.
                              </p>
                            </div>
                          </>
                        ) : activeTab === 'approved' && !q ? (
                          <>
                            <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                              <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div className="space-y-2">
                              <h3 className="text-lg font-semibold text-white/80">No approved matches</h3>
                              <p className="text-sm text-white/50 max-w-md">
                                Approved matches will appear here. These are the matches currently visible on the website. Go to &quot;In Store&quot; tab to approve matches.
                              </p>
                            </div>
                          </>
                        ) : activeTab === 'trending' && !q ? (
                          <>
                            <div className="w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                              <svg className="w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                              </svg>
                            </div>
                            <div className="space-y-2">
                              <h3 className="text-lg font-semibold text-white/80">No trending matches</h3>
                              <p className="text-sm text-white/50 max-w-md">
                                Trending matches will appear here. Mark matches as trending to highlight them on the website. Go to &quot;In Store&quot; tab to mark matches as trending.
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                              <svg className="w-8 h-8 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                              </svg>
                            </div>
                            <div className="space-y-2">
                              <h3 className="text-lg font-semibold text-white/80">No matches found</h3>
                              <p className="text-sm text-white/50 max-w-md">
                                No matches match your search query &quot;<span className="text-[rgb(255,212,0)]">{q}</span>&quot;. Try a different search term or clear the search.
                              </p>
                              <button
                                onClick={() => setQ('')}
                                className="mt-4 pill pill-muted"
                              >
                                Clear Search
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map(match => {
                    const inStore = storeMatchIds.has(match.id);
                    const storeMatch = storeMatches.find(m => m.id === match.id);
                    const approved = storeMatch?.approved || false;
                    const isUnapproved = inStore && !approved;
                    // Check if match is trending: either in trendingRows (from Firestore API) or has isTrending flag
                    const trending = trendingMatches.some((m: any) => m.id === match.id) || storeMatch?.isTrending === true || storeMatch?.trending === true;
                    return (
                      <tr
                        key={match.id}
                        className={`border-t border-white/10 hover:bg-white/5 transition-colors ${
                          isUnapproved ? 'bg-orange-400/5 border-l-2 border-l-orange-400' : ''
                        }`}
                      >
                        <td className="p-4">
                          <input
                            type="checkbox"
                            checked={!!selected[match.id]}
                            onChange={e => toggleSelection(match.id, e.currentTarget.checked)}
                            className="rounded border-white/20"
                          />
                        </td>
                        <td className="p-4 text-sm text-white/70 font-mono">
                          {match.timeLabel || '—'}
                        </td>
                        <td className="p-4">
                          <div className="font-semibold">
                            {match.home?.name || '—'} <span className="text-white/40 text-xs">vs</span>{' '}
                            {match.away?.name || '—'}
                          </div>
                        </td>
                        <td className="p-4 text-sm text-white/70">
                          {match.league?.name || '—'}
                        </td>
                        <td className="p-4 text-center">
                          <span
                            className={`pill !text-xs ${
                              match.status === 'live'
                                ? 'pill-active'
                                : match.status === 'ended'
                                ? 'opacity-50'
                                : 'pill-muted'
                            }`}
                          >
                            {match.status || 'upcoming'}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          {inStore ? (
                            <span className="pill pill-active !text-xs">Yes</span>
                          ) : (
                            <span className="pill pill-muted !text-xs">—</span>
                          )}
                </td>
                        <td className="p-4 text-center">
                          {approved ? (
                            <span className="pill pill-active !text-xs">Yes</span>
                          ) : (
                            <span className={`pill !text-xs ${isUnapproved ? 'pill-active bg-orange-400/20 border-orange-400/50 text-orange-300' : 'pill-muted'}`}>
                              {isUnapproved ? '⚠️ Needs Approval' : 'No'}
                            </span>
                          )}
                </td>
                        <td className="p-4 text-center">
                          {trending ? (
                            <span className="pill pill-active !text-xs">Yes</span>
                          ) : (
                            <span className="pill pill-muted !text-xs">No</span>
                  )}
                </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-2">
                            {storeMatch?.videoSrc && (
                              <button
                                onClick={() => setPreviewMatch(match.id)}
                                className="pill pill-muted text-xs"
                              >
                                Preview
                              </button>
                            )}
                            <button
                              onClick={() =>
                                setEditMatch({
                                  id: match.id,
                                  videoSrc: storeMatch?.videoSrc || match.videoSrc || '',
                                })
                              }
                              className="pill pill-muted text-xs"
                            >
                              Edit Video
                            </button>
                            {inStore && (
                              <>
                                <button
                                  onClick={() => updateStatus([match.id], !approved)}
                                  className={`pill text-xs ${approved ? 'pill-muted' : 'pill-active'}`}
                                >
                                  {approved ? 'Unapprove' : 'Approve'}
                                </button>
                                <button
                                  onClick={() => updateStatus([match.id], undefined, !trending)}
                                  className={`pill text-xs ${trending ? 'pill-active' : 'pill-muted'}`}
                                >
                                  {trending ? 'Unmark' : 'Trending'}
                                </button>
                              </>
                    )}
                  </div>
                </td>
              </tr>
                    );
                  })
                )}
          </tbody>
        </table>
          </div>
      </div>
        )}

      {/* Highlights Tab Content */}
      {(activeTab === 'highlights' || activeTab === 'approved-highlights') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">
                {activeTab === 'approved-highlights' ? 'On Web (Approved Highlights)' : 'In Store (All Highlights)'}
              </h2>
              <p className="text-sm text-white/60 mt-1">
                {activeTab === 'approved-highlights' 
                  ? 'Highlights that are currently visible on the website (approved matches)' 
                  : 'All highlights stored in Firestore for the selected date (regardless of approval status)'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => loadHighlights('all')}
                disabled={loadingHighlights}
                className="pill pill-muted hover:pill-active disabled:opacity-50 whitespace-nowrap"
              >
                Show All Dates
              </button>
              <button
                onClick={() => loadHighlights()}
                disabled={loadingHighlights}
                className="pill pill-active disabled:opacity-50"
              >
                {loadingHighlights ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* Search Filter for Highlights */}
          <div className="flex flex-wrap items-center gap-4">
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search by team name, league, or match ID..."
              className="flex-1 min-w-[300px] px-4 py-2 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-[rgb(255,212,0)]"
            />
            {Object.keys(selectedHighlights).filter(id => selectedHighlights[id]).length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-white/70">
                  {Object.keys(selectedHighlights).filter(id => selectedHighlights[id]).length} selected
                </span>
                <button
                  onClick={() => {
                    const selectedIds = Object.keys(selectedHighlights).filter(id => selectedHighlights[id]);
                    updateHighlightApproval(selectedIds, true);
                  }}
                  className="pill pill-active text-xs"
                >
                  Approve Selected
                </button>
                <button
                  onClick={() => {
                    const selectedIds = Object.keys(selectedHighlights).filter(id => selectedHighlights[id]);
                    updateHighlightApproval(selectedIds, false);
                  }}
                  className="pill pill-muted text-xs"
                >
                  Unapprove Selected
                </button>
              </div>
            )}
            {selectedDate !== todayId() && (
              <button
                onClick={() => {
                  const today = todayId();
                  setSelectedDate(today);
                  loadHighlights(today);
                }}
                className="pill pill-muted hover:pill-active transition-all whitespace-nowrap"
                title="Reset to today"
              >
                ← Today
              </button>
            )}
          </div>

          {loadingHighlights ? (
            <div className="surface p-12 text-center">
              <div className="text-white/60">Loading highlights...</div>
            </div>
          ) : highlights.length === 0 ? (
            <div className="surface p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white/80 mb-2">
                {activeTab === 'approved-highlights' ? 'No approved highlights' : 'No highlights in store'}
              </h3>
              <p className="text-sm text-white/50 max-w-md mx-auto">
                {activeTab === 'approved-highlights'
                  ? 'Approved highlights will appear here. These are the highlights currently visible on the website. Go to "In Store" tab to approve highlights.'
                  : 'All highlights stored in Firestore for this date will appear here. Approve them to make them visible on the website.'}
              </p>
            </div>
          ) : (activeTab === 'highlights' ? inStoreHighlights : approvedHighlights).filter((h: any) => {
            if (!q.trim()) return true;
            const needle = q.toLowerCase().trim();
            const homeTeam = (h.homeTeam || '').toLowerCase();
            const awayTeam = (h.awayTeam || '').toLowerCase();
            const league = (h.league || h.category || '').toLowerCase();
            const id = (h.id || '').toLowerCase();
            return (
              homeTeam.includes(needle) ||
              awayTeam.includes(needle) ||
              league.includes(needle) ||
              id.includes(needle)
            );
          }).length === 0 ? (
            <div className="surface p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white/80 mb-2">No highlights found</h3>
              <p className="text-sm text-white/50 max-w-md mx-auto">
                No highlights match your search query &quot;<span className="text-[rgb(255,212,0)]">{q}</span>&quot;. Try a different search term.
              </p>
              <button
                onClick={() => setQ('')}
                className="mt-4 pill pill-muted"
              >
                Clear Search
              </button>
            </div>
          ) : (
            <div className="surface overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-white/5 border-b border-white/10">
                    <tr>
                      <th className="text-left p-4 w-12">
                        <input
                          type="checkbox"
                          checked={highlights.filter((h: any) => {
                            if (!q.trim()) return true;
                            const needle = q.toLowerCase().trim();
                            const homeTeam = (h.homeTeam || '').toLowerCase();
                            const awayTeam = (h.awayTeam || '').toLowerCase();
                            const league = (h.league || h.category || '').toLowerCase();
                            const id = (h.id || '').toLowerCase();
                            return (
                              homeTeam.includes(needle) ||
                              awayTeam.includes(needle) ||
                              league.includes(needle) ||
                              id.includes(needle)
                            );
                          }).length > 0 && highlights.filter((h: any) => {
                            if (!q.trim()) return true;
                            const needle = q.toLowerCase().trim();
                            const homeTeam = (h.homeTeam || '').toLowerCase();
                            const awayTeam = (h.awayTeam || '').toLowerCase();
                            const league = (h.league || h.category || '').toLowerCase();
                            const id = (h.id || '').toLowerCase();
                            return (
                              homeTeam.includes(needle) ||
                              awayTeam.includes(needle) ||
                              league.includes(needle) ||
                              id.includes(needle)
                            );
                          }).every(h => selectedHighlights[h.id])}
                          onChange={e => toggleAllHighlights(e.currentTarget.checked)}
                          className="rounded border-white/20"
                        />
                      </th>
                      <th className="text-left p-4 text-sm font-semibold text-white/80">Date</th>
                      <th className="text-left p-4 text-sm font-semibold text-white/80">Match</th>
                      <th className="text-left p-4 text-sm font-semibold text-white/80">League</th>
                      <th className="text-left p-4 text-sm font-semibold text-white/80">Video Source</th>
                      <th className="text-center p-4 text-sm font-semibold text-white/80">Approved</th>
                      <th className="text-center p-4 text-sm font-semibold text-white/80">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(activeTab === 'highlights' ? inStoreHighlights : approvedHighlights)
                      .filter((h: any) => {
                        // Filter by search query
                        if (!q.trim()) return true;
                        const needle = q.toLowerCase().trim();
                        const homeTeam = (h.homeTeam || '').toLowerCase();
                        const awayTeam = (h.awayTeam || '').toLowerCase();
                        const league = (h.league || h.category || '').toLowerCase();
                        const id = (h.id || '').toLowerCase();
                        return (
                          homeTeam.includes(needle) ||
                          awayTeam.includes(needle) ||
                          league.includes(needle) ||
                          id.includes(needle)
                        );
                      })
                      .map((highlight: any) => (
                      <tr
                        key={highlight.id}
                        className="border-t border-white/10 hover:bg-white/5 transition-colors"
                      >
                        <td className="p-4">
                          <input
                            type="checkbox"
                            checked={!!selectedHighlights[highlight.id]}
                            onChange={e => toggleHighlightSelection(highlight.id, e.currentTarget.checked)}
                            className="rounded border-white/20"
                          />
                        </td>
                        <td className="p-4 text-sm text-white/70">
                          {highlight.date || '—'}
                        </td>
                        <td className="p-4">
                          <div className="font-semibold">
                            {highlight.homeTeam || '—'} <span className="text-white/40 text-xs">vs</span>{' '}
                            {highlight.awayTeam || '—'}
                          </div>
                          {highlight.score && (
                            <div className="text-xs text-white/50 mt-1">{highlight.score}</div>
                          )}
                        </td>
                        <td className="p-4 text-sm text-white/70">
                          {highlight.league || highlight.category || '—'}
                        </td>
                        <td className="p-4">
                          <div className="max-w-md">
                            <div className="text-xs font-mono text-white/60 break-all">
                              {highlight.videoSrc ? (
                                highlight.videoSrc.substring(0, 60) + (highlight.videoSrc.length > 60 ? '...' : '')
                              ) : (
                                <span className="text-red-400">No video source</span>
                              )}
                            </div>
                            {highlight.videoSrc && (
                              <div className="mt-1">
                                <span className={`pill !text-xs ${
                                  highlight.videoSrc.toLowerCase().includes('cdn') 
                                    ? 'pill-active' 
                                    : 'pill-muted'
                                }`}>
                                  {highlight.videoSrc.toLowerCase().includes('cdn') ? 'CDN ✓' : 'Other'}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          {highlight.approved === true ? (
                            <span className="pill pill-active !text-xs">Yes</span>
                          ) : (
                            <span className="pill pill-muted !text-xs">No</span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => {
                                const docDate = highlight._documentDate || selectedDate;
                                updateHighlightApproval([highlight.id], !highlight.approved, docDate);
                              }}
                              className={`pill text-xs ${highlight.approved ? 'pill-muted' : 'pill-active'}`}
                            >
                              {highlight.approved ? 'Unapprove' : 'Approve'}
                            </button>
                            <button
                              onClick={() => {
                                // Use the document date if available (from API), otherwise try to extract from highlight.date
                                const docDate = highlight._documentDate || highlight.date || selectedDate;
                                // Try to parse the date to get YYYY-MM-DD format
                                let dateStr = docDate;
                                try {
                                  // If it's already in YYYY-MM-DD format, use it directly
                                  if (/^\d{4}-\d{2}-\d{2}$/.test(docDate)) {
                                    dateStr = docDate;
                                  } else {
                                    // Otherwise try to parse it
                                    const dateObj = new Date(docDate);
                                    if (!isNaN(dateObj.getTime())) {
                                      const yyyy = dateObj.getFullYear();
                                      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
                                      const dd = String(dateObj.getDate()).padStart(2, '0');
                                      dateStr = `${yyyy}-${mm}-${dd}`;
                                    }
                                  }
                                } catch {
                                  dateStr = selectedDate;
                                }
                                setEditHighlight({
                                  id: highlight.id,
                                  videoSrc: highlight.videoSrc || '',
                                  date: dateStr,
                                });
                              }}
                              className="pill pill-muted text-xs"
                            >
                              Edit Video
                            </button>
                            {highlight.videoSrc && (
                              <button
                                onClick={() => setPreviewHighlight(highlight.id)}
                                className="pill pill-muted text-xs"
                              >
                                Preview Video
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Predictions Tab Content */}
      {activeTab === 'predictions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Over Predictions Management</h2>
              <p className="text-sm text-white/60 mt-1">Manually add and manage over predictions</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleNewPrediction}
                className="pill pill-active"
              >
                + Add Prediction
              </button>
              <button
                onClick={() => loadPredictions()}
                disabled={loadingPredictions}
                className="pill pill-active disabled:opacity-50"
              >
                {loadingPredictions ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* Date Filter */}
          <div className="surface p-4 rounded-lg border border-white/10">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <label htmlFor="prediction-date-picker" className="text-sm font-medium text-white/80 whitespace-nowrap">
                    Filter by Date:
                  </label>
                  <input
                    id="prediction-date-picker"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      handleDateChange(e.target.value);
                      loadPredictions(e.target.value);
                    }}
                    className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-[rgb(255,212,0)] focus:border-transparent transition-all"
                  />
                </div>
                <button
                  onClick={() => loadPredictions('all')}
                  className="pill pill-muted whitespace-nowrap"
                >
                  Show All Dates
                </button>
                {selectedDate !== todayId() && (
                  <button
                    onClick={() => {
                      const today = todayId();
                      setSelectedDate(today);
                      loadPredictions(today);
                    }}
                    className="pill pill-muted whitespace-nowrap"
                  >
                    Show Today
                  </button>
                )}
              </div>
              <div className="text-right">
                <div className="text-xs text-white/50 uppercase tracking-wide mb-1">Current View</div>
                <div className="text-lg font-semibold text-white/90">
                  {selectedDate === todayId() ? (
                    <span className="text-[rgb(var(--brand-yellow))]">Today</span>
                  ) : (
                    <span>{selectedDate}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {loadingPredictions ? (
            <div className="surface p-12 text-center">
              <div className="text-white/60">Loading predictions...</div>
            </div>
          ) : predictions.length === 0 ? (
            <div className="surface p-12 text-center">
              <div className="text-white/60">No predictions found for {selectedDate === todayId() ? 'today' : selectedDate}</div>
              <div className="text-white/40 text-sm mt-2">Use the date filter above to view predictions for other dates</div>
            </div>
          ) : (
            <div className="surface overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-white/5 border-b border-white/10">
                    <tr>
                      <th className="text-left p-4 w-12">
                        <input
                          type="checkbox"
                          checked={predictions.length > 0 && predictions.every((p: any) => selectedPredictions[p.id])}
                          onChange={e => toggleAllPredictions(e.currentTarget.checked)}
                          className="rounded border-white/20"
                        />
                      </th>
                      <th className="text-left p-4 text-sm font-semibold text-white/80">Date</th>
                      <th className="text-left p-4 text-sm font-semibold text-white/80">Time</th>
                      <th className="text-left p-4 text-sm font-semibold text-white/80">Match</th>
                      <th className="text-left p-4 text-sm font-semibold text-white/80">League</th>
                      <th className="text-left p-4 text-sm font-semibold text-white/80">Predicted Score</th>
                      <th className="text-left p-4 text-sm font-semibold text-white/80">Over Type</th>
                      <th className="text-left p-4 text-sm font-semibold text-white/80">Actual Score</th>
                      <th className="text-center p-4 text-sm font-semibold text-white/80">Status</th>
                      <th className="text-center p-4 text-sm font-semibold text-white/80">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {predictions.map((pred: any) => {
                      const status = pred.status || 'pending';
                      const isWon = status === 'won';
                      const isFailed = status === 'failed';
                      
                      return (
                        <tr
                          key={pred.id}
                          className={`border-t border-white/10 hover:bg-white/5 transition-colors ${
                            isWon ? 'bg-green-500/5' : isFailed ? 'bg-red-500/5' : ''
                          }`}
                        >
                          <td className="p-4">
                            <input
                              type="checkbox"
                              checked={!!selectedPredictions[pred.id]}
                              onChange={e => togglePredictionSelection(pred.id, e.currentTarget.checked)}
                              className="rounded border-white/20"
                            />
                          </td>
                          <td className="p-4 text-sm text-white/70">
                            {pred.matchDate || '—'}
                          </td>
                          <td className="p-4 text-sm text-white/70 font-mono">
                            {pred.timeLabel || '—'}
                          </td>
                          <td className="p-4">
                            <div className="font-semibold">
                              {pred.home || '—'} <span className="text-white/40 text-xs">vs</span>{' '}
                              {pred.away || '—'}
                            </div>
                          </td>
                          <td className="p-4 text-sm text-white/70">
                            {pred.league || '—'}
                          </td>
                          <td className="p-4 text-sm text-white/70 font-mono">
                            {pred.predictedScoreDisplay || '—'}
                          </td>
                          <td className="p-4 text-sm text-white/70">
                            {pred.msbs || 'Over 1.5'}
                          </td>
                          <td className="p-4 text-sm text-white/70 font-mono">
                            {pred.actualScore || '—'}
                          </td>
                          <td className="p-4 text-center">
                            <span
                              className={`pill !text-xs ${
                                isWon
                                  ? 'pill-active bg-green-500/20 text-green-400 border-green-500/40'
                                  : isFailed
                                  ? 'bg-red-500/20 text-red-400 border-red-500/40'
                                  : 'pill-muted'
                              }`}
                            >
                              {isWon ? 'Won' : isFailed ? 'Failed' : 'Pending'}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-2 flex-wrap">
                              <button
                                onClick={() => handleEditPrediction(pred)}
                                className="pill pill-muted text-xs hover:bg-white/10"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deletePrediction(pred.id, pred._path)}
                                className="pill text-xs bg-red-500/20 text-red-400 border-red-500/40 hover:bg-red-500/30"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Prediction Form Modal */}
      {showPredictionForm && editPrediction && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => {
              setShowPredictionForm(false);
              setEditPrediction(null);
            }}
          />
          <div className="relative w-full max-w-2xl bg-[rgb(15,15,18)] border border-white/20 rounded-xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold">
              {editPrediction && editPrediction.id ? 'Edit Prediction' : 'Add New Prediction'}
            </h2>
            
            <form
              onSubmit={e => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const predictionData = {
                  home: formData.get('home')?.toString().trim() || '',
                  away: formData.get('away')?.toString().trim() || '',
                  league: formData.get('league')?.toString().trim() || '',
                  timeLabel: formData.get('timeLabel')?.toString().trim() || '',
                  matchDate: formData.get('matchDate')?.toString().trim() || '',
                  predictedScoreDisplay: formData.get('predictedScoreDisplay')?.toString().trim() || '',
                  msbs: formData.get('msbs')?.toString().trim() || 'Over 1.5',
                  actualScore: formData.get('actualScore')?.toString().trim() || '',
                  status: formData.get('status')?.toString() || null,
                };
                
                // Validate required fields
                if (!predictionData.home || !predictionData.away || !predictionData.league || !predictionData.timeLabel || !predictionData.matchDate) {
                  addToast('Please fill in all required fields (home, away, league, time, date)', 'error');
                  return;
                }
                
                savePrediction(predictionData);
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Home Team <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="home"
                    defaultValue={editPrediction.home}
                    required
                    className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-[rgb(255,212,0)]"
                    placeholder="Home team name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Away Team <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="away"
                    defaultValue={editPrediction.away}
                    required
                    className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-[rgb(255,212,0)]"
                    placeholder="Away team name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    League <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="league"
                    defaultValue={editPrediction.league}
                    required
                    className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-[rgb(255,212,0)]"
                    placeholder="League name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Match Date <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    name="matchDate"
                    defaultValue={editPrediction.matchDate}
                    required
                    className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-[rgb(255,212,0)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Time <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="time"
                    name="timeLabel"
                    defaultValue={editPrediction.timeLabel}
                    required
                    className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-[rgb(255,212,0)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Over Type
                  </label>
                  <select
                    name="msbs"
                    defaultValue={editPrediction.msbs || 'Over 1.5'}
                    className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-[rgb(255,212,0)]"
                  >
                    <option value="Over 1.5">Over 1.5</option>
                    <option value="Over 2.5">Over 2.5</option>
                    <option value="Over 3.5">Over 3.5</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">
                  Predicted Score (e.g., "3-1")
                </label>
                <input
                  type="text"
                  name="predictedScoreDisplay"
                  defaultValue={editPrediction.predictedScoreDisplay}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-[rgb(255,212,0)] font-mono"
                  placeholder="3-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Actual Score (e.g., "2-0")
                  </label>
                  <input
                    type="text"
                    name="actualScore"
                    defaultValue={editPrediction.actualScore}
                    className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-[rgb(255,212,0)] font-mono"
                    placeholder="2-0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    defaultValue={editPrediction.status || ''}
                    className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-[rgb(255,212,0)]"
                  >
                    <option value="">Pending</option>
                    <option value="won">Won</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPredictionForm(false);
                    setEditPrediction(null);
                  }}
                  className="pill pill-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="pill pill-active"
                >
                  {editPrediction && editPrediction.id ? 'Update' : 'Create'} Prediction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

        {/* Edit VideoSrc Modal for Matches */}
        {editMatch && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setEditMatch(null)}
            />
            <div className="relative w-full max-w-2xl bg-[rgb(15,15,18)] border border-white/20 rounded-xl p-6 space-y-4 shadow-2xl">
              <h2 className="text-xl font-semibold">Edit Video Source</h2>
              <input
                type="text"
                value={editMatch.videoSrc}
                onChange={e => setEditMatch({ ...editMatch, videoSrc: e.target.value })}
                placeholder="https://..."
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-[rgb(255,212,0)] font-mono text-sm"
              />
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setEditMatch(null)}
                  className="pill pill-muted"
                >
                  Cancel
                </button>
                <button
                  onClick={() => saveVideoSrc(editMatch.id, editMatch.videoSrc.trim())}
                  className="pill pill-active"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit VideoSrc Modal for Highlights */}
        {editHighlight && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setEditHighlight(null)}
            />
            <div className="relative w-full max-w-2xl bg-[rgb(15,15,18)] border border-white/20 rounded-xl p-6 space-y-4 shadow-2xl">
              <h2 className="text-xl font-semibold">Edit Highlight Video Source</h2>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white/80">Highlight ID</label>
                <div className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 font-mono text-sm text-white/60">
                  {editHighlight.id}
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white/80">Date Document</label>
                <div className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 font-mono text-sm text-white/60">
                  {editHighlight.date}
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white/80">Video Source URL</label>
                <input
                  type="text"
                  value={editHighlight.videoSrc}
                  onChange={e => setEditHighlight({ ...editHighlight, videoSrc: e.target.value })}
                  placeholder="https://cdn-cf-east.streamable.com/video/mp4/..."
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-[rgb(255,212,0)] font-mono text-sm"
                />
                <p className="text-xs text-white/50">
                  Make sure the URL contains &quot;cdn&quot; for optimal performance
                </p>
              </div>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setEditHighlight(null)}
                  className="pill pill-muted"
                >
                  Cancel
                </button>
                <button
                  onClick={() => updateHighlightVideoSrc(editHighlight.id, editHighlight.videoSrc.trim(), editHighlight.date)}
                  className="pill pill-active"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Preview Modal for Matches */}
        {previewMatch && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setPreviewMatch(null)}
            />
            <div className="relative w-full max-w-4xl bg-[rgb(15,15,18)] border border-white/20 rounded-xl p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Video Preview</h2>
                <button
                  onClick={() => setPreviewMatch(null)}
                  className="text-white/70 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <div className="aspect-video bg-gradient-to-br from-white/10 via-white/5 to-white/10 rounded-lg overflow-hidden border border-white/10 relative">
                {(() => {
                  const match = storeMatches.find(m => m.id === previewMatch);
                  const src = match?.videoSrc || '';
                  if (!src) {
                    return (
                      <div className="w-full h-full flex items-center justify-center text-white/50">
                        No video source available
                      </div>
                    );
                  }
                  return (
                    <>
                      {/* Default background pattern */}
                      <div className="absolute inset-0 bg-gradient-to-br from-[rgb(255,212,0)]/5 via-transparent to-blue-500/5 pointer-events-none" />
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,212,0,0.1),transparent_50%)] pointer-events-none" />
                      {/* Iframe */}
                      <iframe
                        src={src}
                        className="w-full h-full relative z-10 bg-white/5"
                        allowFullScreen
                        allow="autoplay; encrypted-media"
                        title="Video preview"
                      />
                    </>
                  );
                })()}
              </div>
              <div className="text-sm text-white/60 font-mono break-all">
                {storeMatches.find(m => m.id === previewMatch)?.videoSrc || 'No URL'}
            </div>
          </div>
        </div>
      )}

        {/* Preview Modal for Highlights */}
        {previewHighlight && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setPreviewHighlight(null)}
            />
            <div className="relative w-full max-w-4xl bg-[rgb(15,15,18)] border border-white/20 rounded-xl p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Highlight Video Preview</h2>
                  <p className="text-sm text-white/60 mt-1">
                    Verify the video plays correctly before approving
                  </p>
                </div>
                <button
                  onClick={() => setPreviewHighlight(null)}
                  className="text-white/70 hover:text-white text-2xl"
                >
                  ✕
                </button>
              </div>
              <div className="aspect-video bg-gradient-to-br from-white/10 via-white/5 to-white/10 rounded-lg overflow-hidden border border-white/10 relative">
                {(() => {
                  const highlight = highlights.find(h => h.id === previewHighlight);
                  const src = highlight?.videoSrc || '';
                  if (!src) {
                    return (
                      <div className="w-full h-full flex items-center justify-center text-white/50">
                        No video source available
                      </div>
                    );
                  }
                  
                  // Determine if it's a direct video URL or needs iframe
                  const isDirectVideo = src.includes('.mp4') || src.includes('.m3u8') || src.includes('cdn-cf-east.streamable.com');
                  
                  return (
                    <>
                      {/* Default background pattern */}
                      <div className="absolute inset-0 bg-gradient-to-br from-[rgb(255,212,0)]/5 via-transparent to-blue-500/5 pointer-events-none" />
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,212,0,0.1),transparent_50%)] pointer-events-none" />
                      
                      {isDirectVideo ? (
                        <video
                          src={src}
                          controls
                          className="w-full h-full relative z-10 bg-black"
                          autoPlay
                          playsInline
                        />
                      ) : (
                        <iframe
                          src={src}
                          className="w-full h-full relative z-10 bg-white/5"
                          allowFullScreen
                          allow="autoplay; encrypted-media; picture-in-picture"
                          title="Highlight video preview"
                        />
                      )}
                    </>
                  );
                })()}
              </div>
              <div className="space-y-2">
                <div className="text-sm text-white/60 font-mono break-all">
                  {highlights.find(h => h.id === previewHighlight)?.videoSrc || 'No URL'}
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-xs text-white/50">
                    Match: {highlights.find(h => h.id === previewHighlight)?.homeTeam || '—'} vs {highlights.find(h => h.id === previewHighlight)?.awayTeam || '—'}
                  </div>
                  <div className="text-xs text-white/50">
                    League: {highlights.find(h => h.id === previewHighlight)?.league || highlights.find(h => h.id === previewHighlight)?.category || '—'}
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                  <button
                    onClick={() => setPreviewHighlight(null)}
                    className="pill pill-muted text-sm"
                  >
                    Close
                  </button>
                  {highlights.find(h => h.id === previewHighlight)?.approved !== true && (
                    <button
                      onClick={() => {
                        const highlight = highlights.find(h => h.id === previewHighlight);
                        if (highlight) {
                          const docDate = highlight._documentDate || selectedDate;
                          updateHighlightApproval([highlight.id], true, docDate);
                          setPreviewHighlight(null);
                        }
                      }}
                      className="pill pill-active text-sm"
                    >
                      Approve This Video
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <AdminLoginGuard>
      <AdminPageContent />
    </AdminLoginGuard>
  );
}
