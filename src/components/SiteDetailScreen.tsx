import React, { useState } from 'react';
import { ArboristReport, Site, Job } from '../types';
import { formatDate } from '../utils/storage';
import { Plus, Search, TreePine, Calendar, ArrowLeft, Building2, MapPin, Upload, Download, Briefcase } from 'lucide-react';
import { ImportModal } from './ImportModal';
import { WorkDoneList } from './WorkDoneList';
import { exportTreesCSV, exportSiteReport } from '../utils/exportUtils';
import { canUserEdit } from '../utils/auth';
import { ExportModal } from './ExportModal';

type SiteDetailSubView = 'trees' | 'work-done';

interface SiteDetailScreenProps {
  site: Site;
  trees: ArboristReport[];
  jobs: Job[];
  sitesSubView: SiteDetailSubView;
  onSitesSubViewChange: (subView: SiteDetailSubView) => void;
  onSelectTree: (tree: ArboristReport) => void;
  onSelectJob: (job: Job) => void;
  onCreateTree: () => void;
  onCreateJob: () => void;
  onBackToSites: () => void;
  onEditSite: () => void;
  onImportTrees: (trees: ArboristReport[]) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const SiteDetailScreen: React.FC<SiteDetailScreenProps> = ({
  site,
  trees,
  jobs,
  sitesSubView,
  onSitesSubViewChange,
  onSelectTree,
  onSelectJob,
  onCreateTree,
  onCreateJob,
  onBackToSites,
  onEditSite,
  onImportTrees,
  searchQuery,
  onSearchChange
}) => {
  const [showImportModal, setShowImportModal] = useState(false);
  const [showTreeExportModal, setShowTreeExportModal] = useState(false);
  const [showSiteExportModal, setShowSiteExportModal] = useState(false);
  const canEdit = canUserEdit();

  const getStatusColor = (status: ArboristReport['status']) => {
    switch (status) {
      case 'draft': return 'bg-[var(--surface-overlay)] text-[var(--text-secondary)]';
      case 'in-progress': return 'bg-[var(--surface-overlay)] text-[var(--text-secondary)]';
      case 'completed': return 'bg-[rgba(138,111,76,0.15)] text-[var(--accent)]';
      default: return 'bg-[var(--surface-overlay)] text-[var(--text-secondary)]';
    }
  };

  const filteredTrees = trees.filter(tree =>
    tree.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tree.treeData.treeNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tree.treeData.species.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tree.treeData.commonName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tree.treeData.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const siteJobs = jobs.filter(job => job.siteId === site.id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[var(--surface-raised)] shadow-sm border-b border-[var(--border)] p-4">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={onBackToSites}
            className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ArrowLeft size={20} />
            Back to Sites
          </button>
          <div className="flex items-center gap-3">
            <Building2 className="text-[var(--leaf)]" size={24} />
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">{site.name}</h1>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="text-sm text-[var(--text-secondary)]">
            <div className="flex items-center gap-1 mb-1">
              <MapPin size={16} />
              {site.address || 'No address specified'}
            </div>
            <div className="flex gap-4">
              <span>{trees.length} {trees.length === 1 ? 'tree' : 'trees'}</span>
              <span>{siteJobs.length} {siteJobs.length === 1 ? 'job' : 'jobs'}</span>
            </div>
          </div>
          <div className="flex gap-2">
            {sitesSubView === 'trees' && (
              <button
                onClick={() => setShowTreeExportModal(true)}
                className="p-2 border border-[var(--border)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--forest)] transition-colors"
                title="Export Trees"
              >
                <Download size={16} />
              </button>
            )}
            <button
              onClick={() => setShowSiteExportModal(true)}
              className="p-2 border border-[var(--border)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--forest)] transition-colors"
              title="Export Site Report"
            >
              <Download size={16} />
            </button>
            <button
              onClick={onEditSite}
              className="flex items-center gap-2 border border-[var(--border)] text-[var(--text-primary)] px-4 py-2 rounded-lg hover:bg-[var(--forest)] transition-colors"
            >
              Edit Site
            </button>
            {canEdit && sitesSubView === 'trees' && (
              <>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="flex items-center gap-2 border border-[var(--accent)] text-[var(--leaf)] px-4 py-2 rounded-lg hover:bg-[var(--accent-soft)] transition-colors"
                >
                  <Upload size={20} />
                  Import Trees
                </button>
                <button
                  onClick={onCreateTree}
                  className="flex items-center gap-2 bg-[var(--canopy)] text-[var(--cream)] px-4 py-2 rounded-lg hover:bg-[var(--forest-light)] transition-colors"
                >
                  <Plus size={20} />
                  Add Tree
                </button>
              </>
            )}
            {canEdit && sitesSubView === 'work-done' && (
              <button
                onClick={onCreateJob}
                className="flex items-center gap-2 bg-[var(--canopy)] text-[var(--cream)] px-4 py-2 rounded-lg hover:bg-[var(--forest-light)] transition-colors"
              >
                <Plus size={20} />
                Add Job
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* Sub-Navigation */}
        <div className="border-b border-[var(--border)] mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => onSitesSubViewChange('trees')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                sitesSubView === 'trees'
                  ? 'border-[var(--moss)] text-[var(--leaf)]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border)]'
              }`}
            >
              <div className="flex items-center gap-2">
                <TreePine size={16} />
                Tree Registry ({trees.length})
              </div>
            </button>
            <button
              onClick={() => onSitesSubViewChange('work-done')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                sitesSubView === 'work-done'
                  ? 'border-[var(--moss)] text-[var(--leaf)]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border)]'
              }`}
            >
              <div className="flex items-center gap-2">
                <Briefcase size={16} />
                Work Done ({siteJobs.length})
              </div>
            </button>
          </nav>
        </div>

        {/* Content based on sub-view */}
        {sitesSubView === 'trees' ? (
          <>
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)]" size={20} />
              <input
                type="text"
                placeholder="Search trees in this site..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
              />
            </div>

            <div className="grid gap-4">
              {filteredTrees.length === 0 ? (
                <div className="text-center py-12">
                  <TreePine className="mx-auto h-12 w-12 text-[var(--text-muted)] mb-4" />
                  <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
                    {searchQuery ? 'No trees found' : 'No trees in this site yet'}
                  </h3>
                  <p className="text-[var(--text-muted)] mb-4">
                    {searchQuery 
                      ? 'Try adjusting your search terms' 
                      : 'Start building your tree registry by adding trees individually or importing from a document'
                    }
                  </p>
                 {!searchQuery && canEdit && (
                    <div className="flex gap-3 justify-center">
                      <button
                        onClick={() => setShowImportModal(true)}
                        className="flex items-center gap-2 border border-[var(--accent)] text-[var(--leaf)] px-4 py-2 rounded-lg hover:bg-[var(--accent-soft)] transition-colors"
                      >
                        <Upload size={20} />
                        Import Trees
                      </button>
                      <button
                        onClick={onCreateTree}
                        className="bg-[var(--canopy)] text-[var(--cream)] px-4 py-2 rounded-lg hover:bg-[var(--forest-light)] transition-colors"
                      >
                        Add First Tree
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                filteredTrees.map((tree) => (
                  <div
                    key={tree.id}
                    onClick={() => onSelectTree(tree)}
                    className="bg-[var(--surface-raised)] rounded-lg shadow-md border border-[var(--border)] p-6 hover:shadow-lg transition-shadow cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {tree.treeData.treeNumber && (
                            <span className="bg-[rgba(138,111,76,0.15)] text-[var(--accent)] px-2 py-1 rounded-full text-sm font-medium">
                              #{tree.treeData.treeNumber}
                            </span>
                          )}
                          <h3 className="text-xl font-semibold text-[var(--text-primary)]">
                            {tree.title || tree.treeData.species || 'Untitled Tree'}
                          </h3>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-[var(--text-secondary)]">
                          {tree.treeData.species && (
                            <div className="font-medium text-[var(--text-primary)]">
                              {tree.treeData.species}
                            </div>
                          )}
                          {tree.treeData.commonName && (
                            <div>
                              {tree.treeData.commonName}
                            </div>
                          )}
                          {tree.treeData.location && (
                            <div className="flex items-center gap-1">
                              <MapPin size={16} />
                              {tree.treeData.location}
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Calendar size={16} />
                            {formatDate(tree.updatedAt)}
                          </div>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(tree.status)}`}>
                        {tree.status}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-[var(--text-muted)]">
                      <span>{tree.photos.length} photos</span>
                      <span>{tree.notes.length} notes</span>
                      {tree.treeData.dbh > 0 && (
                        <span>DBH: {tree.treeData.dbh}cm</span>
                      )}
                      {tree.treeData.height > 0 && (
                        <span>Height: {tree.treeData.height}m</span>
                      )}
                      <span className="font-medium">Health: {tree.treeData.treeHealth}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <WorkDoneList
            jobs={jobs}
            site={site}
            onSelectJob={onSelectJob}
            onCreateJob={onCreateJob}
            searchQuery={searchQuery}
            onSearchChange={onSearchChange}
          />
        )}
      </div>

      {canEdit && (
        <ImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImport={onImportTrees}
          siteId={site.id}
          siteName={site.name}
        />
      )}

      <ExportModal
        isOpen={showTreeExportModal}
        onClose={() => setShowTreeExportModal(false)}
        title="Trees Data"
        data={trees}
        exportFunctions={{
          csv: () => exportTreesCSV(trees)
        }}
        emailOptions={{
          defaultSubject: `Trees Export - ${site.name}`,
          defaultBody: `Please find the attached trees export for ${site.name}. This includes detailed information about all trees at this site including health assessments and measurements.`
        }}
      />

      <ExportModal
        isOpen={showSiteExportModal}
        onClose={() => setShowSiteExportModal(false)}
        title="Site Report"
        data={{ site, trees }}
        exportFunctions={{
          report: () => exportSiteReport(site, trees)
        }}
        emailOptions={{
          defaultSubject: `Site Report - ${site.name}`,
          defaultBody: `Please find the attached comprehensive site report for ${site.name}. This includes site information, tree inventory, and summary statistics.`
        }}
      />
    </div>
  );
};