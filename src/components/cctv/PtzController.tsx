'use client';

import React from 'react';
import {
  Compass,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Activity
} from 'lucide-react';
import { TelemetryPoint } from '@/types';

export interface PtzControllerProps {
  ptzMoving: string | null;
  onPtzAction: (direction: 'up' | 'down' | 'left' | 'right' | 'center' | 'rig' | 'tank' | 'valve') => void;
  onPtzPreset: (label: string, presetKey: string) => void;
  latestData: TelemetryPoint;
}

export const PtzController: React.FC<PtzControllerProps> = ({
  ptzMoving,
  onPtzAction,
  onPtzPreset,
  latestData
}) => {
  return (
    <div className="space-y-6">
      {/* PTZ Rotasi Controller Card */}
      <div className="p-5 bg-zinc-900 text-white rounded-2xl border border-zinc-800 space-y-4 shadow-sm">
        <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
            <Compass className="w-4 h-4 text-sky-400" /> Kontrol Rotasi Kamera
          </h3>
          <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded-full font-mono">
            Connected
          </span>
        </div>

        {/* Minimalist Matte D-Pad */}
        <div className="flex flex-col items-center justify-center py-2">
          <div className="relative w-40 h-40 rounded-full bg-zinc-800/90 border border-zinc-700/80 shadow-lg flex items-center justify-center">

            {/* UP */}
            <button
              type="button"
              onClick={() => onPtzAction('up')}
              className={`absolute top-2 left-1/2 -translate-x-1/2 w-10 h-8 rounded-t-xl bg-zinc-700/70 hover:bg-sky-600 text-zinc-200 hover:text-white flex items-center justify-center transition active:scale-95 ${ptzMoving === 'up' ? 'bg-sky-500 text-white scale-95' : ''}`}
              title="Putar Atas"
            >
              <ChevronUp className="w-4 h-4" />
            </button>

            {/* DOWN */}
            <button
              type="button"
              onClick={() => onPtzAction('down')}
              className={`absolute bottom-2 left-1/2 -translate-x-1/2 w-10 h-8 rounded-b-xl bg-zinc-700/70 hover:bg-sky-600 text-zinc-200 hover:text-white flex items-center justify-center transition active:scale-95 ${ptzMoving === 'down' ? 'bg-sky-500 text-white scale-95' : ''}`}
              title="Putar Bawah"
            >
              <ChevronDown className="w-4 h-4" />
            </button>

            {/* LEFT */}
            <button
              type="button"
              onClick={() => onPtzAction('left')}
              className={`absolute left-2 top-1/2 -translate-y-1/2 w-8 h-10 rounded-l-xl bg-zinc-700/70 hover:bg-sky-600 text-zinc-200 hover:text-white flex items-center justify-center transition active:scale-95 ${ptzMoving === 'left' ? 'bg-sky-500 text-white scale-95' : ''}`}
              title="Putar Kiri"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* RIGHT */}
            <button
              type="button"
              onClick={() => onPtzAction('right')}
              className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-10 rounded-r-xl bg-zinc-700/70 hover:bg-sky-600 text-zinc-200 hover:text-white flex items-center justify-center transition active:scale-95 ${ptzMoving === 'right' ? 'bg-sky-500 text-white scale-95' : ''}`}
              title="Putar Kanan"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* CENTER: Auto Reset */}
            <button
              type="button"
              onClick={() => onPtzAction('center')}
              className="w-12 h-12 rounded-full bg-zinc-700 hover:bg-sky-600 text-white shadow-md flex items-center justify-center text-[10px] font-bold transition active:scale-90 border border-zinc-600"
              title="Reset Posisi"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Presets */}
        <div className="space-y-2 pt-2 border-t border-zinc-800">
          <span className="text-[11px] font-medium text-zinc-400">Sudut Sorot Cepat:</span>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => onPtzPreset('Rig Shell & Tube', 'rig')}
              className="px-2.5 py-1.5 bg-zinc-800/80 hover:bg-zinc-700 rounded-lg text-[11px] font-medium text-zinc-200 text-left transition truncate border border-zinc-700/50"
            >
              • Rig Shell & Tube
            </button>
            <button
              type="button"
              onClick={() => onPtzPreset('Tangki Fluida', 'tank')}
              className="px-2.5 py-1.5 bg-zinc-800/80 hover:bg-zinc-700 rounded-lg text-[11px] font-medium text-zinc-200 text-left transition truncate border border-zinc-700/50"
            >
              • Tangki & Pompa
            </button>
            <button
              type="button"
              onClick={() => onPtzPreset('Panel Solenoid', 'valve')}
              className="px-2.5 py-1.5 bg-zinc-800/80 hover:bg-zinc-700 rounded-lg text-[11px] font-medium text-zinc-200 text-left transition truncate border border-zinc-700/50"
            >
              • Panel Solenoid
            </button>
            <button
              type="button"
              onClick={() => onPtzPreset('Reset Tengah', 'center')}
              className="px-2.5 py-1.5 bg-zinc-800/80 hover:bg-zinc-700 rounded-lg text-[11px] font-medium text-zinc-200 text-left transition truncate border border-zinc-700/50"
            >
              • Reset Tengah
            </button>
          </div>
        </div>
      </div>

      {/* Telemetry Live Data Card */}
      <div className="p-5 bg-zinc-900 text-white rounded-2xl border border-zinc-800 space-y-3 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2 border-b border-zinc-800 pb-3">
          <Activity className="w-4 h-4 text-emerald-400" /> Sensor Terhubung
        </h3>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 bg-zinc-800/60 rounded-xl border border-zinc-700/40">
            <span className="text-zinc-400 text-[10.5px] block">TI1 (Hot In):</span>
            <strong className="text-amber-400 font-mono text-sm">{latestData.ti1}°C</strong>
          </div>
          <div className="p-2.5 bg-zinc-800/60 rounded-xl border border-zinc-700/40">
            <span className="text-zinc-400 text-[10.5px] block">TI2 (Hot Out):</span>
            <strong className="text-rose-400 font-mono text-sm">{latestData.ti2}°C</strong>
          </div>
          <div className="p-2.5 bg-zinc-800/60 rounded-xl border border-zinc-700/40">
            <span className="text-zinc-400 text-[10.5px] block">TI3 (Cold In):</span>
            <strong className="text-cyan-400 font-mono text-sm">{latestData.ti3}°C</strong>
          </div>
          <div className="p-2.5 bg-zinc-800/60 rounded-xl border border-zinc-700/40">
            <span className="text-zinc-400 text-[10.5px] block">TI4 (Cold Out):</span>
            <strong className="text-cyan-400 font-mono text-sm">{latestData.ti4}°C</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
export default PtzController;
