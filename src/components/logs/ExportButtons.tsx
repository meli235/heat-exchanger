'use client';

import React from 'react';
import { FileText, CloudCheck } from 'lucide-react';

export interface ExportButtonsProps {
  isUploading: boolean;
  onExportAndUpload: () => void;
  onCloudDriveAccess: () => void;
  onExportPDFReport: () => void;
}

export const ExportButtons: React.FC<ExportButtonsProps> = ({
  isUploading,
  onExportAndUpload,
  onCloudDriveAccess,
  onExportPDFReport
}) => {
  return (
    <div className="flex flex-wrap items-center gap-2.5 no-print">
      <button
        type="button"
        onClick={onExportAndUpload}
        disabled={isUploading}
        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-2 transition active:scale-95 cursor-pointer"
      >
        <FileText className="w-4 h-4 text-emerald-200" /> {isUploading ? 'Mengunggah ke Cloud...' : 'Ekspor & Upload Excel (Cloud)'}
      </button>
      <button
        onClick={onCloudDriveAccess}
        className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-md shadow-sky-600/20 flex items-center gap-2 transition active:scale-95"
      >
        <CloudCheck className="w-4 h-4 text-sky-200 animate-pulse" /> Akses Supabase Storage
      </button>
      <button
        onClick={onExportPDFReport}
        className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 transition active:scale-95"
      >
        <FileText className="w-4 h-4" /> Cetak / PDF Laporan
      </button>
    </div>
  );
};
export default ExportButtons;
