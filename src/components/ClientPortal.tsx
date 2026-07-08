import React, { useEffect, useState } from 'react';
import { supabase, Site, Report, Photo } from '../utils/supabase';
import { Link, Globe, Copy, Check, Eye, EyeOff, TreePine, ImageIcon } from 'lucide-react';

interface ClientPortalProps {
  site: Site;
  onClose: () => void;
}

export const ClientPortal: React.FC<ClientPortalProps> = ({ site, onClose }) => {
  const [enabled, setEnabled] = useState(site.portal_enabled);
  const [copied, setCopied] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [saving, setSaving] = useState(false);

  const portalUrl = `${window.location.origin}/portal/${site.client_portal_token}`;

  useEffect(() => {
    if (enabled) loadPortalData();
  }, [enabled]);

  const loadPortalData = async () => {
    const [reportsRes, photosRes] = await Promise.all([
      supabase.from('reports').select('*').eq('site_id', site.id).is('deleted_at', null),
      supabase.from('photos').select('*').eq('site_id', site.id).order('taken_at', { ascending: false }),
    ]);
    setReports(reportsRes.data || []);
    setPhotos(photosRes.data || []);
  };

  const handleToggle = async () => {
    setSaving(true);
    const newVal = !enabled;
    await supabase.from('sites').update({ portal_enabled: newVal }).eq('id', site.id);
    setEnabled(newVal);
    setSaving(false);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px'
    }}>
      <div style={{
        background: 'var(--surface-raised)', border: '1px solid var(--border)',
        borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '560px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)', maxHeight: '85vh', overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(138,111,76,0.15)', border: '1px solid rgba(138,111,76,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Globe size={20} color="var(--leaf)" />
          </div>
          <div>
            <h2 style={{ fontFamily: 'Newsreader, serif', fontSize: '20px', color: 'var(--text-primary)' }}>Client Portal</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{site.name}</p>
          </div>
        </div>

        {/* Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderRadius: '10px', background: 'var(--forest)', border: '1px solid var(--border)', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '2px' }}>Portal Access</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{enabled ? 'Clients can view this site via the link' : 'Portal is currently disabled'}</div>
          </div>
          <button onClick={handleToggle} disabled={saving} style={{
            width: '48px', height: '26px', borderRadius: '999px', cursor: 'pointer', border: 'none',
            background: enabled ? 'var(--canopy)' : 'var(--surface-overlay)', position: 'relative', transition: 'all 0.2s'
          }}>
            <div style={{
              width: '20px', height: '20px', borderRadius: '50%', background: 'var(--cream)',
              position: 'absolute', top: '3px', transition: 'all 0.2s',
              left: enabled ? '25px' : '3px'
            }} />
          </button>
        </div>

        {enabled && (
          <>
            {/* Portal URL */}
            <div style={{ marginBottom: '20px' }}>
              <label>Share this link with {site.client_name || 'your client'}</label>
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <div style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', background: 'var(--forest)', border: '1px solid var(--border)', fontSize: '13px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {portalUrl}
                </div>
                <button onClick={handleCopy} className="btn-primary" style={{ flexShrink: 0, padding: '10px 14px' }}>
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            {/* What clients can see */}
            <div style={{ marginBottom: '20px', padding: '16px', borderRadius: '10px', background: 'var(--forest)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px' }}>Clients can see</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <TreePine size={14} color="var(--leaf)" />
                  <span>{reports.length} tree {reports.length === 1 ? 'report' : 'reports'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <ImageIcon size={14} color="var(--leaf)" />
                  <span>{photos.length} {photos.length === 1 ? 'photo' : 'photos'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
                  <EyeOff size={14} />
                  <span>Cannot see jobs, quotes, costs, or other client data</span>
                </div>
              </div>
            </div>
          </>
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Close</button>
        </div>
      </div>
    </div>
  );
};

// =============================================
// Portal View — shown to clients via token URL
// =============================================
export const PortalView: React.FC<{ token: string }> = ({ token }) => {
  const [site, setSite] = useState<Site | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: siteData, error: siteErr } = await supabase
        .from('sites').select('*').eq('client_portal_token', token).eq('portal_enabled', true).single();
      if (siteErr || !siteData) { setError("This portal link is invalid or has been disabled."); setLoading(false); return; }
      setSite(siteData);

      const [reportsRes, photosRes] = await Promise.all([
        supabase.from('reports').select('*').eq('site_id', siteData.id).is('deleted_at', null).order('date', { ascending: false }),
        supabase.from('photos').select('*').eq('site_id', siteData.id).order('taken_at', { ascending: false }),
      ]);
      setReports(reportsRes.data || []);
      setPhotos(photosRes.data || []);
      setLoading(false);
    };
    load();
  }, [token]);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--forest)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
      Loading...
    </div>
  );

  if (error || !site) return (
    <div style={{ minHeight: '100vh', background: 'var(--forest)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ textAlign: 'center', maxWidth: '400px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌲</div>
        <h1 style={{ fontFamily: 'Newsreader, serif', fontSize: '24px', color: 'var(--text-primary)', marginBottom: '8px' }}>Portal Not Found</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{error}</p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--forest)' }}>
      {/* Header */}
      <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '20px 24px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'linear-gradient(135deg, var(--canopy), var(--forest-light))', border: '1px solid var(--border-bright)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TreePine size={20} color="var(--leaf)" />
          </div>
          <div>
            <div style={{ fontFamily: 'Newsreader, serif', fontSize: '18px', color: 'var(--text-primary)' }}>Ginkgo</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Client Portal</div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
        {/* Site info */}
        <div>
          <h1 style={{ fontFamily: 'Newsreader, serif', fontSize: '28px', color: 'var(--text-primary)', marginBottom: '6px' }}>{site.name}</h1>
          {site.address && <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{site.address}</p>}
        </div>

        {/* Tree Reports */}
        {reports.length > 0 && (
          <div>
            <div style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px' }}>Tree Assessments ({reports.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {reports.map(r => (
                <div key={r.id} className="card" style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>{r.title || 'Tree Assessment'}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{r.date} · {r.inspector && `Inspector: ${r.inspector}`}</div>
                    </div>
                    <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', background: r.status === 'completed' ? 'rgba(138,111,76,0.15)' : 'rgba(138,111,76,0.15)', color: r.status === 'completed' ? 'var(--leaf)' : 'var(--amber-light)' }}>{r.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Photos */}
        {photos.length > 0 && (
          <div>
            <div style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px' }}>Site Photos ({photos.length})</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
              {photos.map(photo => (
                <div key={photo.id} onClick={() => setSelectedPhoto(photo)} style={{ borderRadius: '10px', overflow: 'hidden', cursor: 'pointer', border: '1px solid var(--border)', aspectRatio: '4/3', position: 'relative' }}>
                  <img src={photo.url} alt={photo.caption} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  {photo.caption && (
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '8px', background: 'linear-gradient(transparent, rgba(0,0,0,0.7))', fontSize: '12px', color: 'white' }}>
                      {photo.caption}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {reports.length === 0 && photos.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)', fontSize: '14px' }}>
            No reports or photos have been added yet.
          </div>
        )}

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
          Powered by Ginkgo
        </div>
      </main>

      {/* Photo lightbox */}
      {selectedPhoto && (
        <div onClick={() => setSelectedPhoto(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', cursor: 'zoom-out' }}>
          <img src={selectedPhoto.url} alt={selectedPhoto.caption} style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px' }} />
          {selectedPhoto.caption && (
            <div style={{ position: 'absolute', bottom: '32px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.7)', color: 'white', padding: '8px 16px', borderRadius: '999px', fontSize: '13px' }}>
              {selectedPhoto.caption}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
