import React, { useState, useRef } from 'react';
import { Quote } from '../types';
import { importQuotesFromICS } from '../utils/calendarIntegration';
import { X, Upload, Calendar, AlertCircle, CheckCircle, Download } from 'lucide-react';

interface CalendarImportProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (quotes: Quote[]) => void;
}

export const CalendarImport: React.FC<CalendarImportProps> = ({
  isOpen,
  onClose,
  onImport
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importedQuotes, setImportedQuotes] = useState<Quote[]>([]);
  const [selectedQuotes, setSelectedQuotes] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = async (files: FileList) => {
    setIsProcessing(true);
    setError(null);
    setImportedQuotes([]);

    try {
      const file = files[0];
      
      if (!file.name.toLowerCase().endsWith('.ics')) {
        throw new Error('Please select an ICS calendar file (.ics extension)');
      }

      const quotes = await importQuotesFromICS(file);
      setImportedQuotes(quotes);
      
      // Select all quotes by default
      const allIndices = new Set(quotes.map((_, index) => index));
      setSelectedQuotes(allIndices);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import calendar file');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleQuoteSelection = (index: number) => {
    const newSelected = new Set(selectedQuotes);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedQuotes(newSelected);
  };

  const selectAll = () => {
    const allIndices = new Set(importedQuotes.map((_, index) => index));
    setSelectedQuotes(allIndices);
  };

  const selectNone = () => {
    setSelectedQuotes(new Set());
  };

  const handleImport = () => {
    const selectedData = importedQuotes.filter((_, index) => selectedQuotes.has(index));
    onImport(selectedData);
    onClose();
    resetModal();
  };

  const resetModal = () => {
    setImportedQuotes([]);
    setSelectedQuotes(new Set());
    setError(null);
    setIsProcessing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadSampleICS = () => {
    const sampleICS = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Sample//Calendar//EN
CALSCALE:GREGORIAN
BEGIN:VEVENT
UID:sample-1@example.com
DTSTART:20241220T100000Z
DTEND:20241220T120000Z
SUMMARY:Tree Assessment - John Smith
DESCRIPTION:Tree health assessment and pruning consultation\\nPhone: 0412 345 678\\nService: Crown reduction and deadwood removal
LOCATION:123 Main Street, Suburb, State 1234
END:VEVENT
BEGIN:VEVENT
UID:sample-2@example.com
DTSTART:20241221T140000Z
DTEND:20241221T160000Z
SUMMARY:Quote - Tree Removal
DESCRIPTION:Large oak tree removal consultation\\nPhone: 0498 765 432\\nService: Complete tree removal including stump grinding
LOCATION:456 Oak Avenue, Suburb, State 5678
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([sampleICS], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample-calendar.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Calendar className="text-[var(--text-secondary)]" size={24} />
            <div>
              <h2 className="text-xl font-semibold">Import Quotes from Calendar</h2>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Upload an ICS calendar file to import appointments as quotes
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              onClose();
              resetModal();
            }}
            className="p-1 hover:bg-[var(--surface-overlay)] rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {importedQuotes.length === 0 ? (
            <div className="space-y-6">
              {/* Upload Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive
                    ? 'border-[var(--accent)] bg-[var(--surface-overlay)]'
                    : 'border-[var(--border)] hover:border-[var(--border-bright)]'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className="mx-auto h-12 w-12 text-[var(--text-muted)] mb-4" />
                <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
                  {isProcessing ? 'Processing calendar file...' : 'Upload calendar file'}
                </h3>
                <p className="text-[var(--text-secondary)] mb-4">
                  Drag and drop your ICS calendar file here, or click to browse
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".ics"
                  onChange={handleFileInput}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="bg-[var(--ink)] text-[var(--cream)] px-4 py-2 rounded-lg hover:bg-[var(--accent)] transition-colors disabled:opacity-50"
                >
                  {isProcessing ? 'Processing...' : 'Choose ICS File'}
                </button>
                <p className="text-xs text-[var(--text-muted)] mt-2">
                  Supports ICS calendar files from Google Calendar, Outlook, Apple Calendar, etc.
                </p>
              </div>

              {/* Instructions */}
              <div className="bg-[var(--surface-overlay)] p-4 rounded-lg">
                <h4 className="font-medium text-[var(--text-primary)] mb-2">How to export your calendar:</h4>
                <div className="text-sm text-[var(--text-secondary)] space-y-2">
                  <div>
                    <strong>Google Calendar:</strong> Settings → Import & Export → Export (downloads a ZIP file, extract the ICS file)
                  </div>
                  <div>
                    <strong>Outlook:</strong> File → Save Calendar → Save as type: iCalendar Format (*.ics)
                  </div>
                  <div>
                    <strong>Apple Calendar:</strong> File → Export → Export Calendar
                  </div>
                </div>
              </div>

              {/* Sample Download */}
              <div className="bg-[var(--surface-overlay)] p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <Download className="text-[var(--text-secondary)] mt-1" size={20} />
                  <div className="flex-1">
                    <h4 className="font-medium text-[var(--text-primary)]">Need a sample file?</h4>
                    <p className="text-sm text-[var(--text-secondary)] mb-3">
                      Download a sample ICS file to see the expected format for calendar imports.
                    </p>
                    <button
                      onClick={downloadSampleICS}
                      className="text-[var(--text-secondary)] hover:opacity-80 text-sm font-medium"
                    >
                      Download Sample ICS File
                    </button>
                  </div>
                </div>
              </div>

              {/* Supported Event Types */}
              <div className="bg-[var(--surface-overlay)] p-4 rounded-lg">
                <h4 className="font-medium text-[var(--text-primary)] mb-2">What events will be imported?</h4>
                <ul className="text-sm text-[var(--text-secondary)] space-y-1">
                  <li>• Events with keywords: appointment, quote, assessment, inspection, consultation, visit, service</li>
                  <li>• Events with location information</li>
                  <li>• Events with detailed descriptions</li>
                  <li>• All imported quotes will be marked as "New" status</li>
                </ul>
              </div>

              {error && (
                <div className="bg-[rgba(179,67,61,0.08)] p-4 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="text-[var(--danger)] mt-1" size={20} />
                    <div>
                      <h4 className="font-medium text-[var(--text-primary)]">Import Error</h4>
                      <p className="text-sm text-[var(--danger)]">{error}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Import Summary */}
              <div className="bg-[var(--accent-soft)] p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <CheckCircle className="text-[var(--accent)] mt-1" size={20} />
                  <div>
                    <h4 className="font-medium text-[var(--text-primary)]">
                      Found {importedQuotes.length} potential quotes in calendar
                    </h4>
                    <p className="text-sm text-[var(--accent)]">
                      Review the appointments below and select which ones to import as quotes.
                    </p>
                  </div>
                </div>
              </div>

              {/* Selection Controls */}
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={selectAll}
                    className="text-sm text-[var(--text-secondary)] hover:opacity-80"
                  >
                    Select All
                  </button>
                  <span className="text-[var(--border-bright)]">|</span>
                  <button
                    onClick={selectNone}
                    className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    Select None
                  </button>
                </div>
                <span className="text-sm text-[var(--text-secondary)]">
                  {selectedQuotes.size} of {importedQuotes.length} selected
                </span>
              </div>

              {/* Quote List */}
              <div className="space-y-3 max-h-96 overflow-auto">
                {importedQuotes.map((quote, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedQuotes.has(index)
                        ? 'border-[var(--accent)] bg-[var(--surface-overlay)]'
                        : 'border-[var(--border)] hover:border-[var(--border)]'
                    }`}
                    onClick={() => toggleQuoteSelection(index)}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedQuotes.has(index)}
                        onChange={() => toggleQuoteSelection(index)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">
                            {quote.clientName || 'Unknown Client'}
                          </h4>
                          <span className="bg-[var(--surface-overlay)] text-[var(--text-secondary)] px-2 py-1 rounded text-xs font-medium">
                            New
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-[var(--text-secondary)]">
                          <div><strong>Date:</strong> {new Date(quote.scheduledDate).toLocaleDateString()}</div>
                          <div><strong>Time:</strong> {quote.scheduledTime}</div>
                          {quote.address && <div><strong>Address:</strong> {quote.address}</div>}
                          {quote.mobile && <div><strong>Mobile:</strong> {quote.mobile}</div>}
                        </div>
                        {quote.jobDescription.length > 0 && (
                          <div className="mt-2">
                            <strong className="text-sm">Services:</strong>
                            <ul className="text-sm text-[var(--text-secondary)] mt-1">
                              {quote.jobDescription.slice(0, 2).map((item, idx) => (
                                <li key={idx}>• {item.description}</li>
                              ))}
                              {quote.jobDescription.length > 2 && (
                                <li className="text-[var(--text-muted)]">
                                  ... and {quote.jobDescription.length - 2} more
                                </li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {importedQuotes.length > 0 && (
          <div className="border-t p-6">
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  onClose();
                  resetModal();
                }}
                className="px-4 py-2 border border-[var(--border)] rounded-lg hover:bg-[var(--surface-overlay)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={selectedQuotes.size === 0}
                className="px-4 py-2 bg-[var(--ink)] text-[var(--cream)] rounded-lg hover:bg-[var(--accent)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Import {selectedQuotes.size} Quotes
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};