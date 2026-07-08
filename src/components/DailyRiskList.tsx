import React, { useState } from 'react';
import { DailyRisk } from '../types';
import { formatDate } from '../utils/storage';
import { Plus, Search, Shield, Calendar, MapPin, User, Phone, ArrowUpDown, Download } from 'lucide-react';
import { exportRiskAssessmentsCSV } from '../utils/exportUtils';
import { canUserEdit } from '../utils/auth';
import { ExportModal } from './ExportModal';

interface DailyRiskListProps {
  risks: DailyRisk[];
  onSelectRisk: (risk: DailyRisk) => void;
  onCreateRisk: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

type SortField = 'date' | 'siteAddress' | 'clientName';
type SortDirection = 'asc' | 'desc';

export const DailyRiskList: React.FC<DailyRiskListProps> = ({
  risks,
  onSelectRisk,
  onCreateRisk,
  searchQuery,
  onSearchChange
}) => {
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showExportModal, setShowExportModal] = useState(false);
  const canEdit = canUserEdit();

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getHazardCount = (risk: DailyRisk): number => {
    return Object.values(risk.hazards).filter(Boolean).length;
  };

  const sortedAndFilteredRisks = risks
    .filter(risk =>
      risk.siteAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      risk.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      risk.hazardControls.some(hc => 
        hc.hazardIdentified.toLowerCase().includes(searchQuery.toLowerCase()) ||
        hc.controlMeasures.toLowerCase().includes(searchQuery.toLowerCase())
      )
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
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Daily Risk Assessment</h1>
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
              onClick={onCreateRisk}
              className="flex items-center gap-2 bg-[var(--canopy)] text-[var(--cream)] px-4 py-2 rounded-lg hover:bg-[var(--forest-light)] transition-colors"
            >
              <Plus size={20} />
              New Risk Assessment
            </button>
          )}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)]" size={20} />
        <input
          type="text"
          placeholder="Search by site, client, or hazards..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
        />
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm text-[var(--text-secondary)] font-medium">Sort by:</span>
        <SortButton field="date">Date</SortButton>
        <SortButton field="siteAddress">Site</SortButton>
        <SortButton field="clientName">Client</SortButton>
      </div>

      <div className="grid gap-4">
        {sortedAndFilteredRisks.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="mx-auto h-12 w-12 text-[var(--text-muted)] mb-4" />
            <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">No risk assessments found</h3>
            <p className="text-[var(--text-muted)] mb-4">
              {searchQuery ? 'Try adjusting your search terms' : 'Get started by creating your first daily risk assessment'}
            </p>
            {!searchQuery && canEdit && (
              <button
                onClick={onCreateRisk}
                className="bg-[var(--canopy)] text-[var(--cream)] px-4 py-2 rounded-lg hover:bg-[var(--forest-light)] transition-colors"
              >
                Create First Assessment
              </button>
            )}
          </div>
        ) : (
          sortedAndFilteredRisks.map((risk) => (
            <div
              key={risk.id}
              onClick={() => onSelectRisk(risk)}
              className="bg-[var(--surface-raised)] rounded-lg shadow-md border border-[var(--border)] p-6 hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Shield className="text-[var(--leaf)]" size={24} />
                    <h3 className="text-xl font-semibold text-[var(--text-primary)]">
                      Risk Assessment - {new Date(risk.date).toLocaleDateString()}
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-[var(--text-secondary)] mb-3">
                    <div className="flex items-center gap-1">
                      <MapPin size={16} />
                      {risk.siteAddress || 'No site address'}
                    </div>
                    <div className="flex items-center gap-1">
                      <User size={16} />
                      {risk.clientName || 'No client'}
                    </div>
                    <div className="flex items-center gap-1">
                      <Phone size={16} />
                      {risk.clientMobile || 'No mobile'}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar size={16} />
                      {new Date(risk.date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-[var(--text-muted)]">
                <span className="flex items-center gap-1">
                  <Shield size={16} />
                  {getHazardCount(risk)} hazards identified
                </span>
                <span>{risk.hazardControls.length} control measures</span>
                <span>{risk.signatures.length} signatures</span>
                {risk.firstAidLocation && (
                  <span>First Aid: {risk.firstAidLocation}</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Risk Assessments"
        data={risks}
        exportFunctions={{
          csv: () => exportRiskAssessmentsCSV(risks)
        }}
        emailOptions={{
          defaultSubject: 'Risk Assessments Export',
          defaultBody: 'Please find the attached risk assessments export containing detailed safety assessments, hazard controls, and signatures for all recorded assessments.'
        }}
      />
    </div>
  );
};