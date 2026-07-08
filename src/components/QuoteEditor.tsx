import React, { useState } from 'react';
import { Quote, LineItem } from '../types';
import { ArrowLeft, Save, Trash2, Plus, Clock, Archive, Download, ExternalLink, Users } from 'lucide-react';
import { exportSingleQuote } from '../utils/exportUtils';
import { XeroIntegration } from './XeroIntegration';
import { ExportModal } from './ExportModal';
import { BoardThread } from './BoardThread';
import { db } from '../utils/offline';
import { supabase, TeamMember } from '../utils/supabase';
import { fromDbQuote, toDbQuote } from '../utils/mappers';
import { notifyAssignment } from '../utils/notifications';

interface QuoteEditorProps {
  quote: Quote;
  teamMembers: TeamMember[];
  onSave: (quote: Quote) => void;
  onDelete?: (quoteId: string) => void;
  onArchive?: (quoteId: string) => void;
  onBack: () => void;
  isNew?: boolean;
}

export const QuoteEditor: React.FC<QuoteEditorProps> = ({
  quote,
  teamMembers,
  onSave,
  onDelete,
  onArchive,
  onBack,
  isNew = false
}) => {
  const [editingQuote, setEditingQuote] = useState<Quote>(fromDbQuote(quote));
  const [showXeroModal, setShowXeroModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setSaveError('');
    try {
      const previousAssigned = quote.assignedTo || [];
      await db.upsert('quotes', toDbQuote(editingQuote));
      const newlyAssigned = (editingQuote.assignedTo || []).filter(id => !previousAssigned.includes(id));
      if (newlyAssigned.length > 0) {
        await notifyAssignment(teamMembers, newlyAssigned, {
          title: `Assigned to quote: ${editingQuote.clientName || 'Unnamed Client'}`,
          linkType: 'quote', linkId: editingQuote.id,
        });
      }
      onSave(editingQuote);
    } catch (err: any) {
      setSaveError(err?.message || 'Could not save. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const toggleAssignee = (id: string) => {
    setEditingQuote(prev => {
      const current = prev.assignedTo || [];
      const next = current.includes(id) ? current.filter(x => x !== id) : [...current, id];
      return { ...prev, assignedTo: next };
    });
  };

  const handleDelete = async () => {
    if (onDelete && window.confirm('Are you sure you want to delete this quote?')) {
      try {
        await supabase.from('quotes').delete().eq('id', quote.id);
      } catch { /* still close */ }
      onDelete(quote.id);
    }
  };

  const handleArchive = () => {
    if (onArchive && window.confirm('Are you sure you want to archive this quote? It will be moved to the archived section.')) {
      onArchive(quote.id);
    }
  };
  const updateQuote = (field: keyof Quote, value: any) => {
    setEditingQuote(prev => ({ ...prev, [field]: value }));
  };

  const addLineItem = () => {
    const newItem: LineItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      description: ''
    };
    setEditingQuote(prev => ({
      ...prev,
      jobDescription: [...prev.jobDescription, newItem]
    }));
  };

  const updateLineItem = (id: string, description: string) => {
    setEditingQuote(prev => ({
      ...prev,
      jobDescription: prev.jobDescription.map(item =>
        item.id === id ? { ...item, description } : item
      )
    }));
  };

  const removeLineItem = (id: string) => {
    setEditingQuote(prev => ({
      ...prev,
      jobDescription: prev.jobDescription.filter(item => item.id !== id)
    }));
  };

  // Generate time options in 30-minute intervals
  const timeOptions = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeOptions.push(timeString);
    }
  }

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
              <span className="hidden sm:inline">Back to Quotes</span>
            </button>
            <h1 className="text-lg sm:text-2xl font-bold text-[var(--text-primary)] truncate">
              {isNew ? 'New Quote' : 'Edit Quote'}
            </h1>
          </div>
          <div className="flex gap-2 flex-wrap">
            {!isNew && onDelete && (
              <>
                <button
                  onClick={() => setShowExportModal(true)}
                  className="p-2 border border-[var(--border)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--forest)] transition-colors"
                  title="Export Data"
                >
                  <Download size={16} />
                </button>
                <button
                  onClick={() => setShowXeroModal(true)}
                  className="flex items-center gap-2 border border-[var(--border)] text-[var(--text-secondary)] px-4 py-2 rounded-lg hover:bg-[var(--surface-overlay)] transition-colors"
                >
                  <ExternalLink size={20} />
                  Send to Xero
                </button>
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 bg-[var(--danger)] text-[var(--cream)] px-4 py-2 rounded-lg hover:opacity-90 transition-colors"
                >
                  <Trash2 size={20} />
                  Delete
                </button>
              </>
            )}
            {!isNew && onArchive && !quote.archived && (
              <button
                onClick={handleArchive}
                className="flex items-center gap-2 border border-[var(--border)] text-[var(--text-primary)] px-4 py-2 rounded-lg hover:bg-[var(--forest)] transition-colors"
              >
                <Archive size={20} />
                Archive
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-[var(--canopy)] text-[var(--cream)] px-4 py-2 rounded-lg hover:bg-[var(--forest-light)] transition-colors disabled:opacity-50"
            >
              <Save size={20} />
              {saving ? 'Saving…' : 'Save Quote'}
            </button>
          </div>
        </div>
        {saveError && <p className="text-sm text-[#b3433d] mt-2">{saveError}</p>}
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Client Information */}
          <div className="bg-[var(--surface-raised)] rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-6">Client Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Client Name *
                </label>
                <input
                  type="text"
                  value={editingQuote.clientName}
                  onChange={(e) => updateQuote('clientName', e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                  placeholder="Enter client name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Address
                </label>
                <input
                  type="text"
                  value={editingQuote.address}
                  onChange={(e) => updateQuote('address', e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                  placeholder="Enter property address"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Mobile
                  </label>
                  <input
                    type="tel"
                    value={editingQuote.mobile}
                    onChange={(e) => updateQuote('mobile', e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                    placeholder="Mobile number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Site Contact (if different)
                  </label>
                  <input
                    type="text"
                    value={editingQuote.siteContact}
                    onChange={(e) => updateQuote('siteContact', e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                    placeholder="Site contact person"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Scheduled Time */}
          <div className="bg-[var(--surface-raised)] rounded-lg shadow-md p-6">
            <div className="flex items-center gap-2 mb-6">
              <Clock className="text-[var(--leaf)]" size={24} />
              <h2 className="text-xl font-semibold">Scheduled Time</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={editingQuote.scheduledDate}
                  onChange={(e) => updateQuote('scheduledDate', e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Time
                </label>
                <select
                  value={editingQuote.scheduledTime}
                  onChange={(e) => updateQuote('scheduledTime', e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                >
                  {timeOptions.map(time => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Job Description */}
          <div className="bg-[var(--surface-raised)] rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Job Description</h2>
              <button
                onClick={addLineItem}
                className="flex items-center gap-2 bg-[var(--canopy)] text-[var(--cream)] px-4 py-2 rounded-lg hover:bg-[var(--forest-light)] transition-colors"
              >
                <Plus size={20} />
                Add Line Item
              </button>
            </div>

            <div className="space-y-3">
              {editingQuote.jobDescription.map((item, index) => (
                <div key={item.id} className="flex items-center gap-3">
                  <span className="text-sm text-[var(--text-muted)] font-medium min-w-[20px]">
                    {index + 1}.
                  </span>
                  <textarea
                    value={item.description}
                    onChange={(e) => updateLineItem(item.id, e.target.value)}
                    className="flex-1 px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent resize-none"
                    rows={2}
                    placeholder="Enter job description item..."
                  />
                  {editingQuote.jobDescription.length > 1 && (
                    <button
                      onClick={() => removeLineItem(item.id)}
                      className="text-[var(--danger)] hover:opacity-80 transition-colors p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Additional Details */}
          <div className="bg-[var(--surface-raised)] rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-6">Additional Details</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Additional Equipment
                </label>
                <textarea
                  value={editingQuote.additionalEquipment}
                  onChange={(e) => updateQuote('additionalEquipment', e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent resize-none"
                  rows={4}
                  placeholder="List any additional equipment needed for the job..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Access and Parking
                </label>
                <textarea
                  value={editingQuote.accessParking}
                  onChange={(e) => updateQuote('accessParking', e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent resize-none"
                  rows={4}
                  placeholder="Describe access requirements, parking arrangements, site constraints..."
                />
              </div>
            </div>
          </div>

          {/* Assigned To */}
          <div className="bg-[var(--surface-raised)] rounded-lg shadow-md p-6">
            <div className="flex items-center gap-2 mb-6">
              <Users className="text-[var(--leaf)]" size={24} />
              <h2 className="text-xl font-semibold">Assigned To</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {teamMembers.filter(m => m.active).length === 0 && (
                <p className="text-xs text-[var(--text-muted)]">No active team members yet — add some on the Team page.</p>
              )}
              {teamMembers.filter(m => m.active).map(member => {
                const selected = (editingQuote.assignedTo || []).includes(member.id);
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => toggleAssignee(member.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '999px',
                      fontSize: '13px', fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
                      background: selected ? member.colour + '26' : 'transparent',
                      border: `1px solid ${selected ? member.colour : 'var(--border)'}`,
                      color: selected ? 'var(--text-primary)' : 'var(--text-muted)',
                    }}
                  >
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: member.colour, flexShrink: 0 }} />
                    {member.name}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-2">
              {(editingQuote.assignedTo || []).length === 0 ? 'Unassigned — visible to the whole team until someone is picked.' : 'Assigned people are notified when you save.'}
            </p>
          </div>

          {/* Quote Status */}
          <div className="bg-[var(--surface-raised)] rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-6">Quote Status</h2>
            
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Status
              </label>
              <select
                value={editingQuote.status}
                onChange={(e) => updateQuote('status', e.target.value as any)}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
              >
                <option value="new">New</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
              </select>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-sm text-[var(--text-secondary)]">Current status:</span>
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
                  editingQuote.status === 'new' ? 'bg-[var(--surface-overlay)] text-[var(--text-secondary)]' :
                  editingQuote.status === 'scheduled' ? 'bg-[var(--surface-overlay)] text-[var(--text-secondary)]' :
                  'bg-[rgba(138,111,76,0.15)] text-[var(--accent)]'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    editingQuote.status === 'new' ? 'bg-[var(--text-muted)]' :
                    editingQuote.status === 'scheduled' ? 'bg-[var(--text-muted)]' :
                    'bg-[var(--accent-soft)]0'
                  }`}></div>
                  {editingQuote.status.charAt(0).toUpperCase() + editingQuote.status.slice(1)}
                </div>
              </div>
            </div>
          </div>

          {!isNew && (
            <div className="bg-[var(--surface-raised)] rounded-lg shadow-md p-6">
              <BoardThread contextType="quote" contextId={editingQuote.id} teamMembers={teamMembers} notifyTitle={`New comment on quote: ${editingQuote.clientName || 'Unnamed Client'}`} />
            </div>
          )}
        </div>
      </div>

      <XeroIntegration
        quote={editingQuote}
        isOpen={showXeroModal}
        onClose={() => setShowXeroModal(false)}
        onSuccess={(xeroQuoteId) => {
          console.log('Quote sent to Xero:', xeroQuoteId);
          setShowXeroModal(false);
        }}
      />

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Quote"
        data={editingQuote}
        exportFunctions={{
          report: () => exportSingleQuote(editingQuote)
        }}
        emailOptions={{
          defaultSubject: `Quote - ${editingQuote.clientName}`,
          defaultBody: `Please find the attached quote for ${editingQuote.clientName}. This includes detailed job descriptions, scheduling information, and service requirements.`
        }}
      />
    </div>
  );
};