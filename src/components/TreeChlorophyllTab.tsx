import React, { useState, useEffect, useCallback } from 'react';
import { ChlorophyllReading } from '../types';
import { Plus, Trash2, Activity, X } from 'lucide-react';
import { ConfirmationModal } from './ConfirmationModal';
import { db } from '../utils/offline';
import { fromDbChlorophyll, toDbChlorophyll } from '../utils/mappers';

interface TreeChlorophyllTabProps {
  // The tree these readings belong to. `treeId` is the report/tree id so every
  // reading taken here is permanently linked to this one tree.
  treeId: string;
  treeSpecies: string;
  treeLocation: string;
  readOnly?: boolean;
}

const emptyForm = () => ({
  date: new Date().toISOString().split('T')[0],
  treeMaturity: 'Juvenile' as ChlorophyllReading['treeMaturity'],
  chlorophyllLevel: 0,
  extensionGrowth: 0,
  notes: '',
});

const chlorophyllColor = (level: number) => {
  if (level >= 40) return 'text-[var(--leaf)]';
  if (level >= 30) return 'text-[var(--text-secondary)]';
  if (level >= 20) return 'text-[var(--text-secondary)]';
  return 'text-[var(--danger)]';
};

const chlorophyllStatus = (level: number) => {
  if (level >= 40) return 'Excellent';
  if (level >= 30) return 'Good';
  if (level >= 20) return 'Fair';
  return 'Poor';
};

