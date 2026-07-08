import React, { useState } from 'react';
import { Site } from '../types';
import { formatDate } from '../utils/storage';
import { Plus, Search, Building2, Calendar, User, MapPin, TreePine, ArrowRight, Download } from 'lucide-react';
import { exportSitesCSV } from '../utils/exportUtils';
import { canUserEdit } from '../utils/auth';
import { ExportModal } from './ExportModal';

interface SiteListProps {
  sites: Site[];
  onSelectSite: (site: Site) => void;
  onCreateSite: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  getTreeCountForSite: (siteId: string) => number;
}

export const SiteList: React.FC<SiteListProps> = ({ sites, onSelectSite, onCreateSite, searchQuery, onSearchChange, getTreeCountForSite }) => {
  const [showExportModal, setShowExportModal] = useState(false);
  const canEdit = canUserEdit();

  const filteredSites = sites.filter(site =>
    site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    site.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    site.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    site.clientName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: 'Newsreader, serif', fontSize: '32px', color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '4px' }}>
            Site Registry
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            {sites.length} {sites.length === 1 ? 'site' : 'sites'} registered
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={() => setShowExportModal(true)} className="btn-secondary" style={{ padding: '9px 12px' }} title="Export">
            <Download size={16} />
          </button>
          {canEdit && (
            <button onClick={onCreateSite} className="btn-primary">
              <Plus size={16} /> New Site
            </button>
          )}
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          type="text"
          placeholder="Search sites, clients, addresses..."
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          className="input-field"
          style={{ paddingLeft: '42px' }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredSites.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 24px' }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '14px',
              background: 'var(--surface-raised)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
            }}>
              <Building2 size={24} color="var(--text-muted)" />
            </div>
            <h3 style={{ fontFamily: 'Newsreader, serif', fontSize: '20px', color: 'var(--text-primary)', marginBottom: '8px' }}>
              {searchQuery ? 'No results found' : 'No sites yet'}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>
              {searchQuery ? 'Try different search terms' : 'Add your first site to get started'}
            </p>
            {!searchQuery && canEdit && (
              <button onClick={onCreateSite} className="btn-primary">
                <Plus size={16} /> Create First Site
              </button>
            )}
          </div>
        ) : (
          filteredSites.map(site => {
            const treeCount = getTreeCountForSite(site.id);
            return (
              <div key={site.id} onClick={() => onSelectSite(site)} className="card" style={{ padding: '20px 24px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                        background: 'rgba(138,111,76,0.3)', border: '1px solid var(--border-bright)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <Building2 size={16} color="var(--leaf)" />
                      </div>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {site.name || 'Untitled Site'}
                      </h3>
                    </div>
                    {site.description && (
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px', marginLeft: '42px' }}>{site.description}</p>
                    )}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginLeft: '42px' }}>
                      {site.clientName && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                          <User size={13} color="var(--text-muted)" />{site.clientName}
                        </span>
                      )}
                      {site.address && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                          <MapPin size={13} color="var(--text-muted)" />{site.address}
                        </span>
                      )}
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        <Calendar size={13} color="var(--text-muted)" />{formatDate(site.updatedAt)}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--leaf)', fontSize: '14px', fontWeight: '600' }}>
                        <TreePine size={14} />{treeCount}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{treeCount === 1 ? 'tree' : 'trees'}</div>
                    </div>
                    <ArrowRight size={16} color="var(--text-muted)" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Site Registry"
        data={sites}
        exportFunctions={{ csv: () => exportSitesCSV(sites) }}
        emailOptions={{ defaultSubject: 'Site Registry Export', defaultBody: 'Please find the attached site registry export.' }}
      />
    </div>
  );
};
