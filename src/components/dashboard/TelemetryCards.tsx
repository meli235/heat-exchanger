'use client';

import React from 'react';
import { Thermometer, Gauge, Activity } from 'lucide-react';
import { TelemetryPoint, TempLabels } from '@/types';

interface TelemetryCardsProps {
  latestData: TelemetryPoint;
  tempLabels: TempLabels;
  tc1Setpoint: number;
  ti1MaxThreshold: number;
  deltaPHot: number;
  deltaPCold: number;
  fc1Valve: number;
  fc2Valve: number;
  onCardClick?: () => void;
}

export const TelemetryCards: React.FC<TelemetryCardsProps> = ({
  latestData,
  tempLabels,
  tc1Setpoint,
  ti1MaxThreshold,
  deltaPHot,
  deltaPCold,
  fc1Valve,
  fc2Valve,
  onCardClick
}) => {
  return (
    <div id="tour-temp-cards" className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* Card 1: TI1 */}
      <div
        onClick={onCardClick}
        className="asklepios-card p-3.5 sm:p-4 relative overflow-hidden cursor-pointer hover:border-orange-300 hover:shadow-md transition active:scale-[0.98] select-none"
        title="Klik untuk membuka Kontrol Pemanas & Suhu"
      >
        <div className="flex justify-between items-start">
          <span className="text-xs font-semibold text-slate-500">{tempLabels.t1}</span>
          <span className="p-1.5 bg-orange-50 text-orange-600 rounded-xl">
            <Thermometer className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-extrabold text-slate-900">{latestData.ti1}</span>
          <span className="text-xs font-semibold text-slate-500">°C</span>
        </div>
        <div className="mt-2 text-[11px] text-slate-500 flex justify-between">
          <span>Target: {tc1Setpoint}°C</span>
          <span className={latestData.ti1 > ti1MaxThreshold ? 'text-red-600 font-bold' : 'text-emerald-600 font-semibold'}>
            {latestData.ti1 > ti1MaxThreshold ? 'Warning' : 'Optimal'}
          </span>
        </div>
      </div>

      {/* Card 2: TI2 */}
      <div
        onClick={onCardClick}
        className="asklepios-card p-3.5 sm:p-4 relative overflow-hidden cursor-pointer hover:border-orange-300 hover:shadow-md transition active:scale-[0.98] select-none"
        title="Klik untuk membuka Kontrol Pemanas & Suhu"
      >
        <div className="flex justify-between items-start">
          <span className="text-xs font-semibold text-slate-500">{tempLabels.t2}</span>
          <span className="p-1.5 bg-orange-50 text-orange-600 rounded-xl">
            <Thermometer className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-extrabold text-slate-900">{latestData.ti2}</span>
          <span className="text-xs font-semibold text-slate-500">°C</span>
        </div>
        <div className="mt-2 text-[11px] text-slate-500 flex justify-between">
          <span>Penurunan Heat:</span>
          <span className="font-semibold text-slate-700">{(latestData.ti1 - latestData.ti2).toFixed(1)}°C</span>
        </div>
      </div>

      {/* Card 3: TI3 */}
      <div
        onClick={onCardClick}
        className="asklepios-card p-3.5 sm:p-4 relative overflow-hidden cursor-pointer hover:border-cyan-300 hover:shadow-md transition active:scale-[0.98] select-none"
        title="Klik untuk membuka Kontrol Pemanas & Suhu"
      >
        <div className="flex justify-between items-start">
          <span className="text-xs font-semibold text-slate-500">{tempLabels.t3}</span>
          <span className="p-1.5 bg-cyan-50 text-cyan-600 rounded-xl">
            <Thermometer className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-extrabold text-slate-900">{latestData.ti3}</span>
          <span className="text-xs font-semibold text-slate-500">°C</span>
        </div>
        <div className="mt-2 text-[11px] text-slate-500 flex justify-between">
          <span>Air Dingin Lab</span>
          <span className="font-semibold text-slate-700">Suplai Normal</span>
        </div>
      </div>

      {/* Card 4: TI4 */}
      <div
        onClick={onCardClick}
        className="asklepios-card p-3.5 sm:p-4 relative overflow-hidden cursor-pointer hover:border-cyan-300 hover:shadow-md transition active:scale-[0.98] select-none"
        title="Klik untuk membuka Kontrol Pemanas & Suhu"
      >
        <div className="flex justify-between items-start">
          <span className="text-xs font-semibold text-slate-500">{tempLabels.t4}</span>
          <span className="p-1.5 bg-cyan-50 text-cyan-600 rounded-xl">
            <Thermometer className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-extrabold text-slate-900">{latestData.ti4}</span>
          <span className="text-xs font-semibold text-slate-500">°C</span>
        </div>
        <div className="mt-2 text-[11px] text-slate-500 flex justify-between">
          <span>Kenaikan Heat:</span>
          <span className="font-semibold text-slate-700">+{(latestData.ti4 - latestData.ti3).toFixed(1)}°C</span>
        </div>
      </div>

      {/* Card 5: PI1 / PI2 */}
      <div
        onClick={onCardClick}
        className="asklepios-card p-3.5 sm:p-4 relative overflow-hidden cursor-pointer hover:border-sky-300 hover:shadow-md transition active:scale-[0.98] select-none"
      >
        <div className="flex justify-between items-start">
          <span className="text-xs font-semibold text-slate-500">PI1 / PI2 (Hot Press)</span>
          <span className="p-1.5 bg-sky-50 text-sky-600 rounded-xl">
            <Gauge className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-xl font-extrabold text-slate-900">{latestData.pi1} / {latestData.pi2}</span>
          <span className="text-xs font-semibold text-slate-500">atm-g</span>
        </div>
        <div className="mt-2 text-[11px] flex justify-between items-center p-1 bg-slate-50 rounded-lg">
          <span className="text-slate-500">ΔP Hot:</span>
          <strong className="text-sky-700">{deltaPHot} atm-g</strong>
        </div>
      </div>

      {/* Card 6: PI3 / PI4 */}
      <div
        onClick={onCardClick}
        className="asklepios-card p-3.5 sm:p-4 relative overflow-hidden cursor-pointer hover:border-cyan-300 hover:shadow-md transition active:scale-[0.98] select-none"
      >
        <div className="flex justify-between items-start">
          <span className="text-xs font-semibold text-slate-500">PI3 / PI4 (Cold Press)</span>
          <span className="p-1.5 bg-cyan-50 text-cyan-600 rounded-xl">
            <Gauge className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-xl font-extrabold text-slate-900">{latestData.pi3} / {latestData.pi4}</span>
          <span className="text-xs font-semibold text-slate-500">atm-g</span>
        </div>
        <div className="mt-2 text-[11px] flex justify-between items-center p-1 bg-slate-50 rounded-lg">
          <span className="text-slate-500">ΔP Cold:</span>
          <strong className="text-cyan-700">{deltaPCold} atm-g</strong>
        </div>
      </div>

      {/* Card 7: FC1 */}
      <div
        onClick={onCardClick}
        className="asklepios-card p-3.5 sm:p-4 relative overflow-hidden cursor-pointer hover:border-orange-300 hover:shadow-md transition active:scale-[0.98] select-none"
      >
        <div className="flex justify-between items-start">
          <span className="text-xs font-semibold text-slate-500">FC1 (Hot Flow)</span>
          <span className="p-1.5 bg-orange-50 text-orange-600 rounded-xl">
            <Activity className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-extrabold text-slate-900">{latestData.fc1}</span>
          <span className="text-xs font-semibold text-slate-500">L/min</span>
        </div>
        <div className="mt-2 text-[11px] text-slate-500 flex justify-between">
          <span>Katup FC1:</span>
          <span className="font-bold text-slate-700">{fc1Valve}%</span>
        </div>
      </div>

      {/* Card 8: FC2 */}
      <div
        onClick={onCardClick}
        className="asklepios-card p-3.5 sm:p-4 relative overflow-hidden cursor-pointer hover:border-cyan-300 hover:shadow-md transition active:scale-[0.98] select-none"
      >
        <div className="flex justify-between items-start">
          <span className="text-xs font-semibold text-slate-500">FC2 (Cold Flow)</span>
          <span className="p-1.5 bg-cyan-50 text-cyan-600 rounded-xl">
            <Activity className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-extrabold text-slate-900">{latestData.fc2}</span>
          <span className="text-xs font-semibold text-slate-500">L/min</span>
        </div>
        <div className="mt-2 text-[11px] text-slate-500 flex justify-between">
          <span>Katup FC2:</span>
          <span className="font-bold text-slate-700">{fc2Valve}%</span>
        </div>
      </div>
    </div>
  );
};

export default TelemetryCards;
