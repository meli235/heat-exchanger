'use client';

import React from 'react';
import { Sliders, Sparkles } from 'lucide-react';
import { FlowMode } from '@/types';

interface FlowModeSelectorProps {
  variant?: 'control' | 'dashboard';
  currentFlowMode: 'COUNTER' | 'CO-CURRENT' | FlowMode;
  flowVisViewMode?: 'single' | 'compare';
  disabled?: boolean;
  onSelectMode: (mode: 'COUNTER' | 'CO-CURRENT', friendlyMode: FlowMode) => void;
  onSelectViewMode?: (viewMode: 'single' | 'compare') => void;
}

export const FlowModeSelector: React.FC<FlowModeSelectorProps> = ({
  variant = 'control',
  currentFlowMode,
  flowVisViewMode = 'single',
  disabled = false,
  onSelectMode,
  onSelectViewMode
}) => {
  const isCounter =
    currentFlowMode === 'COUNTER' || currentFlowMode === 'Counter-Current';

  if (variant === 'dashboard') {
    return (
      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
          <label className="text-xs font-extrabold text-slate-800 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-sky-600" /> Tombol Pemilihan Mode Aliran:
          </label>
          <span className="text-[11px] text-slate-500 font-medium">
            Pengalihan 4 katup solenoid (Counter-Current vs Co-Current)
          </span>
        </div>

        <div id="tour-flow-mode" className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Co-Current */}
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              onSelectViewMode?.('single');
              onSelectMode('CO-CURRENT', 'Co-Current');
            }}
            className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
              !isCounter && flowVisViewMode === 'single'
                ? 'bg-gradient-to-br from-sky-600 to-cyan-600 text-white border-sky-600 shadow-lg shadow-sky-600/25 ring-2 ring-sky-300'
                : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
            }`}
          >
            <div className="flex justify-between items-center w-full">
              <span className="font-extrabold text-sm flex items-center gap-2">
                <span className="p-1 rounded-lg bg-white/20">🔄</span> Co-Current
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                  !isCounter && flowVisViewMode === 'single'
                    ? 'bg-white/25 text-white'
                    : 'bg-sky-100 text-sky-700'
                }`}
              >
                Aliran Searah
              </span>
            </div>
            <p
              className={`text-[11px] mt-2 leading-relaxed ${
                !isCounter && flowVisViewMode === 'single' ? 'text-sky-50' : 'text-slate-500'
              }`}
            >
              SV1 & 3 (ON/Open), SV2 & 4 (OFF/Closed). Memerlukan arus listrik aktif.
            </p>
          </button>

          {/* Counter-Current */}
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              onSelectViewMode?.('single');
              onSelectMode('COUNTER', 'Counter-Current');
            }}
            className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
              isCounter && flowVisViewMode === 'single'
                ? 'bg-gradient-to-br from-sky-600 to-cyan-600 text-white border-sky-600 shadow-lg shadow-sky-600/25 ring-2 ring-sky-300'
                : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
            }`}
          >
            <div className="flex justify-between items-center w-full">
              <span className="font-extrabold text-sm flex items-center gap-2">
                <span className="p-1 rounded-lg bg-white/20">⇄</span> Counter-Current
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                  isCounter && flowVisViewMode === 'single'
                    ? 'bg-white/25 text-white'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                Fail-Safe Pasif
              </span>
            </div>
            <p
              className={`text-[11px] mt-2 leading-relaxed ${
                isCounter && flowVisViewMode === 'single' ? 'text-sky-50' : 'text-slate-500'
              }`}
            >
              SV1 & 3 (OFF/Closed), SV2 & 4 (ON/Open). Otomatis aktif saat mati daya.
            </p>
          </button>

          {/* Compare Mode */}
          <button
            type="button"
            disabled={disabled}
            onClick={() => onSelectViewMode?.('compare')}
            className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
              flowVisViewMode === 'compare'
                ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white border-purple-600 shadow-lg shadow-purple-600/25 ring-2 ring-purple-300'
                : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
            }`}
          >
            <div className="flex justify-between items-center w-full">
              <span className="font-extrabold text-sm flex items-center gap-2">
                <span className="p-1 rounded-lg bg-white/20">📊</span> Bandingkan Both Mode
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                  flowVisViewMode === 'compare'
                    ? 'bg-white/25 text-white'
                    : 'bg-purple-100 text-purple-700'
                }`}
              >
                Dual View
              </span>
            </div>
            <p
              className={`text-[11px] mt-2 leading-relaxed ${
                flowVisViewMode === 'compare' ? 'text-purple-50' : 'text-slate-500'
              }`}
            >
              Tampilkan diagram visual Co-Current dan Counter-Current secara bersamaan.
            </p>
          </button>
        </div>
      </div>
    );
  }

  // Control tab variant
  return (
    <div id="tour-flow-mode-control" className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
      <label className="text-xs font-bold text-slate-800 block">Arah Aliran Fluida (Flow Mode)</label>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onSelectMode('COUNTER', 'Counter-Current')}
          disabled={disabled}
          className={`py-2 rounded-xl text-xs font-extrabold transition ${
            isCounter
              ? 'bg-sky-600 text-white shadow'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
          }`}
        >
          COUNTER
        </button>
        <button
          type="button"
          onClick={() => onSelectMode('CO-CURRENT', 'Co-Current')}
          disabled={disabled}
          className={`py-2 rounded-xl text-xs font-extrabold transition ${
            !isCounter
              ? 'bg-sky-600 text-white shadow'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
          }`}
        >
          CO-CURRENT
        </button>
      </div>
      <span className="text-[10px] text-slate-500 block">
        Status Saat Ini: <strong>{isCounter ? 'COUNTER' : 'CO-CURRENT'}</strong>
      </span>
    </div>
  );
};

export default FlowModeSelector;
