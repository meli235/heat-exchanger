'use client';

import React from 'react';
import { FileText } from 'lucide-react';

export interface ExportButtonsProps {
  isUploading?: boolean;
  onExportAndUpload?: () => void;
  onCloudDriveAccess?: () => void;
  onExportPDFReport: () => void;
}

export const ExportButtons: React.FC<ExportButtonsProps> = ({
  onExportPDFReport
}) => {
  return (
    <div className="flex flex-wrap items-center gap-2.5 no-print">
      <button
        onClick={onExportPDFReport}
        className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 transition active:scale-95 cursor-pointer"
      >
        <FileText className="w-4 h-4" /> Cetak / PDF Laporan
      </button>
    </div>
  );
};
export default ExportButtons;
