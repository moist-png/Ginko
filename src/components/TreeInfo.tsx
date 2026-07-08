import React from 'react';
import { TreeData } from '../types';
import { normaliseTreeData } from '../utils/mappers';

interface TreeInfoProps {
  treeData: TreeData;
  readOnly?: boolean;
  onUpdate: (treeData: TreeData) => void;
}

export const TreeInfo: React.FC<TreeInfoProps> = ({ treeData, readOnly = false, onUpdate }) => {
  const data = normaliseTreeData(treeData);

  const handleChange = (field: keyof TreeData, value: string | number) => {
    if (readOnly) return;
    onUpdate({ ...data, [field]: value });
  };

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="mb-6" style={{ fontFamily: 'Newsreader, serif', fontWeight: 500, fontSize: '23px', color: 'var(--text-primary)' }}>Tree Information</h2>
      
      <div className="space-y-6">
        <div>
          <label>
            Tree Number
          </label>
          <input
            type="text"
            value={data.treeNumber}
            disabled={readOnly}
            onChange={(e) => handleChange('treeNumber', e.target.value)}
            className="input-field disabled:cursor-not-allowed"
            placeholder="e.g., T001, A-15"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label>
              Scientific Name
            </label>
            <input
              type="text"
              value={data.species}
              disabled={readOnly}
              onChange={(e) => handleChange('species', e.target.value)}
              className="input-field disabled:cursor-not-allowed"
              placeholder="e.g., Quercus alba"
            />
          </div>

          <div>
            <label>
              Common Name
            </label>
            <input
              type="text"
              value={data.commonName}
              disabled={readOnly}
              onChange={(e) => handleChange('commonName', e.target.value)}
              className="input-field disabled:cursor-not-allowed"
              placeholder="e.g., White Oak"
            />
          </div>
        </div>

        <div>
          <label>
            Location Description
          </label>
          <input
            type="text"
            value={data.location}
            disabled={readOnly}
            onChange={(e) => handleChange('location', e.target.value)}
            className="input-field disabled:cursor-not-allowed"
            placeholder="e.g., Front yard, 6 metres from house"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label>
              DBH (cm)
            </label>
            <input
              type="number"
              value={data.dbh}
              disabled={readOnly}
              onChange={(e) => handleChange('dbh', parseFloat(e.target.value) || 0)}
              className="input-field disabled:cursor-not-allowed"
              placeholder="0.0"
              step="0.1"
            />
          </div>

          <div>
            <label>
              Height (m)
            </label>
            <input
              type="number"
              value={data.height}
              disabled={readOnly}
              onChange={(e) => handleChange('height', parseFloat(e.target.value) || 0)}
              className="input-field disabled:cursor-not-allowed"
              placeholder="0.0"
              step="0.1"
            />
          </div>

          <div>
            <label>
              Extension Growth (mm)
            </label>
            <input
              type="number"
              value={data.extensionGrowth}
              disabled={readOnly}
              onChange={(e) => handleChange('extensionGrowth', parseFloat(e.target.value) || 0)}
              className="input-field disabled:cursor-not-allowed"
              placeholder="0"
              step="1"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label>
              Canopy Spread North-South (m)
            </label>
            <input
              type="number"
              value={data.canopySpreadNS}
              disabled={readOnly}
              onChange={(e) => handleChange('canopySpreadNS', parseFloat(e.target.value) || 0)}
              className="input-field disabled:cursor-not-allowed"
              placeholder="0.0"
              step="0.1"
            />
          </div>

          <div>
            <label>
              Canopy Spread East-West (m)
            </label>
            <input
              type="number"
              value={data.canopySpreadEW}
              disabled={readOnly}
              onChange={(e) => handleChange('canopySpreadEW', parseFloat(e.target.value) || 0)}
              className="input-field disabled:cursor-not-allowed"
              placeholder="0.0"
              step="0.1"
            />
          </div>
        </div>

        <div>
          <label>
            Canopy Cover (%)
          </label>
          <input
            type="number"
            value={data.canopyCover}
            disabled={readOnly}
            onChange={(e) => handleChange('canopyCover', parseFloat(e.target.value) || 0)}
            className="input-field disabled:cursor-not-allowed"
            placeholder="0"
            min="0"
            max="100"
            step="1"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label>
              Tree Health
            </label>
            <select
              value={data.treeHealth}
              disabled={readOnly}
              onChange={(e) => handleChange('treeHealth', e.target.value)}
              className="input-field disabled:cursor-not-allowed"
            >
              <option value="Excellent">Excellent</option>
              <option value="Good">Good</option>
              <option value="Fair">Fair</option>
              <option value="Poor">Poor</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          <div>
            <label>
              Structure
            </label>
            <select
              value={data.structure}
              disabled={readOnly}
              onChange={(e) => handleChange('structure', e.target.value)}
              className="input-field disabled:cursor-not-allowed"
            >
              <option value="Excellent">Excellent</option>
              <option value="Good">Good</option>
              <option value="Fair">Fair</option>
              <option value="Poor">Poor</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          <div>
            <label>
              Wound Wood Development
            </label>
            <select
              value={data.woundWoodDevelopment}
              disabled={readOnly}
              onChange={(e) => handleChange('woundWoodDevelopment', e.target.value)}
              className="input-field disabled:cursor-not-allowed"
            >
              <option value="Excellent">Excellent</option>
              <option value="Good">Good</option>
              <option value="Fair">Fair</option>
              <option value="Poor">Poor</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};