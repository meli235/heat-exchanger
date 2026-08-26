'use client';

import React from 'react';
import { ChevronUp, ChevronDown, Thermometer } from 'lucide-react';

interface TargetTempSliderProps {
  targetTemp: number;
  controlMode: 'AUTO' | 'MANUAL';
  emergencyStopped?: boolean;
  isBtnUpActive?: boolean;
  isBtnDownActive?: boolean;
  onChangeTargetTemp?: (val: number) => void;
  onStepUp: () => void;
  onStepDown: () => void;
}

export const TargetTempSlider: React.FC<TargetTempSliderProps> = ({
  targetTemp,
  controlMode,
  emergencyStopped = false,
  isBtnUpActive = false,
  isBtnDownActive = false,
  onStepUp,
  onStepDown,
}) => {
  const isAuto = controlMode === 'AUTO';

  // Hitung perkiraan Step Level P1-P7 berdasarkan targetTemp (30°C ~ P1, 40°C ~ P2, ..., 90°C ~ P7)
  const getStepInfo = (temp: number) => {
    if (temp <= 35) return { step: 'P1', label: '30°C (Min)' };
    if (temp <= 45) return { step: 'P2', label: '40°C' };
    if (temp <= 55) return { step: 'P3', label: '50°C' };
    if (temp <= 65) return { step: 'P4', label: '60°C' };
    if (temp <= 75) return { step: 'P5', label: '70°C' };
    if (temp <= 85) return { step: 'P6', label: '80°C' };
    return { step: 'P7', label: '90°C (Max)' };
  };

  const currentStep = getStepInfo(targetTemp);
  const steps = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'];

  return (
    <div
      className={`p-4 rounded-2xl border transition-all space-y-3 ${
        isAuto
          ? 'bg-purple-50/70 border-purple-300 ring-2 ring-purple-400/20'
          : 'bg-slate-50 border-slate-200'
      }`}
    >
      <div className="flex justify-between items-center text-xs font-bold text-slate-800">
        <span className="flex items-center gap-1.5">
          <Thermometer className="w-4 h-4 text-sky-600" />
          Pengaturan Suhu (Step P1 – P7)
          {isAuto && (
            <span className="px-1.5 py-0.5 bg-purple-600 text-white text-[9px] font-extrabold rounded-md uppercase">
              AUTO
            </span>
          )}
        </span>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-800 font-extrabold text-xs">
            {currentStep.step}
          </span>
          <strong className="text-sky-700 font-extrabold text-base">
            {targetTemp.toFixed(1)} °C
          </strong>
        </div>
      </div>

      {/* Visual Step Level Indicator P1 - P7 */}
      <div className="grid grid-cols-7 gap-1 bg-slate-200/80 p-1.5 rounded-xl">
        {steps.map((stepName, idx) => {
          const isActive = currentStep.step === stepName;
          return (
            <div
              key={stepName}
              className={`py-1 text-center text-[10px] font-extrabold rounded transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-sm scale-105'
                  : 'bg-white/60 text-slate-600'
              }`}
            >
              {stepName}
            </div>
          );
        })}
      </div>

      {/* Tombol Interaktif "Naik" dan "Turun" (Pulsa 200ms ke ESP32) */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <button
          type="button"
          onClick={onStepUp}
          disabled={emergencyStopped}
          className={`py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 shadow-sm ${
            isBtnUpActive
              ? 'bg-emerald-600 text-white scale-95 ring-2 ring-emerald-400'
              : 'bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95'
          }`}
        >
          <ChevronUp className="w-4 h-4 stroke-[3]" />
          <span>Tombol NAIK (+10°C)</span>
        </button>

        <button
          type="button"
          onClick={onStepDown}
          disabled={emergencyStopped}
          className={`py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 shadow-sm ${
            isBtnDownActive
              ? 'bg-rose-600 text-white scale-95 ring-2 ring-rose-400'
              : 'bg-rose-500 text-white hover:bg-rose-600 active:scale-95'
          }`}
        >
          <ChevronDown className="w-4 h-4 stroke-[3]" />
          <span>Tombol TURUN (-10°C)</span>
        </button>
      </div>

      <p className="text-[10px] text-slate-500 font-medium text-center">
        *Mengirim pulsa 200ms (`btn_up` / `btn_down`) untuk menggerakkan servo suhu ESP32 per step (~10°C).
      </p>
    </div>
  );
};

export default TargetTempSlider;
