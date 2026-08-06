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
 * Mengambil data telemetri awal dari Supabase
 */
export async function fetchLatestTelemetry(limit: number = 20): Promise<{ data: TelemetryRow[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('telemetry_data')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('[Supabase Warn] fetch telemetry_data status:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    const sortedData = (data as TelemetryRow[] || []).reverse();
    return { data: sortedData, error: null };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error during fetchLatestTelemetry';
    console.warn('[Supabase Exception] fetchLatestTelemetry:', errorMsg);
    return { data: null, error: new Error(errorMsg) };
  }
}

/**
 * Mengambil status kontrol perangkat saat ini (Row ID = 1)
 */
export async function fetchDeviceControls(): Promise<{ data: DeviceControlsRow | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('device_controls')
      .select('*')
      .eq('id', 1)
      .single();

    if (error) {
      console.warn('[Supabase Warn] fetch device_controls status:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as DeviceControlsRow, error: null };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error during fetchDeviceControls';
    console.warn('[Supabase Exception] fetchDeviceControls:', errorMsg);
    return { data: null, error: new Error(errorMsg) };
  }
}

/**
 * Menulis / Meng-update Perintah Kontrol ke tabel device_controls (row id = 1)
 */
export async function updateDeviceControls(
  updates: Partial<Omit<DeviceControlsRow, 'id'>>
): Promise<{ success: boolean; data: DeviceControlsRow | null; error: string | null }> {
  try {
    const payload = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('device_controls')
      .update(payload)
      .eq('id', 1)
      .select('*')
      .single();

    if (error) {
      console.warn('[Supabase Control Update Warn]:', error.message);
      return { success: false, data: null, error: error.message };
    }

    return { success: true, data: data as DeviceControlsRow, error: null };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Koneksi gagal saat memperbarui perintah kontrol';
    console.warn('[Supabase Control Exception]:', errorMsg);
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
    servo_angle: 45
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

  return {
    connectionStatus,
    errorMessage,
    currentAnonKey,
    saveAnonKey,
    latestTelemetry,
    telemetryStream,
    deviceControls,
    isUpdatingControl,
    initializeData,
    handleFlowModeChange,
    handleControlModeChange,
    handleHeaterPowerToggle,
    handleTargetTempChange,
    handleServoAngleChange
  };
}
