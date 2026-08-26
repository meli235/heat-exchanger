'use client';

import React from 'react';
import { FileText } from 'lucide-react';
import { TelemetryPoint } from '@/types';

export interface DataTableProps {
  filteredLogsData: TelemetryPoint[];
  dateFilter: string;
}

export const DataTable: React.FC<DataTableProps> = ({
  filteredLogsData,
  dateFilter
}) => {
  return (
    <div className="overflow-x-auto border border-slate-300 rounded-xl shadow-sm">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="bg-[#0B2545] text-white font-bold text-center border-b border-slate-400">
            <th className="p-3 border-r border-slate-600 text-left">Waktu (Timestamp)</th>
            <th className="p-3 border-r border-slate-600">T1 - Hot Inlet (°C)</th>
            <th className="p-3 border-r border-slate-600">T2 - Hot Outlet (°C)</th>
            <th className="p-3 border-r border-slate-600">T3 - Cold Inlet (°C)</th>
            <th className="p-3 border-r border-slate-600">T4 - Cold Outlet (°C)</th>
            <th className="p-3 border-r border-slate-600">Heater 1</th>
            <th className="p-3 border-r border-slate-600">Heater 2</th>
            <th className="p-3">Mode Aliran</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 text-center font-medium">
          {filteredLogsData.length === 0 ? (
            <tr>
              <td colSpan={8} className="p-10 text-center bg-slate-50/50">
                <div className="flex flex-col items-center justify-center gap-2 py-6">
                  <FileText className="w-9 h-9 text-slate-300" />
                  <span className="font-bold text-sm text-slate-800">Tidak Ada Data Telemetri Tercatat</span>
                  <span className="text-xs text-slate-500 max-w-sm">
                    {dateFilter === 'Yesterday'
                      ? 'Tidak ada rekaman sesi praktikum pada tanggal kemarin.'
                      : dateFilter === '7Days'
                        ? 'Tidak ada arsip riwayat pada 7 hari terakhir (hanya tersedia sesi hari ini).'
                        : 'Tidak ada data sensor yang sesuai dengan kriteria pencarian.'}
                  </span>
                </div>
              </td>
            </tr>
          ) : (
            filteredLogsData.map((row, idx) => (
              <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50 hover:bg-sky-50/50 transition' : 'bg-white hover:bg-sky-50/50 transition'}>
                <td className="p-2.5 border-r border-slate-200 text-left font-mono font-semibold text-slate-800">
                  {new Date().toLocaleDateString('id-ID')}, {row.timestamp} WIB
                </td>
                <td className="p-2.5 border-r border-slate-200 font-mono font-semibold text-slate-800">{row.ti1.toFixed(2)}</td>
                <td className="p-2.5 border-r border-slate-200 font-mono font-semibold text-slate-800">{row.ti2.toFixed(2)}</td>
                <td className="p-2.5 border-r border-slate-200 font-mono font-semibold text-slate-800">{row.ti3.toFixed(2)}</td>
                <td className="p-2.5 border-r border-slate-200 font-mono font-semibold text-slate-800">{row.ti4.toFixed(2)}</td>
                <td className="p-2.5 border-r border-slate-200">
                  {row.heater1Active ? (
                    <span className="text-emerald-600 font-extrabold px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 inline-block">ON</span>
                  ) : (
                    <span className="text-slate-400 font-bold px-2 py-0.5 rounded bg-slate-100 inline-block">OFF</span>
                  )}
                </td>
                <td className="p-2.5 border-r border-slate-200">
                  {row.heater2Active ? (
                    <span className="text-emerald-600 font-extrabold px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 inline-block">ON</span>
                  ) : (
                    <span className="text-slate-400 font-bold px-2 py-0.5 rounded bg-slate-100 inline-block">OFF</span>
                  )}
                </td>
                <td className="p-2.5 font-bold text-slate-700">{row.mode}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
export default DataTable;
