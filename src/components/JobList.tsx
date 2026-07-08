import React, { useState } from 'react';
import { Job } from '../types';
import { formatDate, formatTime } from '../utils/storage';
import { Plus, Search, Briefcase, Calendar, Clock, MapPin, User, DollarSign, ArrowUpDown, Download } from 'lucide-react';
import { exportJobsCSV } from '../utils/exportUtils';
import { canUserEdit } from '../utils/auth';
import { ExportModal } from './ExportModal';
import type { TeamMember } from '../utils/supabase';

interface JobListProps {
  jobs: Job[];
  teamMembers: TeamMember[];
  onSelectJob: (job: Job) => void;
  onCreateJob: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

type SortField = 'date' | 'clientName' | 'status' | 'jobType' | 'timeSpent' | 'totalCost';
type SortDirection = 'asc' | 'desc';

// Neutral badge treatment for every job type — a deliberate move away from
// hue-coding to keep the single accent colour meaningful (see design handoff).
const NEUTRAL_BADGE = { bg: 'var(--surface-overlay)', color: 'var(--text-secondary)', border: 'var(--border)' };

const JOB_TYPE_STYLES: Record<Job['jobType'], { bg: string; color: string; border: string }> = {
  assessment: NEUTRAL_BADGE,
  pruning: NEUTRAL_BADGE,
  removal: NEUTRAL_BADGE,
  treatment: NEUTRAL_BADGE,
  consultation: NEUTRAL_BADGE,
  emergency: NEUTRAL_BADGE,
  other: NEUTRAL_BADGE,
};

// Status keeps a single functional exception — cancelled reads slightly muted,
// everything else (including completed) stays neutral so the accent stays reserved for state.
const STATUS_STYLES: Record<Job['status'], { bg: string; color: string }> = {
  scheduled: { bg: 'var(--surface-overlay)', color: 'var(--text-secondary)' },
  'in-progress': { bg: 'var(--accent-soft)', color: 'var(--accent)' },
  completed: { bg: 'var(--surface-overlay)', color: 'var(--text-secondary)' },
  cancelled: { bg: 'var(--surface-overlay)', color: 'var(--text-muted)' },
};

export const JobList: React.FC<JobListProps> = ({ jobs, teamMembers, onSelectJob, onCreateJob, searchQuery, onSearchChange }) => {
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showExportModal, setShowExportModal] = useState(false);
  const canEdit = canUserEdit();

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('asc'); }
  };

  const sortedAndFilteredJobs = jobs
    .filter(job =>
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.jobType.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      let aVal: any = a[sortField], bVal: any = b[sortField];
      if (sortField === 'date') { aVal = new Date(aVal).getTime(); bVal = new Date(bVal).getTime(); }
      else if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = bVal.toLowerCase(); }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  const SortBtn = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button onClick={() => handleSort(field)} style={{
      display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '6px',
      fontSize: '12px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.15s',
      background: sortField === field ? 'rgba(138,111,76,0.15)' : 'transparent',
      border: sortField === field ? '1px solid rgba(138,111,76,0.3)' : '1px solid var(--border)',
      color: sortField === field ? 'var(--leaf)' : 'var(--text-muted)',
    }}>
      {children} <ArrowUpDown size={12} />
    </button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: 'Newsreader, serif', fontSize: '32px', color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '4px' }}>Job Management</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{jobs.length} {jobs.length === 1 ? 'job' : 'jobs'} total</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setShowExportModal(true)} className="btn-secondary" style={{ padding: '9px 12px' }}><Download size={16} /></button>
          {canEdit && <button onClick={onCreateJob} className="btn-primary"><Plus size={16} /> New Job</button>}
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input type="text" placeholder="Search jobs..." value={searchQuery} onChange={e => onSearchChange(e.target.value)} className="input-field" style={{ paddingLeft: '42px' }} />
      </div>

      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', marginRight: '4px' }}>Sort</span>
        {(['date', 'clientName', 'status', 'jobType', 'timeSpent', 'totalCost'] as SortField[]).map(f => (
          <SortBtn key={f} field={f}>{f === 'clientName' ? 'Client' : f === 'jobType' ? 'Type' : f === 'timeSpent' ? 'Time' : f === 'totalCost' ? 'Cost' : f.charAt(0).toUpperCase() + f.slice(1)}</SortBtn>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {sortedAndFilteredJobs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 24px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'var(--surface-raised)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Briefcase size={24} color="var(--text-muted)" />
            </div>
            <h3 style={{ fontFamily: 'Newsreader, serif', fontSize: '20px', color: 'var(--text-primary)', marginBottom: '8px' }}>No jobs found</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>{searchQuery ? 'Try different search terms' : 'Create your first job record'}</p>
            {!searchQuery && canEdit && <button onClick={onCreateJob} className="btn-primary"><Plus size={16} /> Create First Job</button>}
          </div>
        ) : (
          sortedAndFilteredJobs.map(job => {
            const typeStyle = JOB_TYPE_STYLES[job.jobType] || JOB_TYPE_STYLES.other;
            const statusStyle = STATUS_STYLES[job.status] || STATUS_STYLES.scheduled;
            return (
              <div key={job.id} onClick={() => onSelectJob(job)} className="card" style={{ padding: '18px 22px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>{job.title || 'Untitled Job'}</h3>
                      <span style={{ padding: '2px 9px', borderRadius: '999px', fontSize: '11px', fontWeight: '600', letterSpacing: '0.04em', textTransform: 'uppercase', background: typeStyle.bg, color: typeStyle.color, border: `1px solid ${typeStyle.border}` }}>{job.jobType}</span>
                      <span style={{ padding: '2px 9px', borderRadius: '999px', fontSize: '11px', fontWeight: '600', letterSpacing: '0.04em', textTransform: 'uppercase', background: statusStyle.bg, color: statusStyle.color }}>{job.status}</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px' }}>
                      {job.clientName && <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: 'var(--text-secondary)' }}><User size={13} color="var(--text-muted)" />{job.clientName}</span>}
                      {job.location && <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: 'var(--text-secondary)' }}><MapPin size={13} color="var(--text-muted)" />{job.location}</span>}
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: 'var(--text-secondary)' }}><Calendar size={13} color="var(--text-muted)" />{new Date(job.date).toLocaleDateString()}</span>
                      {job.timeSpent > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: 'var(--text-secondary)' }}><Clock size={13} color="var(--text-muted)" />{formatTime(job.timeSpent)}</span>}
                      {job.totalCost != null && job.totalCost > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: 'var(--amber)' }}><DollarSign size={13} />${job.totalCost.toFixed(2)}</span>}
                    </div>
                  </div>
                  {job.assignedTo && job.assignedTo.length > 0 && (
                    <div style={{ display: 'flex', flexShrink: 0 }}>
                      {job.assignedTo.slice(0, 4).map((id, i) => {
                        const member = teamMembers.find(m => m.id === id);
                        if (!member) return null;
                        return (
                          <div key={id} title={member.name} style={{ width: '26px', height: '26px', borderRadius: '50%', background: member.colour + '33', border: `2px solid ${member.colour}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: member.colour, marginLeft: i > 0 ? '-8px' : 0 }}>
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <ExportModal isOpen={showExportModal} onClose={() => setShowExportModal(false)} title="Jobs Data" data={jobs} exportFunctions={{ csv: () => exportJobsCSV(jobs) }} emailOptions={{ defaultSubject: 'Jobs Export', defaultBody: 'Please find the attached jobs export.' }} />
    </div>
  );
};
