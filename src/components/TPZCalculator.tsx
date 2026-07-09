import React, { useMemo, useState } from 'react';
import { TreeData } from '../types';
import { Shield, Plus, X, AlertTriangle, RotateCcw } from 'lucide-react';

interface TPZCalculatorProps {
  treeData: TreeData;
}

/**
 * Tree Protection Zone (TPZ) and Structural Root Zone (SRZ) calculator,
 * aligned with AS 4970-2009 "Protection of Trees on Development Sites".
 *
 *   TPZ radius = DBH x 12          (clamped: min 2 m, max 15 m)
 *   SRZ radius = (D x 50)^0.42 x 0.64      (fixed at 1.5 m if D < 0.15 m)
 *
 * where DBH is diameter at breast height (1.4 m) in metres, and D is the
 * trunk diameter immediately above the root buttress, in metres.
 *
 * For multi-stemmed trees, DBH is the combined diameter:
 *   DBH = sqrt(d1^2 + d2^2 + ... + dn^2)
 *
 * Encroachment uses the standard circular-segment method: for a straight
 * cut at distance d from the trunk centre (d < TPZ radius), the encroached
 * area is r^2 * acos(d/r) - d * sqrt(r^2 - d^2). AS 4970-2009 treats an
 * encroached area over 10% of the TPZ as a "major encroachment".
 */

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const combinedDbhCm = (diametersCm: number[]): number => {
  const valid = diametersCm.filter((d) => d > 0);
  if (valid.length === 0) return 0;
  const sumSquares = valid.reduce((sum, d) => sum + d * d, 0);
  return Math.sqrt(sumSquares);
};

const calcTpzRadiusM = (dbhM: number) => {
  const raw = dbhM * 12;
  const radius = clamp(raw, 2, 15);
  const clampedTo: 'min' | 'max' | null = raw < 2 && dbhM > 0 ? 'min' : raw > 15 ? 'max' : null;
  return { raw, radius, clampedTo };
};

const calcSrzRadiusM = (trunkDiameterM: number) => {
  if (trunkDiameterM <= 0) return 0;
  if (trunkDiameterM < 0.15) return 1.5;
  return Math.pow(trunkDiameterM * 50, 0.42) * 0.64;
};

type Severity = 'none' | 'minor' | 'major' | 'srz';

const calcEncroachment = (tpzRadius: number, srzRadius: number, distance: number) => {
  if (!Number.isFinite(distance) || distance < 0 || tpzRadius <= 0) return null;
  if (distance >= tpzRadius) {
    return { areaPct: 0, severity: 'none' as Severity };
  }
  const r = tpzRadius;
  const d = distance;
  const segmentArea = r * r * Math.acos(d / r) - d * Math.sqrt(Math.max(0, r * r - d * d));
  const circleArea = Math.PI * r * r;
  const areaPct = (segmentArea / circleArea) * 100;
  const severity: Severity = distance < srzRadius ? 'srz' : areaPct > 10 ? 'major' : 'minor';
  return { areaPct, severity };
};

const fmt = (n: number, dp = 2) => (Number.isFinite(n) ? n.toFixed(dp) : '—');

