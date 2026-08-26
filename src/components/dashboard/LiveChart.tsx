'use client';

import React from 'react';
import { Activity } from 'lucide-react';
import { TelemetryPoint } from '@/types';

interface LiveChartProps {
  telemetryHistory: TelemetryPoint[];
}

export const LiveChart: React.FC<LiveChartProps> = ({ telemetryHistory }) => {
  return (
    <div className="asklepios-card p-6 bg-white">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-sky-600" /> Grafik Suhu & Tekanan Real-Time
          </h3>
          <p className="text-xs text-slate-500">Update live 2 detik (TI₁ - TI₄)</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Rentang:</span>
          <button className="px-2.5 py-1 bg-sky-50 text-sky-700 rounded-lg text-xs font-bold border border-sky-200">
            Live (2s)
          </button>
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <svg viewBox="0 0 800 220" className="w-full h-52 min-w-[600px] font-sans">
          <line x1="40" y1="20" x2="780" y2="20" stroke="#F1F5F9" strokeWidth="1" />
          <line x1="40" y1="70" x2="780" y2="70" stroke="#F1F5F9" strokeWidth="1" />
          <line x1="40" y1="120" x2="780" y2="120" stroke="#F1F5F9" strokeWidth="1" />
          <line x1="40" y1="170" x2="780" y2="170" stroke="#E2E8F0" strokeWidth="1.5" />

          <text x="30" y="24" textAnchor="end" className="text-[9px] fill-slate-400 font-semibold">80°C</text>
          <text x="30" y="74" textAnchor="end" className="text-[9px] fill-slate-400 font-semibold">60°C</text>
          <text x="30" y="124" textAnchor="end" className="text-[9px] fill-slate-400 font-semibold">40°C</text>
          <text x="30" y="174" textAnchor="end" className="text-[9px] fill-slate-400 font-semibold">20°C</text>

          {/* Polyline TI1 */}
          <polyline
            fill="none"
            stroke="#F97316"
            strokeWidth="3"
            points={telemetryHistory
              .map((d, i) => {
                const total = Math.max(1, telemetryHistory.length - 1);
                const x = 40 + i * (740 / (total > 0 ? total : 1));
                const y = 170 - ((d.ti1 - 20) / 60) * 150;
                return `${x},${y}`;
              })
              .join(' ')}
          />

          {/* Polyline TI2 */}
          <polyline
            fill="none"
            stroke="#EF4444"
            strokeWidth="2.5"
            strokeDasharray="4 2"
            points={telemetryHistory
              .map((d, i) => {
                const total = Math.max(1, telemetryHistory.length - 1);
                const x = 40 + i * (740 / (total > 0 ? total : 1));
                const y = 170 - ((d.ti2 - 20) / 60) * 150;
                return `${x},${y}`;
              })
              .join(' ')}
          />

          {/* Polyline TI3 */}
          <polyline
            fill="none"
            stroke="#06B6D4"
            strokeWidth="2.5"
            points={telemetryHistory
              .map((d, i) => {
                const total = Math.max(1, telemetryHistory.length - 1);
                const x = 40 + i * (740 / (total > 0 ? total : 1));
                const y = 170 - ((d.ti3 - 20) / 60) * 150;
                return `${x},${y}`;
              })
              .join(' ')}
          />

          {/* Polyline TI4 */}
          <polyline
            fill="none"
            stroke="#0284C7"
            strokeWidth="2.5"
            points={telemetryHistory
              .map((d, i) => {
                const total = Math.max(1, telemetryHistory.length - 1);
                const x = 40 + i * (740 / (total > 0 ? total : 1));
                const y = 170 - ((d.ti4 - 20) / 60) * 150;
                return `${x},${y}`;
              })
              .join(' ')}
          />

          {/* Timestamps */}
          {telemetryHistory.map((d, i) => {
            if (i % 4 === 0) {
              const total = Math.max(1, telemetryHistory.length - 1);
              const x = 40 + i * (740 / (total > 0 ? total : 1));
              return (
                <text key={i} x={x} y="195" textAnchor="middle" className="text-[9px] fill-slate-400">
                  {d.timestamp.slice(0, 5)}
                </text>
              );
            }
            return null;
          })}
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-6 text-xs font-semibold">
        <div className="flex items-center gap-2 text-orange-600">
          <span className="w-3 h-1 bg-orange-500 rounded" /> TI1 (Hot Inlet)
        </div>
        <div className="flex items-center gap-2 text-red-600">
          <span className="w-3 h-1 bg-red-500 rounded" /> TI2 (Hot Outlet - Heater 2 Output)
        </div>
        <div className="flex items-center gap-2 text-cyan-600">
          <span className="w-3 h-1 bg-cyan-500 rounded" /> TI3 (Cold Inlet)
        </div>
        <div className="flex items-center gap-2 text-sky-600">
          <span className="w-3 h-1 bg-sky-600 rounded" /> TI4 (Cold Outlet)
        </div>
      </div>
    </div>
  );
};

export default LiveChart;
