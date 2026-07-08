import React, { useState } from 'react';
import { ChlorophyllReading } from '../types';
import { formatDate } from '../utils/storage';
import { Plus, Search, Leaf, Calendar, MapPin, TreePine, ArrowUpDown, History, Download } from 'lucide-react';
import { exportChlorophyllCSV, exportChlorophyllReport } from '../utils/exportUtils';
import { canUserEdit } from '../utils/auth';
import { ExportModal } from './ExportModal';

interface ChlorophyllListProps {
  readings: ChlorophyllReading[];
  onSelectReading: (reading: ChlorophyllReading) => void;
  onCreateReading: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

type SortField = 'date' | 'treeSpecies' | 'treeLocation' | 'treeMaturity' | 'chlorophyllLevel';
type SortDirection = 'asc' | 'desc';

export const ChlorophyllList: React.FC<ChlorophyllListProps> = ({
  readings,
  onSelectReading,
  onCreateReading,
  searchQuery,
  onSearchChange
}) => {
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showExportModal, setShowExportModal] = useState(false);
  const canEdit = canUserEdit();

  const getMaturityColor = (maturity: ChlorophyllReading['treeMaturity']) => {
    switch (maturity) {
      case 'Juvenile': return 'bg-[rgba(138,111,76,0.15)] text-[var(--accent)]';
      case 'Semi mature': return 'bg-[var(--surface-overlay)] text-[var(--text-secondary)]';
      case 'Mature': return 'bg-[var(--surface-overlay)] text-[var(--text-secondary)]';
      case 'Senescent': return 'bg-[var(--surface-overlay)] text-[var(--danger)]';
      default: return 'bg-[var(--surface-overlay)] text-[var(--text-secondary)]';
    }
  };

  const getChlorophyllColor = (level: number) => {
    if (level >= 40) return 'text-[var(--leaf)] font-semibold';
    if (level >= 30) return 'text-[var(--text-secondary)] font-semibold';
    if (level >= 20) return 'text-[var(--text-secondary)] font-semibold';
    return 'text-[var(--danger)] font-semibold';
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Group readings by tree
  const groupedReadings = readings.reduce((acc, reading) => {
    const key = reading.treeId || `${reading.treeSpecies}-${reading.treeLocation}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(reading);
    return acc;
  }, {} as Record<string, ChlorophyllReading[]>);

  // Get the latest reading for each tree for display
  const latestReadings = Object.values(groupedReadings).map(treeReadings => {
    const sorted = treeReadings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return {
      latest: sorted[0],
      count: sorted.length,
      history: sorted.slice(1)
    };
  });

  const sortedAndFilteredReadings = latestReadings
    .filter(({ latest }) =>
      latest.treeSpecies.toLowerCase().includes(searchQuery.toLowerCase()) ||
      latest.treeLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      latest.treeMaturity.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      let aValue: any = a.latest[sortField];
      let bValue: any = b.latest[sortField];

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
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Chlorophyll Readings</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowExportModal(true)}
            className="p-2 border border-[var(--border)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--forest)] transition-colors"
            title="Export Data"
          >
            <Download size={16} />
          </button>
          {canEdit && (
            <button
              onClick={onCreateReading}
              className="flex items-center gap-2 bg-[var(--canopy)] text-[var(--cream)] px-4 py-2 rounded-lg hover:bg-[var(--forest-light)] transition-colors"
            >
              <Plus size={20} />
              New Reading
            </button>
          )}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)]" size={20} />
        <input
          type="text"
          placeholder="Search by species, location, or maturity..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
        />
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm text-[var(--text-secondary)] font-medium">Sort by:</span>
        <SortButton field="date">Date</SortButton>
        <SortButton field="treeSpecies">Species</SortButton>
        <SortButton field="treeLocation">Location</SortButton>
        <SortButton field="treeMaturity">Maturity</SortButton>
        <SortButton field="chlorophyllLevel">Chlorophyll Level</SortButton>
      </div>

      <div className="grid gap-4">
        {sortedAndFilteredReadings.length === 0 ? (
          <div className="text-center py-12">
            <Leaf className="mx-auto h-12 w-12 text-[var(--text-muted)] mb-4" />
            <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">No chlorophyll readings found</h3>
            <p className="text-[var(--text-muted)] mb-4">
              {searchQuery ? 'Try adjusting your search terms' : 'Get started by recording your first chlorophyll reading'}
            </p>
            {!searchQuery && canEdit && (
              <button
                onClick={onCreateReading}
                className="bg-[var(--canopy)] text-[var(--cream)] px-4 py-2 rounded-lg hover:bg-[var(--forest-light)] transition-colors"
              >
                Record First Reading
              </button>
            )}
          </div>
        ) : (
          sortedAndFilteredReadings.map(({ latest, count, history }) => (
            <div
              key={latest.id}
              onClick={() => onSelectReading(latest)}
              className="bg-[var(--surface-raised)] rounded-lg shadow-md border border-[var(--border)] p-6 hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-[var(--text-primary)]">
                      {latest.treeSpecies || 'Unknown Species'}
                    </h3>
                    {count > 1 && (
                      <span className="flex items-center gap-1 bg-[var(--surface-overlay)] text-[var(--text-secondary)] px-2 py-1 rounded-full text-xs font-medium">
                        <History size={12} />
                        {count} readings
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-[var(--text-secondary)]">
                    <div className="flex items-center gap-1">
                      <MapPin size={16} />
                      {latest.treeLocation || 'No location'}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar size={16} />
                      {new Date(latest.date).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1">
                      <TreePine size={16} />
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getMaturityColor(latest.treeMaturity)}`}>
                        {latest.treeMaturity}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-[var(--text-muted)] mb-1">Latest Reading</div>
                  <div className={`text-2xl font-bold ${getChlorophyllColor(latest.chlorophyllLevel)}`}>
                    {latest.chlorophyllLevel}
                  </div>
                  <div className="text-sm text-[var(--text-secondary)]">
                    Growth: {latest.extensionGrowth}mm
                  </div>
                </div>
              </div>
              
              {latest.notes && (
                <div className="text-sm text-[var(--text-secondary)] bg-[var(--forest)] p-3 rounded-lg mb-3">
                  <strong>Notes:</strong> {latest.notes}
                </div>
              )}

              {count > 1 && (
                <div className="text-xs text-[var(--text-muted)] border-t pt-3">
                  <strong>Previous readings:</strong> {history.map(r => 
                    `${new Date(r.date).toLocaleDateString()} (${r.chlorophyllLevel})`
                  ).join(', ')}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Chlorophyll Readings"
        data={readings}
        exportFunctions={{
          csv: () => exportChlorophyllCSV(readings),
          report: () => exportChlorophyllReport(readings)
        }}
        emailOptions={{
          defaultSubject: 'Chlorophyll Monitoring Data Export',
          defaultBody: 'Please find the attached chlorophyll monitoring data export. This includes readings from all monitored trees with their health status and growth measurements.'
        }}
      />
    </div>
  );
};