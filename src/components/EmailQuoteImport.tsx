import React, { useState, useRef } from 'react';
import { Quote, EmailQuoteRequest } from '../types';
import { parseEmailForQuote, isQuoteRequest, createEmailQuoteRequest, processEmailAttachments } from '../utils/emailQuoteParser';
import { X, Mail, Upload, AlertCircle, CheckCircle, Download, FileText, Paperclip } from 'lucide-react';

interface EmailQuoteImportProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (quotes: Quote[]) => void;
}

export const EmailQuoteImport: React.FC<EmailQuoteImportProps> = ({
  isOpen,
  onClose,
  onImport
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [emailRequests, setEmailRequests] = useState<EmailQuoteRequest[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [manualEmail, setManualEmail] = useState({
    from: '',
    subject: '',
    body: ''
  });
  const [showManualEntry, setShowManualEntry] = useState(false);
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
    setEmailRequests([]);

    try {
      const file = files[0];
      
      if (!file.name.toLowerCase().endsWith('.eml') && !file.name.toLowerCase().endsWith('.txt')) {
        throw new Error('Please select an email file (.eml) or text file (.txt)');
      }

      const content = await readFileContent(file);
      const emailRequest = parseEmailFile(content, file.name);
      
      if (isQuoteRequest(emailRequest)) {
        setEmailRequests([emailRequest]);
        setSelectedEmails(new Set([0]));
      } else {
        throw new Error('This email does not appear to be a quote request. Please check the content and try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process email file');
    } finally {
      setIsProcessing(false);
    }
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const parseEmailFile = (content: string, filename: string): EmailQuoteRequest => {
    // Simple email parsing - in production, you'd use a proper email parser
    let from = '';
    let subject = '';
    let body = content;

    // Extract basic email headers if present
    const fromMatch = content.match(/^From:\s*(.+)$/m);
    if (fromMatch) from = fromMatch[1].trim();

    const subjectMatch = content.match(/^Subject:\s*(.+)$/m);
    if (subjectMatch) subject = subjectMatch[1].trim();

    // Remove headers from body
    const bodyStart = content.search(/\n\s*\n/);
    if (bodyStart > 0) {
      body = content.substring(bodyStart).trim();
    }

    // Fallback values
    if (!from) from = 'unknown@example.com';
    if (!subject) subject = filename.replace(/\.[^/.]+$/, ''); // Use filename without extension

    return createEmailQuoteRequest(from, subject, body);
  };

  const handleManualEntry = () => {
    if (!manualEmail.from || !manualEmail.subject || !manualEmail.body) {
      setError('Please fill in all fields for manual entry');
      return;
    }

    const emailRequest = createEmailQuoteRequest(
      manualEmail.from,
      manualEmail.subject,
      manualEmail.body
    );

    if (isQuoteRequest(emailRequest)) {
      setEmailRequests([emailRequest]);
      setSelectedEmails(new Set([0]));
      setShowManualEntry(false);
      setManualEmail({ from: '', subject: '', body: '' });
    } else {
      setError('The entered content does not appear to be a quote request. Please include relevant keywords like "quote", "tree", "removal", etc.');
    }
  };

  const toggleEmailSelection = (index: number) => {
    const newSelected = new Set(selectedEmails);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedEmails(newSelected);
  };

  const handleImport = () => {
    const selectedRequests = emailRequests.filter((_, index) => selectedEmails.has(index));
    const quotes = selectedRequests.map(request => {
      const quote = parseEmailForQuote(request);
      // Add any additional information from attachments
      const attachmentInfo = processEmailAttachments(request.attachments);
      if (attachmentInfo.length > 0) {
        quote.additionalEquipment = attachmentInfo.join('\n');
      }
      return quote;
    });
    
    onImport(quotes);
    onClose();
    resetModal();
  };

  const resetModal = () => {
    setEmailRequests([]);
    setSelectedEmails(new Set());
    setError(null);
    setIsProcessing(false);
    setShowManualEntry(false);
    setManualEmail({ from: '', subject: '', body: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadSampleEmail = () => {
    const sampleEmail = `From: john.smith@email.com
Subject: Tree Removal Quote Request

Hi,

I need a quote for tree removal at my property. I have a large oak tree in my backyard that needs to be removed due to storm damage.

Property details:
- Address: 123 Oak Street, Suburb, State 1234
- Phone: 0412 345 678
- Best contact time: Weekdays after 5pm

The tree is approximately 15 meters tall and located near the back fence. There's good access from the side of the house.

I'm looking to have this done within the next 2-3 weeks if possible.

Please let me know when you could come out for an assessment.

Thanks,
John Smith`;

    const blob = new Blob([sampleEmail], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample-quote-request.txt';
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
            <Mail className="text-[var(--text-secondary)]" size={24} />
            <div>
              <h2 className="text-xl font-semibold">Import Quotes from Email</h2>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Upload email files or enter email content manually to create quotes
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
          {emailRequests.length === 0 ? (
            <div className="space-y-6">
              {/* Upload Area */}
              {!showManualEntry && (
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
                    {isProcessing ? 'Processing email...' : 'Upload email file'}
                  </h3>
                  <p className="text-[var(--text-secondary)] mb-4">
                    Drag and drop your email file here, or click to browse
                  </p>
                  <div className="flex gap-2 justify-center">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".eml,.txt"
                      onChange={handleFileInput}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessing}
                      className="bg-[var(--ink)] text-[var(--cream)] px-4 py-2 rounded-lg hover:bg-[var(--accent)] transition-colors disabled:opacity-50"
                    >
                      {isProcessing ? 'Processing...' : 'Choose Email File'}
                    </button>
                    <button
                      onClick={() => setShowManualEntry(true)}
                      className="border border-[var(--border)] text-[var(--text-secondary)] px-4 py-2 rounded-lg hover:bg-[var(--surface-overlay)] transition-colors"
                    >
                      Enter Manually
                    </button>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-2">
                    Supports .eml email files and .txt files with email content
                  </p>
                </div>
              )}

              {/* Manual Entry Form */}
              {showManualEntry && (
                <div className="border border-[var(--border)] rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Manual Email Entry</h3>
                    <button
                      onClick={() => setShowManualEntry(false)}
                      className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        From Email
                      </label>
                      <input
                        type="email"
                        value={manualEmail.from}
                        onChange={(e) => setManualEmail(prev => ({ ...prev, from: e.target.value }))}
                        className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                        placeholder="client@email.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        Subject
                      </label>
                      <input
                        type="text"
                        value={manualEmail.subject}
                        onChange={(e) => setManualEmail(prev => ({ ...prev, subject: e.target.value }))}
                        className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                        placeholder="Tree removal quote request"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        Email Body
                      </label>
                      <textarea
                        value={manualEmail.body}
                        onChange={(e) => setManualEmail(prev => ({ ...prev, body: e.target.value }))}
                        className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent resize-none"
                        rows={8}
                        placeholder="Enter the email content here..."
                      />
                    </div>
                    <button
                      onClick={handleManualEntry}
                      className="w-full bg-[var(--ink)] text-[var(--cream)] py-2 rounded-lg hover:bg-[var(--accent)] transition-colors"
                    >
                      Process Email Content
                    </button>
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="bg-[var(--surface-overlay)] p-4 rounded-lg">
                <h4 className="font-medium text-[var(--text-primary)] mb-2">How to get email files:</h4>
                <div className="text-sm text-[var(--text-secondary)] space-y-2">
                  <div>
                    <strong>Gmail:</strong> Open email → More (⋮) → Download message (.eml file)
                  </div>
                  <div>
                    <strong>Outlook:</strong> Open email → File → Save As → Save as type: Outlook Message Format (.msg) or Email (.eml)
                  </div>
                  <div>
                    <strong>Apple Mail:</strong> Select email → File → Save As → Format: Raw Message Source
                  </div>
                  <div>
                    <strong>Alternative:</strong> Copy and paste email content into a text file or use manual entry
                  </div>
                </div>
              </div>

              {/* Sample Download */}
              <div className="bg-[var(--surface-overlay)] p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <Download className="text-[var(--text-secondary)] mt-1" size={20} />
                  <div className="flex-1">
                    <h4 className="font-medium text-[var(--text-primary)]">Need a sample?</h4>
                    <p className="text-sm text-[var(--text-secondary)] mb-3">
                      Download a sample email to see the expected format for quote requests.
                    </p>
                    <button
                      onClick={downloadSampleEmail}
                      className="text-[var(--text-secondary)] hover:opacity-80 text-sm font-medium"
                    >
                      Download Sample Email
                    </button>
                  </div>
                </div>
              </div>

              {/* What gets extracted */}
              <div className="bg-[var(--surface-overlay)] p-4 rounded-lg">
                <h4 className="font-medium text-[var(--text-primary)] mb-2">What information is extracted?</h4>
                <ul className="text-sm text-[var(--text-secondary)] space-y-1">
                  <li>• Client name and contact information</li>
                  <li>• Property address and location details</li>
                  <li>• Service requirements and job descriptions</li>
                  <li>• Preferred dates and times</li>
                  <li>• Additional notes and special requirements</li>
                </ul>
              </div>

              {error && (
                <div className="bg-[rgba(179,67,61,0.08)] p-4 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="text-[var(--danger)] mt-1" size={20} />
                    <div>
                      <h4 className="font-medium text-[var(--text-primary)]">Processing Error</h4>
                      <p className="text-sm text-[var(--danger)]">{error}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Processing Summary */}
              <div className="bg-[var(--accent-soft)] p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <CheckCircle className="text-[var(--accent)] mt-1" size={20} />
                  <div>
                    <h4 className="font-medium text-[var(--text-primary)]">
                      Email processed successfully!
                    </h4>
                    <p className="text-sm text-[var(--accent)]">
                      Review the extracted information below and confirm the import.
                    </p>
                  </div>
                </div>
              </div>

              {/* Email Preview */}
              <div className="space-y-3">
                {emailRequests.map((request, index) => {
                  const quote = parseEmailForQuote(request);
                  return (
                    <div
                      key={index}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedEmails.has(index)
                          ? 'border-[var(--accent)] bg-[var(--surface-overlay)]'
                          : 'border-[var(--border)] hover:border-[var(--border)]'
                      }`}
                      onClick={() => toggleEmailSelection(index)}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedEmails.has(index)}
                          onChange={() => toggleEmailSelection(index)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Mail size={16} className="text-[var(--text-secondary)]" />
                            <h4 className="font-medium">
                              From: {request.from}
                            </h4>
                          </div>
                          <div className="text-sm text-[var(--text-secondary)] mb-3">
                            <strong>Subject:</strong> {request.subject}
                          </div>
                          
                          <div className="bg-white p-3 rounded border">
                            <h5 className="font-medium text-[var(--text-primary)] mb-2">Extracted Quote Information:</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                              <div><strong>Client:</strong> {quote.clientName}</div>
                              <div><strong>Mobile:</strong> {quote.mobile || 'Not provided'}</div>
                              <div><strong>Address:</strong> {quote.address || 'Not provided'}</div>
                              <div><strong>Date:</strong> {new Date(quote.scheduledDate).toLocaleDateString()}</div>
                              <div><strong>Time:</strong> {quote.scheduledTime}</div>
                              <div><strong>Status:</strong> <span className="text-[var(--text-secondary)] font-medium">New</span></div>
                            </div>
                            
                            {quote.jobDescription.length > 0 && (
                              <div className="mt-3">
                                <strong className="text-sm">Services:</strong>
                                <ul className="text-sm text-[var(--text-secondary)] mt-1">
                                  {quote.jobDescription.map((item, idx) => (
                                    <li key={idx}>• {item.description}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {request.attachments.length > 0 && (
                              <div className="mt-3">
                                <strong className="text-sm">Attachments:</strong>
                                <div className="flex items-center gap-1 mt-1">
                                  <Paperclip size={14} className="text-[var(--text-muted)]" />
                                  <span className="text-sm text-[var(--text-secondary)]">
                                    {request.attachments.length} file(s)
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {emailRequests.length > 0 && (
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
                disabled={selectedEmails.size === 0}
                className="px-4 py-2 bg-[var(--ink)] text-[var(--cream)] rounded-lg hover:bg-[var(--accent)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Import {selectedEmails.size} Quote{selectedEmails.size !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};