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
  const [activeTab, setActiveTab] = useState<'store' | 'approved' | 'trending' | 'predictions'>('store');
  const [trendingRows, setTrendingRows] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loadingPredictions, setLoadingPredictions] = useState(false);
  const [selectedPredictions, setSelectedPredictions] = useState<Record<string, boolean>>({});
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

  async function loadPredictions(date?: string) {
    const targetDate = date || selectedDate;
    setLoadingPredictions(true);
    try {
      const res = await fetch(`/api/admin/moderate/predictions?date=${encodeURIComponent(targetDate)}`, {
        cache: 'no-store',
        headers: { 'x-internal-token': token },
      });
      const data = await res.json();
      const predictionsData = Array.isArray(data.rows) ? data.rows : [];
      setPredictions(predictionsData);
      addToast(`Loaded ${predictionsData.length} prediction(s) for ${targetDate}`, 'success');
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
      if (!res.ok) throw new Error('Failed to update');
      if (reload) {
        addToast(`Prediction ${approved ? 'approved' : 'unapproved'}`, 'success');
        await loadPredictions();
      }
    } catch (err: any) {
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
  // Trending matches: Use directly from Firestore API (only matches with isTrending == true)
  const trendingMatches = useMemo(() => trendingRows.filter((m: any) => m && m.id), [trendingRows]);

  const matchesByTab = useMemo(() => {
    switch (activeTab) {
      case 'store':
        return storeMatches;
      case 'approved':
        return approvedMatches;
      case 'trending':
        // Only show matches that are explicitly marked as trending in Firestore
        return trendingMatches;
      default:
        return storeMatches;
    }
  }, [activeTab, storeMatches, approvedMatches, trendingMatches]);

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
                  disabled={loading || loadingPredictions}
                  className="pill pill-active disabled:opacity-50 whitespace-nowrap"
                >
                  {loading || loadingPredictions ? (
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="surface p-4">
            <div className="text-sm text-white/60 mb-1">In Store</div>
            <div className="text-2xl font-bold text-blue-400">{storeMatches.length}</div>
          </div>
          <div className="surface p-4">
            <div className="text-sm text-white/60 mb-1">Approved</div>
            <div className="text-2xl font-bold text-green-400">{approvedMatches.length}</div>
          </div>
          <div className="surface p-4">
            <div className="text-sm text-white/60 mb-1">Trending</div>
            <div className="text-2xl font-bold text-purple-400">{trendingMatches.length}</div>
          </div>
        </div>

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
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'store'
                ? 'border-blue-400 text-blue-400'
                : 'border-transparent text-white/60 hover:text-white/80'
            }`}
          >
            In Store ({storeMatches.length})
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'approved'
                ? 'border-green-400 text-green-400'
                : 'border-transparent text-white/60 hover:text-white/80'
            }`}
          >
            On Web ({approvedMatches.length})
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
      </div>

        {/* Search and Bulk Actions - Only show for matches tabs */}
        {activeTab !== 'predictions' && (
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
        {activeTab !== 'predictions' && (
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
                    // Check if match is trending: either in trendingRows (from Firestore API) or has isTrending flag
                    const trending = trendingMatches.some((m: any) => m.id === match.id) || storeMatch?.isTrending === true || storeMatch?.trending === true;
                    return (
                      <tr
                        key={match.id}
                        className="border-t border-white/10 hover:bg-white/5 transition-colors"
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
                            <span className="pill pill-muted !text-xs">No</span>
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

      {/* Predictions Tab Content */}
      {activeTab === 'predictions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Predictions Management</h2>
              <p className="text-sm text-white/60 mt-1">Manage prediction outcomes and status</p>
            </div>
            <div className="flex items-center gap-2">
              {Object.keys(selectedPredictions).filter(id => selectedPredictions[id]).length > 0 && (
                <button
                  onClick={approveSelectedPredictions}
                  disabled={loadingPredictions}
                  className="pill pill-active disabled:opacity-50"
                >
                  Approve All Selected ({Object.keys(selectedPredictions).filter(id => selectedPredictions[id]).length})
                </button>
              )}
              <button
                onClick={() => loadPredictions()}
                disabled={loadingPredictions}
                className="pill pill-active disabled:opacity-50"
              >
                {loadingPredictions ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>

          {loadingPredictions ? (
            <div className="surface p-12 text-center">
              <div className="text-white/60">Loading predictions...</div>
            </div>
          ) : predictions.length === 0 ? (
            <div className="surface p-12 text-center">
              <div className="text-white/60">No predictions found for today</div>
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
                      <th className="text-left p-4 text-sm font-semibold text-white/80">Time</th>
                      <th className="text-left p-4 text-sm font-semibold text-white/80">Match</th>
                      <th className="text-left p-4 text-sm font-semibold text-white/80">League</th>
                      <th className="text-left p-4 text-sm font-semibold text-white/80">Prediction</th>
                      <th className="text-left p-4 text-sm font-semibold text-white/80">MSBS</th>
                      <th className="text-center p-4 text-sm font-semibold text-white/80">Approved</th>
                      <th className="text-center p-4 text-sm font-semibold text-white/80">Status</th>
                      <th className="text-center p-4 text-sm font-semibold text-white/80">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {predictions.map((pred: any) => {
                      const status = pred.status || 'pending';
                      const isWon = status === 'won';
                      const isFailed = status === 'failed';
                      const isApproved = pred.approved === true;
                      
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
                          <td className="p-4 text-sm">
                            <div className="space-y-1">
                              <div className="text-white/80">{pred.msbs || '—'}</div>
                              <div className="text-white/60 text-xs">
                                Winner: {pred.msbsWinner || '—'}
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-sm text-white/70">
                            {pred.msbs || '—'}
                          </td>
                          <td className="p-4 text-center">
                            {isApproved ? (
                              <span className="pill pill-active !text-xs bg-green-500/20 text-green-400 border-green-500/40">Yes</span>
                            ) : (
                              <span className="pill pill-muted !text-xs">No</span>
                            )}
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
                                onClick={() => updatePredictionApproval(pred.id, !isApproved)}
                                className={`pill text-xs ${
                                  isApproved
                                    ? 'pill-active bg-green-500/20 text-green-400 border-green-500/40'
                                    : 'pill-muted hover:bg-green-500/10 hover:border-green-500/30'
                                }`}
                              >
                                {isApproved ? '✓ Approved' : 'Approve'}
                              </button>
                              {/* Status is automatically updated by results scraper every 30 minutes */}
                              {pred.result && (
                                <span className="text-xs text-white/60">
                                  Result: {pred.result} 
                                  {pred.status && (
                                    <span className={`ml-2 ${pred.status === 'won' ? 'text-green-400' : 'text-red-400'}`}>
                                      ({pred.status})
                                    </span>
                                  )}
                                </span>
                              )}
                              {!pred.result && pred.status && (
                                <span className={`text-xs ${pred.status === 'won' ? 'text-green-400' : 'text-red-400'}`}>
                                  {pred.status}
                                </span>
                              )}
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

        {/* Edit VideoSrc Modal */}
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

        {/* Preview Modal */}
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
