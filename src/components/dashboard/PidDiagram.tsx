'use client';

import React from 'react';
import { TelemetryPoint, FlowMode } from '@/types';
import { calculateLMTD } from '@/lib/calculations';

interface SolenoidValveItem {
  name: string;
  type: 'NC' | 'NO';
  state: string;
  active: boolean;
  badgeClass: string;
}

interface SolenoidValvesState {
  sv1: SolenoidValveItem;
  sv2: SolenoidValveItem;
  sv3: SolenoidValveItem;
  sv4: SolenoidValveItem;
}

interface DualHeaterDisplayState {
  h1?: boolean;
  h2?: boolean;
  heater1Active?: boolean;
  heater2Active?: boolean;
  powerWatt?: number;
  stage?: string;
}

interface PidDiagramProps {
  diagramMode: FlowMode;
  titleExtra?: string;
  latestData: TelemetryPoint;
  heaterMasterPower: boolean;
  emergencyStopped: boolean;
  fc1Valve: number;
  dualHeaterState: DualHeaterDisplayState;
  solenoidValves: SolenoidValvesState;
  deltaPHot: number;
  onHoverSensor?: (sensorId: string | null) => void;
}

export const PidDiagram: React.FC<PidDiagramProps> = ({
  diagramMode,
  titleExtra = '',
  latestData,
  heaterMasterPower,
  emergencyStopped,
  fc1Valve,
  dualHeaterState,
  solenoidValves,
  deltaPHot,
  onHoverSensor
}) => {
  const isCounter = diagramMode === 'Counter-Current';

  const thi = latestData.ti1;
  const tho = latestData.ti2;
  const tci = latestData.ti3;
  const tco = latestData.ti4;

  const lmtdVal = calculateLMTD(thi, tho, tci, tco, isCounter);

  const h1Active = dualHeaterState.h1 ?? dualHeaterState.heater1Active ?? false;
  const h2Active = dualHeaterState.h2 ?? dualHeaterState.heater2Active ?? false;

  return (
    <div className="bg-slate-50/80 rounded-2xl border border-slate-200/90 p-4 space-y-4 relative overflow-hidden shadow-sm">
      {/* Subheader */}
      <div className="flex flex-wrap justify-between items-center gap-2 pb-3 border-b border-slate-200/70">
        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-1 rounded-xl text-xs font-extrabold uppercase shadow-sm ${
              isCounter
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-sky-100 text-sky-800 border border-sky-300'
            }`}
          >
            Mode: {diagramMode} {titleExtra}
          </span>
          <span className="text-xs text-slate-600 font-semibold">
            {isCounter
              ? 'Pola Aliran Berlawanan (Counter-Current Flow) - Fail-Safe Pasif'
              : 'Pola Aliran Searah (Co-Current Flow)'}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-bold">
          <span className="text-orange-600 bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200">
            🔥 Hot Stream: Dual Heater (1 & 2) ➔ Tubes
          </span>
          <span
            className={
              isCounter
                ? 'text-cyan-700 bg-cyan-50 px-2.5 py-1 rounded-lg border border-cyan-200'
                : 'text-sky-700 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200'
            }
          >
            ❄️ Cold Stream: {isCounter ? 'Right ⬅ Left (Shell)' : 'Left ➔ Right (Shell)'}
          </span>
        </div>
      </div>

      {/* SVG Schematic Visual */}
      <div className="w-full overflow-x-auto py-2 bg-white rounded-xl border border-slate-200/80 p-2 shadow-inner">
        <svg viewBox="0 0 940 460" className="w-full h-auto min-w-[760px] font-sans">
          <defs>
            <linearGradient id={`hotFlowGrad_${diagramMode}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F97316" />
              <stop offset="50%" stopColor="#EF4444" />
              <stop offset="100%" stopColor="#DC2626" />
            </linearGradient>
            <linearGradient id={`coldFlowGrad_${diagramMode}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06B6D4" />
              <stop offset="100%" stopColor="#0284C7" />
            </linearGradient>
            <filter id={`shadow_${diagramMode}`} x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#0F172A" floodOpacity="0.08" />
            </filter>
          </defs>

          {/* ─── LEFT SUPPLY LOOP (PUMP + DUAL HEATER 1 & HEATER 2) ─── */}
          <path
            d="M100,380 L100,80 L380,80"
            fill="none"
            stroke={heaterMasterPower && !emergencyStopped && fc1Valve > 0 ? `url(#hotFlowGrad_${diagramMode})` : '#94A3B8'}
            strokeWidth="6"
            className={heaterMasterPower && !emergencyStopped && fc1Valve > 0 ? 'animate-flow-hot' : ''}
          />

          <path
            d="M745,290 L745,380 L100,380"
            fill="none"
            stroke="#F97316"
            strokeWidth="6"
            strokeDasharray="6 4"
          />

          {/* Pump 1 */}
          <g className="cursor-pointer transition hover:scale-105" filter={`url(#shadow_${diagramMode})`}>
            <circle cx="100" cy="340" r="22" fill="#FFFFFF" stroke="#0284C7" strokeWidth="3.5" />
            <polygon points="90,340 110,330 110,350" fill="#0284C7" />
            <rect x="70" y="368" width="60" height="18" rx="5" fill="#0284C7" />
            <text x="100" y="380" textAnchor="middle" className="text-[10px] font-extrabold fill-white">PUMP 1</text>
          </g>

          {/* Heater 1 Badge (Lower) */}
          <g className="cursor-pointer transition hover:scale-105" filter={`url(#shadow_${diagramMode})`}>
            <circle cx="100" cy="240" r="22" fill="#FFFFFF" stroke={h1Active ? '#EF4444' : '#94A3B8'} strokeWidth="3.5" />
            <path
              d="M88,240 Q94,232 100,240 T112,240"
              stroke={h1Active ? '#EF4444' : '#94A3B8'}
              strokeWidth="3.5"
              fill="none"
              className={h1Active ? 'animate-pulse' : ''}
            />
            <rect x="62" y="268" width="76" height="18" rx="5" fill={h1Active ? '#EF4444' : '#64748B'} />
            <text x="100" y="280" textAnchor="middle" className="text-[9px] font-extrabold fill-white">
              Heater 1 ({h1Active ? '500W ON' : 'OFF'})
            </text>
          </g>

          {/* Heater 2 Badge (Upper - Temp Monitored Here) */}
          <g className="cursor-pointer transition hover:scale-105" filter={`url(#shadow_${diagramMode})`}>
            <circle cx="100" cy="140" r="22" fill="#FFFFFF" stroke={h2Active ? '#EF4444' : '#94A3B8'} strokeWidth="3.5" />
            <path
              d="M88,140 Q94,132 100,140 T112,140"
              stroke={h2Active ? '#EF4444' : '#94A3B8'}
              strokeWidth="3.5"
              fill="none"
              className={h2Active ? 'animate-pulse' : ''}
            />
            <rect x="62" y="168" width="76" height="18" rx="5" fill={h2Active ? '#EF4444' : '#64748B'} />
            <text x="100" y="180" textAnchor="middle" className="text-[9px] font-extrabold fill-white">
              Heater 2 ({h2Active ? '500W ON' : 'OFF'})
            </text>
          </g>

          {/* ─── HOT TOP PIPE SENSORS & SOLENOID VALVES ─── */}
          {/* P1 Pressure Transducer */}
          <g
            className="cursor-pointer"
            onMouseEnter={() => onHoverSensor?.('PI1')}
            onMouseLeave={() => onHoverSensor?.(null)}
          >
            <line x1="180" y1="80" x2="180" y2="55" stroke="#94A3B8" strokeWidth="2" strokeDasharray="3 3" />
            <circle cx="180" cy="45" r="14" fill="#FFFFFF" stroke="#0284C7" strokeWidth="2.5" />
            <text x="180" y="49" textAnchor="middle" className="text-[9px] font-extrabold fill-[#0284C7]">P1</text>
            <rect x="155" y="18" width="50" height="16" rx="4" fill="#F1F5F9" stroke="#0284C7" strokeWidth="1" />
            <text x="180" y="30" textAnchor="middle" className="text-[9px] font-extrabold fill-slate-800">{latestData.pi1} atm-g</text>
          </g>

          {/* SV1 (NC) Solenoid Valve Badge */}
          <g className="cursor-pointer">
            <polygon points="230,80 240,90 240,70" fill={solenoidValves.sv1.active ? '#16A3A0' : '#DC2626'} />
            <polygon points="250,80 240,90 240,70" fill={solenoidValves.sv1.active ? '#16A3A0' : '#DC2626'} />
            <rect x="222" y="100" width="36" height="15" rx="3" fill="#FFFFFF" stroke={solenoidValves.sv1.active ? '#16A3A0' : '#DC2626'} strokeWidth="1" />
            <text x="240" y="111" textAnchor="middle" className="text-[8px] font-extrabold fill-slate-800">SV1 (NC)</text>
          </g>

          {/* FC1 Hot Flow Valve */}
          <g className="cursor-pointer">
            <polygon points="280,80 292,90 292,70" fill="#F97316" />
            <polygon points="304,80 292,90 292,70" fill="#F97316" />
            <rect x="272" y="100" width="40" height="16" rx="4" fill="#FFEDD5" stroke="#F97316" strokeWidth="1" />
            <text x="292" y="111" textAnchor="middle" className="text-[8px] font-bold fill-orange-800">FC1 ({fc1Valve}%)</text>
          </g>

          {/* TC / TI1 Hot Inlet Temp Sensor */}
          <g
            className="cursor-pointer transition hover:scale-110"
            onMouseEnter={() => onHoverSensor?.('TI1')}
            onMouseLeave={() => onHoverSensor?.(null)}
          >
            <line x1="340" y1="80" x2="340" y2="55" stroke="#F97316" strokeWidth="2" />
            <circle cx="340" cy="45" r="14" fill="#F97316" stroke="#FFFFFF" strokeWidth="2.5" />
            <text x="340" y="49" textAnchor="middle" className="text-[9px] font-extrabold fill-white">TC</text>
            <rect x="312" y="18" width="56" height="18" rx="5" fill="#FFFFFF" stroke="#F97316" strokeWidth="1.5" />
            <text x="340" y="31" textAnchor="middle" className="text-[10px] font-extrabold fill-slate-900">{latestData.ti1}°C</text>
          </g>

          {/* ─── SHELL & TUBE HEAT EXCHANGER MAIN BODY ─── */}
          <rect x="410" y="140" width="320" height="140" rx="16" fill="#F8FAFC" stroke="#0284C7" strokeWidth="3.5" filter={`url(#shadow_${diagramMode})`} />

          <rect x="380" y="130" width="30" height="160" rx="10" fill="#E2E8F0" stroke="#64748B" strokeWidth="2" />
          <text x="395" y="215" textAnchor="middle" className="text-[8px] font-bold fill-slate-600 rotate-[-90] origin-[395px_215px]">HOT INLET HEADER</text>

          <rect x="730" y="130" width="30" height="160" rx="10" fill="#E2E8F0" stroke="#64748B" strokeWidth="2" />
          <text x="745" y="215" textAnchor="middle" className="text-[8px] font-bold fill-slate-600 rotate-[90] origin-[745px_215px]">HOT OUTLET HEADER</text>

          <line x1="410" y1="165" x2="730" y2="165" stroke="#F97316" strokeWidth="6" opacity="0.85" />
          <line x1="410" y1="195" x2="730" y2="195" stroke="#EF4444" strokeWidth="6" opacity="0.85" />
          <line x1="410" y1="225" x2="730" y2="225" stroke="#F97316" strokeWidth="6" opacity="0.85" />
          <line x1="410" y1="255" x2="730" y2="255" stroke="#EF4444" strokeWidth="6" opacity="0.85" />

          <line x1="480" y1="140" x2="480" y2="240" stroke="#94A3B8" strokeWidth="3" strokeDasharray="5 3" />
          <line x1="560" y1="180" x2="560" y2="280" stroke="#94A3B8" strokeWidth="3" strokeDasharray="5 3" />
          <line x1="640" y1="140" x2="640" y2="240" stroke="#94A3B8" strokeWidth="3" strokeDasharray="5 3" />

          <text x="570" y="130" textAnchor="middle" className="text-[11px] font-extrabold fill-slate-800">
            SHELL & TUBE HEAT EXCHANGER ({diagramMode})
          </text>

          <polygon points="460,165 452,160 452,170" fill="#DC2626" />
          <polygon points="580,195 572,190 572,200" fill="#DC2626" />
          <polygon points="680,225 672,220 672,230" fill="#DC2626" />

          {/* ─── SOLENOID VALVES SV2, SV3, SV4 INDICATORS ON PIPELINE ─── */}
          {/* SV2 (NO) */}
          <g className="cursor-pointer">
            <rect x="420" y="300" width="38" height="15" rx="3" fill="#FFFFFF" stroke={solenoidValves.sv2.active ? '#16A3A0' : '#DC2626'} strokeWidth="1" />
            <text x="439" y="311" textAnchor="middle" className="text-[8px] font-extrabold fill-slate-800">SV2 (NO)</text>
          </g>

          {/* SV3 (NC) */}
          <g className="cursor-pointer">
            <rect x="660" y="300" width="38" height="15" rx="3" fill="#FFFFFF" stroke={solenoidValves.sv3.active ? '#16A3A0' : '#DC2626'} strokeWidth="1" />
            <text x="679" y="311" textAnchor="middle" className="text-[8px] font-extrabold fill-slate-800">SV3 (NC)</text>
          </g>

          {/* ─── COLD WATER STREAM (SHELL SIDE) ─── */}
          {isCounter ? (
            <>
              <path d="M690,380 L690,280" fill="none" stroke={`url(#coldFlowGrad_${diagramMode})`} strokeWidth="6" className="animate-flow-cold-reverse" />
              <polygon points="690,280 684,292 696,292" fill="#06B6D4" />

              <path d="M450,140 L450,70 L520,70" fill="none" stroke="#06B6D4" strokeWidth="5" strokeDasharray="6 4" />
              <polygon points="525,70 513,65 513,75" fill="#06B6D4" />

              <path d="M670,250 C630,265 590,230 550,250 C510,265 470,230 440,160" fill="none" stroke="#06B6D4" strokeWidth="3" strokeDasharray="4 4" opacity="0.8" />
              <polygon points="610,255 620,250 620,260" fill="#06B6D4" />
              <polygon points="510,250 520,245 520,255" fill="#06B6D4" />

              <text x="690" y="415" textAnchor="middle" className="text-[10px] font-extrabold fill-cyan-700">❄️ Air Dingin (Cold Water In)</text>
              <text x="450" y="55" textAnchor="middle" className="text-[9px] font-extrabold fill-sky-700">Cold Outlet Out ➔</text>
            </>
          ) : (
            <>
              <path d="M450,380 L450,280" fill="none" stroke={`url(#coldFlowGrad_${diagramMode})`} strokeWidth="6" className="animate-flow-cold-forward" />
              <polygon points="450,280 444,292 456,292" fill="#06B6D4" />

              <path d="M690,140 L690,70 L760,70" fill="none" stroke="#06B6D4" strokeWidth="5" strokeDasharray="6 4" />
              <polygon points="765,70 753,65 753,75" fill="#06B6D4" />

              <path d="M470,250 C510,265 550,230 590,250 C630,265 670,230 680,160" fill="none" stroke="#06B6D4" strokeWidth="3" strokeDasharray="4 4" opacity="0.8" />
              <polygon points="510,255 500,250 500,260" fill="#06B6D4" />
              <polygon points="610,250 600,245 600,255" fill="#06B6D4" />

              <text x="450" y="415" textAnchor="middle" className="text-[10px] font-extrabold fill-cyan-700">❄️ Air Dingin (Cold Water In)</text>
              <text x="690" y="55" textAnchor="middle" className="text-[9px] font-extrabold fill-sky-700">Cold Outlet Out ➔</text>
            </>
          )}

          {/* TI3 & TI4 */}
          <g
            className="cursor-pointer transition hover:scale-110"
            onMouseEnter={() => onHoverSensor?.('TI3')}
            onMouseLeave={() => onHoverSensor?.(null)}
          >
            <circle cx={isCounter ? '690' : '450'} cy="340" r="14" fill="#06B6D4" stroke="#FFFFFF" strokeWidth="2.5" />
            <text x={isCounter ? '690' : '450'} y="344" textAnchor="middle" className="text-[9px] font-extrabold fill-white">TI3</text>
            <rect x={isCounter ? '662' : '422'} y="360" width="56" height="18" rx="5" fill="#FFFFFF" stroke="#06B6D4" strokeWidth="1.5" />
            <text x={isCounter ? '690' : '450'} y="373" textAnchor="middle" className="text-[10px] font-extrabold fill-slate-900">{latestData.ti3}°C</text>
          </g>

          <g
            className="cursor-pointer transition hover:scale-110"
            onMouseEnter={() => onHoverSensor?.('TI4')}
            onMouseLeave={() => onHoverSensor?.(null)}
          >
            <circle cx={isCounter ? '450' : '690'} cy="90" r="14" fill="#0284C7" stroke="#FFFFFF" strokeWidth="2.5" />
            <text x={isCounter ? '450' : '690'} y="94" textAnchor="middle" className="text-[9px] font-extrabold fill-white">TI4</text>
            <rect x={isCounter ? '422' : '662'} y="110" width="56" height="18" rx="5" fill="#FFFFFF" stroke="#0284C7" strokeWidth="1.5" />
            <text x={isCounter ? '450' : '690'} y="123" textAnchor="middle" className="text-[10px] font-extrabold fill-slate-900">{latestData.ti4}°C</text>
          </g>

          {/* TI5 & TI6 */}
          <g
            className="cursor-pointer"
            onMouseEnter={() => onHoverSensor?.('TI5')}
            onMouseLeave={() => onHoverSensor?.(null)}
          >
            <circle cx="520" cy="210" r="11" fill="#0284C7" stroke="#FFFFFF" strokeWidth="2" />
            <text x="520" y="213" textAnchor="middle" className="text-[8px] font-bold fill-white">TI5</text>
            <text x="520" y="232" textAnchor="middle" className="text-[9px] font-bold fill-slate-700">{latestData.ti5}°C</text>
          </g>

          <g
            className="cursor-pointer"
            onMouseEnter={() => onHoverSensor?.('TI6')}
            onMouseLeave={() => onHoverSensor?.(null)}
          >
            <circle cx="620" cy="210" r="11" fill="#0284C7" stroke="#FFFFFF" strokeWidth="2" />
            <text x="620" y="213" textAnchor="middle" className="text-[8px] font-bold fill-white">TI6</text>
            <text x="620" y="232" textAnchor="middle" className="text-[9px] font-bold fill-slate-700">{latestData.ti6}°C</text>
          </g>

          {/* TI2 (Hot Outlet Temp Sensor - Heater 2 Output) */}
          <g
            className="cursor-pointer transition hover:scale-110"
            onMouseEnter={() => onHoverSensor?.('TI2')}
            onMouseLeave={() => onHoverSensor?.(null)}
          >
            <line x1="745" y1="330" x2="745" y2="355" stroke="#F97316" strokeWidth="2" />
            <circle cx="745" cy="365" r="14" fill="#F97316" stroke="#FFFFFF" strokeWidth="2.5" />
            <text x="745" y="369" textAnchor="middle" className="text-[9px] font-extrabold fill-white">TI2</text>
            <rect x="717" y="388" width="56" height="18" rx="5" fill="#FFFFFF" stroke="#F97316" strokeWidth="1.5" />
            <text x="745" y="401" textAnchor="middle" className="text-[10px] font-extrabold fill-slate-900">{latestData.ti2}°C</text>
          </g>

          {/* P2 Pressure Transducer */}
          <g
            className="cursor-pointer"
            onMouseEnter={() => onHoverSensor?.('PI2')}
            onMouseLeave={() => onHoverSensor?.(null)}
          >
            <line x1="550" y1="380" x2="550" y2="405" stroke="#94A3B8" strokeWidth="2" strokeDasharray="3 3" />
            <circle cx="550" cy="415" r="14" fill="#FFFFFF" stroke="#0284C7" strokeWidth="2.5" />
            <text x="550" y="419" textAnchor="middle" className="text-[9px] font-extrabold fill-[#0284C7]">P2</text>
            <rect x="525" y="432" width="50" height="16" rx="4" fill="#F1F5F9" stroke="#0284C7" strokeWidth="1" />
            <text x="550" y="444" textAnchor="middle" className="text-[9px] font-extrabold fill-slate-800">{latestData.pi2} atm-g</text>
          </g>

          {/* Delta P Indicator */}
          <g className="cursor-pointer">
            <rect x="340" y="415" width="130" height="24" rx="8" fill="#EFF6FF" stroke="#3B82F6" strokeWidth="1.5" />
            <text x="405" y="431" textAnchor="middle" className="text-[10px] font-extrabold fill-blue-900">
              ΔP (P1 - P2) = {deltaPHot} atm-g
            </text>
          </g>
        </svg>
      </div>

      {/* Thermal Summary Bar */}
      <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs shadow-sm">
        <div>
          <span className="text-[10px] font-semibold text-slate-400 block">Penurunan Hot Fluid (ΔT_hot):</span>
          <strong className="text-orange-600 font-extrabold text-sm">{(latestData.ti1 - latestData.ti2).toFixed(1)} °C</strong>
        </div>
        <div>
          <span className="text-[10px] font-semibold text-slate-400 block">Kenaikan Cold Fluid (ΔT_cold):</span>
          <strong className="text-cyan-600 font-extrabold text-sm">{(latestData.ti4 - latestData.ti3).toFixed(1)} °C</strong>
        </div>
        <div>
          <span className="text-[10px] font-semibold text-slate-400 block">Estimasi LMTD ({diagramMode}):</span>
          <strong className="text-sky-700 font-extrabold text-sm">{lmtdVal.toFixed(2)} °C</strong>
        </div>
        <div>
          <span className="text-[10px] font-semibold text-slate-400 block">Status Katup Solenoid:</span>
          <span
            className={`inline-block font-extrabold text-[11px] px-2 py-0.5 rounded ${
              isCounter ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-sky-100 text-sky-800 border border-sky-200'
            }`}
          >
            {isCounter ? 'Fail-Safe Pasif (SV1&3 OFF, SV2&4 ON)' : 'Active Co-Current (SV1&3 ON, SV2&4 OFF)'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PidDiagram;
