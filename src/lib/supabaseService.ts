import { useState, useEffect, useCallback } from 'react';
import {
  supabase,
  setSupabaseAnonKey,
  getStoredAnonKey,
  TelemetryRow,
  DeviceControlsRow,
  SupabaseConnectionStatus
} from './supabase';

/**
 * Mengambil data telemetri awal dari Supabase (via Server Proxy API)
 */
export async function fetchLatestTelemetry(limit: number = 20): Promise<{ data: TelemetryRow[] | null; error: Error | null }> {
  try {
    const res = await fetch(`/api/supabase/telemetry?limit=${limit}`, { cache: 'no-store' });
    const json = await res.json();

    if (!res.ok || json.error) {
      const errMsg = json.error || 'Failed to fetch telemetry';
      console.warn('[Supabase API Warn] fetch telemetry_data status:', errMsg);
      return { data: null, error: new Error(errMsg) };
    }

    return { data: json.data as TelemetryRow[], error: null };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error during fetchLatestTelemetry';
    console.warn('[Supabase API Exception] fetchLatestTelemetry:', errorMsg);
    return { data: null, error: new Error(errorMsg) };
  }
}

/**
 * Mengambil status kontrol perangkat saat ini (Row ID = 1 via Server Proxy API)
 */
export async function fetchDeviceControls(): Promise<{ data: DeviceControlsRow | null; error: Error | null }> {
  try {
    const res = await fetch('/api/supabase/controls', { cache: 'no-store' });
    const json = await res.json();

    if (!res.ok || json.error) {
      const errMsg = json.error || 'Failed to fetch device_controls';
      console.warn('[Supabase API Warn] fetch device_controls status:', errMsg);
      return { data: null, error: new Error(errMsg) };
    }

    return { data: json.data as DeviceControlsRow, error: null };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error during fetchDeviceControls';
    console.warn('[Supabase API Exception] fetchDeviceControls:', errorMsg);
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
    const res = await fetch('/api/supabase/controls', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });

    const json = await res.json();

    if (!res.ok || !json.success) {
      const errMsg = json.error || 'Failed to update device_controls';
      console.warn('[Supabase API Control Update Warn]:', errMsg);
      return { success: false, data: null, error: errMsg };
    }

    return { success: true, data: json.data as DeviceControlsRow, error: null };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Koneksi gagal saat memperbarui perintah kontrol';
    console.warn('[Supabase API Control Exception]:', errorMsg);
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

  // 3. Tombol Heater Power (boolean true / false)
  setHeaterPower: async (heaterStatus: boolean) => {
    return updateDeviceControls({ heater_status: heaterStatus });
  },

  // 4. Slider/Input Target Suhu (float, e.g. 50.0)
  setTargetTemp: async (targetTemp: number) => {
    const parsedFloat = parseFloat(targetTemp.toFixed(1));
    return updateDeviceControls({ target_temp: parsedFloat });
  },

  // 5. Slider/Input Sudut Servo (0 - 90 Derajat, integer e.g. 45)
  setServoAngle: async (servoAngle: number) => {
    const parsedInt = Math.min(90, Math.max(0, Math.round(servoAngle)));
    return updateDeviceControls({ servo_angle: parsedInt });
  },

  // 6. Slider/Input Target Flow (0.0 - 10.0 L/min, float)
  setTargetFlow: async (targetFlow: number) => {
    const parsedFloat = parseFloat(Math.min(10.0, Math.max(0.0, targetFlow)).toFixed(1));
    return updateDeviceControls({ target_flow: parsedFloat });
  },

  // 7. Toggle Katup Uap (boolean true / false)
  setUapStatus: async (uapStatus: boolean) => {
    return updateDeviceControls({ uap_status: uapStatus });
  },

  // 8. Toggle Katup Air Dingin (boolean true / false)
  setAirDinginStatus: async (airDinginStatus: boolean) => {
    return updateDeviceControls({ air_dingin: airDinginStatus });
  },

  // 9. Momentary Servo Buttons (Edge Detection: true -> wait 1500ms -> false)
  triggerMomentaryButton: async (btnName: 'btn_up' | 'btn_onoff' | 'btn_down') => {
    try {
      const startRes = await updateDeviceControls({ [btnName]: true });
      if (!startRes.success) return startRes;

      await new Promise((resolve) => setTimeout(resolve, 1500));
    } catch (err) {
      console.warn(`Momentary button pulse start notice (${btnName}):`, err);
    } finally {
      return await updateDeviceControls({ [btnName]: false });
    }
  }
};

/**
 * Custom Hook untuk Integrasi Real-Time Telemetri & Kontrol Dua Arah
 */
