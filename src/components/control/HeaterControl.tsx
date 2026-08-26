'use client';

import React from 'react';
import { Power, Flame } from 'lucide-react';
import { DualHeaterState } from '@/types';

interface HeaterControlProps {
  controlMode: 'AUTO' | 'MANUAL';
  heaterStatus: boolean;
  heater1Status?: boolean;
  heater2Status?: boolean;
  emergencyStopped: boolean;
  dualHeaterState: Partial<DualHeaterState>;
  onToggleHeater: (nextState: boolean) => void;
  onToggleHeater1?: (nextState: boolean) => void;
  onToggleHeater2?: (nextState: boolean) => void;
}

export const HeaterControl: React.FC<HeaterControlProps> = ({
  controlMode,
  heaterStatus,
  heater1Status,
  heater2Status,
  emergencyStopped,
  dualHeaterState,
  onToggleHeater,
  onToggleHeater1,
  onToggleHeater2,
}) => {
  const isAuto = controlMode === 'AUTO';

  // H1 and H2 tracked independently (defaulting to heaterStatus if undefined)
  const isH1On = heater1Status ?? heaterStatus;
  const isH2On = heater2Status ?? heaterStatus;

  return (
    <div
      id="tour-heater-control"
      className={`p-4 rounded-2xl border transition-all space-y-3 ${
        isAuto ? 'bg-purple-50/60 border-purple-200' : 'bg-slate-50 border-slate-200'
      }`}
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-1.5">
          <Flame className={`w-4 h-4 ${isAuto ? 'text-purple-600' : 'text-orange-500'}`} />
          <label className="text-xs font-bold text-slate-800">Kontrol Pemanas (Dual Heater)</label>
        </div>
        {isAuto ? (
          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
            AUTO HEATING
          </span>
        ) : (
          <span
            className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
              heaterStatus ? 'bg-orange-100 text-orange-800' : 'bg-slate-200 text-slate-600'
            }`}
          >
            {heaterStatus ? 'MASTER ON' : 'MASTER OFF'}
          </span>
        )}
      </div>

      {/* Tombol Master Power */}
      <button
        type="button"
        onClick={() => onToggleHeater(!heaterStatus)}
        disabled={emergencyStopped || isAuto}
        className={`w-full py-2 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-2 ${
          isAuto
            ? 'bg-purple-600 text-white opacity-90 cursor-not-allowed shadow-sm'
            : heaterStatus
              ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md hover:from-orange-600 hover:to-amber-700'
              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
        }`}
      >
        <Power className="w-3.5 h-3.5" />
        {isAuto
          ? 'Otomatis Dikelola Suhu'
          : heaterStatus
            ? 'Matikan Master Heater'
            : 'Nyalakan Master Heater'}
      </button>

      {/* Tombol Terpisah: Heater 1 (1000W) & Heater 2 (500W) */}
      {!isAuto && (
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/80">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-slate-600 flex items-center justify-between">
              Heater 1 (1000W)
              <span className={`w-2 h-2 rounded-full ${isH1On ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
            </span>
            <button
              type="button"
              onClick={() => {
                const next = !isH1On;
                if (onToggleHeater1) onToggleHeater1(next);
                else onToggleHeater(next);
              }}
              disabled={emergencyStopped}
              className={`w-full py-1.5 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1.5 ${
                isH1On
                  ? 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700'
                  : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
              }`}
            >
              <Power className="w-3 h-3" />
              {isH1On ? 'H1: ON' : 'H1: OFF'}
            </button>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-slate-600 flex items-center justify-between">
              Heater 2 (500W)
              <span className={`w-2 h-2 rounded-full ${isH2On ? 'bg-amber-500 animate-pulse' : 'bg-slate-300'}`} />
            </span>
            <button
              type="button"
              onClick={() => {
                const next = !isH2On;
                if (onToggleHeater2) onToggleHeater2(next);
                else onToggleHeater(next);
              }}
              disabled={emergencyStopped}
              className={`w-full py-1.5 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1.5 ${
                isH2On
                  ? 'bg-amber-600 text-white shadow-sm hover:bg-amber-700'
                  : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
              }`}
            >
              <Power className="w-3 h-3" />
              {isH2On ? 'H2: ON' : 'H2: OFF'}
            </button>
          </div>
        </div>
      )}

      <span className="text-[10.5px] text-sky-700 font-semibold block truncate">
        Tahap Status:{' '}
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