export const TreeChlorophyllTab: React.FC<TreeChlorophyllTabProps> = ({
  treeId,
  treeSpecies,
  treeLocation,
  readOnly = false,
}) => {
  const [readings, setReadings] = useState<ChlorophyllReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const loadReadings = useCallback(async () => {
    if (!treeId) { setReadings([]); setLoading(false); return; }
    setLoading(true);
    try {
      const rows = await db.select('chlorophyll_readings', { eq: { tree_id: treeId }, is_null: 'deleted_at' });
      const mapped = (rows as any[])
        .map(fromDbChlorophyll)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setReadings(mapped);
    } catch (err: any) {
      setError(err?.message || 'Could not load readings.');
    } finally {
      setLoading(false);
    }
  }, [treeId]);

  useEffect(() => { loadReadings(); }, [loadReadings]);

  const handleAdd = async () => {
    if (saving) return;
    setSaving(true);
    setError('');
    const reading: ChlorophyllReading = {
      id: crypto.randomUUID(),
      treeId,
      treeSpecies,
      treeLocation,
      treeMaturity: form.treeMaturity,
      date: form.date,
      chlorophyllLevel: form.chlorophyllLevel,
      extensionGrowth: form.extensionGrowth,
      notes: form.notes,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    try {
      await db.upsert('chlorophyll_readings', toDbChlorophyll(reading));
      setForm(emptyForm());
      setShowForm(false);
      await loadReadings();
    } catch (err: any) {
      setError(err?.message || 'Could not save. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await db.softDelete('chlorophyll_readings', pendingDelete);
    } catch { /* still refresh */ }
    setPendingDelete(null);
    await loadReadings();
  };

  const latest = readings[0];

  return (
    <div className="p-4 sm:p-6 max-w-3xl">
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Activity size={20} className="text-[var(--leaf)] shrink-0" />
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Chlorophyll Monitoring</h2>
        </div>
        {!readOnly && !showForm && (
          <button
            onClick={() => { setForm(emptyForm()); setShowForm(true); }}
            className="flex items-center gap-2 bg-[var(--canopy)] text-[var(--cream)] px-4 py-2 rounded-lg hover:bg-[var(--forest-light)] transition-colors shrink-0"
          >
            <Plus size={18} /> New Reading
          </button>
        )}
      </div>

      {!treeId && (
        <p className="text-sm text-[var(--text-muted)] mb-4">
          Save this tree first, then you can record chlorophyll readings against it.
        </p>
      )}

      {error && <p className="text-sm text-[#b3433d] mb-4">{error}</p>}

      {/* Latest reading summary */}
      {latest && (
        <div className="bg-[var(--surface-raised)] rounded-lg border border-[var(--border)] p-4 mb-6">
          <div className="text-xs text-[var(--text-muted)] mb-1">Latest reading · {new Date(latest.date).toLocaleDateString()}</div>
          <div className="flex items-baseline gap-3">
            <span className={`text-3xl font-bold ${chlorophyllColor(latest.chlorophyllLevel)}`}>{latest.chlorophyllLevel}</span>
            <span className="text-sm text-[var(--text-secondary)]">SPAD · {chlorophyllStatus(latest.chlorophyllLevel)}</span>
            <span className="text-sm text-[var(--text-muted)] ml-auto">Growth: {latest.extensionGrowth}mm</span>
          </div>
        </div>
      )}

      {/* Add form */}
      {showForm && !readOnly && (
        <div className="bg-[var(--surface-raised)] rounded-lg border border-[var(--border-bright)] p-4 sm:p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">New Reading</h3>
            <button onClick={() => setShowForm(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]" title="Cancel">
              <X size={18} />
            </button>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Tree Maturity</label>
                <select
                  value={form.treeMaturity}
                  onChange={(e) => setForm({ ...form, treeMaturity: e.target.value as ChlorophyllReading['treeMaturity'] })}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                >
                  <option value="Juvenile">Juvenile</option>
                  <option value="Semi mature">Semi mature</option>
                  <option value="Mature">Mature</option>
                  <option value="Senescent">Senescent</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Chlorophyll Level (SPAD)</label>
                <input
                  type="number"
                  value={form.chlorophyllLevel}
                  onChange={(e) => setForm({ ...form, chlorophyllLevel: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                  step="0.1" min="0" max="100" placeholder="0.0"
                />
                {form.chlorophyllLevel > 0 && (
                  <div className="mt-2 text-sm">
                    <span className="text-[var(--text-secondary)]">Status: </span>
                    <span className={`font-semibold ${chlorophyllColor(form.chlorophyllLevel)}`}>{chlorophyllStatus(form.chlorophyllLevel)}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Extension Growth (mm)</label>
                <input
                  type="number"
                  value={form.extensionGrowth}
                  onChange={(e) => setForm({ ...form, extensionGrowth: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                  step="1" min="0" placeholder="0"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Notes (optional)</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent resize-none"
                rows={3} placeholder="Observations, weather conditions, etc."
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={saving}
                className="flex items-center gap-2 bg-[var(--canopy)] text-[var(--cream)] px-4 py-2 rounded-lg hover:bg-[var(--forest-light)] transition-colors disabled:opacity-50"
              >
                <Plus size={18} /> {saving ? 'Saving…' : 'Add Reading'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--forest)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History list */}
      {loading ? (
        <p className="text-sm text-[var(--text-muted)]">Loading readings…</p>
      ) : readings.length === 0 ? (
        !showForm && (
          <div className="text-center py-10">
            <Activity className="mx-auto h-10 w-10 text-[var(--text-muted)] mb-3" />
            <p className="text-[var(--text-muted)]">No chlorophyll readings for this tree yet.</p>
          </div>
        )
      ) : (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wide">History ({readings.length})</h3>
          {readings.map((r) => (
            <div key={r.id} className="bg-[var(--surface-raised)] rounded-lg border border-[var(--border)] p-4">
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-[var(--text-primary)]">{new Date(r.date).toLocaleDateString()}</span>
                    <span className="text-xs text-[var(--text-muted)]">· {r.treeMaturity}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--text-secondary)]">
                    <span>Growth: {r.extensionGrowth}mm</span>
                    <span className={chlorophyllColor(r.chlorophyllLevel)}>{chlorophyllStatus(r.chlorophyllLevel)}</span>
                  </div>
                  {r.notes && <p className="text-xs text-[var(--text-secondary)] mt-2 bg-[var(--forest)] p-2 rounded">{r.notes}</p>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-2xl font-bold ${chlorophyllColor(r.chlorophyllLevel)}`}>{r.chlorophyllLevel}</span>
                  {!readOnly && (
                    <button
                      onClick={() => setPendingDelete(r.id)}
                      className="text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors"
                      title="Delete reading"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmationModal
        isOpen={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Chlorophyll Reading"
        message="Are you sure you want to delete this reading? It will be moved to trash and can be recovered for a short while."
        confirmButtonText="Move to Trash"
        cancelButtonText="Keep Reading"
        isDestructive={true}
      />
    </div>
  );
};
