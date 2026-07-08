import React, { useState } from 'react';
import { ArboristReport, TreeData, Photo, Note } from '../types';
import { TreeInfo } from './TreeInfo';
import { PhotoGallery } from './PhotoGallery';
import { NotesSection } from './NotesSection';
import { ReportPreview } from './ReportPreview';
import { ClinometerTool } from './ClinometerTool';
import { SpeciesIdentifier } from './SpeciesIdentifier';
import { TreeChlorophyllTab } from './TreeChlorophyllTab';
import { ArrowLeft, Save, FileText, Camera, TreePine, StickyNote, Eye, Download, Ruler, Leaf, Activity } from 'lucide-react';
import { exportSingleTreeReport } from '../utils/exportUtils';
import { canUserEdit } from '../utils/auth';
import { ExportModal } from './ExportModal';
import { db } from '../utils/offline';
import { fromDbReport, toDbReport } from '../utils/mappers';

interface ReportEditorProps {
  report: ArboristReport;
  onSave: (report: ArboristReport) => void;
  onBack: () => void;
}

export const ReportEditor: React.FC<ReportEditorProps> = ({ report, onSave, onBack }) => {
  const initial = fromDbReport(report);
  const [activeTab, setActiveTab] = useState<'info' | 'tree' | 'species' | 'height' | 'photos' | 'notes' | 'chlorophyll' | 'preview'>(initial.siteId ? 'tree' : 'info');
  const [editingReport, setEditingReport] = useState<ArboristReport>(initial);
  const [showExportModal, setShowExportModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const canEdit = canUserEdit();

  const handleSave = async () => {
    if (!canEdit || saving) return;
    setSaving(true);
    setSaveError('');
    try {
      await db.upsert('reports', toDbReport(editingReport));
      onSave(editingReport);
      onBack(); // Close the editing panel and go back
    } catch (err: any) {
      setSaveError(err?.message || 'Could not save. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const updateReport = (updates: Partial<ArboristReport>) => {
    setEditingReport(prev => ({ ...prev, ...updates }));
  };

  const updateTreeData = (treeData: TreeData) => {
    updateReport({ treeData });
  };

  const updatePhotos = (photos: Photo[]) => {
    updateReport({ photos });
  };

  const updateNotes = (notes: Note[]) => {
    updateReport({ notes });
  };

  const tabs = [
    { id: 'tree', label: 'Tree Data', icon: TreePine },
    { id: 'species', label: 'Identify Species', icon: Leaf },
    { id: 'height', label: 'Measure Height', icon: Ruler },
    { id: 'chlorophyll', label: 'Chlorophyll', icon: Activity },
    { id: 'photos', label: 'Photos', icon: Camera },
    { id: 'notes', label: 'Notes', icon: StickyNote }
  ];

  // Add Report Info tab only for standalone trees (not part of a site)
  if (!editingReport.siteId) {
    tabs.unshift({ id: 'info', label: 'Report Info', icon: FileText });
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--forest)' }}>
      <div className="border-b p-3 sm:p-4" style={{ background: 'var(--surface-raised)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 transition-colors shrink-0"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ArrowLeft size={20} />
            <span className="hidden sm:inline">Back to Reports</span>
          </button>
          <h1 className="text-lg sm:text-[22px] truncate flex-1 min-w-0" style={{ fontFamily: 'Newsreader, serif', fontWeight: 500, color: 'var(--text-primary)' }}>
            {editingReport.title || 'Untitled Report'}
          </h1>
          <button
            onClick={() => setShowExportModal(true)}
            className="p-2 rounded-lg transition-colors shrink-0"
            style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            title="Export Data"
          >
            <Download size={16} />
          </button>
          {canEdit && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg transition-colors shrink-0 disabled:opacity-50"
              style={{ background: 'var(--ink)', color: 'var(--cream)' }}
            >
              <Save size={20} />
              <span className="hidden sm:inline">{saving ? 'Saving…' : 'Save'}</span>
            </button>
          )}
        </div>
        {saveError && (
          <p className="text-sm mt-2" style={{ color: 'var(--danger)' }}>{saveError}</p>
        )}
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Mobile: horizontal scrolling tab strip */}
        <nav className="md:hidden flex overflow-x-auto gap-2 p-3 border-b" style={{ WebkitOverflowScrolling: 'touch', background: 'var(--forest-mid)', borderColor: 'var(--border)' }}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors"
                style={active
                  ? { background: 'var(--accent-soft)', color: 'var(--accent)', fontWeight: 600, border: '1px solid var(--accent-soft-strong)' }
                  : { color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Desktop: sidebar */}
        <nav className="hidden md:block w-[236px] border-r p-4 shrink-0" style={{ background: 'var(--forest-mid)', borderColor: 'var(--border)' }}>
          <ul className="space-y-2">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <li key={tab.id}>
                  <button
                    onClick={() => setActiveTab(tab.id as any)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors"
                    style={active
                      ? { background: 'var(--accent-soft)', color: 'var(--accent)', fontWeight: 600 }
                      : { color: 'var(--text-secondary)' }}
                  >
                    <Icon size={20} />
                    {tab.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex-1 overflow-auto">
          {activeTab === 'info' && (
            !editingReport.siteId && (
              <div className="p-6 max-w-2xl">
                <h2 className="mb-6" style={{ fontFamily: 'Newsreader, serif', fontWeight: 500, fontSize: '23px', color: 'var(--text-primary)' }}>Report Information</h2>
                <div className="space-y-4">
                  <div>
                    <label>Report Title</label>
                    <input
                      type="text"
                      value={editingReport.title}
                      disabled={!canEdit}
                      onChange={(e) => updateReport({ title: e.target.value })}
                      className="input-field disabled:cursor-not-allowed"
                      placeholder="Enter report title"
                    />
                  </div>

                  <div>
                    <label>Client Name</label>
                    <input
                      type="text"
                      value={editingReport.clientName}
                      disabled={!canEdit}
                      onChange={(e) => updateReport({ clientName: e.target.value })}
                      className="input-field disabled:cursor-not-allowed"
                      placeholder="Enter client name"
                    />
                  </div>

                  <div>
                    <label>Property Address</label>
                    <input
                      type="text"
                      value={editingReport.address}
                      disabled={!canEdit}
                      onChange={(e) => updateReport({ address: e.target.value })}
                      className="input-field disabled:cursor-not-allowed"
                      placeholder="Enter property address"
                    />
                  </div>

                  <div>
                    <label>Inspector Name</label>
                    <input
                      type="text"
                      value={editingReport.inspector}
                      disabled={!canEdit}
                      onChange={(e) => updateReport({ inspector: e.target.value })}
                      className="input-field disabled:cursor-not-allowed"
                      placeholder="Enter inspector name"
                    />
                  </div>

                  <div>
                    <label>Inspection Date</label>
                    <input
                      type="date"
                      value={editingReport.date}
                      disabled={!canEdit}
                      onChange={(e) => updateReport({ date: e.target.value })}
                      className="input-field disabled:cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label>Report Status</label>
                    <select
                      value={editingReport.status}
                      disabled={!canEdit}
                      onChange={(e) => updateReport({ status: e.target.value as any })}
                      className="input-field disabled:cursor-not-allowed"
                    >
                      <option value="draft">Draft</option>
                      <option value="in-progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>
              </div>
            )
          )}

          {activeTab === 'tree' && (
            <TreeInfo
              treeData={editingReport.treeData}
              readOnly={!canEdit}
              onUpdate={updateTreeData}
            />
          )}

          {activeTab === 'species' && (
            <SpeciesIdentifier
              treeData={editingReport.treeData}
              readOnly={!canEdit}
              onUpdate={updateTreeData}
            />
          )}

          {activeTab === 'height' && (
            <ClinometerTool
              treeData={editingReport.treeData}
              readOnly={!canEdit}
              onUpdate={updateTreeData}
            />
          )}

          {activeTab === 'chlorophyll' && (
            <TreeChlorophyllTab
              treeId={editingReport.id}
              treeSpecies={editingReport.treeData.species || editingReport.treeData.commonName || editingReport.title}
              treeLocation={editingReport.treeData.location || editingReport.address}
              readOnly={!canEdit}
            />
          )}

          {activeTab === 'photos' && (
            <PhotoGallery
              photos={editingReport.photos}
              readOnly={!canEdit}
              onUpdate={updatePhotos}
            />
          )}

          {activeTab === 'notes' && (
            <NotesSection
              notes={editingReport.notes}
              readOnly={!canEdit}
              onUpdate={updateNotes}
            />
          )}
        </div>
      </div>

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Tree Report"
        data={editingReport}
        exportFunctions={{
          report: () => exportSingleTreeReport(editingReport)
        }}
        emailOptions={{
          defaultSubject: `Tree Report - ${editingReport.title || 'Tree Assessment'}`,
          defaultBody: `Please find the attached comprehensive tree report. This includes detailed assessment information, photos, notes, and recommendations.`
        }}
      />
    </div>
  );
};