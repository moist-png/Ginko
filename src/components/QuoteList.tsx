import React, { useState } from 'react';
import { Quote } from '../types';
import { formatDate } from '../utils/storage';
import { canUserEdit } from '../utils/auth';
import { Plus, Search, FileText, Calendar, MapPin, User, Phone, ArrowUpDown, Archive, Download, Upload } from 'lucide-react';
import { exportQuotesCSV } from '../utils/exportUtils';
import { CalendarImport } from './CalendarImport';
import { EmailQuoteImport } from './EmailQuoteImport';
import { ExportModal } from './ExportModal';
import type { TeamMember } from '../utils/supabase';

interface QuoteListProps {
  quotes: Quote[];
  teamMembers: TeamMember[];
  onSelectQuote: (quote: Quote) => void;
  onCreateQuote: () => void;
  onImportQuotes: (quotes: Quote[]) => void;
  onUpdateQuoteStatus: (quoteId: string, status: Quote['status']) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

type SortField = 'scheduledDate' | 'clientName' | 'status';
type SortDirection = 'asc' | 'desc';

export const QuoteList: React.FC<QuoteListProps> = ({
  quotes,
  teamMembers,
  onSelectQuote,
  onCreateQuote,
  onImportQuotes,
  onUpdateQuoteStatus,
  searchQuery,
  onSearchChange
}) => {
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [showCalendarImport, setShowCalendarImport] = useState(false);
  const [showEmailImport, setShowEmailImport] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [sortField, setSortField] = useState<SortField>('scheduledDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const canEdit = canUserEdit();

  const getStatusColor = (status: Quote['status']) => {
    switch (status) {
      case 'new': return 'bg-[var(--surface-overlay)] text-[var(--text-secondary)]';
      case 'scheduled': return 'bg-[var(--surface-overlay)] text-[var(--text-secondary)]';
      case 'completed': return 'bg-[rgba(138,111,76,0.15)] text-[var(--accent)]';
      default: return 'bg-[var(--surface-overlay)] text-[var(--text-secondary)]';
    }
  };

  const getStatusDotColor = (status: Quote['status']) => {
    switch (status) {
      case 'new': return 'bg-[var(--text-muted)]';
      case 'scheduled': return 'bg-[var(--text-muted)]';
      case 'completed': return 'bg-[var(--accent-soft)]0';
      default: return 'bg-[var(--forest)]0';
    }
  };

  const getNextStatus = (currentStatus: Quote['status']): Quote['status'] => {
    switch (currentStatus) {
      case 'new': return 'scheduled';
      case 'scheduled': return 'completed';
      case 'completed': return 'new';
      default: return 'new';
    }
  };

  const handleStatusToggle = (e: React.MouseEvent, quoteId: string, currentStatus: Quote['status']) => {
    e.stopPropagation(); // Prevent opening the quote
    const nextStatus = getNextStatus(currentStatus);
    onUpdateQuoteStatus(quoteId, nextStatus);
  };
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedAndFilteredQuotes = quotes
    .filter(quote => activeTab === 'active' ? !quote.archived : quote.archived)
    .filter(quote =>
      quote.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.siteContact.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.jobDescription.some(item => 
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    )
    .sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (sortField === 'scheduledDate') {
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
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Quotes</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowExportModal(true)}
            className="p-2 border border-[var(--border)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--forest)] transition-colors"
            title="Export Data"
          >
            <Download size={16} />
          </button>
          {canEdit && (
            <>
              <button
                onClick={() => setShowEmailImport(true)}
                className="flex items-center gap-2 border border-[var(--accent)] text-[var(--leaf)] px-4 py-2 rounded-lg hover:bg-[var(--accent-soft)] transition-colors"
              >
                <Upload size={20} />
                Import from Email
              </button>
              <button
                onClick={() => setShowCalendarImport(true)}
                className="flex items-center gap-2 border border-[var(--border)] text-[var(--text-secondary)] px-4 py-2 rounded-lg hover:bg-[var(--surface-overlay)] transition-colors"
              >
                <Upload size={20} />
                Import from Calendar
              </button>
              <button
                onClick={onCreateQuote}
                className="flex items-center gap-2 bg-[var(--canopy)] text-[var(--cream)] px-4 py-2 rounded-lg hover:bg-[var(--forest-light)] transition-colors"
              >
                <Plus size={20} />
                New Quote
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-[var(--border)]">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('active')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'active'
                ? 'border-[var(--moss)] text-[var(--leaf)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border)]'
            }`}
          >
            Active Quotes ({quotes.filter(q => !q.archived).length})
          </button>
          <button
            onClick={() => setActiveTab('archived')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'archived'
                ? 'border-[var(--moss)] text-[var(--leaf)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border)]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Archive size={16} />
              Archived ({quotes.filter(q => q.archived).length})
            </div>
          </button>
        </nav>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)]" size={20} />
        <input
          type="text"
          placeholder="Search quotes by client, address, or job description..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
        />
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm text-[var(--text-secondary)] font-medium">Sort by:</span>
        <SortButton field="scheduledDate">Date</SortButton>
        <SortButton field="clientName">Client</SortButton>
        <SortButton field="status">Status</SortButton>
      </div>

      <div className="grid gap-4">
        {sortedAndFilteredQuotes.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-[var(--text-muted)] mb-4" />
            <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
              {activeTab === 'active' ? 'No active quotes found' : 'No archived quotes found'}
            </h3>
            <p className="text-[var(--text-muted)] mb-4">
              {searchQuery 
                ? 'Try adjusting your search terms' 
                : activeTab === 'active' 
                  ? 'Get started by creating your first quote'
                  : 'Archived quotes will appear here when you archive them'
              }
            </p>
            {!searchQuery && activeTab === 'active' && canEdit && (
              <button
                onClick={onCreateQuote}
                className="bg-[var(--canopy)] text-[var(--cream)] px-4 py-2 rounded-lg hover:bg-[var(--forest-light)] transition-colors"
              >
                Create First Quote
              </button>
            )}
          </div>
        ) : (
          sortedAndFilteredQuotes.map((quote) => (
            <div
              key={quote.id}
              onClick={() => onSelectQuote(quote)}
              className="bg-[var(--surface-raised)] rounded-lg shadow-md border border-[var(--border)] p-6 hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <FileText className="text-[var(--leaf)]" size={24} />
                    <h3 className="text-xl font-semibold text-[var(--text-primary)]">
                      Quote for {quote.clientName || 'Unnamed Client'}
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-[var(--text-secondary)] mb-3">
                    <div className="flex items-center gap-1">
                      <User size={16} />
                      {quote.clientName || 'No client'}
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin size={16} />
                      {quote.address || 'No address'}
                    </div>
                    <div className="flex items-center gap-1">
                      <Phone size={16} />
                      {quote.mobile || 'No mobile'}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar size={16} />
                      {new Date(quote.scheduledDate).toLocaleDateString()} at {quote.scheduledTime}
                    </div>
                  </div>
                  {quote.jobDescription.length > 0 && quote.jobDescription[0].description && (
                    <div className="text-sm text-[var(--text-primary)] bg-[var(--forest)] p-3 rounded-lg">
                      <strong>Job Description:</strong> {quote.jobDescription[0].description}
                      {quote.jobDescription.length > 1 && (
                        <span className="text-[var(--text-muted)]"> (+{quote.jobDescription.length - 1} more items)</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {quote.assignedTo && quote.assignedTo.length > 0 && (
                    <div className="flex mr-1">
                      {quote.assignedTo.slice(0, 4).map((id, i) => {
                        const member = teamMembers.find(m => m.id === id);
                        if (!member) return null;
                        return (
                          <div key={id} title={member.name} style={{ width: '24px', height: '24px', borderRadius: '50%', background: member.colour + '33', border: `2px solid ${member.colour}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: member.colour, marginLeft: i > 0 ? '-7px' : 0 }}>
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <button
                    onClick={(e) => handleStatusToggle(e, quote.id, quote.status)}
                    disabled={quote.archived || !canEdit}
                    className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium transition-colors ${canEdit && !quote.archived ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'} ${getStatusColor(quote.status)}`}
                    title={quote.archived ? 'Archived quote - status cannot be changed' : !canEdit ? 'Read-only mode' : `Click to change status from ${quote.status}`}
                  >
                    <div className={`w-2 h-2 rounded-full ${getStatusDotColor(quote.status)}`}></div>
                    {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                  </button>
                  {quote.archived && (
                    <span className="flex items-center gap-1 px-2 py-1 bg-[var(--surface-overlay)] text-[var(--text-secondary)] rounded-full text-xs">
                      <Archive size={12} />
                      Archived
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {canEdit && (
        <React.Fragment>
          <EmailQuoteImport
            isOpen={showEmailImport}
            onClose={() => setShowEmailImport(false)}
            onImport={onImportQuotes}
          />
          <CalendarImport
            isOpen={showCalendarImport}
            onClose={() => setShowCalendarImport(false)}
            onImport={onImportQuotes}
          />
        </React.Fragment>
      )}

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Quotes"
        data={quotes}
        exportFunctions={{
          csv: () => exportQuotesCSV(quotes)
        }}
        emailOptions={{
          defaultSubject: 'Quotes Export',
          defaultBody: 'Please find the attached quotes export containing detailed information about all quote requests including client details, scheduling, and job descriptions.'
        }}
      />
    </div>
  );
};