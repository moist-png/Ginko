import React, { useEffect, useState } from 'react';
import { supabase, Site, Job, Quote, Report } from '../utils/supabase';
import { getPendingCount, syncQueue, isOnline } from '../utils/offline';
import {
  TreePine, Briefcase, FileText, Users, Clock, AlertTriangle,
  TrendingUp, Calendar, MapPin, ChevronRight, RefreshCw, Wifi, WifiOff
} from 'lucide-react';

interface DashboardProps {
  onNavigate: (view: string) => void;
}

interface Stats {
  totalSites: number;
  totalJobs: number;
  activeJobs: number;
  completedJobsThisMonth: number;
  totalReports: number;
  pendingQuotes: number;
  upcomingJobs: Job[];
  recentSites: Site[];
  recentJobs: Job[];
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<Stats>({
    totalSites: 0, totalJobs: 0, activeJobs: 0, completedJobsThisMonth: 0,
    totalReports: 0, pendingQuotes: 0, upcomingJobs: [], recentSites: [], recentJobs: []
  });
  const [loading, setLoading] = useState(true);
  const [pendingSync, setPendingSync] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [online, setOnline] = useState(isOnline());

  useEffect(() => {
    loadStats();
    setPendingSync(getPendingCount());

    const handleOnline = () => { setOnline(true); setPendingSync(getPendingCount()); };
    const handleOffline = () => setOnline(false);
    const handleSynced = () => { setPendingSync(0); loadStats(); };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('arborpro-synced', handleSynced);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('arborpro-synced', handleSynced);
    };
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const today = now.toISOString().split('T')[0];

      const [sitesRes, jobsRes, reportsRes, quotesRes] = await Promise.all([
        supabase.from('sites').select('*').is('deleted_at', null).order('updated_at', { ascending: false }),
        supabase.from('jobs').select('*').is('deleted_at', null).order('date', { ascending: false }),
        supabase.from('reports').select('id').is('deleted_at', null),
        supabase.from('quotes').select('id').eq('status', 'new').eq('archived', false),
      ]);

      const sites: Site[] = sitesRes.data || [];
      const jobs: Job[] = jobsRes.data || [];

      const activeJobs = jobs.filter(j => j.status === 'in-progress' || j.status === 'scheduled');
      const completedThisMonth = jobs.filter(j => j.status === 'completed' && j.updated_at >= startOfMonth);
      const upcoming = jobs
        .filter(j => j.date >= today && (j.status === 'scheduled' || j.status === 'in-progress'))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 5);

