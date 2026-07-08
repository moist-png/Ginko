import React, { useState } from 'react';
import { Site } from '../types';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { ConfirmationModal } from './ConfirmationModal';
import { db } from '../utils/offline';
import { fromDbSite, toDbSite } from '../utils/mappers';

interface SiteEditorProps {
  site: Site;
  onSave: (site: Site) => void;
  onDelete?: (siteId: string) => void;
  onBack: () => void;
  isNew?: boolean;
}

export const SiteEditor: React.FC<SiteEditorProps> = ({
  site,
  onSave,
  onDelete,
  onBack,
  isNew = false
}) => {
  const [editingSite, setEditingSite] = useState<Site>(fromDbSite(site));
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setSaveError('');
    try {
      await db.upsert('sites', toDbSite(editingSite));
      onSave(editingSite);
    } catch (err: any) {
      setSaveError(err?.message || 'Could not save. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    setShowDeleteConfirmation(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await db.softDelete('sites', site.id);
    } catch { /* still close the editor */ }
    if (onDelete) onDelete(site.id);
  };

  const updateSite = (field: keyof Site, value: any) => {
    setEditingSite(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="h-full flex flex-col">
      <div className="bg-[var(--surface-raised)] shadow-sm border-b border-[var(--border)] p-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors shrink-0"
            >
              <ArrowLeft size={20} />
              <span className="hidden sm:inline">Back to Sites</span>
            </button>
            <h1 className="text-lg sm:text-2xl font-bold text-[var(--text-primary)] truncate">
              {isNew ? 'New Site Registry' : 'Edit Site Registry'}
            </h1>
          </div>
          <div className="flex gap-2">
            {!isNew && onDelete && (
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 bg-[var(--danger)] text-[var(--cream)] px-4 py-2 rounded-lg hover:opacity-90 transition-colors"
              >
                <Trash2 size={20} />
                Delete Site
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-[var(--canopy)] text-[var(--cream)] px-4 py-2 rounded-lg hover:bg-[var(--forest-light)] transition-colors disabled:opacity-50"
            >
              <Save size={20} />
              {saving ? 'Saving…' : 'Save Site'}
            </button>
          </div>
        </div>
        {saveError && <p className="text-sm text-[#b3433d] mt-2">{saveError}</p>}
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-[var(--surface-raised)] rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-6">Site Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Site Name *
                </label>
                <input
                  type="text"
                  value={editingSite.name}
                  onChange={(e) => updateSite('name', e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                  placeholder="e.g., Greenwood Elementary School, Central Park East"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Description
                </label>
                <textarea
                  value={editingSite.description}
                  onChange={(e) => updateSite('description', e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent resize-none"
                  rows={3}
                  placeholder="Brief description of the site and assessment purpose"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Site Address
                </label>
                <input
                  type="text"
                  value={editingSite.address}
                  onChange={(e) => updateSite('address', e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                  placeholder="Full address of the site"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Client Name
                  </label>
                  <input
                    type="text"
                    value={editingSite.clientName}
                    onChange={(e) => updateSite('clientName', e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                    placeholder="Client or organization name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Client Phone
                  </label>
                  <input
                    type="tel"
                    value={editingSite.clientPhone}
                    onChange={(e) => updateSite('clientPhone', e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                    placeholder="Client phone number"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Client Email
                </label>
                <input
                  type="email"
                  value={editingSite.clientEmail}
                  onChange={(e) => updateSite('clientEmail', e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                  placeholder="Client email address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Info
                </label>
                <textarea
                  value={editingSite.description}
                  onChange={(e) => updateSite('description', e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent resize-none"
                  rows={3}
                  placeholder="Additional information about the site"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showDeleteConfirmation}
        onClose={() => setShowDeleteConfirmation(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Site"
        message="Are you sure you want to delete this site? This will also move all associated trees to trash. Items can be recovered for a short while after deletion."
        confirmButtonText="Move to Trash"
        cancelButtonText="Keep Site"
        isDestructive={true}
      />
    </div>
  );
};