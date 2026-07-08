import React, { useState, useRef } from 'react';
import { ArboristReport } from '../types';
import { X, Upload, FileText, AlertCircle, CheckCircle, Download } from 'lucide-react';
import { parseDocumentData, ImportedTreeData } from '../utils/documentParser';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (trees: ArboristReport[]) => void;
  siteId: string;
  siteName: string;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  siteId,
  siteName
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importedData, setImportedData] = useState<ImportedTreeData[]>([]);
  const [selectedTrees, setSelectedTrees] = useState<Set<number>>(new Set());
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
    setImportedData([]);

    try {
      const file = files[0];
      const data = await parseDocumentData(file);
      setImportedData(data);
      
      // Select all trees by default
      const allIndices = new Set(data.map((_, index) => index));
      setSelectedTrees(allIndices);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse document');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleTreeSelection = (index: number) => {
    const newSelected = new Set(selectedTrees);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedTrees(newSelected);
  };

  const selectAll = () => {
    const allIndices = new Set(importedData.map((_, index) => index));
    setSelectedTrees(allIndices);
  };

  const selectNone = () => {
    setSelectedTrees(new Set());
  };

  const handleImport = () => {
    const selectedData = importedData.filter((_, index) => selectedTrees.has(index));
    
    const reports: ArboristReport[] = selectedData.map(data => ({
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      title: data.title || `Tree ${data.treeNumber || 'Unknown'}`,
      clientName: '',
      address: '',
      inspector: '',
      date: new Date().toISOString().split('T')[0],
      treeData: {
        treeNumber: data.treeNumber || '',
        species: data.species || '',
        commonName: data.commonName || '',
        dbh: data.dbh || 0,
        height: data.height || 0,
        canopySpreadNS: data.canopySpreadNS || 0,
        canopySpreadEW: data.canopySpreadEW || 0,
        treeHealth: data.treeHealth || 'Good',
        extensionGrowth: data.extensionGrowth || 0,
        structure: data.structure || 'Good',
        woundWoodDevelopment: data.woundWoodDevelopment || 'Good',
        canopyCover: data.canopyCover || 0,
        location: data.location || ''
      },
      photos: [],
      notes: data.notes ? [{
        id: Date.now().toString(),
        title: 'Imported Notes',
        content: data.notes,
        category: 'observation' as const,
        timestamp: Date.now()
      }] : [],
      recommendations: data.recommendations || [],
      status: 'draft' as const,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      siteId
    }));

    onImport(reports);
    onClose();
    resetModal();
  };

  const resetModal = () => {
    setImportedData([]);
    setSelectedTrees(new Set());
    setError(null);
    setIsProcessing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    const template = `Tree Import Template

Instructions:
- Fill in the data for each tree, one tree per section
- Use the exact field names shown below
- Leave fields blank if data is not available
- Save as PDF, Word document, or plain text file

=== TREE 1 ===
Tree Number: T001
Species: Quercus alba
Common Name: White Oak
DBH: 45.5
Height: 18.2
Canopy Spread NS: 12.5
Canopy Spread EW: 14.0
Tree Health: Good
Extension Growth: 150
Structure: Good
Wound Wood Development: Good
Canopy Cover: 85
Location: Front courtyard, near main entrance
Notes: Healthy mature specimen, minor deadwood in crown
Recommendations: Remove deadwood during dormant season

=== TREE 2 ===
Tree Number: T002
Species: Acer saccharum
Common Name: Sugar Maple
DBH: 32.1
Height: 15.5
Canopy Spread NS: 10.2
Canopy Spread EW: 9.8
Tree Health: Fair
Extension Growth: 120
Structure: Fair
Wound Wood Development: Good
Canopy Cover: 75
Location: Playground area, southwest corner
Notes: Some leaf scorch observed, possible root compaction
Recommendations: Improve soil aeration, mulch around base

Add more trees following the same format...`;

    const blob = new Blob([template], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tree-import-template.txt';
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
          <div>
            <h2 className="text-xl font-semibold">Import Trees to {siteName}</h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Upload a PDF, Word document, or text file containing tree data
            </p>
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
          {importedData.length === 0 ? (
            <div className="space-y-6">
              {/* Upload Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                    : 'border-[var(--border)] hover:border-[var(--border-bright)]'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className="mx-auto h-12 w-12 text-[var(--text-muted)] mb-4" />
                <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
                  {isProcessing ? 'Processing document...' : 'Upload tree data document'}
                </h3>
                <p className="text-[var(--text-secondary)] mb-4">
                  Drag and drop your file here, or click to browse
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleFileInput}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="bg-[var(--ink)] text-[var(--cream)] px-4 py-2 rounded-lg hover:bg-[var(--accent)] transition-colors disabled:opacity-50"
                >
                  {isProcessing ? 'Processing...' : 'Choose File'}
                </button>
                <p className="text-xs text-[var(--text-muted)] mt-2">
                  Supports PDF, Word documents (.doc, .docx), and text files
                </p>
              </div>

              {/* Template Download */}
              <div className="bg-[var(--surface-overlay)] p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <FileText className="text-[var(--text-secondary)] mt-1" size={20} />
                  <div className="flex-1">
                    <h4 className="font-medium text-[var(--text-primary)]">Need a template?</h4>
                    <p className="text-sm text-[var(--text-secondary)] mb-3">
                      Download our template to see the expected format for tree data import.
                    </p>
                    <button
                      onClick={downloadTemplate}
                      className="flex items-center gap-2 text-[var(--text-secondary)] hover:opacity-80 text-sm font-medium"
                    >
                      <Download size={16} />
                      Download Template
                    </button>
                  </div>
                </div>
              </div>

              {/* Supported Formats */}
              <div className="bg-[var(--surface-overlay)] p-4 rounded-lg">
                <h4 className="font-medium text-[var(--text-primary)] mb-2">Supported Data Formats</h4>
                <ul className="text-sm text-[var(--text-secondary)] space-y-1">
                  <li>• Structured text with field names (Tree Number, Species, DBH, etc.)</li>
                  <li>• Tables in PDF or Word documents</li>
                  <li>• CSV-like data separated by commas or tabs</li>
                  <li>• Multiple trees separated by headers or blank lines</li>
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
                      Found {importedData.length} trees in document
                    </h4>
                    <p className="text-sm text-[var(--accent)]">
                      Review the data below and select which trees to import.
                    </p>
                  </div>
                </div>
              </div>

              {/* Selection Controls */}
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={selectAll}
                    className="text-sm text-[var(--accent)] hover:opacity-80"
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
                  {selectedTrees.size} of {importedData.length} selected
                </span>
              </div>

              {/* Tree List */}
              <div className="space-y-3 max-h-96 overflow-auto">
                {importedData.map((tree, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedTrees.has(index)
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                        : 'border-[var(--border)] hover:border-[var(--border)]'
                    }`}
                    onClick={() => toggleTreeSelection(index)}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedTrees.has(index)}
                        onChange={() => toggleTreeSelection(index)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {tree.treeNumber && (
                            <span className="bg-[var(--surface-overlay)] text-[var(--accent)] px-2 py-1 rounded text-xs font-medium">
                              #{tree.treeNumber}
                            </span>
                          )}
                          <h4 className="font-medium">
                            {tree.species || 'Unknown Species'}
                          </h4>
                          {tree.commonName && (
                            <span className="text-[var(--text-secondary)]">({tree.commonName})</span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-[var(--text-secondary)]">
                          {tree.dbh && <div>DBH: {tree.dbh}cm</div>}
                          {tree.height && <div>Height: {tree.height}m</div>}
                          {tree.treeHealth && <div>Health: {tree.treeHealth}</div>}
                          {tree.location && <div>Location: {tree.location}</div>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {importedData.length > 0 && (
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
                disabled={selectedTrees.size === 0}
                className="px-4 py-2 bg-[var(--ink)] text-[var(--cream)] rounded-lg hover:bg-[var(--accent)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Import {selectedTrees.size} Trees
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};