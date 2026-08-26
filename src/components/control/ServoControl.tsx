'use client';

import React from 'react';

interface ServoControlProps {
  servoAngle: number;
  controlMode: 'AUTO' | 'MANUAL';
  emergencyStopped?: boolean;
  onChangeServoAngle: (angle: number) => void;
}

export const ServoControl: React.FC<ServoControlProps> = ({
  servoAngle,
  controlMode,
  emergencyStopped = false,
  onChangeServoAngle
}) => {
  const isAuto = controlMode === 'AUTO';

  return (
    <div
      className={`p-4 rounded-2xl border transition-all space-y-2 ${
        isAuto ? 'bg-purple-50/60 border-purple-200' : 'bg-slate-50 border-slate-200'
      }`}
    >
      <div className="flex justify-between items-center text-xs font-bold text-slate-800">
        <span className="flex items-center gap-1">
          Sudut Bukaan Katup Servo
          {isAuto && (
            <span className="text-[9px] text-purple-700 font-extrabold bg-purple-100 px-1.5 py-0.5 rounded border border-purple-200">
              AUTO PID
            </span>
          )}
        </span>
        <strong className="text-indigo-600 font-extrabold text-base">{servoAngle}°</strong>
      </div>
      <input
        type="range"
        min="0"
        max="90"
        value={servoAngle}
        onChange={(e) => onChangeServoAngle(Number(e.target.value))}
        disabled={emergencyStopped || isAuto}
        className={`w-full h-2 bg-slate-200 rounded-lg appearance-none ${
          isAuto ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
        }`}
      />
      <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
        <span>0° (Closed)</span>
        <span>{isAuto ? 'Otomatis ESP32' : '45° (Half)'}</span>
        <span>90° (Open)</span>
      </div>
    </div>
  );
};

export default ServoControl;
