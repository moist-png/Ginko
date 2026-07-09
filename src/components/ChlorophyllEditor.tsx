import React, { useState, useEffect } from 'react';
import { ChlorophyllReading } from '../types';
import { ArrowLeft, Save, Trash2, Plus, History, Search } from 'lucide-react';
import { ConfirmationModal } from './ConfirmationModal';
import { db } from '../utils/offline';
import { fromDbChlorophyll, toDbChlorophyll } from '../utils/mappers';

interface ChlorophyllEditorProps {
  reading: ChlorophyllReading;
  onSave: (reading: ChlorophyllReading) => void;
  onDelete?: (readingId: string) => void;
  onBack: () => void;
  isNew?: boolean;
  allReadings: ChlorophyllReading[];
}

export const ChlorophyllEditor: React.FC<ChlorophyllEditorProps> = ({
  reading,
  onSave,
  onDelete,
  onBack,
  isNew = false,
  allReadings
}) => {
  const [editingReading, setEditingReading] = useState<ChlorophyllReading>(fromDbChlorophyll(reading));
  const [showHistory, setShowHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [existingTrees, setExistingTrees] = useState<Array<{treeId: string, species: string, location: string}>>([]);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    // Get unique trees from existing readings
    const uniqueTrees = allReadings.reduce((acc, r) => {
      const key = `${r.treeSpecies}-${r.treeLocation}`;
      if (!acc.some(t => `${t.species}-${t.location}` === key)) {
        acc.push({
          treeId: r.treeId,
          species: r.treeSpecies,
          location: r.treeLocation
        });
      }
      return acc;
    }, [] as Array<{treeId: string, species: string, location: string}>);
    
    setExistingTrees(uniqueTrees);
  }, [allReadings]);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setSaveError('');
    try {
      await db.upsert('chlorophyll_readings', toDbChlorophyll(editingReading));
      onSave(editingReading);
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
      await db.softDelete('chlorophyll_readings', reading.id);
    } catch { /* still close */ }
    if (onDelete) onDelete(reading.id);
  };

  const updateReading = (field: keyof ChlorophyllReading, value: any) => {
    setEditingReading(prev => ({ ...prev, [field]: value }));
  };

  const selectExistingTree = (tree: {treeId: string, species: string, location: string}) => {
    setEditingReading(prev => ({
      ...prev,
      treeId: tree.treeId,
      treeSpecies: tree.species,
      treeLocation: tree.location
    }));
  };

  const createNewTreeId = () => {
    const newTreeId = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    setEditingReading(prev => ({ ...prev, treeId: newTreeId }));
  };

  const filteredTrees = existingTrees.filter(tree => 
    tree.species.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tree.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTreeHistory = () => {
    return allReadings
      .filter(r => r.treeId === editingReading.treeId && r.id !== editingReading.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const getChlorophyllColor = (level: number) => {
    if (level >= 40) return 'text-[var(--leaf)]';
    if (level >= 30) return 'text-[var(--text-secondary)]';
    if (level >= 20) return 'text-[var(--text-secondary)]';
    return 'text-[var(--danger)]';
  };

  const getChlorophyllStatus = (level: number) => {
    if (level >= 40) return 'Excellent';
    if (level >= 30) return 'Good';
    if (level >= 20) return 'Fair';
    return 'Poor';
  };

  const treeHistory = getTreeHistory();

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
              <span className="hidden sm:inline">Back to Readings</span>
            </button>
            <h1 className="text-lg sm:text-2xl font-bold text-[var(--text-primary)] truncate">
              {isNew ? 'New Chlorophyll Reading' : 'Edit Chlorophyll Reading'}
            </h1>
          </div>
          <div className="flex gap-2 flex-wrap">
            {treeHistory.length > 0 && (
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 border border-[var(--border)] text-[var(--text-primary)] px-4 py-2 rounded-lg hover:bg-[var(--forest)] transition-colors"
              >
                <History size={20} />
                History ({treeHistory.length})
              </button>
            )}
            {!isNew && onDelete && (
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 bg-[var(--danger)] text-[var(--cream)] px-4 py-2 rounded-lg hover:opacity-90 transition-colors"
              >
                <Trash2 size={20} />
                Delete
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-[var(--canopy)] text-[var(--cream)] px-4 py-2 rounded-lg hover:bg-[var(--forest-light)] transition-colors disabled:opacity-50"
            >
              <Save size={20} />
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
        {saveError && <p className="text-sm text-[#b3433d] mt-2">{saveError}</p>}
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-[var(--surface-raised)] rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-6">Reading Information</h2>
                
                {/* Tree Selection */}
               {isNew && existingTrees.length > 0 && (
                 <div className="mb-6">
                   <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                     Search Existing Trees (Optional)
                   </label>
                   <div className="relative">
                     <div className="relative">
                       <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                       <input
                         type="text"
                         value={searchQuery}
                         onChange={(e) => {
                           setSearchQuery(e.target.value);
                           setShowDropdown(true);
                         }}
                         onFocus={() => setShowDropdown(true)}
                         onBlur={() => {
                           // Delay hiding dropdown to allow for clicks
                           setTimeout(() => setShowDropdown(false), 200);
                         }}
                         className="w-full pl-10 pr-4 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                         placeholder="Search by species or location, or leave blank for new tree"
                       />
                     </div>
                     
                     {showDropdown && (searchQuery || filteredTrees.length > 0) && (
                       <div className="absolute z-10 w-full mt-1 bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg shadow-lg max-h-60 overflow-auto">
                         {!searchQuery && (
                           <button
                             onClick={() => {
                               createNewTreeId();
                               setSearchQuery('');
                               setShowDropdown(false);
                             }}
                             className="w-full text-left px-4 py-3 hover:bg-[var(--accent-soft)] border-b border-[var(--border)] font-medium text-[var(--leaf)]"
                           >
                             + Create new tree record
                           </button>
                         )}
                         
                         {searchQuery && filteredTrees.length === 0 && (
                           <div className="px-4 py-3 text-[var(--text-muted)] text-sm">
                             No trees found. Press Enter or click outside to create new tree.
                           </div>
                         )}
                         
                         {filteredTrees.map((tree) => (
                           <button
                             key={tree.treeId}
                             onClick={() => {
                               selectExistingTree(tree);
                               setSearchQuery(`${tree.species} - ${tree.location}`);
                               setShowDropdown(false);
                             }}
                             className="w-full text-left px-4 py-3 hover:bg-[var(--forest)] border-b border-[var(--border)] last:border-b-0"
                           >
                             <div className="font-medium text-[var(--text-primary)]">{tree.species}</div>
                             <div className="text-sm text-[var(--text-secondary)]">{tree.location}</div>
                           </button>
                         ))}
                         
                         {searchQuery && filteredTrees.length > 0 && (
                           <button
                             onClick={() => {
                               createNewTreeId();
                               setSearchQuery('');
                               setShowDropdown(false);
                             }}
                             className="w-full text-left px-4 py-3 hover:bg-[var(--accent-soft)] border-t border-[var(--border)] font-medium text-[var(--leaf)]"
                           >
                             + Create new tree record instead
                           </button>
                         )}
                       </div>
                     )}
                   </div>
                   <p className="text-xs text-[var(--text-muted)] mt-1">
                     Search for existing trees by species or location keywords, or leave blank to create a new tree record
                   </p>
                 </div>
               )}
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                      Tree Species
                    </label>
                    <input
                      type="text"
                      value={editingReading.treeSpecies}
                      onChange={(e) => updateReading('treeSpecies', e.target.value)}
                      className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                      placeholder="e.g., Quercus alba, Acer saccharum"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                      Tree Location
                    </label>
                    <input
                      type="text"
                      value={editingReading.treeLocation}
                      onChange={(e) => updateReading('treeLocation', e.target.value)}
                      className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                      placeholder="e.g., Playground area, Grid reference A3"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                        Tree Maturity
                      </label>
                      <select
                        value={editingReading.treeMaturity}
                        onChange={(e) => updateReading('treeMaturity', e.target.value)}
                        className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                      >
                        <option value="Juvenile">Juvenile</option>
                        <option value="Semi mature">Semi mature</option>
                        <option value="Mature">Mature</option>
                        <option value="Senescent">Senescent</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                        Date
                      </label>
                      <input
                        type="date"
                        value={editingReading.date}
                        onChange={(e) => updateReading('date', e.target.value)}
                        className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                      Chlorophyll Level (SPAD units)
                    </label>
                    <input
                      type="number"
                      value={editingReading.chlorophyllLevel || ''}
                      onChange={(e) => updateReading('chlorophyllLevel', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                      placeholder="0.0"
                      step="0.1"
                      min="0"
                      max="100"
                    />
                    {editingReading.chlorophyllLevel > 0 && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-sm text-[var(--text-secondary)]">Status:</span>
                        <span className={`text-sm font-semibold ${getChlorophyllColor(editingReading.chlorophyllLevel)}`}>
                          {getChlorophyllStatus(editingReading.chlorophyllLevel)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                      Extension Growth (mm)
                    </label>
                    <input
                      type="number"
                      value={editingReading.extensionGrowth || ''}
                      onChange={(e) => updateReading('extensionGrowth', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                      placeholder="0"
                      step="1"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={editingReading.notes || ''}
                      onChange={(e) => updateReading('notes', e.target.value)}
                      className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent resize-none"
                      rows={4}
                      placeholder="Additional observations, weather conditions, etc."
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* History Panel */}
            {(showHistory || treeHistory.length > 0) && (
              <div className="lg:col-span-1">
                <div className="bg-[var(--surface-raised)] rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <History size={20} />
                    Reading History
                  </h3>
                  
                  {treeHistory.length === 0 ? (
                    <p className="text-[var(--text-muted)] text-sm">No previous readings for this tree.</p>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {treeHistory.map((reading) => (
                        <div key={reading.id} className="border border-[var(--border)] rounded-lg p-3">
                          <div className="flex justify-between items-start mb-2">
                            <div className="text-sm font-medium">
                              {new Date(reading.date).toLocaleDateString()}
                            </div>
                            <div className={`text-lg font-bold ${getChlorophyllColor(reading.chlorophyllLevel)}`}>
                              {reading.chlorophyllLevel}
                            </div>
                          </div>
                          <div className="text-xs text-[var(--text-secondary)] mb-1">
                            {reading.treeMaturity}
                          </div>
                          <div className="text-xs text-[var(--text-secondary)] mb-1">
                            Extension Growth: {reading.extensionGrowth}mm
                          </div>
                          {reading.notes && (
                            <div className="text-xs text-[var(--text-primary)] bg-[var(--forest)] p-2 rounded">
                              {reading.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showDeleteConfirmation}
        onClose={() => setShowDeleteConfirmation(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Chlorophyll Reading"
        message="Are you sure you want to delete this chlorophyll reading? The reading will be moved to trash and can be recovered for a short while."
        confirmButtonText="Move to Trash"
        cancelButtonText="Keep Reading"
        isDestructive={true}
      />
    </div>
  );
};