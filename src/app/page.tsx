'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useSupabaseIntegration } from '@/lib/supabaseService';
import {
  Droplets,
  Thermometer,
  Gauge,
  Activity,
  Shield,
  ShieldAlert,
  Users,
  Video,
  FileText,
  Sliders,
  Power,
  AlertTriangle,
  CheckCircle2,
  Bell,
  Download,
  Search,
  Filter,
  UserPlus,
  RefreshCw,
  LogOut,
  ChevronRight,
  Eye,
  Camera,
  Play,
  Pause,
  Maximize2,
  Volume2,
  VolumeX,
  X,
  Plus,
  Edit2,
  Trash2,
  Server,
  Layers,
  ArrowRightLeft,
  Sparkles,
  Lock,
  Cpu,
  Info,
  Clock,
  Code,
  Terminal,
  Zap,
  Check
} from 'lucide-react';

// ─── TYPES & INTERFACES ───
type UserRole = 'developer' | 'admin' | 'operator';

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'Active' | 'Inactive';
  lastLogin: string;
}

interface TelemetryPoint {
  timestamp: string;
  ti1: number; // Hot Inlet (°C)
  ti2: number; // Hot Outlet (°C - Monitored at Heater 2 Outlet)
  ti3: number; // Cold Inlet (°C)
  ti4: number; // Cold Outlet (°C)
  ti5: number; // Shell Mid 1 (°C)
  ti6: number; // Shell Mid 2 (°C)
  pi1: number; // Hot Inlet Press (bar)
  pi2: number; // Hot Outlet Press (bar)
  pi3: number; // Cold Inlet Press (bar)
  pi4: number; // Cold Outlet Press (bar)
  fc1: number; // Hot Flow Rate (L/min)
  fc2: number; // Cold Flow Rate (L/min)
  tc1Setpoint: number; // Target Temp (°C)
  heater1Active: boolean; // Dual Heater 1 Status
  heater2Active: boolean; // Dual Heater 2 Status
  mode: 'Counter-Current' | 'Co-Current';
}

interface AlarmEvent {
  id: string;
  timestamp: string;
  sensor: string;
  metric: string;
  value: number;
  threshold: number;
  severity: 'Critical' | 'Warning' | 'Info';
  acknowledged: boolean;
}

