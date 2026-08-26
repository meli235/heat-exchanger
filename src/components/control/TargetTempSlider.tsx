'use client';

import React from 'react';

interface TargetTempSliderProps {
  targetTemp: number;
  controlMode: 'AUTO' | 'MANUAL';
  emergencyStopped?: boolean;
  onChangeTargetTemp: (val: number) => void;
}

export const TargetTempSlider: React.FC<TargetTempSliderProps> = ({
  targetTemp,
  controlMode,
  emergencyStopped = false,
  onChangeTargetTemp
}) => {
  const isAuto = controlMode === 'AUTO';

  return (
    <div
      className={`p-4 rounded-2xl border transition-all space-y-2 ${
        isAuto
          ? 'bg-purple-50/70 border-purple-300 ring-2 ring-purple-400/20'
          : 'bg-slate-50 border-slate-200'
      }`}
    >
      <div className="flex justify-between items-center text-xs font-bold text-slate-800">
        <span className="flex items-center gap-1.5">
          Target Suhu (TC₁ Setpoint)
          {isAuto && (
            <span className="px-1.5 py-0.2 bg-purple-600 text-white text-[9px] font-extrabold rounded-md uppercase">
              Parameter Utama
            </span>
          )}
        </span>
        <strong className="text-sky-700 font-extrabold text-base">{targetTemp.toFixed(1)} °C</strong>
      </div>
      <input
        type="range"
        min="30"
        max="90"
        step="0.5"
        value={targetTemp}
        onChange={(e) => onChangeTargetTemp(Number(e.target.value))}
        disabled={emergencyStopped}
        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
      />
      <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
        <span>30.0 °C</span>
        <span>60.0 °C</span>
        <span>90.0 °C</span>
      </div>
    </div>
  );
};

export default TargetTempSlider;