      setStats({
        totalSites: sites.length,
        totalJobs: jobs.length,
        activeJobs: activeJobs.length,
        completedJobsThisMonth: completedThisMonth.length,
        totalReports: reportsRes.data?.length || 0,
        pendingQuotes: quotesRes.data?.length || 0,
        upcomingJobs: upcoming,
        recentSites: sites.slice(0, 4),
        recentJobs: jobs.slice(0, 5),
      });
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    await syncQueue();
    await loadStats();
    setPendingSync(getPendingCount());
    setSyncing(false);
  };

  // Status/type badges are intentionally neutral — a deliberate move away from
  // hue-coding so the single accent colour stays meaningful (see design handoff).

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <RefreshCw size={24} style={{ margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
          <p style={{ fontSize: '14px' }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }} className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'Newsreader, serif', fontWeight: 500, fontSize: '33px', color: 'var(--text-primary)', letterSpacing: '-0.01em', marginBottom: '6px' }}>
            Dashboard
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            {new Date().toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Online/Offline + Sync indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px',
            borderRadius: '999px', fontSize: '12px', fontWeight: '600',
            background: online ? 'var(--accent-soft)' : 'rgba(179,67,61,0.12)',
            border: `1px solid ${online ? 'var(--accent-soft-strong)' : 'rgba(179,67,61,0.3)'}`,
            color: online ? 'var(--accent)' : 'var(--danger)',
          }}>
            {online ? <Wifi size={13} /> : <WifiOff size={13} />}
            {online ? 'Online' : 'Offline'}
          </div>

          {pendingSync > 0 && (
            <button onClick={handleSync} disabled={!online || syncing} style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px',
              borderRadius: '999px', fontSize: '12px', fontWeight: '600', cursor: online ? 'pointer' : 'not-allowed',
              background: 'var(--surface-overlay)', border: '1px solid var(--border)', color: 'var(--text-secondary)',
            }}>
              <RefreshCw size={13} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
              {pendingSync} pending sync
            </button>
          )}
        </div>
      </div>

      {/* Stat Cards — accent colour reserved for the primary metric only */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
        {[
          { label: 'Tree Reports', value: stats.totalReports, icon: FileText, primary: true, action: 'sites' },
          { label: 'Pending Quotes', value: stats.pendingQuotes, icon: Clock, primary: false, action: 'quotes' },
        ].map(({ label, value, icon: Icon, primary, action }) => (
          <div key={label} onClick={() => onNavigate(action)} className="card" style={{ padding: '20px', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '9px', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={18} color={primary ? 'var(--accent)' : 'var(--text-secondary)'} />
              </div>
            </div>
            <div style={{ fontSize: '28px', fontWeight: '600', fontFamily: 'Newsreader, serif', color: primary ? 'var(--accent)' : 'var(--text-primary)', lineHeight: 1, marginBottom: '6px' }}>{value}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500' }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '20px' }}>
        {/* Upcoming Jobs */}
        <div className="card" style={{ padding: '24px', overflow: 'hidden' }}>
          <div className="grain-surface" />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2 style={{ fontFamily: 'Newsreader, serif', fontWeight: 500, fontSize: '19px', color: 'var(--text-primary)' }}>Upcoming Jobs</h2>
            <button onClick={() => onNavigate('jobs')} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>
              View all <ChevronRight size={14} />
            </button>
          </div>
          {stats.upcomingJobs.length === 0 ? (
            <div style={{ position: 'relative', textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '14px' }}>
              <Calendar size={24} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
              No upcoming jobs
            </div>
          ) : (
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {stats.upcomingJobs.map(job => (
                <div key={job.id} onClick={() => onNavigate('jobs')} style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px',
                  borderRadius: '8px', background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer'
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.title || 'Untitled Job'}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{job.client_name} · {new Date(job.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</div>
                  </div>
                  <span style={{
                    padding: '2px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: '600', flexShrink: 0,
                    background: 'var(--surface-overlay)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em'
                  }}>{job.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Sites */}
        <div className="card" style={{ padding: '24px', overflow: 'hidden' }}>
          <div className="grain-surface" />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2 style={{ fontFamily: 'Newsreader, serif', fontWeight: 500, fontSize: '19px', color: 'var(--text-primary)' }}>Recent Sites</h2>
            <button onClick={() => onNavigate('sites')} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>
              View all <ChevronRight size={14} />
            </button>
          </div>
          {stats.recentSites.length === 0 ? (
            <div style={{ position: 'relative', textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '14px' }}>
              <MapPin size={24} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
              No sites yet
            </div>
          ) : (
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {stats.recentSites.map(site => (
                <div key={site.id} onClick={() => onNavigate('sites')} style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px',
                  borderRadius: '8px', background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer'
                }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                    background: 'var(--forest-mid)', border: '1px solid var(--border-bright)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <MapPin size={14} color="var(--text-secondary)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{site.name || 'Untitled Site'}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{site.client_name || 'No client'}</div>
                  </div>
                  {site.portal_enabled && (
                    <span style={{ padding: '2px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: '600', background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-soft-strong)', flexShrink: 0 }}>Portal</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card" style={{ padding: '24px', overflow: 'hidden' }}>
        <div className="grain-surface" />
        <h2 style={{ position: 'relative', fontFamily: 'Newsreader, serif', fontWeight: 500, fontSize: '19px', color: 'var(--text-primary)', marginBottom: '16px' }}>Quick Actions</h2>
        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
          {[
            { label: 'New Job', icon: Briefcase, action: 'new-job' },
            { label: 'New Site', icon: MapPin, action: 'new-site' },
            { label: 'New Quote', icon: FileText, action: 'new-quote' },
            { label: 'Risk Assessment', icon: AlertTriangle, action: 'new-risk' },
            { label: 'Team', icon: Users, action: 'team' },
          ].map(({ label, icon: Icon, action }) => (
            <button key={action} onClick={() => onNavigate(action)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
              padding: '16px 10px', borderRadius: '9px', cursor: 'pointer', transition: 'all 0.15s',
              background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)',
            }}>
              <Icon size={20} color="var(--accent)" />
              <span style={{ fontSize: '12px', fontWeight: '500' }}>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