export default function FluidHEDashboard() {
  // ─── SUPABASE INTEGRATION HOOK (REALTIME MONITORING & BIDIRECTIONAL CONTROL) ───
  const {
    connectionStatus: supabaseStatus,
    errorMessage: supabaseError,
    currentAnonKey,
    saveAnonKey,
    latestTelemetry: supabaseTelemetry,
    telemetryStream,
    deviceControls: supabaseControls,
    isUpdatingControl,
    handleFlowModeChange,
    handleControlModeChange,
    handleHeaterPowerToggle,
    handleTargetTempChange,
    handleServoAngleChange
  } = useSupabaseIntegration();

  const [inputAnonKey, setInputAnonKey] = useState<string>('');
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);

  // ─── AUTH & ROLE STATE ───
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; role: UserRole }>({
    name: 'Dr. Ir. Budi Santoso',
    email: 'admin@uad.ac.id',
    role: 'admin'
  });
  const [loginEmail, setLoginEmail] = useState<string>('admin@uad.ac.id');
  const [loginPassword, setLoginPassword] = useState<string>('••••••••');
  const [selectedDemoRole, setSelectedDemoRole] = useState<UserRole>('admin');

  // ─── NAVIGATION STATE ───
  const [activeTab, setActiveTab] = useState<'dashboard' | 'control' | 'cctv' | 'logs' | 'alarms' | 'users' | 'developer'>('dashboard');

  // ─── OPERATOR PRACTICE SESSION COUNTDOWN STATE (ADMIN MANAGED) ───
  const [operatorSessionLimit, setOperatorSessionLimit] = useState<number>(30); // minutes
  const [operatorSessionRemaining, setOperatorSessionRemaining] = useState<number>(1800); // seconds
  const [sessionExpiredModal, setSessionExpiredModal] = useState<boolean>(false);

  // ─── CONTROL STATES ───
  const [heaterMasterPower, setHeaterMasterPower] = useState<boolean>(true);
  const [tc1Setpoint, setTc1Setpoint] = useState<number>(65); // 30 - 90 °C
  const [fc1Valve, setFc1Valve] = useState<number>(75); // 0 - 100 % (Hot Valve)
  const [fc2Valve, setFc2Valve] = useState<number>(60); // 0 - 100 % (Cold Valve)
  const [operationMode, setOperationMode] = useState<'Counter-Current' | 'Co-Current'>('Counter-Current');
  const [flowVisViewMode, setFlowVisViewMode] = useState<'single' | 'compare'>('single');
  const [emergencyStopped, setEmergencyStopped] = useState<boolean>(false);

  // ─── SAFETY & WARNING SYSTEM STATES ───
  const [primingNotice, setPrimingNotice] = useState<string | null>(null);
  const [heatingTimerSeconds, setHeatingTimerSeconds] = useState<number>(0);
  const [show1MinWarning, setShow1MinWarning] = useState<boolean>(false);

  // ─── ALARM THRESHOLDS & AUDIO ───
  const [ti1MaxThreshold, setTi1MaxThreshold] = useState<number>(75.0);
  const [deltaPMaxThreshold, setDeltaPMaxThreshold] = useState<number>(0.8);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showAlarmModal, setShowAlarmModal] = useState<boolean>(false);

  // ─── DATA & HISTORY STATES ───
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetryPoint[]>([]);
  const [alarmLogs, setAlarmLogs] = useState<AlarmEvent[]>([
    {
      id: 'ALM-101',
      timestamp: new Date(Date.now() - 3600000).toLocaleTimeString('id-ID'),
      sensor: 'TI1',
      metric: 'Hot Inlet Temperature',
      value: 76.8,
      threshold: 75.0,
      severity: 'Critical',
      acknowledged: true
    },
    {
      id: 'ALM-102',
      timestamp: new Date(Date.now() - 1800000).toLocaleTimeString('id-ID'),
      sensor: 'PI1',
      metric: 'Hot Pressure Drop (P1 - P2)',
      value: 0.85,
      threshold: 0.80,
      severity: 'Warning',
      acknowledged: false
    }
  ]);

  // ─── USER MANAGEMENT STATE (3-TIER: DEVELOPER, ADMIN, OPERATOR) ───
  const [usersList, setUsersList] = useState<UserItem[]>([
    { id: 'USR-01', name: 'Dr. Ir. Budi Santoso (Dosen / KaLab)', email: 'admin@uad.ac.id', role: 'admin', status: 'Active', lastLogin: 'Hari ini, 14:15' },
    { id: 'USR-02', name: 'Rahmat Hidayat (Mahasiswa Operator)', email: 'operator@uad.ac.id', role: 'operator', status: 'Active', lastLogin: 'Hari ini, 13:40' },
    { id: 'USR-03', name: 'Tim Developer Software & IoT', email: 'dev@uad.ac.id', role: 'developer', status: 'Active', lastLogin: 'Hari ini, 11:20' },
    { id: 'USR-04', name: 'Siti Aminah, M.Eng. (Asisten Lab)', email: 'siti.aminah@uad.ac.id', role: 'operator', status: 'Active', lastLogin: 'Kemarin, 16:20' }
  ]);
  const [showAddUserModal, setShowAddUserModal] = useState<boolean>(false);
  const [newUserName, setNewUserName] = useState<string>('');
  const [newUserEmail, setNewUserEmail] = useState<string>('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('operator');

  // ─── DEVELOPER HARDWARE CALIBRATION & MODBUS STATES ───
  const [modbusPort, setModbusPort] = useState<string>('/dev/ttyUSB0 (RS485 Baud 9600 8N1)');
  const [mqttBroker, setMqttBroker] = useState<string>('mqtt://iot.uad.ac.id:1883 (Topic: uad/chemeng/he)');
  const [tempOffset, setTempOffset] = useState<number>(0.0);
  const [pressOffset, setPressOffset] = useState<number>(0.0);

  // ─── CCTV & LAPTOP WEBCAM STATES ───
  const [selectedCamera, setSelectedCamera] = useState<'webcam' | 'cam1' | 'cam2'>('webcam');
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [cctvRecording, setCctvRecording] = useState<boolean>(true);
  const [webcamActive, setWebcamActive] = useState<boolean>(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const webcamVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Enumerate Available Camera Devices
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        const vDevices = devices.filter((d) => d.kind === 'videoinput');
        setVideoDevices(vDevices);
      });
    }
  }, []);

  // HTML5 Webcam Stream Effect
  useEffect(() => {
    if (activeTab === 'cctv' && selectedCamera === 'webcam') {
      if (typeof window !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
        }

        let constraints: MediaStreamConstraints = { video: { facingMode: cameraFacing } };
        if (selectedDeviceId) {
          constraints = { video: { deviceId: { exact: selectedDeviceId } } };
        }

        const startCameraStream = (reqConstraints: MediaStreamConstraints) => {
          navigator.mediaDevices
            .getUserMedia(reqConstraints)
            .then((stream) => {
              mediaStreamRef.current = stream;
              if (webcamVideoRef.current) {
                webcamVideoRef.current.srcObject = stream;
                webcamVideoRef.current.play().catch(() => {});
              }
              setWebcamActive(true);
              setWebcamError(null);

              navigator.mediaDevices.enumerateDevices().then((devs) => {
                setVideoDevices(devs.filter((d) => d.kind === 'videoinput'));
              });
            })
            .catch(() => {
              if (typeof reqConstraints.video === 'object' && reqConstraints.video !== null) {
                startCameraStream({ video: true });
              } else {
                setWebcamActive(false);
                setWebcamError('Akses kamera di-blokir oleh browser. Klik ikon kamera/gembok di Chrome URL bar (localhost:3000) lalu pilih "Izinkan / Allow".');
              }
            });
        };

        startCameraStream(constraints);
      } else {
        setWebcamError('Browser tidak mendukung API kamera HTML5.');
      }
    } else {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      setWebcamActive(false);
    }

    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
    };
  }, [activeTab, selectedCamera, cameraFacing, selectedDeviceId]);

  // ─── DATA LOG FILTER STATES (INCLUDES 30s INTERVAL) ───
  const [logSearchQuery, setLogSearchQuery] = useState<string>('');
  const [logInterval, setLogInterval] = useState<'1s' | '5s' | '30s' | '1m'>('5s');
  const [dateFilter, setDateFilter] = useState<string>('Today');

  // ─── P&ID HOVER TOOLTIP ───
  const [activePidHover, setActivePidHover] = useState<string | null>(null);

  // ─── SOLENOID VALVE CONFIGURATION & FAIL-SAFE MAPPING (4 VALVES) ───
  const solenoidValves = useMemo(() => {
    if (operationMode === 'Counter-Current') {
      return {
        sv1: { name: 'Solenoid Valve 1', type: 'NC' as const, state: 'OFF (Closed)', active: false, badgeClass: 'bg-red-100 text-red-700 border-red-300' },
        sv2: { name: 'Solenoid Valve 2', type: 'NO' as const, state: 'ON (Open)', active: true, badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
        sv3: { name: 'Solenoid Valve 3', type: 'NC' as const, state: 'OFF (Closed)', active: false, badgeClass: 'bg-red-100 text-red-700 border-red-300' },
        sv4: { name: 'Solenoid Valve 4', type: 'NO' as const, state: 'ON (Open)', active: true, badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
        isFailSafeActive: true,
        modeNotice: 'Mode Aktif Secara Otomatis (Passive Fail-Safe: Tanpa Listrik kembali ke Counter-Current)'
      };
    } else {
      return {
        sv1: { name: 'Solenoid Valve 1', type: 'NC' as const, state: 'ON (Open)', active: true, badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
        sv2: { name: 'Solenoid Valve 2', type: 'NO' as const, state: 'OFF (Closed)', active: false, badgeClass: 'bg-red-100 text-red-700 border-red-300' },
        sv3: { name: 'Solenoid Valve 3', type: 'NC' as const, state: 'ON (Open)', active: true, badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
        sv4: { name: 'Solenoid Valve 4', type: 'NO' as const, state: 'OFF (Closed)', active: false, badgeClass: 'bg-red-100 text-red-700 border-red-300' },
        isFailSafeActive: false,
        modeNotice: 'Memerlukan Daya Listrik Aktif (Co-Current Flow)'
      };
    }
  }, [operationMode]);

  // ─── DUAL HEATER STAGED CONTROL LOGIC ───
  const latestData = useMemo(() => {
    if (telemetryHistory.length === 0) {
      return {
        timestamp: new Date().toLocaleTimeString('id-ID'),
        ti1: 64.2,
        ti2: 48.5,
        ti3: 27.1,
        ti4: 42.8,
        ti5: 38.4,
        ti6: 45.1,
        pi1: 2.45,
        pi2: 1.95,
        pi3: 2.10,
        pi4: 1.72,
        fc1: 18.5,
        fc2: 24.2,
        tc1Setpoint: 65,
        heater1Active: true,
        heater2Active: true,
        mode: 'Counter-Current' as const
      };
    }
    return telemetryHistory[telemetryHistory.length - 1];
  }, [telemetryHistory]);

  const dualHeaterState = useMemo(() => {
    const isPrimed = fc1Valve > 0;
    const isMasterOn = heaterMasterPower && !emergencyStopped && isPrimed;

    if (!isMasterOn) {
      return {
        h1: false,
        h2: false,
        stage: 'OFF',
        powerWatt: 0,
        description: 'OFF (Pemanas Dimatikan / Belum Priming)'
      };
    }

    // Measure deltaT at Outlet of Heater 2 (TI2)
    const ti2Temp = latestData.ti2;
    const deltaT = tc1Setpoint - ti2Temp;

    if (deltaT > 3.0) {
      // Stage 1: Far from target -> Both Heaters ON (Full 1000W)
      return {
        h1: true,
        h2: true,
        stage: 'STAGE_1',
        powerWatt: 1000,
        description: 'Tahap 1: Kedua Pemanas Menyala Penuh (Heater 1 ON & Heater 2 ON - 1000W)'
      };
    } else if (deltaT > 0) {
      // Stage 2: Approaching target -> Heater 1 OFF, Heater 2 ON (Smooth 500W to prevent overshoot)
      return {
        h1: false,
        h2: true,
        stage: 'STAGE_2',
        powerWatt: 500,
        description: 'Tahap 2: Kontrol Bertahap (Heater 1 OFF, Heater 2 ON - 500W untuk mencegah overshoot)'
      };
    } else {
      return {
        h1: false,
        h2: false,
        stage: 'SETPOINT_REACHED',
        powerWatt: 0,
        description: 'Target Suhu Tercapai (Dual Heater Standby)'
      };
    }
  }, [heaterMasterPower, emergencyStopped, fc1Valve, latestData.ti2, tc1Setpoint]);

  const deltaPHot = useMemo(() => {
    return parseFloat((latestData.pi1 - latestData.pi2).toFixed(2));
  }, [latestData.pi1, latestData.pi2]);

  const deltaPCold = useMemo(() => {
    return parseFloat((latestData.pi3 - latestData.pi4).toFixed(2));
  }, [latestData.pi3, latestData.pi4]);

  const isAlarmActive = useMemo(() => {
    return latestData.ti1 > ti1MaxThreshold || deltaPHot > deltaPMaxThreshold;
  }, [latestData.ti1, ti1MaxThreshold, deltaPHot, deltaPMaxThreshold]);

  // ─── OPERATOR SESSION TIMER EFFECT ───
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isLoggedIn && currentUser.role === 'operator') {
      timer = setInterval(() => {
        setOperatorSessionRemaining((prev) => {
          if (prev <= 1) {
            setSessionExpiredModal(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setOperatorSessionRemaining(operatorSessionLimit * 60);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isLoggedIn, currentUser.role, operatorSessionLimit]);

  // ─── 1-MINUTE TARGET TEMPERATURE WARNING TIMER EFFECT ───
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    const isHeating = heaterMasterPower && !emergencyStopped && fc1Valve > 0;

    if (isHeating && latestData.ti2 < tc1Setpoint - 1.5) {
      timer = setInterval(() => {
        setHeatingTimerSeconds((prev) => {
          const next = prev + 1;
          if (next >= 60) {
            setShow1MinWarning(true);
          }
          return next;
        });
      }, 1000);
    } else {
      setHeatingTimerSeconds(0);
      setShow1MinWarning(false);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [heaterMasterPower, emergencyStopped, fc1Valve, latestData.ti2, tc1Setpoint]);

  // ─── AUDIO SYNTHESIZER SIREN FOR ALARM ───
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sirenOscRef = useRef<OscillatorNode | null>(null);

  const startSirenSound = () => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      if (sirenOscRef.current) return;

      const osc = audioCtxRef.current.createOscillator();
      const gain = audioCtxRef.current.createGain();
      osc.type = 'sawtooth';
      gain.gain.setValueAtTime(0.15, audioCtxRef.current.currentTime);

      const now = audioCtxRef.current.currentTime;
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.linearRampToValueAtTime(1200, now + 0.4);
      osc.frequency.linearRampToValueAtTime(800, now + 0.8);

      osc.connect(gain);
      gain.connect(audioCtxRef.current.destination);
      osc.start();
      sirenOscRef.current = osc;
    } catch {
      // Audio synth fallback silence
    }
  };

  const stopSirenSound = () => {
    if (sirenOscRef.current) {
      try {
        sirenOscRef.current.stop();
        sirenOscRef.current.disconnect();
      } catch {
        // ignore
      }
      sirenOscRef.current = null;
    }
  };

  useEffect(() => {
    if (isAlarmActive && soundEnabled && isLoggedIn) {
      startSirenSound();
      setShowAlarmModal(true);
    } else {
      stopSirenSound();
    }
    return () => {
      stopSirenSound();
    };
  }, [isAlarmActive, soundEnabled, isLoggedIn]);

  // ─── TELEMETRY SIMULATION LOOP (WITH DUAL HEATER & SOLENOID VALVES) ───
  // ─── TELEMETRY DATA HANDLER (REAL-TIME SUPABASE TELEMETRY_DATA ONLY) ───
  useEffect(() => {
    // Apabila terkoneksi ke Supabase, gunakan data murni dari Supabase telemetry_data
    if (supabaseStatus === 'ONLINE' || supabaseTelemetry || (telemetryStream && telemetryStream.length > 0)) {
      if (telemetryStream && telemetryStream.length > 0) {
        const realHistory: TelemetryPoint[] = telemetryStream.map((row) => {
          const isHeaterOn = row.heater_status === 'ON';
          return {
            timestamp: row.created_at
              ? new Date(row.created_at).toLocaleTimeString('id-ID')
              : new Date().toLocaleTimeString('id-ID'),
            ti1: row.temp_1,
            ti2: row.temp_2,
            ti3: row.temp_3,
            ti4: row.temp_4,
            ti5: parseFloat(((row.temp_3 + row.temp_4) / 2).toFixed(1)),
            ti6: parseFloat(((row.temp_1 + row.temp_2) / 2).toFixed(1)),
            pi1: row.pressure,
            pi2: parseFloat((row.pressure * 0.82).toFixed(2)),
            pi3: parseFloat((row.pressure * 0.90).toFixed(2)),
            pi4: parseFloat((row.pressure * 0.72).toFixed(2)),
            fc1: row.flow_rate,
            fc2: parseFloat((row.flow_rate * 1.15).toFixed(1)),
            tc1Setpoint: supabaseControls.target_temp,
            heater1Active: isHeaterOn,
            heater2Active: isHeaterOn,
            mode: supabaseControls.flow_mode === 'COUNTER' ? 'Counter-Current' : 'Co-Current'
          };
        });
        setTelemetryHistory(realHistory);
      }
      return;
    }

    // Baseline Fallback awal (hanya jika Supabase belum terhubung)
    const initialHistory: TelemetryPoint[] = [];
    const baseTime = Date.now() - 20 * 5000;
    for (let i = 0; i < 20; i++) {
      const t = new Date(baseTime + i * 5000).toLocaleTimeString('id-ID');
      initialHistory.push({
        timestamp: t,
        ti1: 0,
        ti2: 0,
        ti3: 0,
        ti4: 0,
        ti5: 0,
        ti6: 0,
        pi1: 0,
        pi2: 0,
        pi3: 0,
        pi4: 0,
        fc1: 0,
        fc2: 0,
        tc1Setpoint: tc1Setpoint,
        heater1Active: false,
        heater2Active: false,
        mode: operationMode
      });
    }
    setTelemetryHistory(initialHistory);
  }, [supabaseStatus, supabaseTelemetry, telemetryStream, supabaseControls]);

  // ─── LOGIN HANDLER ───
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDemoRole === 'developer') {
      setCurrentUser({
        name: 'Tim Developer Software & IoT',
        email: loginEmail || 'dev@uad.ac.id',
        role: 'developer'
      });
    } else if (selectedDemoRole === 'admin') {
      setCurrentUser({
        name: 'Dr. Ir. Budi Santoso (Dosen / KaLab)',
        email: loginEmail || 'admin@uad.ac.id',
        role: 'admin'
      });
    } else {
      setCurrentUser({
        name: 'Rahmat Hidayat (Mahasiswa Operator)',
        email: loginEmail || 'operator@uad.ac.id',
        role: 'operator'
      });
      setOperatorSessionRemaining(operatorSessionLimit * 60);
    }
    setIsLoggedIn(true);
    setActiveTab('dashboard');
  };

  // ─── EMERGENCY STOP HANDLER ───
  const triggerEmergencyStop = () => {
    setEmergencyStopped(true);
    setHeaterMasterPower(false);
    setFc1Valve(0);
    setAlarmLogs((prev) => [
      {
        id: `ALM-${Math.floor(100 + Math.random() * 900)}`,
        timestamp: new Date().toLocaleTimeString('id-ID'),
        sensor: 'EMERGENCY_BUTTON',
        metric: 'Manual Emergency Stop Trip Activated',
        value: 0,
        threshold: 0,
        severity: 'Critical',
        acknowledged: false
      },
      ...prev
    ]);
  };

  const resetEmergencyStop = () => {
    setEmergencyStopped(false);
    setHeaterMasterPower(true);
    setFc1Valve(75);
  };

  // ─── DOWNSAMPLED LOGS FOR INTERVAL EXPORT & TABLE (1s, 5s, 30s, 1m) ───
  const filteredLogsData = useMemo(() => {
    const filtered = telemetryHistory.filter((d) => d.timestamp.includes(logSearchQuery));
    if (logInterval === '1s' || logInterval === '5s') {
      return filtered;
    } else if (logInterval === '30s') {
      return filtered.filter((_, idx) => idx % 6 === 0);
    } else if (logInterval === '1m') {
      return filtered.filter((_, idx) => idx % 12 === 0);
    }
    return filtered;
  }, [telemetryHistory, logSearchQuery, logInterval]);

  // ─── STYLED EXCEL & XLSX EXPORT HANDLERS ───
  const getFormattedDateStr = (date: Date) => {
    const d = date.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const t = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/:/g, '.');
    return `${d}, ${t} WIB`;
  };

  const exportExcelXLSX = () => {
    const now = new Date();
    const printedAt = getFormattedDateStr(now);
    const dateToday = getFormattedDateStr(now).split(',')[0];
    const dataSet = filteredLogsData.length > 0 ? filteredLogsData : telemetryHistory;
    const dateRangeStart = dataSet.length > 0 ? `${dateToday}, ${dataSet[0].timestamp} WIB` : printedAt;
    const dateRangeEnd = dataSet.length > 0 ? `${dateToday}, ${dataSet[dataSet.length - 1].timestamp} WIB` : printedAt;

    const metadataRows = [
      ['LAPORAN MONITORING HEAT EXCHANGER UAD'],
      ['Sistem: Heat Exchanger Thermal Analytics & IoT Control'],
      [`Interval Sampling: ${logInterval}`],
      [`Rentang Data: ${dateRangeStart} s.d. ${dateRangeEnd}`],
      [`Dicetak Pada: ${printedAt}`],
      [],
      ['Waktu (Timestamp)', 'T1 - Hot Inlet (°C)', 'T2 - Hot Outlet (°C)', 'T3 - Cold Inlet (°C)', 'T4 - Cold Outlet (°C)', 'Heater 1', 'Heater 2', 'Mode Aliran']
    ];

    const dataRows = dataSet.map((d) => [
      `${dateToday}, ${d.timestamp} WIB`,
      Number(d.ti1.toFixed(2)),
      Number(d.ti2.toFixed(2)),
      Number(d.ti3.toFixed(2)),
      Number(d.ti4.toFixed(2)),
      d.heater1Active ? 'ON' : 'OFF',
      d.heater2Active ? 'ON' : 'OFF',
      d.mode
    ]);

    const worksheetData = [...metadataRows, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);

    ws['!cols'] = [
      { wch: 30 },
      { wch: 22 },
      { wch: 22 },
      { wch: 22 },
      { wch: 22 },
      { wch: 14 },
      { wch: 14 },
      { wch: 18 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Temperature Logs');

    const fileName = `export_history_${logInterval}_${now.toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const exportStyledExcelHTML = () => {
    const now = new Date();
    const printedAt = getFormattedDateStr(now);
    const dateToday = getFormattedDateStr(now).split(',')[0];
    const dataSet = filteredLogsData.length > 0 ? filteredLogsData : telemetryHistory;
    const dateRangeStart = dataSet.length > 0 ? `${dateToday}, ${dataSet[0].timestamp} WIB` : printedAt;
    const dateRangeEnd = dataSet.length > 0 ? `${dateToday}, ${dataSet[dataSet.length - 1].timestamp} WIB` : printedAt;

    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; }
          .title { font-size: 14pt; font-weight: bold; color: #000000; }
          .meta { font-size: 10pt; color: #1E293B; }
          th { background-color: #0B2545; color: #FFFFFF; font-size: 10pt; font-weight: bold; padding: 8px 12px; border: 1px solid #000000; text-align: center; }
          td { font-size: 10pt; padding: 6px 12px; border: 1px solid #CBD5E1; text-align: center; }
          .even { background-color: #F8FAFC; }
          .status-on { color: #16A34A; font-weight: bold; }
          .status-off { color: #DC2626; font-weight: bold; }
        </style>
      </head>
      <body>
        <table>
          <tr><td colspan="8" class="title" style="text-align:left;">LAPORAN MONITORING HEAT EXCHANGER UAD</td></tr>
          <tr><td colspan="8" class="meta" style="text-align:left;">Sistem: Heat Exchanger Thermal Analytics (Interval: ${logInterval})</td></tr>
          <tr><td colspan="8" class="meta" style="text-align:left;">Rentang Data: ${dateRangeStart} s.d. ${dateRangeEnd}</td></tr>
          <tr><td colspan="8" class="meta" style="text-align:left;">Dicetak Pada: ${printedAt}</td></tr>
          <tr><td colspan="8"></td></tr>
          <tr>
            <th>Waktu (Timestamp)</th>
            <th>T1 - Hot Inlet (°C)</th>
            <th>T2 - Hot Outlet (°C)</th>
            <th>T3 - Cold Inlet (°C)</th>
            <th>T4 - Cold Outlet (°C)</th>
            <th>Heater 1</th>
            <th>Heater 2</th>
            <th>Mode Aliran</th>
          </tr>
    `;

    dataSet.forEach((d, idx) => {
      const bgClass = idx % 2 === 1 ? 'even' : '';
      html += `
        <tr class="${bgClass}">
          <td style="text-align:left;">${dateToday}, ${d.timestamp} WIB</td>
          <td>${d.ti1.toFixed(2)}</td>
          <td>${d.ti2.toFixed(2)}</td>
          <td>${d.ti3.toFixed(2)}</td>
          <td>${d.ti4.toFixed(2)}</td>
          <td class="${d.heater1Active ? 'status-on' : 'status-off'}">${d.heater1Active ? 'ON' : 'OFF'}</td>
          <td class="${d.heater2Active ? 'status-on' : 'status-off'}">${d.heater2Active ? 'ON' : 'OFF'}</td>
          <td>${d.mode}</td>
        </tr>
      `;
    });

    html += `</table></body></html>`;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `export_history_${logInterval}_${now.toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPDFReport = () => {
    window.print();
  };

  // ─── ADD USER HANDLER ───
  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail) return;
    const newUser: UserItem = {
      id: `USR-0${usersList.length + 1}`,
      name: newUserName,
      email: newUserEmail,
      role: newUserRole,
      status: 'Active',
      lastLogin: 'Baru saja'
    };
    setUsersList([...usersList, newUser]);
    setNewUserName('');
    setNewUserEmail('');
    setShowAddUserModal(false);
  };

  // ─── REUSABLE P&ID SCHEMATIC RENDERER WITH DUAL HEATER & SOLENOID VALVES ───
  const renderPIDDiagram = (diagramMode: 'Counter-Current' | 'Co-Current', titleExtra: string = '') => {
    const isCounter = diagramMode === 'Counter-Current';

    const thi = latestData.ti1;
    const tho = latestData.ti2;
    const tci = latestData.ti3;
    const tco = latestData.ti4;

    const dt1 = isCounter ? (thi - tco) : (thi - tci);
    const dt2 = isCounter ? (tho - tci) : (tho - tco);
    const lmtdVal = Math.abs(dt1 - dt2) < 0.1 ? dt1 : ((dt1 - dt2) / Math.log(Math.max(0.01, dt1) / Math.max(0.01, dt2)));

    return (
      <div className="bg-slate-50/80 rounded-2xl border border-slate-200/90 p-4 space-y-4 relative overflow-hidden shadow-sm">
        {/* Subheader */}
        <div className="flex flex-wrap justify-between items-center gap-2 pb-3 border-b border-slate-200/70">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-xl text-xs font-extrabold uppercase shadow-sm ${
              isCounter
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-sky-100 text-sky-800 border border-sky-300'
            }`}>
              Mode: {diagramMode} {titleExtra}
            </span>
            <span className="text-xs text-slate-600 font-semibold">
              {isCounter ? 'Pola Aliran Berlawanan (Counter-Current Flow) - Fail-Safe Pasif' : 'Pola Aliran Searah (Co-Current Flow)'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-bold">
            <span className="text-orange-600 bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200">
              🔥 Hot Stream: Dual Heater (1 & 2) ➔ Tubes
            </span>
            <span className={isCounter ? "text-cyan-700 bg-cyan-50 px-2.5 py-1 rounded-lg border border-cyan-200" : "text-sky-700 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200"}>
              ❄️ Cold Stream: {isCounter ? "Right ⬅ Left (Shell)" : "Left ➔ Right (Shell)"}
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
              stroke={heaterMasterPower && !emergencyStopped && fc1Valve > 0 ? `url(#hotFlowGrad_${diagramMode})` : "#94A3B8"}
              strokeWidth="6"
              className={heaterMasterPower && !emergencyStopped && fc1Valve > 0 ? "animate-flow-hot" : ""}
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
              <circle cx="100" cy="240" r="22" fill="#FFFFFF" stroke={dualHeaterState.h1 ? "#EF4444" : "#94A3B8"} strokeWidth="3.5" />
              <path
                d="M88,240 Q94,232 100,240 T112,240"
                stroke={dualHeaterState.h1 ? "#EF4444" : "#94A3B8"}
                strokeWidth="3.5"
                fill="none"
                className={dualHeaterState.h1 ? "animate-pulse" : ""}
              />
              <rect x="62" y="268" width="76" height="18" rx="5" fill={dualHeaterState.h1 ? "#EF4444" : "#64748B"} />
              <text x="100" y="280" textAnchor="middle" className="text-[9px] font-extrabold fill-white">Heater 1 ({dualHeaterState.h1 ? '500W ON' : 'OFF'})</text>
            </g>

            {/* Heater 2 Badge (Upper - Temp Monitored Here) */}
            <g className="cursor-pointer transition hover:scale-105" filter={`url(#shadow_${diagramMode})`}>
              <circle cx="100" cy="140" r="22" fill="#FFFFFF" stroke={dualHeaterState.h2 ? "#EF4444" : "#94A3B8"} strokeWidth="3.5" />
              <path
                d="M88,140 Q94,132 100,140 T112,140"
                stroke={dualHeaterState.h2 ? "#EF4444" : "#94A3B8"}
                strokeWidth="3.5"
                fill="none"
                className={dualHeaterState.h2 ? "animate-pulse" : ""}
              />
              <rect x="62" y="168" width="76" height="18" rx="5" fill={dualHeaterState.h2 ? "#EF4444" : "#64748B"} />
              <text x="100" y="180" textAnchor="middle" className="text-[9px] font-extrabold fill-white">Heater 2 ({dualHeaterState.h2 ? '500W ON' : 'OFF'})</text>
            </g>

            {/* ─── HOT TOP PIPE SENSORS & SOLENOID VALVES ─── */}
            {/* P1 Pressure Transducer */}
            <g className="cursor-pointer" onMouseEnter={() => setActivePidHover('PI1')} onMouseLeave={() => setActivePidHover(null)}>
              <line x1="180" y1="80" x2="180" y2="55" stroke="#94A3B8" strokeWidth="2" strokeDasharray="3 3" />
              <circle cx="180" cy="45" r="14" fill="#FFFFFF" stroke="#0284C7" strokeWidth="2.5" />
              <text x="180" y="49" textAnchor="middle" className="text-[9px] font-extrabold fill-[#0284C7]">P1</text>
              <rect x="155" y="18" width="50" height="16" rx="4" fill="#F1F5F9" stroke="#0284C7" strokeWidth="1" />
              <text x="180" y="30" textAnchor="middle" className="text-[9px] font-extrabold fill-slate-800">{latestData.pi1} bar</text>
            </g>

            {/* SV1 (NC) Solenoid Valve Badge */}
            <g className="cursor-pointer">
              <polygon points="230,80 240,90 240,70" fill={solenoidValves.sv1.active ? "#16A3A0" : "#DC2626"} />
              <polygon points="250,80 240,90 240,70" fill={solenoidValves.sv1.active ? "#16A3A0" : "#DC2626"} />
              <rect x="222" y="100" width="36" height="15" rx="3" fill="#FFFFFF" stroke={solenoidValves.sv1.active ? "#16A3A0" : "#DC2626"} strokeWidth="1" />
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
            <g className="cursor-pointer transition hover:scale-110" onMouseEnter={() => setActivePidHover('TI1')} onMouseLeave={() => setActivePidHover(null)}>
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
              <rect x="420" y="300" width="38" height="15" rx="3" fill="#FFFFFF" stroke={solenoidValves.sv2.active ? "#16A3A0" : "#DC2626"} strokeWidth="1" />
              <text x="439" y="311" textAnchor="middle" className="text-[8px] font-extrabold fill-slate-800">SV2 (NO)</text>
            </g>

            {/* SV3 (NC) */}
            <g className="cursor-pointer">
              <rect x="660" y="300" width="38" height="15" rx="3" fill="#FFFFFF" stroke={solenoidValves.sv3.active ? "#16A3A0" : "#DC2626"} strokeWidth="1" />
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
            <g className="cursor-pointer transition hover:scale-110" onMouseEnter={() => setActivePidHover('TI3')} onMouseLeave={() => setActivePidHover(null)}>
              <circle cx={isCounter ? "690" : "450"} cy="340" r="14" fill="#06B6D4" stroke="#FFFFFF" strokeWidth="2.5" />
              <text x={isCounter ? "690" : "450"} y="344" textAnchor="middle" className="text-[9px] font-extrabold fill-white">TI3</text>
              <rect x={isCounter ? "662" : "422"} y="360" width="56" height="18" rx="5" fill="#FFFFFF" stroke="#06B6D4" strokeWidth="1.5" />
              <text x={isCounter ? "690" : "450"} y="373" textAnchor="middle" className="text-[10px] font-extrabold fill-slate-900">{latestData.ti3}°C</text>
            </g>

            <g className="cursor-pointer transition hover:scale-110" onMouseEnter={() => setActivePidHover('TI4')} onMouseLeave={() => setActivePidHover(null)}>
              <circle cx={isCounter ? "450" : "690"} cy="90" r="14" fill="#0284C7" stroke="#FFFFFF" strokeWidth="2.5" />
              <text x={isCounter ? "450" : "690"} y="94" textAnchor="middle" className="text-[9px] font-extrabold fill-white">TI4</text>
              <rect x={isCounter ? "422" : "662"} y="110" width="56" height="18" rx="5" fill="#FFFFFF" stroke="#0284C7" strokeWidth="1.5" />
              <text x={isCounter ? "450" : "690"} y="123" textAnchor="middle" className="text-[10px] font-extrabold fill-slate-900">{latestData.ti4}°C</text>
            </g>

            {/* TI5 & TI6 */}
            <g className="cursor-pointer" onMouseEnter={() => setActivePidHover('TI5')} onMouseLeave={() => setActivePidHover(null)}>
              <circle cx="520" cy="210" r="11" fill="#0284C7" stroke="#FFFFFF" strokeWidth="2" />
              <text x="520" y="213" textAnchor="middle" className="text-[8px] font-bold fill-white">TI5</text>
              <text x="520" y="232" textAnchor="middle" className="text-[9px] font-bold fill-slate-700">{latestData.ti5}°C</text>
            </g>

            <g className="cursor-pointer" onMouseEnter={() => setActivePidHover('TI6')} onMouseLeave={() => setActivePidHover(null)}>
              <circle cx="620" cy="210" r="11" fill="#0284C7" stroke="#FFFFFF" strokeWidth="2" />
              <text x="620" y="213" textAnchor="middle" className="text-[8px] font-bold fill-white">TI6</text>
              <text x="620" y="232" textAnchor="middle" className="text-[9px] font-bold fill-slate-700">{latestData.ti6}°C</text>
            </g>

            {/* TI2 (Hot Outlet Temp Sensor - Heater 2 Output) */}
            <g className="cursor-pointer transition hover:scale-110" onMouseEnter={() => setActivePidHover('TI2')} onMouseLeave={() => setActivePidHover(null)}>
              <line x1="745" y1="330" x2="745" y2="355" stroke="#F97316" strokeWidth="2" />
              <circle cx="745" cy="365" r="14" fill="#F97316" stroke="#FFFFFF" strokeWidth="2.5" />
              <text x="745" y="369" textAnchor="middle" className="text-[9px] font-extrabold fill-white">TI2</text>
              <rect x="717" y="388" width="56" height="18" rx="5" fill="#FFFFFF" stroke="#F97316" strokeWidth="1.5" />
              <text x="745" y="401" textAnchor="middle" className="text-[10px] font-extrabold fill-slate-900">{latestData.ti2}°C</text>
            </g>

            {/* P2 Pressure Transducer */}
            <g className="cursor-pointer" onMouseEnter={() => setActivePidHover('PI2')} onMouseLeave={() => setActivePidHover(null)}>
              <line x1="550" y1="380" x2="550" y2="405" stroke="#94A3B8" strokeWidth="2" strokeDasharray="3 3" />
              <circle cx="550" cy="415" r="14" fill="#FFFFFF" stroke="#0284C7" strokeWidth="2.5" />
              <text x="550" y="419" textAnchor="middle" className="text-[9px] font-extrabold fill-[#0284C7]">P2</text>
              <rect x="525" y="432" width="50" height="16" rx="4" fill="#F1F5F9" stroke="#0284C7" strokeWidth="1" />
              <text x="550" y="444" textAnchor="middle" className="text-[9px] font-extrabold fill-slate-800">{latestData.pi2} bar</text>
            </g>

            {/* Delta P Indicator */}
            <g className="cursor-pointer">
              <rect x="340" y="415" width="130" height="24" rx="8" fill="#EFF6FF" stroke="#3B82F6" strokeWidth="1.5" />
              <text x="405" y="431" textAnchor="middle" className="text-[10px] font-extrabold fill-blue-900">
                ΔP (P1 - P2) = {deltaPHot} bar
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
            <span className={`inline-block font-extrabold text-[11px] px-2 py-0.5 rounded ${
              isCounter ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-sky-100 text-sky-800 border border-sky-200'
            }`}>
              {isCounter ? 'Fail-Safe Pasif (SV1&3 OFF, SV2&4 ON)' : 'Active Co-Current (SV1&3 ON, SV2&4 OFF)'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // ─── RENDER: LOGIN SCREEN (SUPPORTING DEVELOPER, ADMIN, OPERATOR ROLES) ───
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 md:p-8 relative overflow-hidden font-sans">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-sky-200/50 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-cyan-200/50 rounded-full blur-3xl pointer-events-none" />

        <header className="flex justify-between items-center max-w-7xl mx-auto w-full z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 relative flex items-center justify-center p-1 bg-white rounded-2xl shadow-md border border-slate-200/80 shrink-0">
              <img src="/uad-logo.png" alt="Logo UAD" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
                FluidHE <span className="text-xs px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 font-semibold border border-sky-200">v2.5 IoT</span>
              </h1>
              <p className="text-xs text-slate-500">Universitas Ahmad Dahlan - Dual Heater & Solenoid Control</p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200/80 shadow-sm text-xs font-medium text-slate-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Connected to UAD Campus Intranet
          </div>
        </header>

        <main className="max-w-md w-full mx-auto my-auto py-8 z-10">
          <div className="asklepios-card p-8 bg-white/90 backdrop-blur-md shadow-xl border border-slate-200/80 rounded-3xl">
            <div className="text-center mb-6">
              <div className="inline-flex p-2 bg-white rounded-2xl mb-3 border border-slate-200/80 shadow-md w-16 h-16 items-center justify-center">
                <img src="/uad-logo.png" alt="Logo UAD" className="w-full h-full object-contain" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Masuk ke Sistem</h2>
              <p className="text-sm text-slate-500 mt-1">Laboratorium Teknik Kimia & IoT Industri UAD</p>
            </div>

            {/* Main Lab Role Switcher (Admin & Operator) */}
            <div className="mb-6 p-1.5 bg-slate-100/80 rounded-2xl flex border border-slate-200/60 gap-1">
              <button
                type="button"
                onClick={() => {
                  setSelectedDemoRole('admin');
                  setLoginEmail('admin@uad.ac.id');
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  selectedDemoRole === 'admin'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Shield className="w-3.5 h-3.5" /> Admin (Dosen / KaLab)
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedDemoRole('operator');
                  setLoginEmail('operator@uad.ac.id');
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  selectedDemoRole === 'operator'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Users className="w-3.5 h-3.5" /> Operator (Mahasiswa)
              </button>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email / Username</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-800 transition"
                  placeholder="user@uad.ac.id"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Kata Sandi</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-800 transition"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="p-3 rounded-xl bg-sky-50/80 border border-sky-100 text-xs text-sky-800 flex items-start gap-2">
                <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <span>
                  Role <strong className="uppercase">{selectedDemoRole}</strong>:{' '}
                  {selectedDemoRole === 'admin'
                    ? 'Manajemen user, verifikasi kalibrasi & penetapan batas durasi praktikum.'
                    : 'Pengoperasian alat, grafik real-time & download data ber-interval.'}
                </span>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-700 hover:to-cyan-700 text-white font-bold rounded-xl shadow-lg shadow-sky-500/25 transition-all transform active:scale-[0.99] flex items-center justify-center gap-2"
              >
                Masuk ke Dashboard Lab
                <ChevronRight className="w-4 h-4" />
              </button>
            </form>

            {/* Separate Developer Portal Redirect Link */}
            <div className="mt-6 pt-4 border-t border-slate-100 text-center space-y-2">
              <p className="text-xs text-slate-500 font-medium">Membutuhkan akses hardware low-level & Modbus/MQTT?</p>
              <a
                href="http://localhost:3001/developer"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold hover:bg-purple-100 transition"
              >
                <Code className="w-3.5 h-3.5 text-purple-600" /> Buka Developer Portal (Port 3001)
              </a>
            </div>
          </div>
        </main>

        <footer className="text-center text-xs text-slate-400 z-10 py-2">
          © 2026 Heat Exchanger Control System - Universitas Ahmad Dahlan Campus Intranet
        </footer>
      </div>
    );
  }

  // ─── RENDER MAIN APP DASHBOARD ───
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">

      {/* ─── ALARM SIREN POPUP MODAL ─── */}
      {showAlarmModal && isAlarmActive && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="asklepios-card max-w-md w-full p-6 bg-white rounded-3xl shadow-2xl border-2 border-red-500 animate-pulse">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <div className="p-3 bg-red-100 rounded-2xl animate-bounce">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-slate-900">PERINGATAN SUHU TINGGI!</h3>
                <p className="text-xs text-red-600 font-semibold">Bahaya Temperatur / Tekanan Melampaui Batas</p>
              </div>
            </div>

            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-sm space-y-2 mb-6">
              <div className="flex justify-between text-slate-700">
                <span>Sensor Hot Inlet (TI1):</span>
                <strong className="text-red-700 font-bold">{latestData.ti1}°C</strong>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Batas Maksimum Aman:</span>
                <strong>{ti1MaxThreshold}°C</strong>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Pressure Drop Hot Fluid (ΔP):</span>
                <strong className={deltaPHot > deltaPMaxThreshold ? 'text-red-700 font-bold' : ''}>{deltaPHot} bar</strong>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                {soundEnabled ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                {soundEnabled ? 'Matikan Siren' : 'Bunyikan Siren'}
              </button>

              <button
                onClick={() => setShowAlarmModal(false)}
                className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-500/20 transition flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" /> Tutup & Konfirmasi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── OPERATOR SESSION EXPIRED MODAL ─── */}
      {sessionExpiredModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="asklepios-card max-w-md w-full p-6 bg-white rounded-3xl shadow-2xl border-2 border-amber-500 text-center space-y-4">
            <div className="p-4 bg-amber-100 text-amber-700 rounded-full w-16 h-16 mx-auto flex items-center justify-center animate-bounce">
              <Clock className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Durasi Sesi Praktikum Selesai!</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Batas waktu durasi sesi pengoperasian mahasiswa (Operator) yang diizinkan Admin ({operatorSessionLimit} menit) telah berakhir.
            </p>
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
              Harap hubungi <strong>Dosen / Asisten Lab (Admin)</strong> untuk memperpanjang durasi praktikum.
            </div>
            <button
              onClick={() => {
                setSessionExpiredModal(false);
                setIsLoggedIn(false);
              }}
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md"
            >
              Kembali ke Halaman Login
            </button>
          </div>
        </div>
      )}

      {/* ─── ADD USER MODAL ─── */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="asklepios-card max-w-md w-full p-6 bg-white rounded-3xl shadow-xl">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-sky-600" /> Tambah User Baru
              </h3>
              <button onClick={() => setShowAddUserModal(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  placeholder="Contoh: Ir. Hendra Suputra"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email UAD</label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  placeholder="hendra@uad.ac.id"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Role / Hak Akses</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-slate-800"
                >
                  <option value="operator">Operator (Mahasiswa - Monitoring & Control)</option>
                  <option value="admin">Admin (Dosen / KaLab - Akses Penuh + User Mgmt)</option>
                  <option value="developer">Developer (Akses Source Code & Hardware Config)</option>
                </select>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-md shadow-sky-600/20"
                >
                  Simpan User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── TOP HEADER BAR ─── */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-8 py-3 flex items-center justify-between no-print">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 relative flex items-center justify-center p-1 bg-white rounded-xl shadow-md border border-slate-200/80 shrink-0">
            <img src="/uad-logo.png" alt="Logo UAD" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">FluidHE Dashboard</h1>
              <span className="px-2 py-0.5 bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-bold rounded-full">
                UAD Kampus IV
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">Laboratorium Teknik Kimia - Universitas Ahmad Dahlan</p>
          </div>
        </div>

        {/* Status Banner & Operator Session Countdown */}
        <div className="flex items-center gap-3">
          {/* Supabase Connection Status Badge */}
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition ${
            supabaseStatus === 'ONLINE'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : supabaseStatus === 'CONNECTING'
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              supabaseStatus === 'ONLINE'
                ? 'bg-emerald-500 animate-pulse'
                : supabaseStatus === 'CONNECTING'
                ? 'bg-amber-500 animate-ping'
                : 'bg-red-500'
            }`} />
            <span>
              Supabase: {supabaseStatus === 'ONLINE' ? 'CONNECTED' : supabaseStatus === 'CONNECTING' ? 'CONNECTING...' : 'OFFLINE'}
            </span>
          </div>

          {currentUser.role === 'operator' && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-xs font-bold">
              <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
              <span>Sesi Praktikum: {Math.floor(operatorSessionRemaining / 60)}m {operatorSessionRemaining % 60}s</span>
            </div>
          )}

          {emergencyStopped ? (
            <div className="flex items-center gap-2 px-3 py-1 bg-red-600 text-white rounded-full text-xs font-bold animate-pulse shadow-md">
              <AlertTriangle className="w-4 h-4" /> EMERGENCY TRIP ACTIVE
            </div>
          ) : isAlarmActive ? (
            <button
              onClick={() => setShowAlarmModal(true)}
              className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 border border-red-200 rounded-full text-xs font-bold animate-pulse"
            >
              <Bell className="w-4 h-4 text-red-600" /> ALARM TI1 TINGGI ({latestData.ti1}°C)
            </button>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-full text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Sistem Normal ({latestData.mode})
            </div>
          )}

          {/* User Profile Pill */}
          <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
            <div className="text-right hidden md:block">
              <p className="text-xs font-bold text-slate-900">{currentUser.name}</p>
              <span className={`inline-block text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded ${
                currentUser.role === 'developer'
                  ? 'bg-purple-100 text-purple-700 border border-purple-200'
                  : currentUser.role === 'admin'
                  ? 'bg-sky-100 text-sky-700 border border-sky-200'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {currentUser.role}
              </span>
            </div>

            <button
              onClick={() => setIsLoggedIn(false)}
              title="Keluar"
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* ─── BODY CONTAINER (SIDEBAR + MAIN CONTENT) ─── */}
      <div className="flex-1 flex flex-col md:flex-row max-w-[1600px] w-full mx-auto">

        {/* ─── SIDEBAR NAVIGATION ─── */}
        <aside className="w-full md:w-64 bg-white border-r border-slate-200/80 p-4 space-y-2 no-print shrink-0">
          <div className="px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            Menu Utama
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Activity className="w-4 h-4" /> Real-Time Monitoring
            </button>

            <button
              onClick={() => setActiveTab('control')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                activeTab === 'control'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Sliders className="w-4 h-4" /> Control Panel
            </button>

            <button
              onClick={() => setActiveTab('cctv')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                activeTab === 'cctv'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Video className="w-4 h-4" /> CCTV Feed
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                activeTab === 'logs'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4" /> Data Logs & Laporan
            </button>

            <button
              onClick={() => setActiveTab('alarms')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                activeTab === 'alarms'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="relative">
                <Bell className="w-4 h-4" />
                {alarmLogs.some(a => !a.acknowledged) && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
                )}
              </div>
              Alarm System
            </button>
          </nav>

          <div className="pt-4 border-t border-slate-100">
            <div className="px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Administrasi & Dev
            </div>

            {currentUser.role === 'admin' || currentUser.role === 'developer' ? (
              <button
                onClick={() => setActiveTab('users')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                  activeTab === 'users'
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4" /> User Management
                </div>
                <span className="px-1.5 py-0.5 bg-sky-100 text-sky-700 rounded text-[10px] font-extrabold">Admin</span>
              </button>
            ) : (
              <div className="px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200/60 text-slate-400 text-xs flex items-center justify-between opacity-75">
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5" /> User Management
                </div>
                <span className="text-[10px]">Terbatas</span>
              </div>
            )}

            {/* Developer Control Tab Button */}
            <button
              onClick={() => setActiveTab('developer')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all mt-1 ${
                activeTab === 'developer'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Code className="w-4 h-4 text-purple-500" /> Developer Control
              </div>
              <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] font-extrabold">Dev</span>
            </button>
          </div>

          <div className="mt-8 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <Server className="w-4 h-4 text-sky-600" /> Specs Hardware
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Double Heater (2x 500W), 4 Solenoid Valves (SV1-4 NC/NO), 6 TI, 4 PI, 2 FC.
            </p>
          </div>
        </aside>

        {/* ─── MAIN CONTENT VIEW SWITCHER ─── */}
        <main className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto">

          {/* SAFETY / WARNING BANNERS */}
          {primingNotice && (
            <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-2xl flex justify-between items-center text-xs text-amber-900 shadow-sm animate-fade-in">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <strong className="font-bold">Peringatan Keselamatan Kerja (Dry Heating Prevention):</strong>
                  <p className="mt-0.5">{primingNotice}</p>
                </div>
              </div>
              <button onClick={() => setPrimingNotice(null)} className="p-1 hover:bg-amber-100 rounded-lg text-amber-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {show1MinWarning && (
            <div className="p-4 bg-orange-50 border-2 border-orange-500 rounded-2xl flex justify-between items-center text-xs text-orange-900 shadow-md animate-pulse">
              <div className="flex items-center gap-3">
                <Clock className="w-6 h-6 text-orange-600 shrink-0" />
                <div>
                  <strong className="font-bold">Sistem Peringatan (1 Menit): Target Suhu Belum Tercapai!</strong>
                  <p className="mt-0.5">
                    Pemanas telah menyala selama {heatingTimerSeconds} detik tetapi suhu target ({tc1Setpoint}°C) belum tercapai. Disarankan untuk **menurunkan laju aliran (Flow Rate FC1)** agar perpindahan panas lebih optimal.
                  </p>
                </div>
              </div>
              <button onClick={() => setShow1MinWarning(false)} className="px-3 py-1 bg-orange-600 text-white rounded-lg font-bold text-xs">
                Mengerti
              </button>
            </div>
          )}

          {/* TAB 1: MAIN REALTIME DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">

              {/* 1. Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="asklepios-card p-4 relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold text-slate-500">TI1 (Hot Inlet)</span>
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

                <div className="asklepios-card p-4 relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold text-slate-500">TI2 (Hot Outlet - Heater 2)</span>
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

                <div className="asklepios-card p-4 relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold text-slate-500">TI3 (Cold Inlet)</span>
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

                <div className="asklepios-card p-4 relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold text-slate-500">TI4 (Cold Outlet)</span>
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

                <div className="asklepios-card p-4 relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold text-slate-500">PI1 / PI2 (Hot Press)</span>
                    <span className="p-1.5 bg-sky-50 text-sky-600 rounded-xl">
                      <Gauge className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-xl font-extrabold text-slate-900">{latestData.pi1} / {latestData.pi2}</span>
                    <span className="text-xs font-semibold text-slate-500">bar</span>
                  </div>
                  <div className="mt-2 text-[11px] flex justify-between items-center p-1 bg-slate-50 rounded-lg">
                    <span className="text-slate-500">ΔP Hot:</span>
                    <strong className="text-sky-700">{deltaPHot} bar</strong>
                  </div>
                </div>

                <div className="asklepios-card p-4 relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold text-slate-500">PI3 / PI4 (Cold Press)</span>
                    <span className="p-1.5 bg-cyan-50 text-cyan-600 rounded-xl">
                      <Gauge className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-xl font-extrabold text-slate-900">{latestData.pi3} / {latestData.pi4}</span>
                    <span className="text-xs font-semibold text-slate-500">bar</span>
                  </div>
                  <div className="mt-2 text-[11px] flex justify-between items-center p-1 bg-slate-50 rounded-lg">
                    <span className="text-slate-500">ΔP Cold:</span>
                    <strong className="text-cyan-700">{deltaPCold} bar</strong>
                  </div>
                </div>

                <div className="asklepios-card p-4 relative overflow-hidden">
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

                <div className="asklepios-card p-4 relative overflow-hidden">
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

              {/* DUAL HEATER & SOLENOID VALVE SYSTEM STATUS CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Dual Heater Card */}
                <div className="asklepios-card p-5 bg-white space-y-3 border-l-4 border-l-orange-500">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-orange-600" /> Sistem Pemanas Ganda (Double Heater)
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-100 text-orange-800">
                      Daya: {dualHeaterState.powerWatt}W
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {dualHeaterState.description}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className={`p-2.5 rounded-xl border flex justify-between items-center font-bold ${
                      dualHeaterState.h1 ? 'bg-orange-50 border-orange-200 text-orange-900' : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}>
                      <span>Heater 1 (500W)</span>
                      <span>{dualHeaterState.h1 ? '⚡ ON' : 'OFF'}</span>
                    </div>
                    <div className={`p-2.5 rounded-xl border flex justify-between items-center font-bold ${
                      dualHeaterState.h2 ? 'bg-orange-50 border-orange-200 text-orange-900' : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}>
                      <span>Heater 2 (500W)</span>
                      <span>{dualHeaterState.h2 ? '⚡ ON' : 'OFF'}</span>
                    </div>
                  </div>
                </div>

                {/* Solenoid Valves Status Card */}
                <div className="asklepios-card p-5 bg-white space-y-3 border-l-4 border-l-sky-500">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
                      <ArrowRightLeft className="w-4 h-4 text-sky-600" /> Katup Solenoid & Fail-Safe Pasif
                    </h4>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      solenoidValves.isFailSafeActive ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'
                    }`}>
                      {operationMode}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {solenoidValves.modeNotice}
                  </p>
                  <div className="grid grid-cols-4 gap-1.5 text-[11px] pt-1 text-center">
                    <div className={`p-2 rounded-lg border font-bold ${solenoidValves.sv1.badgeClass}`}>
                      SV1 (NC)<br /><span className="text-[10px] font-extrabold">{solenoidValves.sv1.state.split(' ')[0]}</span>
                    </div>
                    <div className={`p-2 rounded-lg border font-bold ${solenoidValves.sv2.badgeClass}`}>
                      SV2 (NO)<br /><span className="text-[10px] font-extrabold">{solenoidValves.sv2.state.split(' ')[0]}</span>
                    </div>
                    <div className={`p-2 rounded-lg border font-bold ${solenoidValves.sv3.badgeClass}`}>
                      SV3 (NC)<br /><span className="text-[10px] font-extrabold">{solenoidValves.sv3.state.split(' ')[0]}</span>
                    </div>
                    <div className={`p-2 rounded-lg border font-bold ${solenoidValves.sv4.badgeClass}`}>
                      SV4 (NO)<br /><span className="text-[10px] font-extrabold">{solenoidValves.sv4.state.split(' ')[0]}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Real-Time Temperature & Pressure Multi-Line Chart */}
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

                    <polyline
                      fill="none"
                      stroke="#F97316"
                      strokeWidth="3"
                      points={telemetryHistory
                        .map((d, i) => {
                          const x = 40 + i * (740 / 19);
                          const y = 170 - ((d.ti1 - 20) / 60) * 150;
                          return `${x},${y}`;
                        })
                        .join(' ')}
                    />

                    <polyline
                      fill="none"
                      stroke="#EF4444"
                      strokeWidth="2.5"
                      strokeDasharray="4 2"
                      points={telemetryHistory
                        .map((d, i) => {
                          const x = 40 + i * (740 / 19);
                          const y = 170 - ((d.ti2 - 20) / 60) * 150;
                          return `${x},${y}`;
                        })
                        .join(' ')}
                    />

                    <polyline
                      fill="none"
                      stroke="#06B6D4"
                      strokeWidth="2.5"
                      points={telemetryHistory
                        .map((d, i) => {
                          const x = 40 + i * (740 / 19);
                          const y = 170 - ((d.ti3 - 20) / 60) * 150;
                          return `${x},${y}`;
                        })
                        .join(' ')}
                    />

                    <polyline
                      fill="none"
                      stroke="#0284C7"
                      strokeWidth="2.5"
                      points={telemetryHistory
                        .map((d, i) => {
                          const x = 40 + i * (740 / 19);
                          const y = 170 - ((d.ti4 - 20) / 60) * 150;
                          return `${x},${y}`;
                        })
                        .join(' ')}
                    />

                    {telemetryHistory.map((d, i) => {
                      if (i % 4 === 0) {
                        const x = 40 + i * (740 / 19);
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

              {/* 3. Interactive Digital Twin P&ID Visual Diagram */}
              <div className="asklepios-card p-6 bg-white relative overflow-hidden space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <Layers className="w-5 h-5 text-sky-600" /> Visualisasi Real-Time Aliran Fluid & Digital Twin P&ID
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Menampilkan posisi 4 Katup Solenoid (SV1-SV4) & Dual Heater secara real-time
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-sky-50 text-sky-700 border border-sky-200 text-xs font-bold rounded-xl flex items-center gap-1.5">
                      <ArrowRightLeft className="w-3.5 h-3.5" /> Mode Aktif: {operationMode}
                    </span>
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-xl flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /> Live Telemetry
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
                    <label className="text-xs font-extrabold text-slate-800 flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-sky-600" /> Tombol Pemilihan Mode Aliran:
                    </label>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Pengalihan 4 katup solenoid (Counter-Current vs Co-Current)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setOperationMode('Co-Current');
                        setFlowVisViewMode('single');
                      }}
                      className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                        operationMode === 'Co-Current' && flowVisViewMode === 'single'
                          ? 'bg-gradient-to-br from-sky-600 to-cyan-600 text-white border-sky-600 shadow-lg shadow-sky-600/25 ring-2 ring-sky-300'
                          : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="font-extrabold text-sm flex items-center gap-2">
                          <span className="p-1 rounded-lg bg-white/20">🔄</span> Co-Current
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          operationMode === 'Co-Current' && flowVisViewMode === 'single'
                            ? 'bg-white/25 text-white'
                            : 'bg-sky-100 text-sky-700'
                        }`}>
                          Aliran Searah
                        </span>
                      </div>
                      <p className={`text-[11px] mt-2 leading-relaxed ${
                        operationMode === 'Co-Current' && flowVisViewMode === 'single' ? 'text-sky-50' : 'text-slate-500'
                      }`}>
                        SV1 & 3 (ON/Open), SV2 & 4 (OFF/Closed). Memerlukan arus listrik aktif.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setOperationMode('Counter-Current');
                        setFlowVisViewMode('single');
                      }}
                      className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                        operationMode === 'Counter-Current' && flowVisViewMode === 'single'
                          ? 'bg-gradient-to-br from-sky-600 to-cyan-600 text-white border-sky-600 shadow-lg shadow-sky-600/25 ring-2 ring-sky-300'
                          : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="font-extrabold text-sm flex items-center gap-2">
                          <span className="p-1 rounded-lg bg-white/20">⇄</span> Counter-Current
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          operationMode === 'Counter-Current' && flowVisViewMode === 'single'
                            ? 'bg-white/25 text-white'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          Fail-Safe Pasif
                        </span>
                      </div>
                      <p className={`text-[11px] mt-2 leading-relaxed ${
                        operationMode === 'Counter-Current' && flowVisViewMode === 'single' ? 'text-sky-50' : 'text-slate-500'
                      }`}>
                        SV1 & 3 (OFF/Closed), SV2 & 4 (ON/Open). Otomatis aktif saat mati daya.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFlowVisViewMode('compare')}
                      className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                        flowVisViewMode === 'compare'
                          ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white border-purple-600 shadow-lg shadow-purple-600/25 ring-2 ring-purple-300'
                          : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="font-extrabold text-sm flex items-center gap-2">
                          <span className="p-1 rounded-lg bg-white/20">📊</span> Bandingkan Both Mode
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          flowVisViewMode === 'compare' ? 'bg-white/25 text-white' : 'bg-purple-100 text-purple-700'
                        }`}>
                          Dual View
                        </span>
                      </div>
                      <p className={`text-[11px] mt-2 leading-relaxed ${
                        flowVisViewMode === 'compare' ? 'text-purple-50' : 'text-slate-500'
                      }`}>
                        Tampilkan diagram visual Co-Current dan Counter-Current secara bersamaan.
                      </p>
                    </button>
                  </div>
                </div>

                {flowVisViewMode === 'single' ? (
                  renderPIDDiagram(operationMode)
                ) : (
                  <div className="space-y-6">
                    <div className="text-xs font-bold text-slate-700 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-600" /> Tampilan Perbandingan Dual Diagram (Co-Current vs Counter-Current)
                    </div>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                      {renderPIDDiagram('Co-Current', '(Pola Searah)')}
                      {renderPIDDiagram('Counter-Current', '(Pola Arah Berlawanan)')}
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: CONTROL PANEL */}
          {activeTab === 'control' && (
            <div className="space-y-6 max-w-5xl mx-auto">

              {/* ─── SUPABASE REALTIME & BIDIRECTIONAL CONTROL PANEL ─── */}
              <div className="asklepios-card p-6 bg-white border-l-4 border-l-emerald-500 shadow-xl space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                      <Server className="w-5 h-5 text-emerald-600" /> Supabase Real-Time Telemetry & Control Center
                    </h2>
                    <p className="text-xs text-slate-500">Integrasi 2 Arah ESP32 (Real-Time Monitoring & Write Command `device_controls` row ID = 1)</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-extrabold border flex items-center gap-1.5 ${
                      supabaseStatus === 'ONLINE'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : supabaseStatus === 'CONNECTING'
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : 'bg-red-100 text-red-800 border-red-300'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${
                        supabaseStatus === 'ONLINE' ? 'bg-emerald-600 animate-pulse' : supabaseStatus === 'CONNECTING' ? 'bg-amber-600 animate-ping' : 'bg-red-600'
                      }`} />
                      Koneksi: {supabaseStatus}
                    </span>
                    {isUpdatingControl && (
                      <span className="px-2.5 py-1 bg-sky-50 text-sky-700 text-[10px] font-bold rounded-full border border-sky-200 animate-pulse">
                        Menulis ke Supabase...
                      </span>
                    )}
                  </div>
                </div>

                {supabaseError && (
                  <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{supabaseError}</span>
                  </div>
                )}


                {/* 1. Real-Time Read Telemetry Sensor Cards */}
                <div className="space-y-3">
                  <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-emerald-600" /> Telemetri Real-Time (Read Data Sensor: `telemetry_data`)
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-semibold block">Temp 1 (Suhu T1)</span>
                      <strong className="text-orange-600 font-extrabold text-base">
                        {supabaseTelemetry ? supabaseTelemetry.temp_1.toFixed(1) : latestData.ti1.toFixed(1)} °C
                      </strong>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-semibold block">Temp 2 (Suhu T2)</span>
                      <strong className="text-orange-600 font-extrabold text-base">
                        {supabaseTelemetry ? supabaseTelemetry.temp_2.toFixed(1) : latestData.ti2.toFixed(1)} °C
                      </strong>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-semibold block">Temp 3 (Suhu T3)</span>
                      <strong className="text-cyan-600 font-extrabold text-base">
                        {supabaseTelemetry ? supabaseTelemetry.temp_3.toFixed(1) : latestData.ti3.toFixed(1)} °C
                      </strong>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-semibold block">Temp 4 (Suhu T4)</span>
                      <strong className="text-cyan-600 font-extrabold text-base">
                        {supabaseTelemetry ? supabaseTelemetry.temp_4.toFixed(1) : latestData.ti4.toFixed(1)} °C
                      </strong>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-semibold block">Pressure (Tekanan)</span>
                      <strong className="text-sky-600 font-extrabold text-base">
                        {supabaseTelemetry ? supabaseTelemetry.pressure.toFixed(2) : latestData.pi1.toFixed(2)} bar
                      </strong>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-semibold block">Flow Rate (Debit Air)</span>
                      <strong className="text-emerald-600 font-extrabold text-base">
                        {supabaseTelemetry ? supabaseTelemetry.flow_rate.toFixed(1) : latestData.fc1.toFixed(1)} L/min
                      </strong>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-semibold block">Status Pemanas</span>
                      <span className={`inline-block px-2 py-0.5 mt-1 rounded text-[10px] font-extrabold ${
                        (supabaseTelemetry?.heater_status === 'ON') ? 'bg-orange-100 text-orange-800' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {supabaseTelemetry ? supabaseTelemetry.heater_status : 'OFF'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-semibold block">Warning Status</span>
                      <span className={`inline-block px-2 py-0.5 mt-1 rounded text-[10px] font-extrabold ${
                        (supabaseTelemetry?.warning_status === 'NORMAL') ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {supabaseTelemetry ? supabaseTelemetry.warning_status : 'NORMAL'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Write Control Command Inputs (device_controls row id = 1) */}
                <div className="space-y-4 pt-2">
                  <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-purple-600" /> Perintah Kontrol Perangkat Dua Arah (`device_controls` row id = 1)
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                    {/* Switch Control Mode (AUTO / MANUAL) */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <label className="text-xs font-bold text-slate-800 block">Switch Control Mode</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleControlModeChange('AUTO')}
                          className={`py-2 rounded-xl text-xs font-extrabold transition ${
                            supabaseControls.control_mode === 'AUTO'
                              ? 'bg-purple-600 text-white shadow'
                              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          AUTO
                        </button>
                        <button
                          type="button"
                          onClick={() => handleControlModeChange('MANUAL')}
                          className={`py-2 rounded-xl text-xs font-extrabold transition ${
                            supabaseControls.control_mode === 'MANUAL'
                              ? 'bg-purple-600 text-white shadow'
                              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          MANUAL
                        </button>
                      </div>
                      <span className="text-[10px] text-slate-500 block">Status Saat Ini: <strong>{supabaseControls.control_mode}</strong></span>
                    </div>

                    {/* Switch Mode Aliran (COUNTER / CO-CURRENT) */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <label className="text-xs font-bold text-slate-800 block">Switch Mode Aliran (flow_mode)</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setOperationMode('Counter-Current');
                            handleFlowModeChange('COUNTER');
                          }}
                          className={`py-2 rounded-xl text-xs font-extrabold transition ${
                            supabaseControls.flow_mode === 'COUNTER'
                              ? 'bg-sky-600 text-white shadow'
                              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          COUNTER
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setOperationMode('Co-Current');
                            handleFlowModeChange('CO-CURRENT');
                          }}
                          className={`py-2 rounded-xl text-xs font-extrabold transition ${
                            supabaseControls.flow_mode === 'CO-CURRENT'
                              ? 'bg-sky-600 text-white shadow'
                              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          CO-CURRENT
                        </button>
                      </div>
                      <span className="text-[10px] text-slate-500 block">Status Saat Ini: <strong>{supabaseControls.flow_mode}</strong></span>
                    </div>

                    {/* Tombol Heater Power */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-slate-800">Heater Power Switch</label>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                          supabaseControls.heater_status ? 'bg-orange-100 text-orange-800' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {supabaseControls.heater_status ? 'POWER ON' : 'POWER OFF'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const nextState = !supabaseControls.heater_status;
                          setHeaterMasterPower(nextState);
                          handleHeaterPowerToggle(nextState);
                        }}
                        className={`w-full py-2.5 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-2 ${
                          supabaseControls.heater_status
                            ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md'
                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                      >
                        <Power className="w-4 h-4" /> {supabaseControls.heater_status ? 'Matikan Heater' : 'Nyalakan Heater'}
                      </button>
                    </div>

                    {/* Slider/Input Sudut Servo (0 - 90 Derajat) */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                        <span>Sudut Servo (servo_angle)</span>
                        <strong className="text-indigo-600 font-extrabold text-sm">{supabaseControls.servo_angle}°</strong>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="90"
                        value={supabaseControls.servo_angle}
                        onChange={(e) => handleServoAngleChange(Number(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                        <span>0° (Closed)</span>
                        <span>45° (Half)</span>
                        <span>90° (Open)</span>
                      </div>
                    </div>

                  </div>

                  {/* Slider Target Suhu (target_temp) */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                      <span>Target Setpoint Temperature (target_temp)</span>
                      <strong className="text-sky-700 font-extrabold text-base">{supabaseControls.target_temp.toFixed(1)} °C</strong>
                    </div>
                    <input
                      type="range"
                      min="30"
                      max="90"
                      step="0.5"
                      value={supabaseControls.target_temp}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setTc1Setpoint(val);
                        handleTargetTempChange(val);
                      }}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                      <span>30.0 °C</span>
                      <span>60.0 °C</span>
                      <span>90.0 °C</span>
                    </div>
                  </div>

                </div>
              </div>

              <div className="asklepios-card p-6 bg-white">
                <h2 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-sky-600" /> Manual Valve & Auxiliary Rig Controls
                </h2>
                <p className="text-xs text-slate-500 mb-6">Atur setpoint temperatur, bukaan katup flow, logika dual heater & mode solenoid valve</p>

                {emergencyStopped && (
                  <div className="mb-6 p-4 bg-red-50 border-2 border-red-500 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3 text-red-700">
                      <AlertTriangle className="w-6 h-6 animate-bounce" />
                      <div>
                        <h4 className="font-bold text-sm">EMERGENCY STOP HEATER DIBEKUKAN!</h4>
                        <p className="text-xs">Pemanas dimatikan total & katup ditutup untuk keamanan.</p>
                      </div>
                    </div>
                    <button
                      onClick={resetEmergencyStop}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow"
                    >
                      Reset & Pulihkan
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  {/* Dual Heater Control Box */}
                  <div className="p-5 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-orange-600" /> Master Dual Heater (Heater 1 & 2)
                      </span>
                      <button
                        onClick={() => {
                          if (fc1Valve === 0 && !heaterMasterPower) {
                            setPrimingNotice('Pastikan aliran fluida terisi penuh (priming) sebelum menyalakan heater untuk mencegah dry heating!');
                            return;
                          }
                          setHeaterMasterPower(!heaterMasterPower);
                        }}
                        disabled={emergencyStopped}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition ${
                          heaterMasterPower && !emergencyStopped && fc1Valve > 0
                            ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {heaterMasterPower && !emergencyStopped && fc1Valve > 0 ? 'MASTER ON' : 'MASTER OFF'}
                      </button>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1">
                      <div className="flex justify-between font-bold">
                        <span>Status Logika Kontrol Bertahap:</span>
                        <span className="text-sky-700">{dualHeaterState.stage}</span>
                      </div>
                      <p className="text-[11px] text-slate-500">{dualHeaterState.description}</p>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-semibold text-slate-700 mb-2">
                        <span>Target Setpoint Temperature (TC₁)</span>
                        <strong className="text-sky-700 font-bold text-sm">{tc1Setpoint}°C</strong>
                      </div>
                      <input
                        type="range"
                        min="30"
                        max="90"
                        value={tc1Setpoint}
                        onChange={(e) => setTc1Setpoint(Number(e.target.value))}
                        disabled={emergencyStopped || !heaterMasterPower}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-semibold">
                        <span>30°C</span>
                        <span>60°C</span>
                        <span>90°C</span>
                      </div>
                    </div>
                  </div>

                  {/* Flow Pattern Mode Switch */}
                  <div className="p-5 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-4">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                      <ArrowRightLeft className="w-4 h-4 text-sky-600" /> Mode Aliran & Solenoid Valves
                    </span>
                    <p className="text-xs text-slate-500">Pilih arah aliran (Counter-Current = Passive Fail-Safe)</p>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <button
                        onClick={() => setOperationMode('Counter-Current')}
                        className={`p-3 rounded-xl border text-xs font-bold text-center transition ${
                          operationMode === 'Counter-Current'
                            ? 'bg-sky-600 text-white border-sky-600 shadow-md shadow-sky-600/20'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Counter-Current
                        <p className="text-[10px] opacity-80 mt-0.5 font-normal">Fail-Safe Pasif (Default)</p>
                      </button>

                      <button
                        onClick={() => setOperationMode('Co-Current')}
                        className={`p-3 rounded-xl border text-xs font-bold text-center transition ${
                          operationMode === 'Co-Current'
                            ? 'bg-sky-600 text-white border-sky-600 shadow-md shadow-sky-600/20'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Co-Current
                        <p className="text-[10px] opacity-80 mt-0.5 font-normal">Aliran Searah</p>
                      </button>
                    </div>
                  </div>

                  {/* Valve FC1 (Hot Fluid Flow) */}
                  <div className="p-5 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3">
                    <div className="flex justify-between text-xs font-bold text-slate-800">
                      <span>Bukaan Katup FC1 (Air Panas)</span>
                      <span className="text-orange-600 font-extrabold text-sm">{fc1Valve}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={fc1Valve}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setFc1Valve(val);
                        if (val === 0 && heaterMasterPower) {
                          setPrimingNotice('Katup air panas ditutup. Pemanas secara otomatis standby untuk mencegah dry heating.');
                        }
                      }}
                      disabled={emergencyStopped}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="text-[11px] text-slate-500 flex justify-between">
                      <span>Laju Alir Estimasi:</span>
                      <strong>{((fc1Valve / 100) * 25).toFixed(1)} L/min</strong>
                    </div>
                  </div>

                  {/* Valve FC2 (Cold Fluid Flow) */}
                  <div className="p-5 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3">
                    <div className="flex justify-between text-xs font-bold text-slate-800">
                      <span>Bukaan Katup FC2 (Air Dingin)</span>
                      <span className="text-cyan-600 font-extrabold text-sm">{fc2Valve}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={fc2Valve}
                      onChange={(e) => setFc2Valve(Number(e.target.value))}
                      disabled={emergencyStopped}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="text-[11px] text-slate-500 flex justify-between">
                      <span>Laju Alir Estimasi:</span>
                      <strong>{((fc2Valve / 100) * 30).toFixed(1)} L/min</strong>
                    </div>
                  </div>

                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="text-xs text-slate-500">
                    *Tombol Merah Darurat akan mematikan pemanas dan trip katup secara konstan.
                  </div>

                  <button
                    onClick={triggerEmergencyStop}
                    disabled={emergencyStopped}
                    className="w-full sm:w-auto px-6 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 transform active:scale-95 transition"
                  >
                    <Power className="w-4 h-4" /> EMERGENCY STOP HEATER
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* TAB 3: CCTV LIVE MONITORING */}
          {activeTab === 'cctv' && (
            <div className="space-y-6">
              <div className="asklepios-card p-6 bg-white">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Video className="w-5 h-5 text-sky-600" /> Live CCTV Camera Feed - Lab HE UAD
                    </h2>
                    <p className="text-xs text-slate-500">RTSP / HLS Live Stream Rig Shell and Tube Heat Exchanger</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedCamera('webcam');
                        setCameraFacing('user');
                        setSelectedDeviceId('');
                      }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                        selectedCamera === 'webcam' && cameraFacing === 'user'
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 ring-2 ring-emerald-300'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <Camera className="w-3.5 h-3.5" /> 📷 Kamera Depan
                    </button>

                    <button
                      onClick={() => {
                        setSelectedCamera('webcam');
                        setCameraFacing('environment');
                        setSelectedDeviceId('');
                      }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                        selectedCamera === 'webcam' && cameraFacing === 'environment'
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 ring-2 ring-emerald-300'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <Camera className="w-3.5 h-3.5" /> 📷 Kamera Belakang
                    </button>

                    {videoDevices.length > 1 && (
                      <select
                        value={selectedDeviceId}
                        onChange={(e) => {
                          setSelectedCamera('webcam');
                          setSelectedDeviceId(e.target.value);
                        }}
                        className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                      >
                        <option value="">-- Pilih Perangkat Kamera ({videoDevices.length}) --</option>
                        {videoDevices.map((dev, idx) => (
                          <option key={dev.deviceId || idx} value={dev.deviceId}>
                            {dev.label || `Kamera Web ${idx + 1}`}
                          </option>
                        ))}
                      </select>
                    )}

                    <button
                      onClick={() => setSelectedCamera('cam1')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                        selectedCamera === 'cam1'
                          ? 'bg-sky-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Kamera 1: Rig HE
                    </button>
                    <button
                      onClick={() => setSelectedCamera('cam2')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                        selectedCamera === 'cam2'
                          ? 'bg-sky-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Kamera 2: Tanki Storage
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 relative bg-slate-900 rounded-3xl overflow-hidden shadow-xl aspect-video flex flex-col justify-between p-4 border border-slate-800">
                    {selectedCamera === 'webcam' ? (
                      webcamActive ? (
                        <video
                          ref={webcamVideoRef}
                          autoPlay
                          playsInline
                          muted
                          className="absolute inset-0 w-full h-full object-cover rounded-3xl"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 text-center z-0">
                          <Camera className="w-12 h-12 text-amber-400 mb-2 animate-bounce" />
                          <p className="text-sm font-bold text-slate-200">Izin Kamera Diperlukan</p>
                          <p className="text-xs text-amber-300/90 mt-1 max-w-md bg-amber-500/10 p-3 rounded-2xl border border-amber-500/20">
                            {webcamError || 'Klik ikon Kamera di URL Bar Chrome (localhost:3000) lalu pilih "Izinkan / Allow".'}
                          </p>
                          <div className="flex gap-2 mt-4">
                            <button
                              onClick={() => {
                                setCameraFacing('user');
                                setSelectedCamera('cam1');
                                setTimeout(() => setSelectedCamera('webcam'), 100);
                              }}
                              className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md hover:bg-emerald-700 transition"
                            >
                              📷 Coba Kamera Depan Lagi
                            </button>
                          </div>
                        </div>
                      )
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center opacity-90 pointer-events-none">
                        <div className="w-full h-full border border-sky-500/10 grid grid-cols-6 grid-rows-4" />
                      </div>
                    )}

                    <div className="relative z-10 flex justify-between items-center text-xs text-white/90 font-mono">
                      <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                        <span>
                          {selectedCamera === 'webcam' ? `💻 KAMERA LAPTOP (${cameraFacing === 'user' ? 'DEPAN' : 'BELAKANG'})` : selectedCamera === 'cam1' ? 'LIVE STREAM | CAM 01 - HE RIG' : 'LIVE STREAM | CAM 02 - STORAGE TANK'}
                        </span>
                      </div>
                      <span className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
                        {new Date().toLocaleDateString('id-ID')} - {new Date().toLocaleTimeString('id-ID')}
                      </span>
                    </div>

                    {selectedCamera !== 'webcam' && (
                      <div className="relative z-10 text-center my-auto">
                        <div className="inline-flex p-5 bg-sky-500/10 rounded-full border border-sky-400/20 text-sky-400 mb-2 animate-pulse">
                          <Video className="w-12 h-12" />
                        </div>
                        <p className="text-xs text-slate-300 font-semibold">Feed Kamera Realtime Lab IoT Teknik Kimia</p>
                        <p className="text-[10px] text-slate-500">1080p @ 30 FPS - Encoding H.264 / RTSP</p>
                      </div>
                    )}

                    <div className="relative z-10 flex justify-between items-center bg-black/60 backdrop-blur-md p-2.5 rounded-2xl border border-white/20 mt-auto">
                      <div className="flex items-center gap-2 text-white">
                        <button onClick={() => setCctvRecording(!cctvRecording)} className="p-1.5 hover:bg-white/10 rounded-lg">
                          {cctvRecording ? <Pause className="w-4 h-4 text-emerald-400" /> : <Play className="w-4 h-4" />}
                        </button>
                        <span className="text-[11px] text-slate-300 font-medium">Auto-record: Active</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button title="Ambil Foto Snapshot" className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold flex items-center gap-1">
                          <Camera className="w-4 h-4" /> Snapshot
                        </button>
                        <button title="Layar Penuh" className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg">
                          <Maximize2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                  </div>

                  <div className="asklepios-card p-5 bg-slate-900 text-white rounded-3xl space-y-4 border border-slate-800">
                    <h3 className="text-sm font-bold flex items-center gap-2 text-sky-400">
                      <Activity className="w-4 h-4" /> Telemetri Overlay Live
                    </h3>

                    <div className="space-y-3 text-xs">
                      <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/60 flex justify-between items-center">
                        <span className="text-slate-400">TI1 (Hot Inlet):</span>
                        <strong className="text-orange-400 text-sm font-bold">{latestData.ti1}°C</strong>
                      </div>

                      <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/60 flex justify-between items-center">
                        <span className="text-slate-400">TI2 (Heater 2 Output):</span>
                        <strong className="text-red-400 text-sm font-bold">{latestData.ti2}°C</strong>
                      </div>

                      <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/60 flex justify-between items-center">
                        <span className="text-slate-400">PI1 Pressure:</span>
                        <strong className="text-sky-400 text-sm font-bold">{latestData.pi1} bar</strong>
                      </div>

                      <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/60 flex justify-between items-center">
                        <span className="text-slate-400">Flow FC1 (Hot):</span>
                        <strong className="text-emerald-400 text-sm font-bold">{latestData.fc1} L/min</strong>
                      </div>

                      <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/60 flex justify-between items-center">
                        <span className="text-slate-400">Status Dual Heater:</span>
                        <strong className={dualHeaterState.powerWatt > 0 ? "text-emerald-400 font-bold" : "text-slate-400"}>
                          {dualHeaterState.powerWatt > 0 ? `ON (${dualHeaterState.powerWatt}W)` : 'OFF'}
                        </strong>
                      </div>
                    </div>

                    <div className="pt-2 text-[11px] text-slate-400 leading-relaxed">
                      Telemetri disinkronkan secara *live* saat mengawasi visual fisik alat HE via kamera CCTV.
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 4: DATA LOGS & EXPORT LAPORAN */}
          {activeTab === 'logs' && (
            <div className="space-y-6">
              <div className="asklepios-card p-6 bg-white shadow-xl rounded-3xl border border-slate-200">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                      <FileText className="w-6 h-6 text-sky-600" /> Laporan Monitoring Heat Exchanger
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">Ekspor data telemetri historis sesuai interval pencatatan (1s, 5s, 30s, 1m)</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 no-print">
                    <button
                      onClick={exportExcelXLSX}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition active:scale-95"
                    >
                      <Download className="w-4 h-4" /> Export Excel (.xlsx)
                    </button>
                    <button
                      onClick={exportStyledExcelHTML}
                      className="px-4 py-2.5 bg-gradient-to-r from-sky-700 to-blue-800 hover:from-sky-800 hover:to-blue-900 text-white rounded-xl text-xs font-bold shadow-md shadow-sky-700/20 flex items-center gap-1.5 transition active:scale-95"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300" /> Export Excel Warna (.xls)
                    </button>
                    <button
                      onClick={exportPDFReport}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition active:scale-95"
                    >
                      <FileText className="w-4 h-4" /> Cetak / PDF Laporan
                    </button>
                  </div>
                </div>

                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/90 mb-6 space-y-1.5 text-xs">
                  <h1 className="text-base font-extrabold text-slate-900 tracking-wide">LAPORAN MONITORING HEAT EXCHANGER UAD</h1>
                  <p className="text-slate-600 font-medium">Sistem: <strong className="text-slate-800">Heat Exchanger Thermal Analytics (Interval Sampling: {logInterval})</strong></p>
                  <p className="text-slate-600 font-medium">
                    Rentang Data: <strong className="text-slate-800">{new Date().toLocaleDateString('id-ID')}, {telemetryHistory[0]?.timestamp || '10.54.51'} WIB s.d. {new Date().toLocaleDateString('id-ID')}, {telemetryHistory[telemetryHistory.length - 1]?.timestamp || '12.31.41'} WIB</strong>
                  </p>
                  <p className="text-slate-600 font-medium">
                    Dicetak Pada: <strong className="text-slate-800">{new Date().toLocaleDateString('id-ID')}, {new Date().toLocaleTimeString('id-ID').replace(/:/g, '.')} WIB</strong>
                  </p>
                </div>

                {/* Filter Controls Bar with 30s option */}
                <div className="p-4 bg-white rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 no-print shadow-sm">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Cari Waktu / Sensor</label>
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={logSearchQuery}
                        onChange={(e) => setLogSearchQuery(e.target.value)}
                        placeholder="Contoh: 12.31..."
                        className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Interval Sampling Pencatatan</label>
                    <select
                      value={logInterval}
                      onChange={(e) => setLogInterval(e.target.value as '1s' | '5s' | '30s' | '1m')}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-bold focus:outline-none"
                    >
                      <option value="1s">1 Detik (High Frequency)</option>
                      <option value="5s">5 Detik (Default Realtime)</option>
                      <option value="30s">30 Detik (Interval Sedang)</option>
                      <option value="1m">1 Menit (Ringkasan Lab)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Rentang Tanggal</label>
                    <select
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none"
                    >
                      <option value="Today">Hari Ini ({new Date().toLocaleDateString('id-ID')})</option>
                      <option value="Yesterday">Kemarin</option>
                      <option value="7Days">7 Hari Terakhir</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-300 rounded-xl shadow-sm">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#0B2545] text-white font-bold text-center border-b border-slate-400">
                        <th className="p-3 border-r border-slate-600 text-left">Waktu (Timestamp)</th>
                        <th className="p-3 border-r border-slate-600">T1 - Hot Inlet (°C)</th>
                        <th className="p-3 border-r border-slate-600">T2 - Hot Outlet (°C)</th>
                        <th className="p-3 border-r border-slate-600">T3 - Cold Inlet (°C)</th>
                        <th className="p-3 border-r border-slate-600">T4 - Cold Outlet (°C)</th>
                        <th className="p-3 border-r border-slate-600">Heater 1</th>
                        <th className="p-3 border-r border-slate-600">Heater 2</th>
                        <th className="p-3">Mode Aliran</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-center font-medium">
                      {filteredLogsData.map((row, idx) => (
                        <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50 hover:bg-sky-50/50 transition' : 'bg-white hover:bg-sky-50/50 transition'}>
                          <td className="p-2.5 border-r border-slate-200 text-left font-mono font-semibold text-slate-800">
                            {new Date().toLocaleDateString('id-ID')}, {row.timestamp} WIB
                          </td>
                          <td className="p-2.5 border-r border-slate-200 font-mono font-semibold text-slate-800">{row.ti1.toFixed(2)}</td>
                          <td className="p-2.5 border-r border-slate-200 font-mono font-semibold text-slate-800">{row.ti2.toFixed(2)}</td>
                          <td className="p-2.5 border-r border-slate-200 font-mono font-semibold text-slate-800">{row.ti3.toFixed(2)}</td>
                          <td className="p-2.5 border-r border-slate-200 font-mono font-semibold text-slate-800">{row.ti4.toFixed(2)}</td>
                          <td className="p-2.5 border-r border-slate-200">
                            {row.heater1Active ? (
                              <span className="text-emerald-600 font-extrabold px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 inline-block">ON</span>
                            ) : (
                              <span className="text-slate-400 font-bold px-2 py-0.5 rounded bg-slate-100 inline-block">OFF</span>
                            )}
                          </td>
                          <td className="p-2.5 border-r border-slate-200">
                            {row.heater2Active ? (
                              <span className="text-emerald-600 font-extrabold px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 inline-block">ON</span>
                            ) : (
                              <span className="text-slate-400 font-bold px-2 py-0.5 rounded bg-slate-100 inline-block">OFF</span>
                            )}
                          </td>
                          <td className="p-2.5 font-bold text-slate-700">{row.mode}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex justify-between items-center text-xs text-slate-500 no-print">
                  <span>Menampilkan {filteredLogsData.length} baris data telemetri (Sampling: {logInterval})</span>
                  <span>Halaman 1 dari 1</span>
                </div>

              </div>
            </div>
          )}

          {/* TAB 5: ALARM SYSTEM */}
          {activeTab === 'alarms' && (
            <div className="space-y-6">
              <div className="asklepios-card p-6 bg-white">
                <h2 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-red-600" /> Alarm & Siren Management System
                </h2>
                <p className="text-xs text-slate-500 mb-6">Konfigurasi nilai ambang batas kritis (threshold) dan riwayat log peringatan</p>

                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
                        step="0.05"
                        value={deltaPMaxThreshold}
                        onChange={(e) => setDeltaPMaxThreshold(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800"
                      />
                      <span className="text-xs text-slate-500 font-semibold">bar</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Status Sound Siren Audio</label>
                    <button
                      onClick={() => setSoundEnabled(!soundEnabled)}
                      className={`w-full py-2 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                        soundEnabled
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
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.severity === 'Critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
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
                                onClick={() => {
                                  setAlarmLogs(alarmLogs.map((a) => (a.id === item.id ? { ...a, acknowledged: true } : a)));
                                }}
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
            </div>
          )}

          {/* TAB 6: USER MANAGEMENT & SESSION LIMITS (3-TIER ROLE ACCESS) */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              {currentUser.role !== 'admin' && currentUser.role !== 'developer' ? (
                <div className="asklepios-card p-8 bg-white text-center space-y-3">
                  <div className="inline-flex p-4 bg-red-50 text-red-600 rounded-full mb-2">
                    <Lock className="w-8 h-8" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">Akses Dibatasi (Admin & Developer Only)</h2>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Halaman Manajemen User hanya dapat diakses oleh akun dengan Role <strong>ADMIN</strong> atau <strong>DEVELOPER</strong>.
                  </p>
                </div>
              ) : (
                <div className="asklepios-card p-6 bg-white space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Users className="w-5 h-5 text-sky-600" /> User Management & Hak Akses (3-Tier RBAC)
                      </h2>
                      <p className="text-xs text-slate-500">Kelola akun Developer, Admin (Dosen/KaLab), dan Operator (Mahasiswa)</p>
                    </div>

                    <button
                      onClick={() => setShowAddUserModal(true)}
                      className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-md shadow-sky-600/20 flex items-center gap-1.5 transition"
                    >
                      <UserPlus className="w-4 h-4" /> Tambah User Baru
                    </button>
                  </div>

                  {/* Admin Setting: Session Limit for Operators */}
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-amber-900 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-600" /> Pengaturan Batas Durasi Sesi Praktikum Operator
                      </h4>
                      <p className="text-[11px] text-amber-800 mt-0.5">
                        Tentukan durasi maksimum pengoperasian alat bagi mahasiswa sebelum sesi otomatis diakhiri.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-slate-700">Durasi Sesi:</label>
                      <select
                        value={operatorSessionLimit}
                        onChange={(e) => {
                          const mins = Number(e.target.value);
                          setOperatorSessionLimit(mins);
                          setOperatorSessionRemaining(mins * 60);
                        }}
                        className="px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                      >
                        <option value={15}>15 Menit</option>
                        <option value={30}>30 Menit (Default)</option>
                        <option value={60}>60 Menit (1 Jam)</option>
                        <option value={120}>120 Menit (2 Jam)</option>
                      </select>
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-slate-200/80 rounded-2xl">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                          <th className="p-3">ID User</th>
                          <th className="p-3">Nama Pengguna</th>
                          <th className="p-3">Email UAD</th>
                          <th className="p-3">Role / Hak Akses</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Login Terakhir</th>
                          <th className="p-3">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {usersList.map((u) => (
                          <tr key={u.id} className="hover:bg-slate-50/80 transition">
                            <td className="p-3 font-mono font-bold text-slate-600">{u.id}</td>
                            <td className="p-3 font-bold text-slate-900">{u.name}</td>
                            <td className="p-3 text-slate-600">{u.email}</td>
                            <td className="p-3">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                u.role === 'developer'
                                  ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                  : u.role === 'admin'
                                  ? 'bg-sky-100 text-sky-700 border border-sky-200'
                                  : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                              }`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                u.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                              }`}>
                                {u.status}
                              </span>
                            </td>
                            <td className="p-3 text-slate-500">{u.lastLogin}</td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    const nextRole: UserRole = u.role === 'operator' ? 'admin' : u.role === 'admin' ? 'developer' : 'operator';
                                    setUsersList(usersList.map((x) => (x.id === u.id ? { ...x, role: nextRole } : x)));
                                  }}
                                  className="p-1 text-slate-400 hover:text-sky-600 rounded-lg hover:bg-slate-100"
                                  title="Ubah Role"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    setUsersList(usersList.filter((x) => x.id !== u.id));
                                  }}
                                  className="p-1 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100"
                                  title="Hapus User"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                </div>
              )}
            </div>
          )}

          {/* TAB 7: DEVELOPER CONTROL & HARDWARE INTEGRATION */}
          {activeTab === 'developer' && (
            <div className="space-y-6">
              <div className="asklepios-card p-6 bg-white space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-purple-900 flex items-center gap-2">
                      <Code className="w-5 h-5 text-purple-600" /> Developer Mode & Hardware Protocol Inspector
                    </h2>
                    <p className="text-xs text-slate-500">Konfigurasi integrasi Modbus RTU / RS485, MQTT topic stream, dan kalibrasi sensor</p>
                  </div>
                  <span className="px-3 py-1 bg-purple-100 text-purple-800 font-extrabold text-xs rounded-full border border-purple-200">
                    Developer Privilege Active
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Modbus & MQTT Config Box */}
                  <div className="p-5 bg-purple-50/50 rounded-2xl border border-purple-200 space-y-4">
                    <h3 className="text-xs font-bold text-purple-900 flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-purple-600" /> Protocol Hardware Settings
                    </h3>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Port Serial Modbus RTU (RS485):</label>
                      <input
                        type="text"
                        value={modbusPort}
                        onChange={(e) => setModbusPort(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs font-mono text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">MQTT Broker Endpoint & Topic:</label>
                      <input
                        type="text"
                        value={mqttBroker}
                        onChange={(e) => setMqttBroker(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs font-mono text-slate-800"
                      />
                    </div>
                  </div>

                  {/* Calibration Offset Sliders */}
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                    <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-sky-600" /> Sensor Calibration Offsets
                    </h3>

                    <div>
                      <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                        <span>Temperature Sensor Offset (TI1-TI6)</span>
                        <strong>{tempOffset > 0 ? `+${tempOffset}` : tempOffset}°C</strong>
                      </div>
                      <input
                        type="range"
                        min="-5"
                        max="5"
                        step="0.1"
                        value={tempOffset}
                        onChange={(e) => setTempOffset(Number(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                        <span>Pressure Transducer Offset (PI1-PI4)</span>
                        <strong>{pressOffset > 0 ? `+${pressOffset}` : pressOffset} bar</strong>
                      </div>
                      <input
                        type="range"
                        min="-0.5"
                        max="0.5"
                        step="0.01"
                        value={pressOffset}
                        onChange={(e) => setPressOffset(Number(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Raw Telemetry JSON Payload Stream */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-slate-600" /> Live Modbus/MQTT Raw Payload Stream (JSON Inspector)
                  </h3>
                  <pre className="p-4 bg-slate-950 text-emerald-400 font-mono text-xs rounded-2xl overflow-x-auto max-h-64 shadow-inner border border-slate-800">
                    {JSON.stringify(
                      {
                        device_id: 'HE-RIG-UAD-01',
                        firmware_version: 'v2.5-DualHeater-SV4',
                        protocol: 'Modbus-RTU over RS485',
                        timestamp: latestData.timestamp,
                        relays: {
                          relay_1_heater1: dualHeaterState.h1,
                          relay_2_heater2: dualHeaterState.h2,
                          relay_3_sv1_nc: solenoidValves.sv1.active,
                          relay_4_sv2_no: solenoidValves.sv2.active,
                          relay_5_sv3_nc: solenoidValves.sv3.active,
                          relay_6_sv4_no: solenoidValves.sv4.active
                        },
                        telemetry: {
                          ti1_hot_in: latestData.ti1,
                          ti2_hot_out: latestData.ti2,
                          ti3_cold_in: latestData.ti3,
                          ti4_cold_out: latestData.ti4,
                          pi1_hot_in: latestData.pi1,
                          pi2_hot_out: latestData.pi2,
                          delta_p_hot: deltaPHot,
                          fc1_flow_hot: latestData.fc1,
                          fc2_flow_cold: latestData.fc2
                        }
                      },
                      null,
                      2
                    )}
                  </pre>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

    </div>
  );
}
