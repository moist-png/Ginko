import React from 'react';
import { X, Trash2, RotateCcw } from 'lucide-react';
import {
  ArboristReport,
  ChlorophyllReading,
  Site,
  Job,
  DailyRisk,
} from '../types';
import {
  getAllRawReports,
  getAllRawChlorophyllReadings,
  getAllRawSites,
  getAllRawJobs,
  getAllRawDailyRisks,
  recoverReport,
  recoverChlorophyllReading,
  recoverSite,
  recoverJob,
  recoverDailyRisk,
} from '../utils/storage';

interface RecentlyDeletedProps {
  isOpen: boolean;
  onClose: () => void;
  onRecover: (type: string) => void; // Callback to refresh App.tsx state
}

const SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000;

export const RecentlyDeleted: React.FC<RecentlyDeletedProps> = ({
  isOpen,
  onClose,
  onRecover,
}) => {
  const [deletedReports, setDeletedReports] = React.useState<ArboristReport[]>([]);
  const [deletedReadings, setDeletedReadings] = React.useState<ChlorophyllReading[]>([]);
  const [deletedSites, setDeletedSites] = React.useState<Site[]>([]);
  const [deletedJobs, setDeletedJobs] = React.useState<Job[]>([]);
  const [deletedDailyRisks, setDeletedDailyRisks] = React.useState<DailyRisk[]>([]);

  const fetchDeletedItems = () => {
    const now = Date.now();
    setDeletedReports(getAllRawReports().filter(r => r.deletedAt && (now - r.deletedAt < SEVEN_DAYS_IN_MS)));
    setDeletedReadings(getAllRawChlorophyllReadings().filter(r => r.deletedAt && (now - r.deletedAt < SEVEN_DAYS_IN_MS)));
    setDeletedSites(getAllRawSites().filter(s => s.deletedAt && (now - s.deletedAt < SEVEN_DAYS_IN_MS)));
    setDeletedJobs(getAllRawJobs().filter(j => j.deletedAt && (now - j.deletedAt < SEVEN_DAYS_IN_MS)));
    setDeletedDailyRisks(getAllRawDailyRisks().filter(r => r.deletedAt && (now - r.deletedAt < SEVEN_DAYS_IN_MS)));
  };

  React.useEffect(() => {
    if (isOpen) {
      fetchDeletedItems();
    }
  }, [isOpen]);

  const handleRecover = async (type: string, id: string) => {
    switch (type) {
      case 'report':
        await recoverReport(id);
        break;
      case 'chlorophyll':
        await recoverChlorophyllReading(id);
        break;
      case 'site':
        await recoverSite(id);
        break;
      case 'job':
        await recoverJob(id);
        break;
      case 'dailyRisk':
        await recoverDailyRisk(id);
        break;
      default:
        break;
    }
    fetchDeletedItems(); // Refresh deleted items list
    onRecover(type); // Notify App.tsx to refresh main list
  };

  const renderDeletedItem = (item: any, type: string) => {
    const deletedDate = item.deletedAt ? new Date(item.deletedAt).toLocaleDateString() : 'Unknown Date';
    const itemName = item.title || item.name || item.treeSpecies || item.siteAddress || 'Untitled Item';

    return (
      <div key={item.id} className="flex items-center justify-between p-3 bg-[var(--forest)] rounded-lg border border-[var(--border)]">
        <div>
          <p className="font-medium text-[var(--text-secondary)]">{itemName}</p>
          <p className="text-xs text-[var(--text-muted)]">Deleted: {deletedDate}</p>
        </div>
        <button
          onClick={() => handleRecover(type, item.id)}
          className="flex items-center gap-1 px-3 py-1 bg-[var(--text-muted)] text-[var(--cream)] rounded-md hover:bg-[var(--ink)] transition-colors text-sm"
        >
          <RotateCcw size={14} /> Recover
        </button>
      </div>
    );
  };

  const totalDeleted = deletedReports.length + deletedReadings.length + deletedSites.length + deletedJobs.length + deletedDailyRisks.length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--surface-raised)] rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Recently Deleted ({totalDeleted})</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[var(--surface-overlay)] rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {totalDeleted === 0 ? (
            <div className="text-center py-12 text-[var(--text-muted)]">
              <Trash2 className="mx-auto h-12 w-12 mb-4" />
              <p>No recently deleted items.</p>
            </div>
          ) : (
            <>
              {deletedReports.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-[var(--text-primary)]">Tree Reports</h3>
                  {deletedReports.map(item => renderDeletedItem(item, 'report'))}
                </div>
              )}
              {deletedReadings.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-[var(--text-primary)]">Chlorophyll Readings</h3>
                  {deletedReadings.map(item => renderDeletedItem(item, 'chlorophyll'))}
                </div>
              )}
              {deletedSites.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-[var(--text-primary)]">Sites</h3>
                  {deletedSites.map(item => renderDeletedItem(item, 'site'))}
                </div>
              )}
              {deletedJobs.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-[var(--text-primary)]">Jobs</h3>
                  {deletedJobs.map(item => renderDeletedItem(item, 'job'))}
                </div>
              )}
              {deletedDailyRisks.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-[var(--text-primary)]">Daily Risks</h3>
                  {deletedDailyRisks.map(item => renderDeletedItem(item, 'dailyRisk'))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};