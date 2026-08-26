'use client';

import React from 'react';
import {
  Volume2,
  VolumeX,
  Bell,
  CheckCircle2
} from 'lucide-react';
import { AlarmEvent } from '@/types';

export interface AlarmSettingsProps {
  ti1MaxThreshold: number;
  setTi1MaxThreshold: (val: number) => void;
  deltaPMaxThreshold: number;
  setDeltaPMaxThreshold: (val: number) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  alarmLogs: AlarmEvent[];
  onAcknowledgeAlarm: (id: string) => void;
}

export const AlarmSettings: React.FC<AlarmSettingsProps> = ({
  ti1MaxThreshold,
  setTi1MaxThreshold,
  deltaPMaxThreshold,
  setDeltaPMaxThreshold,
  soundEnabled,
  setSoundEnabled,
  alarmLogs,
  onAcknowledgeAlarm
}) => {
  return (
    <div>
      <div id="tour-alarm-settings" className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Threshold Suhu Kritis (TI1 Hot Inlet)</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.5"
              value={ti1MaxThreshold}
              onChange={(e) => setTi1MaxThreshold(Number(e.target.value))}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800"
            />
            <span className="text-xs text-slate-500 font-semibold">°C</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Threshold Max Pressure Drop (ΔP Hot)</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.1"
              min="0"
              max="2.0"
              value={deltaPMaxThreshold}
              onChange={(e) => setDeltaPMaxThreshold(Number(e.target.value))}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800"
            />
            <span className="text-xs text-slate-500 font-semibold">atm-g</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">Maksimal operasi 2,0 atm-g (ambang aman pompa: 1,5–2,0 atm-g)</p>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Status Sound Siren Audio</label>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`w-full py-2 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${soundEnabled
              ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
              : 'bg-slate-200 text-slate-600'
              }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            {soundEnabled ? 'Siren Audio Aktif' : 'Siren Audio Mute'}
          </button>
        </div>
      </div>

      <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
        <Bell className="w-4 h-4 text-slate-600" /> Riwayat Log Kejadian Alarm
      </h3>

      <div className="overflow-x-auto border border-slate-200/80 rounded-2xl">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
              <th className="p-3">ID Alarm</th>
              <th className="p-3">Waktu</th>
              <th className="p-3">Sensor</th>
              <th className="p-3">Metrik Deskripsi</th>
              <th className="p-3">Nilai Real-time</th>
              <th className="p-3">Batas Aman</th>
              <th className="p-3">Tingkat Bahaya</th>
              <th className="p-3">Aksi Acknowledge</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {alarmLogs.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/80 transition">
                <td className="p-3 font-mono font-bold text-slate-700">{item.id}</td>
                <td className="p-3 text-slate-600">{item.timestamp}</td>
                <td className="p-3 font-bold text-slate-900">{item.sensor}</td>
                <td className="p-3 text-slate-600">{item.metric}</td>
                <td className="p-3 font-bold text-red-600">{item.value}</td>
                <td className="p-3 text-slate-500">{item.threshold}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.severity === 'Critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                    {item.severity}
                  </span>
                </td>
                <td className="p-3">
                  {item.acknowledged ? (
                    <span className="text-emerald-600 font-semibold flex items-center gap-1 text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Dikonfirmasi
                    </span>
                  ) : (
                    <button
                      onClick={() => onAcknowledgeAlarm(item.id)}
                      className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-[10px] font-bold"
                    >
                      Konfirmasi
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default AlarmSettings;
