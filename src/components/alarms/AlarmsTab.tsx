'use client';

import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { AlarmEvent } from '@/types';
import { AlarmSettings } from './AlarmSettings';

export interface AlarmsTabProps {
  ti1MaxThreshold: number;
  setTi1MaxThreshold: (val: number) => void;
  deltaPMaxThreshold: number;
  setDeltaPMaxThreshold: (val: number) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  alarmLogs: AlarmEvent[];
  setAlarmLogs: (logs: AlarmEvent[]) => void;
}

export const AlarmsTab: React.FC<AlarmsTabProps> = ({
  ti1MaxThreshold,
  setTi1MaxThreshold,
  deltaPMaxThreshold,
  setDeltaPMaxThreshold,
  soundEnabled,
  setSoundEnabled,
  alarmLogs,
  setAlarmLogs
}) => {
  return (
    <div className="space-y-6">
      <div className="asklepios-card p-6 bg-white">
        <h2 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-red-600" /> Alarm & Siren Management System
        </h2>
        <p className="text-xs text-slate-500 mb-6">Konfigurasi nilai ambang batas kritis (threshold) dan riwayat log peringatan</p>

        <AlarmSettings
          ti1MaxThreshold={ti1MaxThreshold}
          setTi1MaxThreshold={setTi1MaxThreshold}
          deltaPMaxThreshold={deltaPMaxThreshold}
          setDeltaPMaxThreshold={setDeltaPMaxThreshold}
          soundEnabled={soundEnabled}
          setSoundEnabled={setSoundEnabled}
          alarmLogs={alarmLogs}
          onAcknowledgeAlarm={(id) => {
            setAlarmLogs(alarmLogs.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)));
          }}
        />
      </div>
    </div>
  );
};
export default AlarmsTab;
