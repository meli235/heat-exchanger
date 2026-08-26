'use client';

import React from 'react';
import { Power } from 'lucide-react';
import { DualHeaterState } from '@/types';

interface HeaterControlProps {
  controlMode: 'AUTO' | 'MANUAL';
  heaterStatus: boolean;
  emergencyStopped: boolean;
  dualHeaterState: Partial<DualHeaterState>;
  onToggleHeater: (nextState: boolean) => void;
}

export const HeaterControl: React.FC<HeaterControlProps> = ({
  controlMode,
  heaterStatus,
  emergencyStopped,
  dualHeaterState,
  onToggleHeater
}) => {
  return (
    <div
      id="tour-heater-control"
      className={`p-4 rounded-2xl border transition-all space-y-2 ${
        controlMode === 'AUTO' ? 'bg-purple-50/60 border-purple-200' : 'bg-slate-50 border-slate-200'
      }`}
    >
      <div className="flex justify-between items-center">
        <label className="text-xs font-bold text-slate-800">Daya Utama Pemanas</label>
        {controlMode === 'AUTO' ? (
          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
            AUTO PID HEATING
          </span>
        ) : (
          <span
            className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
              heaterStatus ? 'bg-orange-100 text-orange-800' : 'bg-slate-200 text-slate-600'
            }`}
          >
            {heaterStatus ? 'POWER ON' : 'POWER OFF'}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={() => onToggleHeater(!heaterStatus)}
        disabled={emergencyStopped || controlMode === 'AUTO'}
        className={`w-full py-2.5 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-2 ${
          controlMode === 'AUTO'
            ? 'bg-purple-600 text-white opacity-90 cursor-not-allowed shadow-sm'
            : heaterStatus
              ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md'
              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
        }`}
      >
        <Power className="w-4 h-4" />
        {controlMode === 'AUTO'
          ? 'Otomatis Dikelola (Mode AUTO)'
          : heaterStatus
            ? 'Matikan Heater'
            : 'Nyalakan Heater'}
      </button>

      <span className="text-[10.5px] text-sky-700 font-semibold block truncate">
        Tahap:{' '}
        {dualHeaterState.stage === 'STAGE_1'
          ? 'Tahap 1 (Pemanasan Penuh 1000W)'
          : dualHeaterState.stage === 'STAGE_2'
            ? 'Tahap 2 (Kontrol Halus 500W)'
            : dualHeaterState.stage === 'SETPOINT_REACHED'
              ? 'Siaga (Target Suhu Tercapai 0W)'
              : 'Nonaktif (0W)'}
      </span>
    </div>
  );
};

export default HeaterControl;
