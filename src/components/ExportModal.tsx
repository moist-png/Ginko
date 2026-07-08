import React, { useState } from 'react';
import { Download, Mail, FileText, Table, File, X, Send, Copy } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: any;
  exportFunctions: {
    csv?: () => void;
    pdf?: () => void;
    excel?: () => void;
    json?: () => void;
    report?: () => void;
  };
  emailOptions?: {
    defaultSubject: string;
    defaultBody: string;
  };
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  title,
  data,
  exportFunctions,
  emailOptions
}) => {
  const [selectedFormat, setSelectedFormat] = useState<string>('csv');
  const [emailData, setEmailData] = useState({
    to: '',
    subject: emailOptions?.defaultSubject || `${title} Export`,
    body: emailOptions?.defaultBody || `Please find the attached ${title.toLowerCase()} export.`
  });
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const formats = [
    { 
      id: 'csv', 
      name: 'CSV', 
      description: 'Comma-separated values for spreadsheets',
      icon: Table,
      available: !!exportFunctions.csv
    },
    { 
      id: 'pdf', 
      name: 'PDF Report', 
      description: 'Formatted report document',
      icon: FileText,
      available: !!exportFunctions.pdf || !!exportFunctions.report
    },
    { 
      id: 'excel', 
      name: 'Excel', 
      description: 'Microsoft Excel format',
      icon: Table,
      available: !!exportFunctions.excel
    },
    { 
      id: 'json', 
      name: 'JSON', 
      description: 'Raw data format',
      icon: File,
      available: !!exportFunctions.json
    }
  ].filter(format => format.available);

  const handleDownload = () => {
    switch (selectedFormat) {
      case 'csv':
        exportFunctions.csv?.();
        break;
      case 'pdf':
        exportFunctions.pdf?.() || exportFunctions.report?.();
        break;
      case 'excel':
        exportFunctions.excel?.();
        break;
      case 'json':
        exportFunctions.json?.();
        break;
    }
    onClose();
  };

  const handleEmail = async () => {
    setIsSending(true);
    try {
      // In a real implementation, this would send the email via an API
      // For now, we'll simulate the process and copy to clipboard
      const emailContent = `To: ${emailData.to}\nSubject: ${emailData.subject}\n\n${emailData.body}`;
      
      await navigator.clipboard.writeText(emailContent);
      
      // Also trigger the download
      handleDownload();
      
      alert('Email content copied to clipboard! The file has been downloaded for you to attach manually.');
    } catch (error) {
      alert('Failed to prepare email. Please try downloading the file instead.');
    } finally {
      setIsSending(false);
      setShowEmailForm(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--surface-raised)] rounded-lg max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold">Export {title}</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[var(--surface-overlay)] rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-3">
              Choose Export Format
            </label>
            <div className="space-y-2">
              {formats.map((format) => {
                const Icon = format.icon;
                return (
                  <label
                    key={format.id}
                    className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedFormat === format.id
                        ? 'border-[var(--accent)] bg-[var(--surface-overlay)]'
                        : 'border-[var(--border)] hover:border-[var(--border)]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="format"
                      value={format.id}
                      checked={selectedFormat === format.id}
                      onChange={(e) => setSelectedFormat(e.target.value)}
                      className="sr-only"
                    />
                    <Icon size={20} className="text-[var(--text-secondary)] mr-3" />
                    <div>
                      <div className="font-medium text-[var(--text-primary)]">{format.name}</div>
                      <div className="text-sm text-[var(--text-secondary)]">{format.description}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Email Form */}
          {showEmailForm && (
            <div className="space-y-4 border-t pt-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Email To
                </label>
                <input
                  type="email"
                  value={emailData.to}
                  onChange={(e) => setEmailData(prev => ({ ...prev, to: e.target.value }))}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                  placeholder="recipient@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  value={emailData.subject}
                  onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Message
                </label>
                <textarea
                  value={emailData.body}
                  onChange={(e) => setEmailData(prev => ({ ...prev, body: e.target.value }))}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent resize-none"
                  rows={4}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            {!showEmailForm ? (
              <>
                <button
                  onClick={handleDownload}
                  className="flex-1 flex items-center justify-center gap-2 bg-[var(--ink)] text-[var(--cream)] px-4 py-2 rounded-lg hover:bg-[var(--accent)] transition-colors"
                >
                  <Download size={16} />
                  Download
                </button>
                <button
                  onClick={() => setShowEmailForm(true)}
                  className="flex-1 flex items-center justify-center gap-2 border border-[var(--border)] text-[var(--text-secondary)] px-4 py-2 rounded-lg hover:bg-[var(--surface-overlay)] transition-colors"
                >
                  <Mail size={16} />
                  Email
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowEmailForm(false)}
                  className="flex-1 px-4 py-2 border border-[var(--border)] rounded-lg hover:bg-[var(--forest)] transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleEmail}
                  disabled={!emailData.to || isSending}
                  className="flex-1 flex items-center justify-center gap-2 bg-[var(--ink)] text-[var(--cream)] px-4 py-2 rounded-lg hover:bg-[var(--accent)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Preparing...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Send Email
                    </>
                  )}
                </button>
              </>
            )}
          </div>

          <div className="text-xs text-[var(--text-muted)] text-center">
            Email functionality will copy the email content to your clipboard and download the file for manual attachment.
          </div>
        </div>
      </div>
    </div>
  );
};