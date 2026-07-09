import React, { useState } from 'react';
import { Tree, ArboristReport, Site } from '../types';
import { TreeInfo } from './TreeInfo';
import { SpeciesIdentifier } from './SpeciesIdentifier';
import { ClinometerTool } from './ClinometerTool';
import { TPZCalculator } from './TPZCalculator';
import { TreeChlorophyllTab } from './TreeChlorophyllTab';
import { ArrowLeft, Save, TreePine, Leaf, Ruler, Shield, Activity, FileText, Trash2, Plus, Calendar } from 'lucide-react';
import { canUserEdit } from '../utils/auth';
import { db } from '../utils/offline';
import { toDbTree, fromDbTree } from '../utils/mappers';
import { formatDate } from '../utils/storage';

interface TreeEditorProps {
  tree: any; // raw shell or already-normalised Tree — normalised internally
  site?: Site;
  reports: ArboristReport[]; // all reports that include this tree
  isNew: boolean;
  onSave: (tree: Tree) => void;
  onDelete: () => void;
  onBack: () => void;
  onCreateReportForTree: (tree: Tree) => void;
  onOpenReport: (report: ArboristReport) => void;
}

export const TreeEditor: React.FC<TreeEditorProps> = ({
  tree, site, reports, isNew, onSave, onDelete, onBack, onCreateReportForTree, onOpenReport
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'species' | 'height' | 'tpz' | 'chlorophyll' | 'reports'>('info');
  const [editingTree, setEditingTree] = useState<Tree>(fromDbTree(tree));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const canEdit = canUserEdit();

  const handleSave = async () => {
    if (!canEdit || saving) return;
    setSaving(true);
    setSaveError('');
    try {
      await db.upsert('trees', toDbTree(editingTree));
      onSave(editingTree);
      onBack();
    } catch (err: any) {
      setSaveError(err?.message || 'Could not save. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!confirm('Delete this tree? It will move to Recently Deleted.')) return;
    db.softDelete('trees', editingTree.id).then(onDelete);
  };

  const tabs = [
    { id: 'info', label: 'Tree Info', icon: TreePine },
    { id: 'species', label: 'Identify Species', icon: Leaf },
    { id: 'height', label: 'Measure Height', icon: Ruler },
    { id: 'tpz', label: 'TPZ / SRZ', icon: Shield },
    { id: 'chlorophyll', label: 'Chlorophyll', icon: Activity },
    { id: 'reports', label: `Reports (${reports.length})`, icon: FileText },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--forest)' }}>
      <div className="border-b p-3 sm:p-4" style={{ background: 'var(--surface-raised)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2 sm:gap-4">
          <button onClick={onBack} className="flex items-center gap-2 transition-colors shrink-0" style={{ color: 'var(--text-secondary)' }}>
            <ArrowLeft size={20} />
            <span className="hidden sm:inline">Back</span>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-[22px] truncate" style={{ fontFamily: 'Newsreader, serif', fontWeight: 500, color: 'var(--text-primary)' }}>
              {editingTree.treeNumber ? `#${editingTree.treeNumber} — ` : ''}{editingTree.species || editingTree.commonName || 'Untitled Tree'}
            </h1>
            {site && <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{site.name}</p>}
          </div>
          {canEdit && !isNew && (
            <button onClick={handleDelete} className="p-2 rounded-lg transition-colors shrink-0" style={{ border: '1px solid var(--border)', color: 'var(--danger)' }} title="Delete Tree">
              <Trash2 size={16} />
            </button>
          )}
          {canEdit && (
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg transition-colors shrink-0 disabled:opacity-50" style={{ background: 'var(--ink)', color: 'var(--cream)' }}>
              <Save size={20} />
              <span className="hidden sm:inline">{saving ? 'Saving…' : 'Save'}</span>
            </button>
          )}
        </div>
        {saveError && <p className="text-sm mt-2" style={{ color: 'var(--danger)' }}>{saveError}</p>}
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <nav className="md:hidden flex overflow-x-auto gap-2 p-3 border-b" style={{ WebkitOverflowScrolling: 'touch', background: 'var(--forest-mid)', borderColor: 'var(--border)' }}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors"
                style={active ? { background: 'var(--accent-soft)', color: 'var(--accent)', fontWeight: 600, border: '1px solid var(--accent-soft-strong)' } : { color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                <Icon size={16} />{tab.label}
              </button>
            );
          })}
        </nav>

        <nav className="hidden md:block w-[236px] border-r p-4 shrink-0" style={{ background: 'var(--forest-mid)', borderColor: 'var(--border)' }}>
          <ul className="space-y-2">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <li key={tab.id}>
                  <button onClick={() => setActiveTab(tab.id as any)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors"
                    style={active ? { background: 'var(--accent-soft)', color: 'var(--accent)', fontWeight: 600 } : { color: 'var(--text-secondary)' }}>
                    <Icon size={20} />{tab.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex-1 overflow-auto">
          {activeTab === 'info' && (
            <TreeInfo treeData={editingTree} readOnly={!canEdit} onUpdate={(d) => setEditingTree(prev => ({ ...prev, ...d }))} />
          )}

          {activeTab === 'species' && (
            <SpeciesIdentifier treeData={editingTree} readOnly={!canEdit} onUpdate={(d) => setEditingTree(prev => ({ ...prev, ...d }))} />
          )}

          {activeTab === 'height' && (
            <ClinometerTool treeData={editingTree} readOnly={!canEdit} onUpdate={(d) => setEditingTree(prev => ({ ...prev, ...d }))} />
          )}

          {activeTab === 'tpz' && (
            <TPZCalculator treeData={editingTree} />
          )}

          {activeTab === 'chlorophyll' && (
            <TreeChlorophyllTab
              treeId={editingTree.id}
              treeSpecies={editingTree.species || editingTree.commonName || editingTree.treeNumber}
              treeLocation={editingTree.location}
              readOnly={!canEdit}
            />
          )}

          {activeTab === 'reports' && (
            <div className="p-6 max-w-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 style={{ fontFamily: 'Newsreader, serif', fontWeight: 500, fontSize: '23px', color: 'var(--text-primary)' }}>Report History</h2>
                {canEdit && !isNew && (
                  <button onClick={() => onCreateReportForTree(editingTree)} className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors" style={{ background: 'var(--canopy)', color: 'var(--cream)' }}>
                    <Plus size={18} />New Report
                  </button>
                )}
              </div>
              {isNew ? (
                <p style={{ color: 'var(--text-muted)' }}>Save this tree first, then you can start writing reports about it.</p>
              ) : reports.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="mx-auto h-12 w-12 mb-4" style={{ color: 'var(--text-muted)' }} />
                  <p style={{ color: 'var(--text-muted)' }}>No reports yet for this tree.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reports.map(r => (
                    <div key={r.id} onClick={() => onOpenReport(r)} className="rounded-lg shadow-sm p-4 cursor-pointer transition-shadow hover:shadow-md" style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)' }}>
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>{r.title || 'Untitled Report'}</h3>
                        <span className="px-2 py-1 rounded-full text-xs font-medium" style={{ background: 'var(--surface-overlay)', color: 'var(--text-secondary)' }}>{r.status}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                        <span className="flex items-center gap-1"><Calendar size={12} />{formatDate(r.updatedAt)}</span>
                        <span>{r.trees.length} {r.trees.length === 1 ? 'tree' : 'trees'} in this report</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
