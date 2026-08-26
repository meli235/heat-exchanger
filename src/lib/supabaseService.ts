import {
  TelemetryRow,
  DeviceControlsRow
} from '@/types';
import { getStoredAnonKey } from './supabase';

/**
 * Mengambil data telemetri awal dari Supabase (via Server Proxy API)
 */
export async function fetchLatestTelemetry(limit: number = 20): Promise<{ data: TelemetryRow[] | null; error: Error | null }> {
  try {
    const customKey = getStoredAnonKey();
    const headers: Record<string, string> = {};
    if (customKey && customKey.trim().length > 10) {
      headers['x-supabase-key'] = customKey.trim();
    }

    const res = await fetch(`/api/supabase/telemetry?limit=${limit}`, { cache: 'no-store', headers });
    const json = await res.json();

    if (!res.ok || json.error) {
      const errMsg = json.error || 'Failed to fetch telemetry';
      return { data: null, error: new Error(errMsg) };
    }

    return { data: json.data as TelemetryRow[], error: null };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error during fetchLatestTelemetry';
    return { data: null, error: new Error(errorMsg) };
  }
}

/**
 * Mengambil status kontrol perangkat saat ini (Row ID = 1 via Server Proxy API)
 */
export async function fetchDeviceControls(): Promise<{ data: DeviceControlsRow | null; error: Error | null }> {
  try {
    const customKey = getStoredAnonKey();
    const headers: Record<string, string> = {};
    if (customKey && customKey.trim().length > 10) {
      headers['x-supabase-key'] = customKey.trim();
    }

    const res = await fetch('/api/supabase/controls', { cache: 'no-store', headers });
    const json = await res.json();

    if (!res.ok || json.error) {
      const errMsg = json.error || 'Failed to fetch device_controls';
      return { data: null, error: new Error(errMsg) };
    }

    return { data: json.data as DeviceControlsRow, error: null };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error during fetchDeviceControls';
    return { data: null, error: new Error(errorMsg) };
  }
}

/**
 * Menulis / Meng-update Perintah Kontrol ke tabel device_controls (row id = 1 via Server Proxy API)
 */
export async function updateDeviceControls(
  updates: Partial<Omit<DeviceControlsRow, 'id'>>
): Promise<{ success: boolean; data: DeviceControlsRow | null; error: string | null }> {
  try {
    const customKey = getStoredAnonKey();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (customKey && customKey.trim().length > 10) {
      headers['x-supabase-key'] = customKey.trim();
    }

    const res = await fetch('/api/supabase/controls', {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates)
    });

    const json = await res.json();

    if (!res.ok || !json.success) {
      const errMsg = json.error || 'Failed to update device_controls';
      return { success: false, data: null, error: errMsg };
    }

    return { success: true, data: json.data as DeviceControlsRow, error: null };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Koneksi gagal saat memperbarui perintah kontrol';
    return { success: false, data: null, error: errorMsg };
  }
}

/**
 * Helper Spesifik Kontrol Sesuai Spesifikasi Prompt
 */
export const supabaseControlService = {
  // 1. Switch Mode Aliran ("COUNTER" / "CO-CURRENT")
  setFlowMode: async (flowMode: 'COUNTER' | 'CO-CURRENT') => {
    return updateDeviceControls({ flow_mode: flowMode });
  },

  // 2. Switch Control Mode ("AUTO" / "MANUAL")
  setControlMode: async (controlMode: 'AUTO' | 'MANUAL') => {
    return updateDeviceControls({ control_mode: controlMode });
  },

  // 3. Tombol Heater 1 & 2 Power Terpisah (boolean true / false)
  setHeater1Power: async (status: boolean) => {
    return updateDeviceControls({ heater_status: status, btn_onoff: status, control_mode: 'MANUAL' });
  },

  setHeater2Power: async (status: boolean) => {
    return updateDeviceControls({ heater_status: status, btn_onoff: status, control_mode: 'MANUAL' });
  },

  setHeaterPower: async (heaterStatus: boolean) => {
    return updateDeviceControls({ heater_status: heaterStatus, btn_onoff: heaterStatus, control_mode: 'MANUAL' });
  },

  // 4. Slider/Input Target Suhu (float, e.g. 62.5)
  setTargetTemp: async (targetTemp: number) => {
    const parsedFloat = parseFloat(targetTemp.toFixed(1));
    return updateDeviceControls({ target_temp: parsedFloat });
  },

  // 5. Slider/Input Sudut Servo (0 - 180 Derajat, integer e.g. 52)
  setServoAngle: async (servoAngle: number) => {
    const parsedInt = Math.min(180, Math.max(0, Math.round(servoAngle)));
    return updateDeviceControls({ servo_angle: parsedInt });
  },

  // 6. Slider/Input Target Flow (0.0 - 10.0 L/min, float)
  setTargetFlow: async (targetFlow: number) => {
    const parsedFloat = parseFloat(Math.min(10.0, Math.max(0.0, targetFlow)).toFixed(1));
    return updateDeviceControls({ target_flow: parsedFloat });
  },

  // 7. Toggle Katup Uap Manual & Otomatis Berjadwal
  setUapStatus: async (uapStatus: boolean) => {
    return updateDeviceControls({ uap_status: uapStatus });
  },

  setUapAutoStatus: async (uapAutoStatus: boolean) => {
    return updateDeviceControls({ uap_auto_status: uapAutoStatus });
  },

  setUapIntervalMin: async (intervalMin: number) => {
    return updateDeviceControls({ uap_interval_min: intervalMin });
  },

  // 8. Toggle Katup Air Dingin (boolean true / false)
  setAirDinginStatus: async (airDinginStatus: boolean) => {
    return updateDeviceControls({ air_dingin: airDinginStatus });
  },

  // 9. Momentary Servo Buttons UP/DOWN (Rising edge pulse 200ms: true -> wait 200ms -> false)
  triggerStepButton: async (btnName: 'btn_up' | 'btn_down') => {
    try {
      const startRes = await updateDeviceControls({ [btnName]: true });
      if (!startRes.success) return startRes;

      await new Promise((resolve) => setTimeout(resolve, 300));
    } catch (err) {
      console.warn(`Step button pulse start notice (${btnName}):`, err);
    } finally {
      return await updateDeviceControls({ [btnName]: false });
    }
  },

  triggerMomentaryButton: async (btnName: 'btn_up' | 'btn_onoff' | 'btn_down') => {
    try {
      const startRes = await updateDeviceControls({ [btnName]: true });
      if (!startRes.success) return startRes;

      await new Promise((resolve) => setTimeout(resolve, 300));
    } catch (err) {
      console.warn(`Momentary button pulse start notice (${btnName}):`, err);
    } finally {
      return await updateDeviceControls({ [btnName]: false });
    }
  }
};

export { useSupabaseIntegration } from '@/hooks/useSupabaseIntegration';

