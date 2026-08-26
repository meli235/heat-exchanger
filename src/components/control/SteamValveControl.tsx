'use client';

import React from 'react';
import { Wind, Clock, Power } from 'lucide-react';

interface SteamValveControlProps {
  uapStatus: boolean;
  uapAutoStatus?: boolean;
  uapIntervalMin?: number;
  emergencyStopped?: boolean;
  onToggleUapManual: (nextState: boolean) => void;
  onToggleUapAuto: (nextState: boolean) => void;
  onChangeUapInterval: (min: number) => void;
}

export const SteamValveControl: React.FC<SteamValveControlProps> = ({
  uapStatus,
  uapAutoStatus = false,
  uapIntervalMin = 10,
  emergencyStopped = false,
  onToggleUapManual,
  onToggleUapAuto,
  onChangeUapInterval,
}) => {
  return (
    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <Wind className="w-4 h-4 text-cyan-600" />
          Kontrol Katup Solenoid Uap (Dual Mode)
        </span>
        <span
          className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
            uapStatus ? 'bg-cyan-100 text-cyan-800' : 'bg-slate-200 text-slate-600'
          }`}
        >
          {uapStatus ? 'KATUP BUKA' : 'KATUP TUTUP'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Mode Manual On-Demand */}
        <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-bold text-slate-700">1. Manual On-Demand</span>
            <span className={`w-2 h-2 rounded-full ${uapStatus ? 'bg-cyan-500 animate-pulse' : 'bg-slate-300'}`} />
          </div>
          <button
            type="button"
            onClick={() => onToggleUapManual(!uapStatus)}
            disabled={emergencyStopped}
            className={`w-full py-2 rounded-lg text-xs font-extrabold transition flex items-center justify-center gap-1.5 ${
              uapStatus
                ? 'bg-cyan-600 text-white shadow hover:bg-cyan-700'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            {uapStatus ? 'Tutup Katup Uap' : 'Buka Katup Uap'}
          </button>
        </div>

        {/* Mode Otomatis Berjadwal */}
        <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
              <Clock className="w-3 h-3 text-purple-600" /> 2. Auto Berjadwal
            </span>
            <input
              type="checkbox"
              checked={uapAutoStatus}
              onChange={(e) => onToggleUapAuto(e.target.checked)}
              disabled={emergencyStopped}
              className="w-4 h-4 text-purple-600 rounded cursor-pointer accent-purple-600"
            />
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500 font-medium">Interval Tiap:</span>
            <select
              value={uapIntervalMin}
              onChange={(e) => onChangeUapInterval(Number(e.target.value))}
              disabled={emergencyStopped || !uapAutoStatus}
              className="px-2 py-1 bg-slate-100 border border-slate-300 rounded font-bold text-slate-800 text-[11px]"
            >
              <option value={5}>5 Menit</option>
              <option value={10}>10 Menit</option>
              <option value={15}>15 Menit</option>
              <option value={30}>30 Menit</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SteamValveControl;
