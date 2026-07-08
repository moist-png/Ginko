import React, { useState, useEffect } from 'react';
import { Job, Site } from '../types';
import { ArrowLeft, Save, Trash2, Clock, Download, Users } from 'lucide-react';
import { exportSingleJob } from '../utils/exportUtils';
import { supabase, TeamMember } from '../utils/supabase';
import { ExportModal } from './ExportModal';
import { ConfirmationModal } from './ConfirmationModal';
import { BoardThread } from './BoardThread';
import { db } from '../utils/offline';
import { fromDbJob, toDbJob } from '../utils/mappers';
import { notifyAssignment, notifyStatusChange } from '../utils/notifications';
import { isSupervisorOrAbove } from '../utils/auth';

const JOB_STATUS_OPTIONS: { value: Job['status']; label: string }[] = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

interface JobEditorProps {
  job: Job;
  teamMembers: TeamMember[];
  onSave: (job: Job) => void;
  onDelete?: (jobId: string) => void;
  onBack: () => void;
  isNew?: boolean;
}

export const JobEditor: React.FC<JobEditorProps> = ({
  job,
  teamMembers,
  onSave,
  onDelete,
  onBack,
  isNew = false
}) => {
  const [editingJob, setEditingJob] = useState<Job>(fromDbJob(job));
  const [showExportModal, setShowExportModal] = useState(false);
  const [sites, setSites] = useState<Site[]>([]);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const canCancel = isSupervisorOrAbove();

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('sites')
        .select('*')
        .is('deleted_at', null)
        .order('name', { ascending: true });
      if (data) setSites(data as any);
    })();
  }, []);

  // Calculate time spent when start/end times change
  useEffect(() => {
    if (editingJob.startTime && editingJob.endTime) {
      const start = new Date(`2000-01-01T${editingJob.startTime}`);
      const end = new Date(`2000-01-01T${editingJob.endTime}`);
      
      if (end > start) {
        const diffMs = end.getTime() - start.getTime();
        const diffMinutes = Math.round(diffMs / (1000 * 60));
        setEditingJob(prev => ({ ...prev, timeSpent: diffMinutes }));
      }
    }
  }, [editingJob.startTime, editingJob.endTime]);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setSaveError('');
    try {
      const previousAssigned = job.assignedTo || [];
      const previousStatus = job.status;
      await db.upsert('jobs', toDbJob(editingJob));

      const newlyAssigned = (editingJob.assignedTo || []).filter(id => !previousAssigned.includes(id));
      if (newlyAssigned.length > 0) {
        await notifyAssignment(teamMembers, newlyAssigned, {
          title: `Assigned to job: ${editingJob.title || 'Untitled Job'}`,
          linkType: 'job', linkId: editingJob.id,
        });
      }
      if (!isNew && previousStatus !== editingJob.status) {
        const stillAssigned = (editingJob.assignedTo || []).filter(id => !newlyAssigned.includes(id));
        await notifyStatusChange(teamMembers, stillAssigned, {
          title: `Job "${editingJob.title || 'Untitled Job'}" is now ${editingJob.status}`,
          linkType: 'job', linkId: editingJob.id,
        });
      }
      onSave(editingJob);
    } catch (err: any) {
      setSaveError(err?.message || 'Could not save. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const toggleAssignee = (id: string) => {
    setEditingJob(prev => {
      const current = prev.assignedTo || [];
      const next = current.includes(id) ? current.filter(x => x !== id) : [...current, id];
      return { ...prev, assignedTo: next };
    });
  };

  const handleDelete = () => {
    setShowDeleteConfirmation(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await db.softDelete('jobs', job.id);
    } catch { /* still close the editor */ }
    if (onDelete) onDelete(job.id);
  };

  const updateJob = (field: keyof Job, value: any) => {
    setEditingJob(prev => ({ ...prev, [field]: value }));
  };

  const formatTimeInput = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const parseTimeInput = (timeString: string): number => {
    const [hours, mins] = timeString.split(':').map(Number);
    return (hours || 0) * 60 + (mins || 0);
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
              <span className="hidden sm:inline">Back to Jobs</span>
            </button>
            <h1 className="text-lg sm:text-2xl font-bold text-[var(--text-primary)] truncate">
              {isNew ? 'New Job' : 'Edit Job'}
            </h1>
          </div>
          <div className="flex gap-2">
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
                  onClick={handleDelete}
                  className="flex items-center gap-2 bg-red-600 text-[var(--cream)] px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Trash2 size={20} />
                  Delete
                </button>
              </>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-[var(--canopy)] text-[var(--cream)] px-4 py-2 rounded-lg hover:bg-[var(--forest-light)] transition-colors disabled:opacity-50"
            >
              <Save size={20} />
              {saving ? 'Saving…' : 'Save Job'}
            </button>
          </div>
        </div>
        {saveError && <p className="text-sm text-[#e88] mt-2">{saveError}</p>}
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-[var(--surface-raised)] rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-6">Job Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Job Title *
                </label>
                <input
                  type="text"
                  value={editingJob.title}
                  onChange={(e) => updateJob('title', e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="e.g., Tree Assessment - Oak Removal, Pruning - Maple Trees"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Link to Site (Optional)
                </label>
                <select
                  value={editingJob.siteId || ''}
                  onChange={(e) => updateJob('siteId', e.target.value || undefined)}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">None - Standalone Job</option>
                  {sites.map(site => (
                    <option key={site.id} value={site.id}>
                      {site.name} - {site.address}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Link this job to a site registry to track work done at specific locations
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Client Name
                  </label>
                  <input
                    type="text"
                    value={editingJob.clientName}
                    onChange={(e) => updateJob('clientName', e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Client or organization name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={editingJob.date}
                    onChange={(e) => updateJob('date', e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={editingJob.location}
                  onChange={(e) => updateJob('location', e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Job site address or location"
                />
              </div>
            </div>
          </div>

          <div className="bg-[var(--surface-raised)] rounded-lg shadow-md p-6">
            <div className="flex items-center gap-2 mb-6">
              <Users className="text-[var(--leaf)]" size={24} />
              <h2 className="text-xl font-semibold">Assignment &amp; Status</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Assigned To</label>
                <div className="flex flex-wrap gap-2">
                  {teamMembers.filter(m => m.active).length === 0 && (
                    <p className="text-xs text-[var(--text-muted)]">No active team members yet — add some on the Team page.</p>
                  )}
                  {teamMembers.filter(m => m.active).map(member => {
                    const selected = (editingJob.assignedTo || []).includes(member.id);
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
                  {(editingJob.assignedTo || []).length === 0 ? 'Unassigned — visible to the whole team until someone is picked.' : 'Assigned people are notified when you save.'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Status</label>
                <select
                  value={editingJob.status}
                  onChange={(e) => updateJob('status', e.target.value as Job['status'])}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  {JOB_STATUS_OPTIONS.filter(opt => opt.value !== 'cancelled' || canCancel).map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-[var(--surface-raised)] rounded-lg shadow-md p-6">
            <div className="flex items-center gap-2 mb-6">
              <Clock className="text-[var(--leaf)]" size={24} />
              <h2 className="text-xl font-semibold">Time Tracking</h2>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={editingJob.startTime}
                    onChange={(e) => updateJob('startTime', e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={editingJob.endTime}
                    onChange={(e) => updateJob('endTime', e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Total Time Spent (HH:MM)
                </label>
                <input
                  type="time"
                  value={formatTimeInput(editingJob.timeSpent)}
                  onChange={(e) => updateJob('timeSpent', parseTimeInput(e.target.value))}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Auto-calculated from start/end times, or enter manually
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[var(--surface-raised)] rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-6">Work Details</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Work Completed
                </label>
                <textarea
                  value={editingJob.workCompleted}
                  onChange={(e) => updateJob('workCompleted', e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  rows={4}
                  placeholder="Describe the work that has been completed..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Work To Complete
                </label>
                <textarea
                  value={editingJob.workToComplete}
                  onChange={(e) => updateJob('workToComplete', e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  rows={4}
                  placeholder="Describe any remaining work or follow-up tasks..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Notes
                </label>
                <textarea
                  value={editingJob.notes}
                  onChange={(e) => updateJob('notes', e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  rows={4}
                  placeholder="Additional notes, observations, or important details..."
                />
              </div>
            </div>
          </div>

          {!isNew && (
            <div className="bg-[var(--surface-raised)] rounded-lg shadow-md p-6">
              <BoardThread contextType="job" contextId={editingJob.id} teamMembers={teamMembers} notifyTitle={`New comment on job: ${editingJob.title || 'Untitled Job'}`} />
            </div>
          )}
        </div>
      </div>

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Job Report"
        data={editingJob}
        exportFunctions={{
          report: () => exportSingleJob(editingJob)
        }}
        emailOptions={{
          defaultSubject: `Job Report - ${editingJob.title}`,
          defaultBody: `Please find the attached job report containing detailed information about work completed, time tracking, and billing details.`
        }}
      />

      <ConfirmationModal
        isOpen={showDeleteConfirmation}
        onClose={() => setShowDeleteConfirmation(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Job"
        message="Are you sure you want to delete this job? The job will be moved to trash and can be recovered for a short while."
        confirmButtonText="Move to Trash"
        cancelButtonText="Keep Job"
        isDestructive={true}
      />
    </div>
  );
};