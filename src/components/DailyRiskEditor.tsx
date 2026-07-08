import React, { useState } from 'react';
import { DailyRisk, HazardControl, Signature } from '../types';
import { ArrowLeft, Save, Trash2, Plus, PenTool, Download } from 'lucide-react';
import { exportSingleRiskAssessment } from '../utils/exportUtils';
import { getCurrentUser, getUserDisplayName } from '../utils/auth';
import { ExportModal } from './ExportModal';
import { ConfirmationModal } from './ConfirmationModal';
import { db } from '../utils/offline';
import { fromDbRisk, toDbRisk } from '../utils/mappers';

interface DailyRiskEditorProps {
  risk: DailyRisk;
  onSave: (risk: DailyRisk) => void;
  onDelete?: (riskId: string) => void;
  onBack: () => void;
  isNew?: boolean;
}

export const DailyRiskEditor: React.FC<DailyRiskEditorProps> = ({
  risk,
  onSave,
  onDelete,
  onBack,
  isNew = false
}) => {
  const [editingRisk, setEditingRisk] = useState<DailyRisk>(fromDbRisk(risk));
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [newSignatureName, setNewSignatureName] = useState('');
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setSaveError('');
    try {
      await db.upsert('daily_risks', toDbRisk(editingRisk));
      onSave(editingRisk);
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
      await db.softDelete('daily_risks', risk.id);
    } catch { /* still close */ }
    if (onDelete) onDelete(risk.id);
  };

  const updateRisk = (field: keyof DailyRisk, value: any) => {
    setEditingRisk(prev => ({ ...prev, [field]: value }));
  };

  const updateHazard = (hazardKey: keyof DailyRisk['hazards'], value: boolean) => {
    setEditingRisk(prev => ({
      ...prev,
      hazards: { ...prev.hazards, [hazardKey]: value }
    }));
  };

  const addHazardControl = () => {
    const newControl: HazardControl = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      hazardIdentified: '',
      controlMeasures: ''
    };
    setEditingRisk(prev => ({
      ...prev,
      hazardControls: [...prev.hazardControls, newControl]
    }));
  };

  const updateHazardControl = (id: string, field: keyof HazardControl, value: string) => {
    setEditingRisk(prev => ({
      ...prev,
      hazardControls: prev.hazardControls.map(hc =>
        hc.id === id ? { ...hc, [field]: value } : hc
      )
    }));
  };

  const removeHazardControl = (id: string) => {
    setEditingRisk(prev => ({
      ...prev,
      hazardControls: prev.hazardControls.filter(hc => hc.id !== id)
    }));
  };

  const addSignature = () => {
    if (newSignatureName.trim()) {
      // Use current user's name if available and no custom name provided
      const signatureName = newSignatureName.trim() || getUserDisplayName();
      
      const newSignature: Signature = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: signatureName,
        timestamp: Date.now()
      };
      setEditingRisk(prev => ({
        ...prev,
        signatures: [...prev.signatures, newSignature]
      }));
      setNewSignatureName('');
      setShowSignatureModal(false);
    }
  };

  const addCurrentUserSignature = () => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      const newSignature: Signature = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: currentUser.name,
        timestamp: Date.now()
      };
      setEditingRisk(prev => ({
        ...prev,
        signatures: [...prev.signatures, newSignature]
      }));
    }
  };

  const removeSignature = (id: string) => {
    setEditingRisk(prev => ({
      ...prev,
      signatures: prev.signatures.filter(sig => sig.id !== id)
    }));
  };

  const hazardOptions = [
    { key: 'workingAtHeights', label: 'Working at heights' },
    { key: 'unstableGround', label: 'Unstable/sloping ground' },
    { key: 'powerlines', label: 'Powerlines' },
    { key: 'undergroundServices', label: 'Underground services' },
    { key: 'siteWorkers', label: 'Site workers' },
    { key: 'pedestrians', label: 'Pedestrians' },
    { key: 'traffic', label: 'Traffic' },
    { key: 'noise', label: 'Noise' },
    { key: 'chainsaws', label: 'Chainsaws' },
    { key: 'loweringDevices', label: 'Lowering devices' },
    { key: 'ewp', label: 'EWP' },
    { key: 'crane', label: 'Crane' },
    { key: 'deadBranches', label: 'Dead branches' },
    { key: 'brokenBranches', label: 'Broken branches' },
    { key: 'deadTree', label: 'Dead tree' },
    { key: 'barkInclusions', label: 'Bark inclusions' },
    { key: 'treeLean', label: 'Tree lean' },
    { key: 'fallenTree', label: 'Fallen/supported tree' },
    { key: 'wildlife', label: 'Wildlife' }
  ];

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
              <span className="hidden sm:inline">Back to Risk Assessments</span>
            </button>
            <h1 className="text-lg sm:text-2xl font-bold text-[var(--text-primary)] truncate">
              {isNew ? 'New Daily Risk Assessment' : 'Edit Daily Risk Assessment'}
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
                  onClick={handleDelete}
                  className="flex items-center gap-2 bg-[var(--danger)] text-[var(--cream)] px-4 py-2 rounded-lg hover:opacity-90 transition-colors"
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
              {saving ? 'Saving…' : 'Save Assessment'}
            </button>
          </div>
        </div>
        {saveError && <p className="text-sm text-[#b3433d] mt-2">{saveError}</p>}
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Site Information */}
          <div className="bg-[var(--surface-raised)] rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-6">Site Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Site Address *
                </label>
                <input
                  type="text"
                  value={editingRisk.siteAddress}
                  onChange={(e) => updateRisk('siteAddress', e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                  placeholder="Enter site address"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={editingRisk.date}
                    onChange={(e) => updateRisk('date', e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Client Name
                  </label>
                  <input
                    type="text"
                    value={editingRisk.clientName}
                    onChange={(e) => updateRisk('clientName', e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                    placeholder="Client name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Client Mobile Number
                  </label>
                  <input
                    type="tel"
                    value={editingRisk.clientMobile}
                    onChange={(e) => updateRisk('clientMobile', e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                    placeholder="Mobile number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    First Aid Location
                  </label>
                  <input
                    type="text"
                    value={editingRisk.firstAidLocation}
                    onChange={(e) => updateRisk('firstAidLocation', e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                    placeholder="First aid kit location"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Nearest Hospital/ER
                </label>
                <input
                  type="text"
                  value={editingRisk.nearestHospital}
                  onChange={(e) => updateRisk('nearestHospital', e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                  placeholder="Nearest hospital or emergency room"
                />
              </div>
            </div>
          </div>

          {/* Hazards */}
          <div className="bg-[var(--surface-raised)] rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-6">Hazards</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {hazardOptions.map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingRisk.hazards[key as keyof typeof editingRisk.hazards]}
                    onChange={(e) => updateHazard(key as keyof typeof editingRisk.hazards, e.target.checked)}
                    className="w-4 h-4 text-[var(--leaf)] border-[var(--border)] rounded focus:ring-[var(--accent)]"
                  />
                  <span className="text-sm text-[var(--text-primary)]">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Hazard Controls */}
          <div className="bg-[var(--surface-raised)] rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Hazard Identification & Control Measures</h2>
              <button
                onClick={addHazardControl}
                className="flex items-center gap-2 bg-[var(--canopy)] text-[var(--cream)] px-4 py-2 rounded-lg hover:bg-[var(--forest-light)] transition-colors"
              >
                <Plus size={20} />
                Add Hazard
              </button>
            </div>

            {editingRisk.hazardControls.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-[var(--text-muted)] mb-4">No hazards identified yet</p>
                <button
                  onClick={addHazardControl}
                  className="bg-[var(--canopy)] text-[var(--cream)] px-4 py-2 rounded-lg hover:bg-[var(--forest-light)] transition-colors"
                >
                  Add First Hazard
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {editingRisk.hazardControls.map((control, index) => (
                  <div key={control.id} className="border border-[var(--border)] rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-[var(--text-primary)]">Hazard {index + 1}</h3>
                      <button
                        onClick={() => removeHazardControl(control.id)}
                        className="text-[var(--danger)] hover:opacity-80 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                          Hazard Identified
                        </label>
                        <textarea
                          value={control.hazardIdentified}
                          onChange={(e) => updateHazardControl(control.id, 'hazardIdentified', e.target.value)}
                          className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent resize-none"
                          rows={3}
                          placeholder="Describe the hazard..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                          Control Measures
                        </label>
                        <textarea
                          value={control.controlMeasures}
                          onChange={(e) => updateHazardControl(control.id, 'controlMeasures', e.target.value)}
                          className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent resize-none"
                          rows={3}
                          placeholder="Describe control measures..."
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Signatures */}
          <div className="bg-[var(--surface-raised)] rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Signatures</h2>
              <button
                onClick={() => setShowSignatureModal(true)}
                className="flex items-center gap-2 border border-[var(--accent)] text-[var(--leaf)] px-4 py-2 rounded-lg hover:bg-[var(--accent-soft)] transition-colors"
              >
                <PenTool size={20} />
                Add Custom Signature
              </button>
              {getCurrentUser() && (
                <button
                  onClick={addCurrentUserSignature}
                  className="flex items-center gap-2 bg-[var(--canopy)] text-[var(--cream)] px-4 py-2 rounded-lg hover:bg-[var(--forest-light)] transition-colors"
                >
                  <PenTool size={20} />
                  Sign as {getCurrentUser()?.name}
                </button>
              )}
            </div>

            {editingRisk.signatures.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-[var(--text-muted)] mb-4">No signatures added yet</p>
                <div className="flex gap-2 justify-center">
                  {getCurrentUser() && (
                    <button
                      onClick={addCurrentUserSignature}
                      className="bg-[var(--canopy)] text-[var(--cream)] px-4 py-2 rounded-lg hover:bg-[var(--forest-light)] transition-colors"
                    >
                      Sign as {getCurrentUser()?.name}
                    </button>
                  )}
                  <button
                    onClick={() => setShowSignatureModal(true)}
                    className="border border-[var(--accent)] text-[var(--leaf)] px-4 py-2 rounded-lg hover:bg-[var(--accent-soft)] transition-colors"
                  >
                    Add Custom Signature
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {editingRisk.signatures.map((signature) => (
                  <div key={signature.id} className="border border-[var(--border)] rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-[var(--text-primary)]">{signature.name}</h3>
                      <button
                        onClick={() => removeSignature(signature.id)}
                        className="text-[var(--danger)] hover:opacity-80 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <p className="text-sm text-[var(--text-muted)]">
                      Signed: {new Date(signature.timestamp).toLocaleDateString()} at {new Date(signature.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Signature Modal */}
      {showSignatureModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface-raised)] rounded-lg max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Add Signature</h3>
              <button
                onClick={() => {
                  setShowSignatureModal(false);
                  setNewSignatureName('');
                }}
                className="p-1 hover:bg-[var(--surface-overlay)] rounded-full transition-colors"
              >
                <Plus className="rotate-45" size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={newSignatureName}
                 placeholder={`Enter name or leave blank to use "${getUserDisplayName()}"`}
                  onChange={(e) => setNewSignatureName(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                  onKeyPress={(e) => e.key === 'Enter' && addSignature()}
                />
              </div>
              
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    setShowSignatureModal(false);
                    setNewSignatureName('');
                  }}
                  className="flex-1 px-4 py-2 border border-[var(--border)] rounded-lg hover:bg-[var(--forest)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={addSignature}
                  className="flex-1 px-4 py-2 bg-[var(--canopy)] text-[var(--cream)] rounded-lg hover:bg-[var(--forest-light)] transition-colors"
                >
                  Add Signature
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Risk Assessment"
        data={editingRisk}
        exportFunctions={{
          report: () => exportSingleRiskAssessment(editingRisk)
        }}
        emailOptions={{
          defaultSubject: `Risk Assessment - ${editingRisk.siteAddress}`,
          defaultBody: `Please find the attached daily risk assessment for ${editingRisk.siteAddress} dated ${editingRisk.date}. This includes identified hazards, control measures, and signatures.`
        }}
      />

      <ConfirmationModal
        isOpen={showDeleteConfirmation}
        onClose={() => setShowDeleteConfirmation(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Risk Assessment"
        message="Are you sure you want to delete this risk assessment? The assessment will be moved to trash and can be recovered for a short while."
        confirmButtonText="Move to Trash"
        cancelButtonText="Keep Assessment"
        isDestructive={true}
      />
    </div>
  );
};