export const TPZCalculator: React.FC<TPZCalculatorProps> = ({ treeData }) => {
  const initialDbhCm = treeData?.dbh && treeData.dbh > 0 ? treeData.dbh : 0;

  const [stemMode, setStemMode] = useState<'single' | 'multi'>('single');
  const [singleDiameterCm, setSingleDiameterCm] = useState<number>(initialDbhCm);
  const [stems, setStems] = useState<number[]>([initialDbhCm || 0, 0]);

  const [srzSameAsDbh, setSrzSameAsDbh] = useState(true);
  const [srzDiameterCmManual, setSrzDiameterCmManual] = useState<number>(initialDbhCm);

  const [encroachDistance, setEncroachDistance] = useState<string>('');

  const dbhCm = stemMode === 'single' ? singleDiameterCm : combinedDbhCm(stems);
  const dbhM = dbhCm / 100;

  const srzDiameterCm = srzSameAsDbh ? dbhCm : srzDiameterCmManual;
  const srzDiameterM = srzDiameterCm / 100;

  const tpz = useMemo(() => calcTpzRadiusM(dbhM), [dbhM]);
  const srzRadius = useMemo(() => calcSrzRadiusM(srzDiameterM), [srzDiameterM]);

  const encroachment = useMemo(() => {
    const d = parseFloat(encroachDistance);
    if (encroachDistance === '' || !Number.isFinite(d)) return null;
    return calcEncroachment(tpz.radius, srzRadius, d);
  }, [encroachDistance, tpz.radius, srzRadius]);

  const updateStem = (i: number, value: number) => {
    setStems((prev) => prev.map((s, idx) => (idx === i ? value : s)));
  };
  const addStem = () => setStems((prev) => [...prev, 0]);
  const removeStem = (i: number) => setStems((prev) => prev.filter((_, idx) => idx !== i));

  // --- diagram geometry ------------------------------------------------
  const maxRadius = Math.max(tpz.radius, srzRadius, 0.1);
  const scale = 120 / maxRadius;
  const tpzPx = tpz.radius * scale;
  const srzPx = srzRadius * scale;
  const centre = 150;
  const encroachD = encroachment && encroachment.severity !== 'none' ? parseFloat(encroachDistance) : null;
  const encroachLineX = encroachD !== null ? centre + encroachD * scale : null;

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto pb-16">
      <div className="flex items-center gap-2 mb-1">
        <Shield className="shrink-0" size={22} style={{ color: 'var(--accent)' }} />
        <h2 style={{ fontFamily: 'Newsreader, serif', fontWeight: 500, fontSize: '23px', color: 'var(--text-primary)' }}>
          TPZ / SRZ Calculator
        </h2>
      </div>
      <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
        Tree Protection Zone and Structural Root Zone, per AS 4970-2009.
      </p>

      {/* --- DBH input --- */}
      <div className="rounded-xl p-4 mb-4" style={{ border: '1px solid var(--border)', background: 'var(--surface-raised)' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="section-label">Trunk diameter (DBH)</span>
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            <button
              onClick={() => setStemMode('single')}
              className="px-3 py-1.5 text-xs font-medium transition-colors"
              style={stemMode === 'single' ? { background: 'var(--accent-soft)', color: 'var(--accent)' } : { color: 'var(--text-secondary)' }}
            >
              Single stem
            </button>
            <button
              onClick={() => setStemMode('multi')}
              className="px-3 py-1.5 text-xs font-medium transition-colors"
              style={stemMode === 'multi' ? { background: 'var(--accent-soft)', color: 'var(--accent)' } : { color: 'var(--text-secondary)' }}
            >
              Multi-stem
            </button>
          </div>
        </div>

        {stemMode === 'single' ? (
          <div>
            <label>DBH (cm)</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={singleDiameterCm || ''}
              onChange={(e) => setSingleDiameterCm(parseFloat(e.target.value) || 0)}
              className="input-field"
              placeholder="0.0"
            />
            {treeData?.dbh > 0 && (
              <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
                Pre-filled from this tree's DBH in Tree Info — edit if measuring fresh.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
              Enter each stem's diameter (cm), measured at 1.4 m. Combined DBH is calculated as the square root of the sum of squares.
            </p>
            {stems.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs w-16 shrink-0" style={{ color: 'var(--text-muted)' }}>Stem {i + 1}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={s || ''}
                  onChange={(e) => updateStem(i, parseFloat(e.target.value) || 0)}
                  className="input-field"
                  placeholder="0.0 cm"
                />
                {stems.length > 2 && (
                  <button onClick={() => removeStem(i)} className="p-2 shrink-0" style={{ color: 'var(--text-muted)' }} title="Remove stem">
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={addStem}
              className="flex items-center gap-1.5 text-xs font-medium mt-1"
              style={{ color: 'var(--accent)' }}
            >
              <Plus size={14} /> Add stem
            </button>
            <p className="text-sm mt-3" style={{ color: 'var(--text-secondary)' }}>
              Combined DBH: <strong style={{ color: 'var(--text-primary)' }}>{fmt(dbhCm, 1)} cm</strong>
            </p>
          </div>
        )}
      </div>

      {/* --- SRZ trunk diameter --- */}
      <div className="rounded-xl p-4 mb-4" style={{ border: '1px solid var(--border)', background: 'var(--surface-raised)' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="section-label">Trunk diameter above root buttress (for SRZ)</span>
          {!srzSameAsDbh && (
            <button
              onClick={() => setSrzSameAsDbh(true)}
              className="flex items-center gap-1 text-xs font-medium"
              style={{ color: 'var(--accent)' }}
            >
              <RotateCcw size={12} /> Use DBH
            </button>
          )}
        </div>
        <input
          type="number"
          inputMode="decimal"
          step="0.1"
          value={srzDiameterCm || ''}
          onChange={(e) => {
            setSrzSameAsDbh(false);
            setSrzDiameterCmManual(parseFloat(e.target.value) || 0);
          }}
          className="input-field"
          placeholder="0.0"
        />
        <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
          {srzSameAsDbh ? 'Matching combined DBH above — adjust if the buttress diameter differs.' : 'Custom value — measured just above the root buttress.'}
        </p>
      </div>

      {/* --- Results --- */}
      <div className="rounded-xl p-5 mb-4" style={{ border: '1px solid var(--border)', background: 'var(--surface-raised)' }}>
        <div className="grid grid-cols-2 gap-4 text-center mb-5">
          <div>
            <p className="text-[11px] font-semibold tracking-widest uppercase mb-1" style={{ color: 'var(--text-muted)' }}>TPZ radius</p>
            <p className="text-3xl font-semibold" style={{ color: 'var(--accent)' }}>{fmt(tpz.radius)} m</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>diameter {fmt(tpz.radius * 2)} m</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold tracking-widest uppercase mb-1" style={{ color: 'var(--text-muted)' }}>SRZ radius</p>
            <p className="text-3xl font-semibold" style={{ color: 'var(--text-primary)' }}>{fmt(srzRadius)} m</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>diameter {fmt(srzRadius * 2)} m</p>
          </div>
        </div>

        {tpz.clampedTo === 'min' && (
          <p className="text-xs mb-3 text-center" style={{ color: 'var(--text-muted)' }}>
            Calculated TPZ ({fmt(tpz.raw)} m) is below the standard 2 m minimum — 2 m has been applied.
          </p>
        )}
        {tpz.clampedTo === 'max' && (
          <p className="text-xs mb-3 text-center" style={{ color: 'var(--text-muted)' }}>
            Calculated TPZ ({fmt(tpz.raw)} m) exceeds the standard 15 m maximum — capped at 15 m. A larger TPZ may still be justified for a tree of high retention value.
          </p>
        )}

        {/* Diagram */}
        <div className="flex justify-center">
          <svg viewBox="0 0 300 300" width="220" height="220">
            <circle cx={centre} cy={centre} r={tpzPx} fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="5 4" />
            {srzPx > 0 && (
              <circle cx={centre} cy={centre} r={srzPx} fill="var(--accent-soft)" stroke="var(--text-primary)" strokeWidth="1.5" />
            )}
            <circle cx={centre} cy={centre} r="3" fill="var(--text-primary)" />
            {encroachLineX !== null && (
              <line x1={encroachLineX} y1={centre - 130} x2={encroachLineX} y2={centre + 130} stroke="var(--danger)" strokeWidth="1.5" strokeDasharray="3 3" />
            )}
            <text x={centre} y={centre - tpzPx - 8} textAnchor="middle" fontSize="10" fill="var(--text-muted)">TPZ</text>
            {srzPx > 6 && (
              <text x={centre} y={centre - srzPx - 6} textAnchor="middle" fontSize="10" fill="var(--text-secondary)">SRZ</text>
            )}
            {encroachLineX !== null && (
              <text x={encroachLineX} y={centre - 136} textAnchor="middle" fontSize="9" fill="var(--danger)">works</text>
            )}
          </svg>
        </div>
      </div>

      {/* --- Encroachment --- */}
      <div className="rounded-xl p-4" style={{ border: '1px solid var(--border)', background: 'var(--surface-raised)' }}>
        <span className="section-label">Encroachment check (optional)</span>
        <p className="text-xs mt-1.5 mb-3" style={{ color: 'var(--text-muted)' }}>
          Distance from the trunk centre to the nearest edge of proposed works (m).
        </p>
        <input
          type="number"
          inputMode="decimal"
          step="0.1"
          value={encroachDistance}
          onChange={(e) => setEncroachDistance(e.target.value)}
          className="input-field"
          placeholder="e.g. 4.5"
        />

        {encroachment && (
          <div className="mt-4">
            {encroachment.severity === 'none' && (
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Outside the TPZ — no encroachment.
              </p>
            )}
            {encroachment.severity !== 'none' && (
              <div className="flex items-start gap-2 rounded-lg p-3" style={{
                background: encroachment.severity === 'minor' ? 'var(--surface-overlay)' : 'rgba(179,67,61,0.1)',
                border: `1px solid ${encroachment.severity === 'minor' ? 'var(--border)' : 'rgba(179,67,61,0.25)'}`,
              }}>
                <AlertTriangle size={16} className="shrink-0 mt-0.5" style={{ color: encroachment.severity === 'minor' ? 'var(--text-muted)' : 'var(--danger)' }} />
                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <p>
                    Encroaches <strong style={{ color: 'var(--text-primary)' }}>{fmt(encroachment.areaPct, 1)}%</strong> of the TPZ area.
                  </p>
                  {encroachment.severity === 'srz' && (
                    <p className="mt-1">Falls within the Structural Root Zone — generally unacceptable without a detailed root investigation and specific arborist advice.</p>
                  )}
                  {encroachment.severity === 'major' && (
                    <p className="mt-1">Major encroachment (over 10% of TPZ area) — likely requires root investigation, design changes, or supervised low-impact construction under AS 4970-2009.</p>
                  )}
                  {encroachment.severity === 'minor' && (
                    <p className="mt-1">Minor encroachment (10% or less of TPZ area) — generally acceptable under AS 4970-2009.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <p className="text-xs mt-5" style={{ color: 'var(--text-muted)' }}>
        Based on AS 4970-2009 "Protection of Trees on Development Sites". These figures are a guide only — species tolerance, soil, slope, and root distribution can all affect the true protection zone required. Not saved to Tree Data; re-enter or adjust figures each time you need them.
      </p>
    </div>
  );
};