export function useSupabaseIntegration() {
  const [connectionStatus, setConnectionStatus] = useState<SupabaseConnectionStatus>('CONNECTING');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentAnonKey, setCurrentAnonKey] = useState<string>('');
  const [latestTelemetry, setLatestTelemetry] = useState<TelemetryRow | null>(null);
  const [telemetryStream, setTelemetryStream] = useState<TelemetryRow[]>([]);
  const [deviceControls, setDeviceControls] = useState<DeviceControlsRow>({
    id: 1,
    flow_mode: 'COUNTER',
    control_mode: 'MANUAL',
    heater_status: true,
    target_temp: 50.0,
    target_flow: 5.0,
    servo_angle: 45,
    uap_status: false,
    air_dingin: false,
    btn_up: false,
    btn_onoff: false,
    btn_down: false
  });
  const [activeMomentaryButtons, setActiveMomentaryButtons] = useState<{ btn_up: boolean; btn_onoff: boolean; btn_down: boolean }>({
    btn_up: false,
    btn_onoff: false,
    btn_down: false
  });
  const [isUpdatingControl, setIsUpdatingControl] = useState<boolean>(false);

  useEffect(() => {
    setCurrentAnonKey(getStoredAnonKey());
  }, []);

  // Initial Fetch Data (Telemetry & Controls)
  const initializeData = useCallback(async () => {
    setConnectionStatus('CONNECTING');
    setErrorMessage(null);

    const activeKey = getStoredAnonKey();
    if (!activeKey || activeKey.includes('YOUR_SUPABASE') || activeKey.includes('INVALID_KEY') || activeKey.trim().length < 10) {
      setErrorMessage('Supabase Anon Key belum diisi atau tidak valid. Silakan masukkan Public Anon Key Anda di bawah ini.');
      setConnectionStatus('ERROR');
      return;
    }

    try {
      // 1. Fetch initial telemetry
      const { data: initialTelemetry, error: telemetryErr } = await fetchLatestTelemetry(20);
      if (telemetryErr) {
        if (telemetryErr.message.includes('Invalid API key') || telemetryErr.message.includes('apiKey')) {
          setErrorMessage('Supabase Anon Key tidak valid atau salah. Silakan masukkan Public Anon Key yang benar dari Supabase Dashboard.');
        } else {
          setErrorMessage(`Gagal membaca telemetry_data: ${telemetryErr.message}`);
        }
        setConnectionStatus('ERROR');
      } else if (initialTelemetry && initialTelemetry.length > 0) {
        setTelemetryStream(initialTelemetry);
        setLatestTelemetry(initialTelemetry[initialTelemetry.length - 1]);
        setConnectionStatus('ONLINE');
      }

      // 2. Fetch initial device controls
      const { data: controlsData, error: controlsErr } = await fetchDeviceControls();
      if (controlsErr) {
        if (!telemetryErr) {
          setErrorMessage(`Gagal membaca device_controls (Row ID=1): ${controlsErr.message}`);
        }
      } else if (controlsData) {
        setDeviceControls(controlsData);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menghubungkan ke Supabase';
      setErrorMessage(msg);
      setConnectionStatus('ERROR');
    }
  }, []);

  // Function to save new Anon Key dynamically from UI
  const saveAnonKey = (newKey: string) => {
    setSupabaseAnonKey(newKey);
    setCurrentAnonKey(newKey.trim());
    initializeData();
  };

  // Realtime Subscription Setup for telemetry_data & device_controls
  useEffect(() => {
    initializeData();

    // 1. Telemetry Data Subscription (INSERT event)
    const telemetryChannel = supabase
      .channel('telemetry_realtime_channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'telemetry_data' },
        (payload) => {
          const newRow = payload.new as TelemetryRow;
          setLatestTelemetry(newRow);
          setTelemetryStream((prev) => {
            const updated = [...prev, newRow];
            return updated.slice(-30);
          });
          setConnectionStatus('ONLINE');
          setErrorMessage(null);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('ONLINE');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          // If error was key related, keep error
        }
      });

    // 2. Device Controls Realtime Sync Subscription (UPDATE event on row id = 1)
    const controlsChannel = supabase
      .channel('device_controls_realtime_channel')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'device_controls' },
        (payload) => {
          const updatedControls = payload.new as DeviceControlsRow;
          if (updatedControls && updatedControls.id === 1) {
            setDeviceControls(updatedControls);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(telemetryChannel);
      supabase.removeChannel(controlsChannel);
    };
  }, [initializeData]);

  // Handlers untuk Dispatch Command Write dengan Try-Catch & Feedback State
  const handleFlowModeChange = async (flowMode: 'COUNTER' | 'CO-CURRENT') => {
    setIsUpdatingControl(true);
    setDeviceControls((prev) => ({ ...prev, flow_mode: flowMode }));
    const result = await supabaseControlService.setFlowMode(flowMode);
    setIsUpdatingControl(false);
    if (!result.success) {
      setErrorMessage(`Gagal update flow_mode: ${result.error}`);
    } else {
      setErrorMessage(null);
    }
    return result;
  };

  const handleControlModeChange = async (controlMode: 'AUTO' | 'MANUAL') => {
    setIsUpdatingControl(true);
    setDeviceControls((prev) => ({ ...prev, control_mode: controlMode }));
    const result = await supabaseControlService.setControlMode(controlMode);
    setIsUpdatingControl(false);
    if (!result.success) {
      setErrorMessage(`Gagal update control_mode: ${result.error}`);
    } else {
      setErrorMessage(null);
    }
    return result;
  };

  const handleHeaterPowerToggle = async (heaterStatus: boolean) => {
    setIsUpdatingControl(true);
    setDeviceControls((prev) => ({ ...prev, heater_status: heaterStatus }));
    const result = await supabaseControlService.setHeaterPower(heaterStatus);
    setIsUpdatingControl(false);
    if (!result.success) {
      setErrorMessage(`Gagal update heater_status: ${result.error}`);
    } else {
      setErrorMessage(null);
    }
    return result;
  };

  const handleTargetTempChange = async (targetTemp: number) => {
    setIsUpdatingControl(true);
    setDeviceControls((prev) => ({ ...prev, target_temp: targetTemp }));
    const result = await supabaseControlService.setTargetTemp(targetTemp);
    setIsUpdatingControl(false);
    if (!result.success) {
      setErrorMessage(`Gagal update target_temp: ${result.error}`);
    } else {
      setErrorMessage(null);
    }
    return result;
  };

  const handleServoAngleChange = async (servoAngle: number) => {
    setIsUpdatingControl(true);
    setDeviceControls((prev) => ({ ...prev, servo_angle: servoAngle }));
    const result = await supabaseControlService.setServoAngle(servoAngle);
    setIsUpdatingControl(false);
    if (!result.success) {
      setErrorMessage(`Gagal update servo_angle: ${result.error}`);
    } else {
      setErrorMessage(null);
    }
    return result;
  };

  const handleTargetFlowChange = async (targetFlow: number) => {
    setIsUpdatingControl(true);
    setDeviceControls((prev) => ({ ...prev, target_flow: targetFlow }));
    const result = await supabaseControlService.setTargetFlow(targetFlow);
    setIsUpdatingControl(false);
    if (!result.success) {
      setErrorMessage(`Gagal update target_flow: ${result.error}`);
    } else {
      setErrorMessage(null);
    }
    return result;
  };

  const handleUapStatusToggle = async (uapStatus: boolean) => {
    setIsUpdatingControl(true);
    setDeviceControls((prev) => ({ ...prev, uap_status: uapStatus }));
    const result = await supabaseControlService.setUapStatus(uapStatus);
    setIsUpdatingControl(false);
    if (!result.success) {
      setErrorMessage(`Gagal update uap_status: ${result.error}`);
    } else {
      setErrorMessage(null);
    }
    return result;
  };

  const handleAirDinginToggle = async (airDinginStatus: boolean) => {
    setIsUpdatingControl(true);
    setDeviceControls((prev) => ({ ...prev, air_dingin: airDinginStatus }));
    const result = await supabaseControlService.setAirDinginStatus(airDinginStatus);
    setIsUpdatingControl(false);
    if (!result.success) {
      setErrorMessage(`Gagal update air_dingin: ${result.error}`);
    } else {
      setErrorMessage(null);
    }
    return result;
  };

  const handleMomentaryButtonPress = async (btnName: 'btn_up' | 'btn_onoff' | 'btn_down') => {
    setIsUpdatingControl(true);
    setActiveMomentaryButtons((prev) => ({ ...prev, [btnName]: true }));
    setDeviceControls((prev) => ({ ...prev, [btnName]: true }));

    const result = await supabaseControlService.triggerMomentaryButton(btnName);
    
    setActiveMomentaryButtons((prev) => ({ ...prev, [btnName]: false }));
    setDeviceControls((prev) => ({ ...prev, [btnName]: false }));
    setIsUpdatingControl(false);

    if (!result.success) {
      setErrorMessage(`Gagal memicu tombol servo ${btnName}: ${result.error}`);
    } else {
      setErrorMessage(null);
    }
    return result;
  };

  return {
    connectionStatus,
    errorMessage,
    currentAnonKey,
    saveAnonKey,
    latestTelemetry,
    telemetryStream,
    deviceControls,
    activeMomentaryButtons,
    isUpdatingControl,
    initializeData,
    handleFlowModeChange,
    handleControlModeChange,
    handleHeaterPowerToggle,
    handleTargetTempChange,
    handleServoAngleChange,
    handleTargetFlowChange,
    handleUapStatusToggle,
    handleAirDinginToggle,
    handleMomentaryButtonPress
  };
}
