import React, { useState } from 'react';
import { Job, Site } from '../types';
import { formatDate, formatTime } from '../utils/storage';
import { Plus, Search, Briefcase, Calendar, Clock, MapPin, User, DollarSign, ArrowUpDown } from 'lucide-react';
import { canUserEdit } from '../utils/auth';

interface WorkDoneListProps {
  jobs: Job[];
  site: Site;
  onSelectJob: (job: Job) => void;
  onCreateJob: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

type SortField = 'date' | 'title' | 'status' | 'jobType' | 'timeSpent' | 'totalCost';
type SortDirection = 'asc' | 'desc';

export const WorkDoneList: React.FC<WorkDoneListProps> = ({
  jobs,
  site,
  onSelectJob,
  onCreateJob,
  searchQuery,
  onSearchChange
}) => {
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const canEdit = canUserEdit();

  const getJobTypeColor = (jobType: Job['jobType']) => {
    switch (jobType) {
      case 'assessment': return 'bg-[var(--surface-overlay)] text-[var(--text-secondary)]';
      case 'pruning': return 'bg-[rgba(138,111,76,0.15)] text-[var(--accent)]';
      case 'removal': return 'bg-[var(--surface-overlay)] text-[var(--danger)]';
      case 'treatment': return 'bg-[var(--surface-overlay)] text-[var(--text-secondary)]';
      case 'consultation': return 'bg-[var(--surface-overlay)] text-[var(--text-secondary)]';
      case 'emergency': return 'bg-[var(--surface-overlay)] text-[var(--text-secondary)]';
      default: return 'bg-[var(--surface-overlay)] text-[var(--text-secondary)]';
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter jobs for this site
  const siteJobs = jobs.filter(job => job.siteId === site.id);

  const sortedAndFilteredJobs = siteJobs
    .filter(job =>
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.jobType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.workCompleted.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (sortField === 'date') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  const SortButton: React.FC<{ field: SortField; children: React.ReactNode }> = ({ field, children }) => (
    <button
      onClick={() => handleSort(field)}
      className={`flex items-center gap-1 px-2 py-1 rounded text-sm font-medium transition-colors ${
        sortField === field
          ? 'bg-[rgba(138,111,76,0.15)] text-[var(--leaf)]'
          : 'text-[var(--text-secondary)] hover:bg-[var(--surface-overlay)]'
      }`}
    >
      {children}
      <ArrowUpDown size={14} />
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">Work Done at {site.name}</h2>
          <p className="text-[var(--text-secondary)]">{siteJobs.length} {siteJobs.length === 1 ? 'job' : 'jobs'} completed at this site</p>
        </div>
        {canEdit && (
          <button
            onClick={onCreateJob}
            className="flex items-center gap-2 bg-[var(--canopy)] text-[var(--cream)] px-4 py-2 rounded-lg hover:bg-[var(--forest-light)] transition-colors"
          >
            <Plus size={20} />
            Add Job to Site
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)]" size={20} />
        <input
          type="text"
          placeholder="Search jobs at this site..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
        />
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm text-[var(--text-secondary)] font-medium">Sort by:</span>
        <SortButton field="date">Date</SortButton>
        <SortButton field="title">Title</SortButton>
        <SortButton field="status">Status</SortButton>
        <SortButton field="jobType">Type</SortButton>
        <SortButton field="timeSpent">Time</SortButton>
        <SortButton field="totalCost">Cost</SortButton>
      </div>

      <div className="grid gap-4">
        {sortedAndFilteredJobs.length === 0 ? (
          <div className="text-center py-12">
            <Briefcase className="mx-auto h-12 w-12 text-[var(--text-muted)] mb-4" />
            <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">No work done at this site yet</h3>
            <p className="text-[var(--text-muted)] mb-4">
              {searchQuery ? 'Try adjusting your search terms' : 'Get started by adding the first job for this site'}
            </p>
            {!searchQuery && canEdit && (
              <button
                onClick={onCreateJob}
                className="bg-[var(--canopy)] text-[var(--cream)] px-4 py-2 rounded-lg hover:bg-[var(--forest-light)] transition-colors"
              >
                Add First Job
              </button>
            )}
          </div>
        ) : (
          sortedAndFilteredJobs.map((job) => (
            <div
              key={job.id}
              onClick={() => onSelectJob(job)}
              className="bg-[var(--surface-raised)] rounded-lg shadow-md border border-[var(--border)] p-6 hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-[var(--text-primary)]">
                      {job.title || 'Untitled Job'}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getJobTypeColor(job.jobType)}`}>
                      {job.jobType}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-[var(--text-secondary)] mb-3">
                    <div className="flex items-center gap-1">
                      <User size={16} />
                      {job.clientName || 'No client'}
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin size={16} />
                      {job.location || 'No location'}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar size={16} />
                      {new Date(job.date).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={16} />
                      {formatTime(job.timeSpent)}
                    </div>
                    {job.totalCost && job.totalCost > 0 && (
                      <div className="flex items-center gap-1">
                        <DollarSign size={16} />
                        ${job.totalCost.toFixed(2)}
                      </div>
                    )}
                  </div>
                  {job.workCompleted && (
                    <div className="text-sm text-[var(--text-primary)] bg-[var(--forest)] p-3 rounded-lg">
                      <strong>Work Completed:</strong> {job.workCompleted}
                    </div>
                  )}
                </div>
                <span className="text-sm text-[var(--text-secondary)] font-medium">
                  {job.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};