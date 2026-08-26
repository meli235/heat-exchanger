import { useState, useEffect, useCallback } from 'react';
import {
  supabase,
  setSupabaseAnonKey,
  getStoredAnonKey
} from '@/lib/supabase';
import {
  TelemetryRow,
  DeviceControlsRow,
  SupabaseConnectionStatus
} from '@/types';
import {
  fetchLatestTelemetry,
  fetchDeviceControls,
  supabaseControlService
} from '@/lib/supabaseService';

/**
 * Custom Hook untuk Integrasi Real-Time Telemetri & Kontrol Dua Arah ESP32 (Supabase)
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

  // Realtime & Hybrid Polling Setup for telemetry_data & device_controls
  useEffect(() => {
    initializeData();

    // Polling Interval Fallback (Setiap 2 Detik) untuk Menjamin Update Real-Time Selalu Tampak
    const pollInterval = setInterval(() => {
      fetchLatestTelemetry(20).then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          setTelemetryStream(data);
          setLatestTelemetry(data[data.length - 1]);
          setConnectionStatus('ONLINE');
          setErrorMessage(null);
        }
      });

      fetchDeviceControls().then(({ data, error }) => {
        if (!error && data) {
          setDeviceControls(data);
        }
      });
    }, 2000);

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
      clearInterval(pollInterval);
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
