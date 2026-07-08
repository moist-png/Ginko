import React from 'react';
import { ArboristReport } from '../types';
import { Download, Calendar, User, MapPin, TreePine, Camera, FileText } from 'lucide-react';

interface ReportPreviewProps {
  report: ArboristReport;
}

export const ReportPreview: React.FC<ReportPreviewProps> = ({ report }) => {
  const handleExport = () => {
    // This would typically generate a PDF or formatted document
    const reportContent = generateReportContent(report);
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `arborist-report-${report.title || 'untitled'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateReportContent = (report: ArboristReport) => {
    return `
ARBORIST REPORT

Report Title: ${report.title}
Client: ${report.clientName}
Property Address: ${report.address}
Inspector: ${report.inspector}
Inspection Date: ${report.date}

TREE INFORMATION
================
Tree Number: ${report.treeData.treeNumber}
Scientific Name: ${report.treeData.species}
Common Name: ${report.treeData.commonName}
Location: ${report.treeData.location}
DBH: ${report.treeData.dbh} cm
Height: ${report.treeData.height} m
Canopy Spread N-S: ${report.treeData.canopySpreadNS} m
Canopy Spread E-W: ${report.treeData.canopySpreadEW} m
Tree Health: ${report.treeData.treeHealth}
Structure: ${report.treeData.structure}
Wound Wood Development: ${report.treeData.woundWoodDevelopment}
Extension Growth: ${report.treeData.extensionGrowth} mm
Canopy Cover: ${report.treeData.canopyCover}%

OBSERVATIONS & NOTES
===================
${report.notes.map(note => `
${note.title} (${note.category})
${note.content}
`).join('\n')}

PHOTOS
======
${report.photos.map(photo => `
${photo.category}: ${photo.caption}
`).join('\n')}

Generated on: ${new Date().toLocaleDateString()}
    `.trim();
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'Excellent': return 'text-[var(--accent)]';
      case 'Good': return 'text-[var(--accent)]';
      case 'Fair': return 'text-[var(--text-secondary)]';
      case 'Poor': return 'text-[var(--text-secondary)]';
      case 'Critical': return 'text-[var(--danger)]';
      default: return 'text-[var(--text-muted)]';
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Report Preview</h2>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 bg-[var(--ink)] text-[var(--cream)] px-4 py-2 rounded-lg hover:bg-[var(--accent)] transition-colors"
        >
          <Download size={20} />
          Export Report
        </button>
      </div>

      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        {/* Header */}
        <div className="bg-[var(--ink)] text-[var(--cream)] p-6">
          <h1 className="text-2xl font-bold mb-2">ARBORIST REPORT</h1>
          <h2 className="text-xl">{report.title || 'Untitled Report'}</h2>
        </div>

        {/* Report Information */}
        <div className="p-6 border-b">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <User className="text-[var(--text-muted)]" size={20} />
              <div>
                <span className="font-medium">Client:</span> {report.clientName}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="text-[var(--text-muted)]" size={20} />
              <div>
                <span className="font-medium">Date:</span> {report.date}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="text-[var(--text-muted)]" size={20} />
              <div>
                <span className="font-medium">Address:</span> {report.address}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="text-[var(--text-muted)]" size={20} />
              <div>
                <span className="font-medium">Inspector:</span> {report.inspector}
              </div>
            </div>
          </div>
        </div>

        {/* Tree Information */}
        <div className="p-6 border-b">
          <div className="flex items-center gap-2 mb-4">
            <TreePine className="text-[var(--accent)]" size={24} />
            <h3 className="text-lg font-semibold">Tree Information</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {report.treeData.treeNumber && (
              <div>
                <span className="font-medium">Tree Number:</span> {report.treeData.treeNumber}
              </div>
            )}
            <div>
              <span className="font-medium">Scientific Name:</span> {report.treeData.species}
            </div>
            <div>
              <span className="font-medium">Common Name:</span> {report.treeData.commonName}
            </div>
            <div>
              <span className="font-medium">Location:</span> {report.treeData.location}
            </div>
            <div>
              <span className="font-medium">DBH:</span> {report.treeData.dbh} cm
            </div>
            <div>
              <span className="font-medium">Height:</span> {report.treeData.height} m
            </div>
            <div>
              <span className="font-medium">Canopy Spread N-S:</span> {report.treeData.canopySpreadNS} m
            </div>
            <div>
              <span className="font-medium">Canopy Spread E-W:</span> {report.treeData.canopySpreadEW} m
            </div>
            <div>
              <span className="font-medium">Extension Growth:</span> {report.treeData.extensionGrowth} mm
            </div>
            <div>
              <span className="font-medium">Canopy Cover:</span> {report.treeData.canopyCover}%
            </div>
            <div>
              <span className="font-medium">Tree Health:</span> 
              <span className={`ml-2 font-semibold ${getConditionColor(report.treeData.treeHealth)}`}>
                {report.treeData.treeHealth}
              </span>
            </div>
            <div>
              <span className="font-medium">Structure:</span> 
              <span className={`ml-2 font-semibold ${getConditionColor(report.treeData.structure)}`}>
                {report.treeData.structure}
              </span>
            </div>
            <div>
              <span className="font-medium">Wound Wood Development:</span> 
              <span className={`ml-2 font-semibold ${getConditionColor(report.treeData.woundWoodDevelopment)}`}>
                {report.treeData.woundWoodDevelopment}
              </span>
            </div>
          </div>
        </div>

        {/* Photos */}
        {report.photos.length > 0 && (
          <div className="p-6 border-b">
            <div className="flex items-center gap-2 mb-4">
              <Camera className="text-[var(--accent)]" size={24} />
              <h3 className="text-lg font-semibold">Photo Documentation</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {report.photos.map(photo => (
                <div key={photo.id} className="border rounded-lg overflow-hidden">
                  <img src={photo.url} alt={photo.caption} className="w-full h-32 object-cover" />
                  <div className="p-2">
                    <p className="text-sm font-medium">{photo.category}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{photo.caption}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {report.notes.length > 0 && (
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold mb-4">Observations & Notes</h3>
            <div className="space-y-4">
              {report.notes.map(note => (
                <div key={note.id} className="border-l-4 border-[var(--accent)] pl-4">
                  <h4 className="font-medium">{note.title}</h4>
                  <p className="text-sm text-[var(--text-secondary)] mb-1">{note.category}</p>
                  <p className="text-[var(--text-secondary)] whitespace-pre-wrap">{note.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-6 bg-[var(--surface-overlay)] text-center text-sm text-[var(--text-secondary)]">
          <p>Report generated on {new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
};