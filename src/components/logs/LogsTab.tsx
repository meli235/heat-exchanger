'use client';

import React from 'react';
import {
  FileText,
  ShieldCheck,
  Cloud,
  Search
} from 'lucide-react';
import { TelemetryPoint } from '@/types';
import { ExportButtons } from './ExportButtons';
import { DataTable } from './DataTable';

export interface LogsTabProps {
  filteredLogsData: TelemetryPoint[];
  logInterval: '1s' | '2s' | '5s' | '30s' | '1m';
  setLogInterval: (interval: '1s' | '2s' | '5s' | '30s' | '1m') => void;
  dateFilter: string;
  setDateFilter: (filter: string) => void;
  logSearchQuery: string;
  setLogSearchQuery: (query: string) => void;
  isUploading: boolean;
  handleExportAndUpload: () => void;
  handleCloudDriveAccess: () => void;
  exportPDFReport: () => void;
}

export const LogsTab: React.FC<LogsTabProps> = ({
  filteredLogsData,
  logInterval,
  setLogInterval,
  dateFilter,
  setDateFilter,
  logSearchQuery,
  setLogSearchQuery,
  isUploading,
  handleExportAndUpload,
  handleCloudDriveAccess,
  exportPDFReport
}) => {
  return (
    <div className="space-y-6">
      <div id="tour-logs-tab" className="asklepios-card p-6 bg-white shadow-xl rounded-3xl border border-slate-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <FileText className="w-6 h-6 text-sky-600" /> Laporan Monitoring Heat Exchanger
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Sinkronisasi otomatis telemetri real-time ke Cloud Drive (Fasilitas unduh Flashdisk dinonaktifkan)</p>
          </div>

          <ExportButtons
            isUploading={isUploading}
            onExportAndUpload={handleExportAndUpload}
            onCloudDriveAccess={handleCloudDriveAccess}
            onExportPDFReport={exportPDFReport}
          />
        </div>

        {/* Banner Informasi Keamanan & Proteksi Data Flashdisk */}
        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200/90 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-700 rounded-xl shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2 flex-wrap">
                Proteksi Data HE: Ambil Data via Flashdisk Dinonaktifkan
                <span className="px-2 py-0.5 bg-emerald-200/80 text-emerald-900 font-extrabold rounded-full text-[10px]">Auto Cloud Storage</span>
              </h4>
              <p className="text-slate-600 mt-0.5 leading-relaxed">
                Pengambilan data manual menggunakan USB Flashdisk telah dinonaktifkan demi integritas & keamanan laboratorium. Seluruh log telemetri sensor Heat Exchanger otomatis terunggah dan tersimpan aman di Google Drive / Supabase Cloud DB.
              </p>
            </div>
          </div>
          <button
            onClick={handleCloudDriveAccess}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl whitespace-nowrap flex items-center gap-1.5 transition text-xs shrink-0 active:scale-95"
          >
            <Cloud className="w-4 h-4 text-emerald-200" /> Buka Cloud Drive
          </button>
        </div>

        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/90 mb-6 space-y-1.5 text-xs">
          <h1 className="text-base font-extrabold text-slate-900 tracking-wide">LAPORAN MONITORING HEAT EXCHANGER UAD</h1>
          <p className="text-slate-600 font-medium">Sistem: <strong className="text-slate-800">Heat Exchanger Thermal Analytics (Interval Sampling: {logInterval})</strong></p>
          <p className="text-slate-600 font-medium">
            Rentang Data: <strong className="text-slate-800">
              {filteredLogsData.length > 0
                ? `${new Date().toLocaleDateString('id-ID')}, ${filteredLogsData[0]?.timestamp} WIB s.d. ${new Date().toLocaleDateString('id-ID')}, ${filteredLogsData[filteredLogsData.length - 1]?.timestamp} WIB`
                : `Tidak ada data log (${dateFilter === 'Yesterday' ? 'Kemarin' : dateFilter === '7Days' ? '7 Hari Terakhir' : 'Kriteria Pencarian'})`}
            </strong>
          </p>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 no-print shadow-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Cari Waktu / Sensor</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={logSearchQuery}
                onChange={(e) => setLogSearchQuery(e.target.value)}
                placeholder="Contoh: 12.31, 25.00, ON, Counter..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Interval Sampling Pencatatan</label>
            <select
              value={logInterval}
              onChange={(e) => setLogInterval(e.target.value as '1s' | '2s' | '5s' | '30s' | '1m')}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-bold focus:outline-none"
            >
              <option value="1s">1 Detik (High Frequency)</option>
              <option value="2s">2 Detik (Rekomendasi Praktikum)</option>
              <option value="5s">5 Detik (Default Realtime)</option>
              <option value="30s">30 Detik (Interval Sedang)</option>
              <option value="1m">1 Menit (Ringkasan Lab)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Rentang Tanggal</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none"
            >
              <option value="Today">Hari Ini ({new Date().toLocaleDateString('id-ID')})</option>
              <option value="Yesterday">Kemarin</option>
              <option value="7Days">7 Hari Terakhir</option>
            </select>
          </div>
        </div>

        <DataTable
          filteredLogsData={filteredLogsData}
          dateFilter={dateFilter}
        />

        <div className="mt-4 flex justify-between items-center text-xs text-slate-500 no-print">
          <span>Menampilkan {filteredLogsData.length} baris data telemetri (Sampling: {logInterval})</span>
          <span>Halaman 1 dari 1</span>
        </div>

      </div>
    </div>
  );
};
export default LogsTab;
