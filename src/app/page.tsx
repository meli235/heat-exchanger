'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { uploadToCloud } from '@/lib/supabase-upload';
import { uploadToDrive } from '@/lib/drive-upload';
import { useSupabaseIntegration } from '@/hooks/useSupabaseIntegration';
import GuidedTour from '@/components/GuidedTour';
import CCTVHistory from '@/components/CCTVHistory';
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
  Cloud,
  CloudCheck,
  Calendar,
  Database,
  HardDrive,
  ExternalLink,
  ShieldCheck,
  Search,
  Filter,
  UserPlus,
  HelpCircle,
  RefreshCw,
  LogOut,
  ChevronRight,
  Eye,
  EyeOff,
  Camera,
  Play,
  Pause,
  Maximize2,
  Folder,
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
  Check,
  Menu,
  Radio,
  Mail,
  Key,
  Send,
  Mic,
  MicOff,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Compass,
  Film,
  Square,
  SlidersHorizontal,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  Disc,
  Volume1
} from 'lucide-react';
import {
  TelemetryCards,
  PidDiagram,
  LiveChart,
  StatCards
} from '@/components/dashboard';
import {
  HeaterControl,
  FlowModeSelector,
  ServoControl,
  TargetTempSlider
} from '@/components/control';
import { LoginScreen } from '@/components/auth';
import { CctvTab } from '@/components/cctv';
import { LogsTab } from '@/components/logs';
import { AlarmsTab } from '@/components/alarms';
import { UsersTab } from '@/components/users';
import {
  calculateLMTD,
  calculateAutoControlParameters,
  calculatePressureDrop
} from '@/lib/calculations';
import {
  UserRole,
  UserItem,
  TelemetryPoint,
  AlarmEvent,
  FlowMode
} from '@/types';



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
    activeMomentaryButtons,
    isUpdatingControl,
    handleFlowModeChange,
    handleControlModeChange,
    handleHeaterPowerToggle,
    handleTargetTempChange,
    handleServoAngleChange,
    handleTargetFlowChange,
    handleUapStatusToggle,
    handleAirDinginToggle,
    handleMomentaryButtonPress
  } = useSupabaseIntegration();

  // Dynamic Temperature Labels based on Active flow_mode ("COUNTER" vs "CO-CURRENT")
  const tempLabels = useMemo(() => {
    const isCounter = (supabaseControls?.flow_mode || 'COUNTER') === 'COUNTER';
    if (isCounter) {
      return {
        t1: 'TI1 (Hot Inlet)',
        t2: 'TI2 (Hot Outlet)',
        t3: 'TI3 (Cold Inlet)',
        t4: 'TI4 (Cold Outlet)',
      };
    } else {
      return {
        t1: 'TI1 (Hot Outlet)',
        t2: 'TI2 (Hot Inlet)',
        t3: 'TI3 (Cold Outlet)',
        t4: 'TI4 (Cold Inlet)',
      };
    }
  }, [supabaseControls?.flow_mode]);

  useEffect(() => {
    if (supabaseControls?.flow_mode) {
      setOperationMode(supabaseControls.flow_mode === 'CO-CURRENT' ? 'Co-Current' : 'Counter-Current');
    }
  }, [supabaseControls?.flow_mode]);

  const [inputAnonKey, setInputAnonKey] = useState<string>('');
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);

  // ─── VISUAL IOT SYNC TRANSMISSION FEEDBACK ───
  const [syncFeedback, setSyncFeedback] = useState<{
    active: boolean;
    message: string;
    detail: string;
    type: 'syncing' | 'success' | 'idle';
  }>({
    active: false,
    message: 'Tersinkronisasi',
    detail: 'Semua perintah terkirim ke ESP32',
    type: 'idle'
  });

  const syncTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerSyncFeedback = (commandName: string, valueStr: string) => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);

    // Step 1: Visual sending status
    setSyncFeedback({
      active: true,
      message: `Mengirim: ${commandName} (${valueStr})`,
      detail: `Data sedang dikirim ke mikrokontroler ESP32 via IoT Cloud...`,
      type: 'syncing'
    });

    // Step 2: Smooth transition to Success Ack after 500ms
    setTimeout(() => {
      setSyncFeedback({
        active: true,
        message: `Tersinkron: ${commandName}`,
        detail: `Nilai ${valueStr} berhasil diterima & aktif di mikrokontroler.`,
        type: 'success'
      });
    }, 500);

    // Step 3: Hold visibly for 3 seconds then fade out
    syncTimerRef.current = setTimeout(() => {
      setSyncFeedback((prev) => ({ ...prev, active: false, type: 'idle' }));
    }, 3200);
  };

  // ─── AUTO-CONTROL PARAMETER REGULATION FUNCTION ───
  const applyAutoControl = (targetTemp: number) => {
    const { autoServo, autoFc1, autoFc2 } = calculateAutoControlParameters(targetTemp);
    setFc1Valve(autoFc1);
    setFc2Valve(autoFc2);
    setHeaterMasterPower(true);
    handleServoAngleChange(autoServo);
    handleHeaterPowerToggle(true);
  };


  // ─── AUTH & ROLE STATE ───
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; role: UserRole }>({
    name: 'Dr. Ir. Budi Santoso',
    email: 'admin@uad.ac.id',
    role: 'admin'
  });
  const [loginEmail, setLoginEmail] = useState<string>('admin@uad.ac.id');
  const [loginPassword, setLoginPassword] = useState<string>('12345678');
  const [selectedDemoRole, setSelectedDemoRole] = useState<UserRole>('admin');

  // ─── NAVIGATION & TOUR STATE ───
  const [activeTab, setActiveTab] = useState<'dashboard' | 'control' | 'cctv' | 'cctv-history' | 'logs' | 'alarms' | 'users'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isTourOpen, setIsTourOpen] = useState<boolean>(false);
  const [isCloudDriveModalOpen, setIsCloudDriveModalOpen] = useState<boolean>(false);
  const [cloudLastSyncTime, setCloudLastSyncTime] = useState<string>(new Date().toLocaleTimeString('id-ID'));

  // ─── 24/7 CCTV HISTORY RECORDINGS STATES ───
  const [recordings, setRecordings] = useState<any[]>([]);
  const [activeRecording, setActiveRecording] = useState<string | null>(null);

  const fetchRecordings = async () => {
    try {
      const res = await fetch('/api/cctv/recordings');
      const data = await res.json();
      setRecordings(data.recordings || []);
    } catch (err) {
      console.error('Fetch recordings error:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'cctv-history') {
      fetchRecordings();
    }
  }, [activeTab]);

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
  const [deltaPMaxThreshold, setDeltaPMaxThreshold] = useState<number>(2.0);
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
      value: 2.15,
      threshold: 2.00,
      severity: 'Warning',
      acknowledged: false
    }
  ]);

  // ─── USER MANAGEMENT STATE (2-TIER: ADMIN, OPERATOR) ───
  const todayStr = new Date().toISOString().slice(0, 10);
  const [usersList, setUsersList] = useState<UserItem[]>([
    { id: 'USR-01', name: 'Dwi Melianti (Admin Utama / Dosen)', email: 'dwimeliantiistiqomah55@gmail.com', role: 'admin', status: 'Active', lastLogin: 'Hari ini, 14:15', isScheduleRestricted: false },
    { id: 'USR-02', name: 'Dwi Melianti (Mahasiswa ITENAS)', email: 'dwi.melianti@mhs.itenas.ac.id', role: 'operator', status: 'Active', lastLogin: 'Hari ini, 13:50', isScheduleRestricted: true, allowedStartDate: todayStr, allowedEndDate: todayStr, allowedStartTime: '07:00', allowedEndTime: '18:00' },
    { id: 'USR-03', name: 'wink (Mahasiswa Operator)', email: 'mr.winkyy23@gmail.com', role: 'operator', status: 'Active', lastLogin: 'Hari ini, 14:30', isScheduleRestricted: true, allowedStartDate: todayStr, allowedEndDate: todayStr, allowedStartTime: '07:00', allowedEndTime: '18:00' },
    { id: 'USR-04', name: 'Dr. Ir. Budi Santoso (Dosen / KaLab)', email: 'admin@uad.ac.id', role: 'admin', status: 'Active', lastLogin: 'Hari ini, 14:15', isScheduleRestricted: false },
    { id: 'USR-05', name: 'Rahmat Hidayat (Mahasiswa Operator)', email: 'operator@uad.ac.id', role: 'operator', status: 'Active', lastLogin: 'Hari ini, 13:40', isScheduleRestricted: true, allowedStartDate: todayStr, allowedEndDate: todayStr, allowedStartTime: '07:00', allowedEndTime: '18:00' }
  ]);
  const [showAddUserModal, setShowAddUserModal] = useState<boolean>(false);
  const [newUserName, setNewUserName] = useState<string>('');
  const [newUserEmail, setNewUserEmail] = useState<string>('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('operator');
  const [newUserRestricted, setNewUserRestricted] = useState<boolean>(true);
  const [newUserStartDate, setNewUserStartDate] = useState<string>(todayStr);
  const [newUserEndDate, setNewUserEndDate] = useState<string>(todayStr);
  const [newUserStartTime, setNewUserStartTime] = useState<string>('07:00');
  const [newUserEndTime, setNewUserEndTime] = useState<string>('18:00');
  const [userToDelete, setUserToDelete] = useState<UserItem | null>(null);

  // Active Session Lock State (Ensures ONLY 1 Active Account at a time)
  const [activeSession, setActiveSession] = useState<{
    email: string;
    name: string;
    role: string;
    loginTime: string;
    lastHeartbeat: number;
  } | null>(null);

  // ─── AUTH & SECURE EMAIL OTP PASSWORD RESET STATES ───
  const DEFAULT_PASSWORDS: Record<string, string> = {
    'dwimeliantiistiqomah55@gmail.com': 'admin123',
    'dwi.melianti@mhs.itenas.ac.id': 'operator123',
    'mr.winkyy23@gmail.com': 'LZY8aTLn',
    'admin@uad.ac.id': 'admin123',
    'operator@uad.ac.id': 'operator123',
    'dev@uad.ac.id': 'dev123'
  };
  const [userPasswords, setUserPasswords] = useState<Record<string, string>>(DEFAULT_PASSWORDS);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showLoginPassword, setShowLoginPassword] = useState<boolean>(false);

  // Email OTP Reset Password Modal States
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [resetStep, setResetStep] = useState<'INPUT_EMAIL' | 'VERIFY_OTP' | 'NEW_PASSWORD' | 'SUCCESS'>('INPUT_EMAIL');
  const [resetEmailInput, setResetEmailInput] = useState<string>('dwimeliantiistiqomah55@gmail.com');
  const [generatedOtp, setGeneratedOtp] = useState<string>('');
  const [enteredOtp, setEnteredOtp] = useState<string>('');
  const [newPasswordInput, setNewPasswordInput] = useState<string>('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState<string>('');
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [otpResendCountdown, setOtpResendCountdown] = useState<number>(0);
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);
  const [smtpStatusInfo, setSmtpStatusInfo] = useState<string | null>(null);

  // Load saved passwords and user accounts from localStorage
  useEffect(() => {
    try {
      const savedPass = localStorage.getItem('fluidhe_user_passwords');
      if (savedPass) {
        setUserPasswords((prev) => ({ ...DEFAULT_PASSWORDS, ...prev, ...JSON.parse(savedPass) }));
      }
      const savedUsers = localStorage.getItem('fluidhe_user_accounts');
      if (savedUsers) {
        const parsedUsers = JSON.parse(savedUsers);
        if (Array.isArray(parsedUsers) && parsedUsers.length > 0) {
          setUsersList(parsedUsers);
        }
      }
    } catch (e) {
      console.error('Failed to load user credentials from storage', e);
    }
  }, []);

  // Single Active Session Lock & Heartbeat Synchronization Effect
  useEffect(() => {
    const checkActiveSession = () => {
      try {
        const stored = localStorage.getItem('fluidhe_active_session');
        if (stored) {
          const parsed = JSON.parse(stored);
          const now = Date.now();
          if (now - parsed.lastHeartbeat < 15000) {
            setActiveSession(parsed);
          } else {
            setActiveSession(null);
          }
        } else {
          setActiveSession(null);
        }
      } catch (e) {
        console.error(e);
      }
    };

    checkActiveSession();
    const interval = setInterval(() => {
      checkActiveSession();
      if (isLoggedIn && currentUser) {
        const mySession = {
          email: currentUser.email,
          name: currentUser.name,
          role: currentUser.role,
          loginTime: new Date().toLocaleTimeString('id-ID'),
          lastHeartbeat: Date.now()
        };
        localStorage.setItem('fluidhe_active_session', JSON.stringify(mySession));
        setActiveSession(mySession);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [isLoggedIn, currentUser]);

  // Schedule Access Validation Helper Function (Validation for Exact Single Date & Time)
  const validateScheduleAccess = (user: UserItem): { allowed: boolean; reason?: string } => {
    if (!user.isScheduleRestricted || user.role === 'admin') {
      return { allowed: true };
    }

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10); // YYYY-MM-DD format

    // 1. Validasi Rentang Tanggal (Date Range Check)
    if (user.allowedStartDate && todayStr < user.allowedStartDate) {
      return { allowed: false, reason: `Masa izin praktikum Anda belum dimulai. (Mulai: ${user.allowedStartDate})` };
    }
    if (user.allowedEndDate && todayStr > user.allowedEndDate) {
      return { allowed: false, reason: `Masa izin praktikum Anda telah berakhir pada ${user.allowedEndDate}.` };
    }

    // 2. Validasi Jam Operasional Check
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = (user.allowedStartTime || '07:00').split(':').map(Number);
    const startMinutes = startH * 60 + (startM || 0);

    const [endH, endM] = (user.allowedEndTime || '18:00').split(':').map(Number);
    const endMinutes = endH * 60 + (endM || 0);

    if (currentMinutes < startMinutes || currentMinutes > endMinutes) {
      return {
        allowed: false,
        reason: `AKSES DITOLAK (DILUAR JAM OPERASIONAL): Saat ini (${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB) berada di luar jam operasional praktikum. Jam yang diizinkan Admin: ${user.allowedStartTime || '07:00'} s.d. ${user.allowedEndTime || '18:00'} WIB.`
      };
    }

    return { allowed: true };
  };

  const [isAddingUser, setIsAddingUser] = useState<boolean>(false);
  const [addUserSuccessMsg, setAddUserSuccessMsg] = useState<string | null>(null);
  const [lastCreatedUserCredentials, setLastCreatedUserCredentials] = useState<{ email: string; name: string; password: string; role: string } | null>(null);

  // Handler for Admin adding a new user (generates random password and dispatches email)
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;

    const email = newUserEmail.toLowerCase().trim();

    if (usersList.some(u => u.email.toLowerCase() === email)) {
      alert(`User dengan email ${email} sudah terdaftar di sistem!`);
      return;
    }

    // Generate secure 8-character random password
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let randomPassword = '';
    for (let i = 0; i < 8; i++) {
      randomPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const newUser: UserItem = {
      id: `USR-0${usersList.length + 1}`,
      name: newUserName.trim(),
      email: email,
      role: newUserRole,
      status: 'Active',
      lastLogin: 'Belum Pernah',
      isScheduleRestricted: newUserRole === 'operator' ? newUserRestricted : false,
      allowedDays: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'],
      allowedStartTime: newUserStartTime || '07:00',
      allowedEndTime: newUserEndTime || '18:00'
    };

    const updatedUsers = [...usersList, newUser];
    setUsersList(updatedUsers);

    const updatedPasswords = { ...userPasswords, [email]: randomPassword };
    setUserPasswords(updatedPasswords);

    try {
      localStorage.setItem('fluidhe_user_accounts', JSON.stringify(updatedUsers));
      localStorage.setItem('fluidhe_user_passwords', JSON.stringify(updatedPasswords));
    } catch (err) {
      console.error('Failed to save to localStorage', err);
    }

    setIsAddingUser(true);
    try {
      await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          type: 'NEW_ACCOUNT',
          initialPassword: randomPassword,
          name: newUserName.trim(),
          role: newUserRole
        })
      });
    } catch (err) {
      console.error('Failed to send welcome email', err);
    } finally {
      setIsAddingUser(false);
    }

    setLastCreatedUserCredentials({
      email: email,
      name: newUserName.trim(),
      password: randomPassword,
      role: newUserRole
    });
    setNewUserName('');
    setNewUserEmail('');
    setNewUserRole('operator');
  };

  const [resendingEmailFor, setResendingEmailFor] = useState<string | null>(null);

  const handleResendUserCredentials = async (user: UserItem) => {
    const email = user.email.toLowerCase().trim();
    const currentPass = userPasswords[email] || (user.role === 'admin' ? 'admin123' : 'operator123');

    setResendingEmailFor(user.id);
    try {
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          type: 'NEW_ACCOUNT',
          initialPassword: currentPass,
          name: user.name,
          role: user.role
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(`✅ Email kredensial & kata sandi berhasil dikirim ke: ${email}`);
      } else {
        alert(`⚠️ Gagal mengirim email: ${data.message || 'Error tidak diketahui'}`);
      }
    } catch (err) {
      alert(`⚠️ Terjadi kesalahan saat mengirim email: ${err}`);
    } finally {
      setResendingEmailFor(null);
    }
  };

  // OTP Countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (otpResendCountdown > 0) {
      timer = setTimeout(() => setOtpResendCountdown(prev => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [otpResendCountdown]);

  // ─── REAL CCTV & IP CAMERA STATES (EZVIZ C6N FULL INTEGRATION) ───
  const [selectedCamera, setSelectedCamera] = useState<'cam1' | 'cam2' | 'cam3'>('cam1');
  const [cctvRecording, setCctvRecording] = useState<boolean>(true);
  const [cctvIpUrl, setCctvIpUrl] = useState<string>('http://localhost:8889/stream.html?src=he_cctv');
  const [cctvStreamSource, setCctvStreamSource] = useState<'local' | 'custom' | 'demo'>('local');
  const [isEditingCctvUrl, setIsEditingCctvUrl] = useState<boolean>(false);
  const [tempCctvUrl, setTempCctvUrl] = useState<string>('http://localhost:8889/stream.html?src=he_cctv');

  // EZVIZ Mobile App Style Controls
  const [cctvAudioMuted, setCctvAudioMuted] = useState<boolean>(false);
  const [audioUserActivated, setAudioUserActivated] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [cctvVolume, setCctvVolume] = useState<number>(85);
  const [cctvMicActive, setCctvMicActive] = useState<boolean>(false);
  const [cctvDefinition, setCctvDefinition] = useState<'1080p' | '720p' | 'auto'>('1080p');
  const [isPtzDrawerOpen, setIsPtzDrawerOpen] = useState<boolean>(false);
  const [ptzSpeed, setPtzSpeed] = useState<number>(60);
  const [ptzMoving, setPtzMoving] = useState<string | null>(null);

  // Digital Interactive PTZ States (Scale & Viewport Pan)
  const [digitalZoom, setDigitalZoom] = useState<number>(1.0);
  const [digitalPanX, setDigitalPanX] = useState<number>(0);
  const [digitalPanY, setDigitalPanY] = useState<number>(0);

  const [isManualRecording, setIsManualRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [cctvToast, setCctvToast] = useState<{ message: string; type: 'info' | 'success' | 'warning' } | null>(null);
  // ─── WEBRTC NATIVE VIDEO PLAYER REFS & STATES ───
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioTransceiverRef = useRef<RTCRtpTransceiver | null>(null);
  const webrtcStreamRef = useRef<MediaStream | null>(null);
  const [webrtcConnected, setWebrtcConnected] = useState<boolean>(false);
  const [webrtcError, setWebrtcError] = useState<string | null>(null);
  const [activeMediaTab, setActiveMediaTab] = useState<'all' | 'snapshot' | 'video'>('all');
  const [previewMediaItem, setPreviewMediaItem] = useState<{ id: string; type: 'snapshot' | 'video'; title: string; timestamp: string; url?: string; thumbnail?: string; metadata?: any } | null>(null);
  const [cctvMediaList, setCctvMediaList] = useState<Array<{ id: string; type: 'snapshot' | 'video'; title: string; timestamp: string; url?: string; thumbnail?: string; metadata?: any }>>([
    {
      id: 'snap-demo-1',
      type: 'snapshot',
      title: 'Snapshot Kalibrasi Suhu Rig HE',
      timestamp: '18/08/2026 19:25:48 WIB',
      url: '',
      metadata: { ti1: 25.0, ti2: 25.0, ti3: 25.0, ti4: 25.0, flow: 0.0 }
    }
  ]);

  // ─── DATA LOG FILTER STATES (INCLUDES 2s, 30s INTERVAL) ───
  const [logSearchQuery, setLogSearchQuery] = useState<string>('');
  const [logInterval, setLogInterval] = useState<'1s' | '2s' | '5s' | '30s' | '1m'>('2s');
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
      if (supabaseTelemetry) {
        const isHeaterOn = supabaseTelemetry.heater_status === 'ON';
        return {
          timestamp: supabaseTelemetry.created_at
            ? new Date(supabaseTelemetry.created_at).toLocaleTimeString('id-ID')
            : new Date().toLocaleTimeString('id-ID'),
          ti1: supabaseTelemetry.temp_1,
          ti2: supabaseTelemetry.temp_2,
          ti3: supabaseTelemetry.temp_3,
          ti4: supabaseTelemetry.temp_4,
          ti5: parseFloat(((supabaseTelemetry.temp_3 + supabaseTelemetry.temp_4) / 2).toFixed(1)),
          ti6: parseFloat(((supabaseTelemetry.temp_1 + supabaseTelemetry.temp_2) / 2).toFixed(1)),
          pi1: parseFloat(Number(supabaseTelemetry.pressure || 0).toFixed(2)),
          pi2: supabaseTelemetry.pressure_outlet !== undefined ? parseFloat(Number(supabaseTelemetry.pressure_outlet).toFixed(2)) : parseFloat((Number(supabaseTelemetry.pressure || 0) * 0.82).toFixed(2)),
          pi3: supabaseTelemetry.pressure_inlet_2 !== undefined ? parseFloat(Number(supabaseTelemetry.pressure_inlet_2).toFixed(2)) : parseFloat((Number(supabaseTelemetry.pressure || 0) * 0.90).toFixed(2)),
          pi4: supabaseTelemetry.pressure_outlet_2 !== undefined ? parseFloat(Number(supabaseTelemetry.pressure_outlet_2).toFixed(2)) : parseFloat((Number(supabaseTelemetry.pressure || 0) * 0.72).toFixed(2)),
          fc1: parseFloat(Number(supabaseTelemetry.flow_rate || 0).toFixed(1)),
          fc2: supabaseTelemetry.flow_rate_2 !== undefined ? parseFloat(Number(supabaseTelemetry.flow_rate_2).toFixed(1)) : parseFloat((Number(supabaseTelemetry.flow_rate || 0) * 1.15).toFixed(1)),
          tc1Setpoint: supabaseControls?.target_temp || tc1Setpoint,
          heater1Active: isHeaterOn,
          heater2Active: isHeaterOn,
          mode: (supabaseControls?.flow_mode === 'COUNTER' ? 'Counter-Current' : 'Co-Current') as any
        };
      }
      return {
        timestamp: new Date().toLocaleTimeString('id-ID'),
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
      };
    }
    return telemetryHistory[telemetryHistory.length - 1];
  }, [telemetryHistory, supabaseTelemetry, supabaseControls, tc1Setpoint, operationMode]);

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
    const streamToUse = (telemetryStream && telemetryStream.length > 0)
      ? telemetryStream
      : (supabaseTelemetry ? [supabaseTelemetry] : []);

    if (streamToUse.length > 0) {
      const realHistory: TelemetryPoint[] = streamToUse.map((row) => {
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
          pi1: parseFloat(Number(row.pressure || 0).toFixed(2)),
          pi2: row.pressure_outlet !== undefined ? parseFloat(Number(row.pressure_outlet).toFixed(2)) : parseFloat((Number(row.pressure || 0) * 0.82).toFixed(2)),
          pi3: row.pressure_inlet_2 !== undefined ? parseFloat(Number(row.pressure_inlet_2).toFixed(2)) : parseFloat((Number(row.pressure || 0) * 0.90).toFixed(2)),
          pi4: row.pressure_outlet_2 !== undefined ? parseFloat(Number(row.pressure_outlet_2).toFixed(2)) : parseFloat((Number(row.pressure || 0) * 0.72).toFixed(2)),
          fc1: parseFloat(Number(row.flow_rate || 0).toFixed(1)),
          fc2: row.flow_rate_2 !== undefined ? parseFloat(Number(row.flow_rate_2).toFixed(1)) : parseFloat((Number(row.flow_rate || 0) * 1.15).toFixed(1)),
          tc1Setpoint: supabaseControls.target_temp,
          heater1Active: isHeaterOn,
          heater2Active: isHeaterOn,
          mode: supabaseControls.flow_mode === 'COUNTER' ? 'Counter-Current' : 'Co-Current'
        };
      });
      setTelemetryHistory(realHistory);
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
  }, [supabaseStatus, supabaseTelemetry, telemetryStream, supabaseControls, tc1Setpoint, operationMode]);

  // ─── OTP PASSWORD RESET HANDLERS (SECURE EMAIL VERIFICATION FOR ALL REGISTERED USERS) ───
  const handleRequestOtp = async (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    setResetError(null);

    const email = resetEmailInput.toLowerCase().trim();
    if (!email) {
      setResetError('Silakan masukkan alamat email akun Anda.');
      return;
    }

    // Security Check: Whitelist verification (User must be registered in usersList or system accounts)
    const isRegisteredUser = usersList.some(u => u.email.toLowerCase() === email) ||
      email === 'dwimeliantiistiqomah55@gmail.com' ||
      email === 'dwi.melianti@mhs.itenas.ac.id' ||
      email === 'admin@uad.ac.id' ||
      email === 'operator@uad.ac.id' ||
      email === 'dev@uad.ac.id';

    if (!isRegisteredUser) {
      setResetError('⛔ Akses Ditolak: Alamat email ini tidak terdaftar di sistem Laboratorium. Silakan hubungi Dosen / KaLab untuk didaftarkan.');
      return;
    }

    // Generate 6-Digit OTP Code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);
    setEnteredOtp('');
    setOtpResendCountdown(60);

    // Call API /api/send-otp to send actual email
    setIsSendingEmail(true);
    setSmtpStatusInfo(null);
    try {
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, otp: code, type: 'OTP' })
      });
      const data = await res.json();
      if (data.method === 'UNCONFIGURED_SMTP') {
        setSmtpStatusInfo('UNCONFIGURED');
      } else if (data.success) {
        setSmtpStatusInfo('SENT');
      }
    } catch (err) {
      console.warn('API send-otp call:', err);
    } finally {
      setIsSendingEmail(false);
    }

    setResetStep('VERIFY_OTP');
  };

  // ─── CCTV MANUAL RECORDING TIMER & HANDLERS ───
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isManualRecording) {
      interval = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isManualRecording]);

  // ─── WEBRTC CONNECTION TO go2rtc ───
  const connectWebRTC = async () => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    setWebrtcConnected(false);
    setWebrtcError(null);

    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      pcRef.current = pc;

      pc.addTransceiver('video', { direction: 'recvonly' });
      const audioTransceiver = pc.addTransceiver('audio', { direction: 'recvonly' });
      audioTransceiverRef.current = audioTransceiver;

      pc.ontrack = (event) => {
        if (event.streams[0] && videoRef.current) {
          videoRef.current.srcObject = event.streams[0];
          webrtcStreamRef.current = event.streams[0];
          setWebrtcConnected(true);
          setWebrtcError(null);
        }
      };

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        if (state === 'connected') {
          setWebrtcConnected(true);
          setWebrtcError(null);
        } else if (state === 'failed') {
          setWebrtcConnected(false);
          setWebrtcError('Koneksi WebRTC gagal. Pastikan kamera dan go2rtc aktif.');
        } else if (state === 'disconnected' || state === 'closed') {
          setWebrtcConnected(false);
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const host = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
      let resp: Response | null = null;
      try {
        resp = await fetch(`http://${host}:8889/api/webrtc?src=he_cctv`, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: pc.localDescription?.sdp || offer.sdp,
        });
      } catch (fErr) {
        if (host !== 'localhost') {
          try {
            resp = await fetch('http://localhost:8889/api/webrtc?src=he_cctv', {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain' },
              body: pc.localDescription?.sdp || offer.sdp,
            });
          } catch (ignored) {}
        }
      }

      if (!resp || !resp.ok) {
        setWebrtcError('Kamera CCTV offline / Gagal menyambung go2rtc');
        setWebrtcConnected(false);
        return;
      }

      const answer = await resp.text();
      await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: answer }));
      setWebrtcConnected(true);
      setWebrtcError(null);
    } catch (err: any) {
      console.warn('WebRTC connect notice:', err?.message || err);
      setWebrtcError('Kamera CCTV offline');
      setWebrtcConnected(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'cctv' && cctvStreamSource === 'local') {
      connectWebRTC();
    }
    return () => {
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cctvStreamSource, activeTab]);

  // Sync audio mute with video element — uses ref to bypass browser autoplay restrictions
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = cctvAudioMuted;
      if (!cctvAudioMuted) {
        videoRef.current.volume = cctvVolume / 100;
        // Force play to resume audio after unmuting
        videoRef.current.play().catch(() => { });
      }
    }
  }, [cctvAudioMuted, cctvVolume]);

  // Sync volume with video element
  useEffect(() => {
    if (videoRef.current && !cctvAudioMuted) {
      videoRef.current.volume = cctvVolume / 100;
    }
  }, [cctvVolume, cctvAudioMuted]);

  const triggerCctvToast = (message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    setCctvToast({ message, type });
    setTimeout(() => setCctvToast(null), 3500);
  };

  const handlePtzAction = async (action: string) => {
    setPtzMoving(action);

    const actionLabels: Record<string, string> = {
      up: '⬆️ Memutar Fisik Kamera ke Atas',
      down: '⬇️ Memutar Fisik Kamera ke Bawah',
      left: '⬅️ Memutar Fisik Kamera ke Kiri',
      right: '➡️ Memutar Fisik Kamera ke Kanan',
      zoomIn: '🔍 Zoom In Lensa Kamera',
      zoomOut: '🔍 Zoom Out Lensa Kamera',
      center: '🔄 Memutar Fisik Kamera ke Posisi Awal',
    };

    triggerCctvToast(actionLabels[action] || `🎮 Perintah PTZ: ${action.toUpperCase()}`, 'info');

    try {
      const res = await fetch('/api/cctv/ptz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, speed: ptzSpeed })
      });
      const data = await res.json();
      if (data.success) {
        triggerCctvToast(`✅ Motor Fisik Kamera Berputar: ${action.toUpperCase()}`, 'success');
      }
    } catch (err) {
      console.warn('PTZ Background Dispatch:', err);
    } finally {
      setTimeout(() => setPtzMoving(null), 600);
    }
  };

  const handlePtzPreset = async (presetTitle: string, presetKey: string) => {
    triggerCctvToast(`🎯 Mengarahkan Fisik Kamera ke: ${presetTitle}`, 'info');
    try {
      const res = await fetch('/api/cctv/ptz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: presetKey, speed: ptzSpeed })
      });
      const data = await res.json();
      if (data.success) {
        triggerCctvToast(`✅ Kamera Mengarah ke: ${presetTitle}`, 'success');
      }
    } catch (err) {
      console.warn('PTZ Preset Dispatch:', err);
    }
  };

  const handleTakeSnapshot = () => {
    const video = videoRef.current;
    if (!video || !webrtcConnected) {
      triggerCctvToast('⚠️ Tidak dapat mengambil snapshot — kamera belum terhubung', 'warning');
      return;
    }

    const timeStr = new Date().toLocaleTimeString('id-ID').replace(/:/g, '-');
    const dateStr = new Date().toLocaleDateString('id-ID');

    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1920;
      canvas.height = video.videoHeight || 1080;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw current video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Add watermark overlay bar
      const barHeight = 56;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, canvas.height - barHeight, canvas.width, barHeight);
      ctx.font = 'bold 18px monospace';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`FluidHE Lab CCTV • ${dateStr} ${timeStr} WIB`, 16, canvas.height - 32);
      ctx.font = '14px monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`TI1: ${latestData.ti1}°C | TI2: ${latestData.ti2}°C | TI3: ${latestData.ti3}°C | TI4: ${latestData.ti4}°C | FC1: ${latestData.fc1} L/m`, 16, canvas.height - 10);

      const localDataUrl = canvas.toDataURL('image/png');

      canvas.toBlob(async (blob) => {
        if (!blob) return;

        const fileName = `Snapshot_HE_${timeStr}.png`;

        try {
          // Upload to Google Drive (cctv-snapshots folder)
          const driveForm = new FormData();
          driveForm.append('file', new File([blob], fileName, { type: 'image/png' }));
          driveForm.append('folder', 'cctv-snapshots');
          fetch('/api/drive', { method: 'POST', body: driveForm }).catch(err => console.error('Drive snapshot upload notice:', err));

          const result = await uploadToCloud(blob, fileName, 'cctv-snapshots');

          const newSnap = {
            id: 'snap-' + Date.now(),
            type: 'snapshot' as const,
            title: `Snapshot Lab HE (${timeStr})`,
            timestamp: `${dateStr} ${timeStr} WIB`,
            url: result.url || localDataUrl,
            metadata: {
              ti1: latestData.ti1,
              ti2: latestData.ti2,
              ti3: latestData.ti3,
              ti4: latestData.ti4,
              flow: latestData.fc1,
              heater: dualHeaterState.powerWatt > 0 ? `${dualHeaterState.powerWatt}W` : 'OFF'
            }
          };

          setCctvMediaList((prev) => [newSnap, ...prev]);
          triggerCctvToast('📸 Snapshot tersimpan di Cloud Storage!', 'success');
        } catch (err: any) {
          console.error('Snapshot Cloud upload error:', err);
          const fallbackSnap = {
            id: 'snap-' + Date.now(),
            type: 'snapshot' as const,
            title: `Snapshot Lab HE (${timeStr})`,
            timestamp: `${dateStr} ${timeStr} WIB`,
            url: localDataUrl,
            metadata: {
              ti1: latestData.ti1,
              ti2: latestData.ti2,
              ti3: latestData.ti3,
              ti4: latestData.ti4,
              flow: latestData.fc1,
              heater: dualHeaterState.powerWatt > 0 ? `${dualHeaterState.powerWatt}W` : 'OFF'
            }
          };
          setCctvMediaList((prev) => [fallbackSnap, ...prev]);
          triggerCctvToast('📸 Snapshot disimpan ke Galeri!', 'success');
        }
      }, 'image/png');
    } catch (err) {
      console.error('Snapshot capture error:', err);
      triggerCctvToast('⚠️ Gagal mengambil snapshot dari kamera', 'warning');
    }
  };

  const handleToggleManualRecord = () => {
    if (!isManualRecording) {
      // START recording
      const stream = webrtcStreamRef.current;
      if (!stream || !webrtcConnected) {
        triggerCctvToast('⚠️ Tidak dapat merekam — kamera belum terhubung', 'warning');
        return;
      }

      try {
        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : MediaRecorder.isTypeSupported('video/webm')
            ? 'video/webm'
            : '';

        if (!mimeType) {
          triggerCctvToast('⚠️ Browser tidak mendukung perekaman video', 'warning');
          return;
        }

        recordedChunksRef.current = [];
        const recorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            recordedChunksRef.current.push(e.data);
          }
        };

        recorder.start(1000);
        setIsManualRecording(true);
        triggerCctvToast('🔴 Perekaman video live dimulai...', 'warning');
      } catch (err) {
        console.error('MediaRecorder error:', err);
        triggerCctvToast('⚠️ Gagal memulai perekaman video', 'warning');
      }
    } else {
      // STOP recording
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        recorder.onstop = async () => {
          const dur = recordingSeconds;
          const timeStr = new Date().toLocaleTimeString('id-ID').replace(/:/g, '-');
          const dateStr = new Date().toLocaleDateString('id-ID');
          const blob = new Blob(recordedChunksRef.current, { type: recorder.mimeType || 'video/webm' });
          const localVideoUrl = URL.createObjectURL(blob);
          const fileName = `Recording_HE_${dur}s_${timeStr}.webm`;

          try {
            const result = await uploadToCloud(blob, fileName, 'cctv-recordings');

            const newVideo = {
              id: 'rec-' + Date.now(),
              type: 'video' as const,
              title: `Rekaman Lab HE (${dur}s)`,
              timestamp: `${dateStr} ${timeStr} WIB`,
              url: result.url || localVideoUrl,
              metadata: {
                ti1: latestData.ti1,
                ti2: latestData.ti2,
                ti3: latestData.ti3,
                ti4: latestData.ti4,
                flow: latestData.fc1,
                duration: `${dur} Detik`,
                heater: dualHeaterState.powerWatt > 0 ? `${dualHeaterState.powerWatt}W` : 'OFF'
              }
            };

            setCctvMediaList((prev) => [newVideo, ...prev]);
            triggerCctvToast(`💾 Rekaman ${dur}s tersimpan di Cloud Storage!`, 'success');
          } catch (err: any) {
            console.error('Recording Cloud upload error:', err);
            const fallbackVideo = {
              id: 'rec-' + Date.now(),
              type: 'video' as const,
              title: `Rekaman Lab HE (${dur}s)`,
              timestamp: `${dateStr} ${timeStr} WIB`,
              url: localVideoUrl,
              metadata: {
                ti1: latestData.ti1,
                ti2: latestData.ti2,
                ti3: latestData.ti3,
                ti4: latestData.ti4,
                flow: latestData.fc1,
                duration: `${dur} Detik`,
                heater: dualHeaterState.powerWatt > 0 ? `${dualHeaterState.powerWatt}W` : 'OFF'
              }
            };
            setCctvMediaList((prev) => [fallbackVideo, ...prev]);
            triggerCctvToast(`💾 Rekaman video (${dur}s) disimpan ke Galeri!`, 'success');
          }
        };
        recorder.stop();
      }
      setIsManualRecording(false);
      mediaRecorderRef.current = null;
    }
  };

  const handleToggleMic = async () => {
    if (!cctvMicActive) {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('BROWSER_INSECURE_CONTEXT');
        }
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = micStream;
        const audioTrack = micStream.getAudioTracks()[0];

        if (audioTransceiverRef.current) {
          await audioTransceiverRef.current.sender.replaceTrack(audioTrack);
        } else if (pcRef.current) {
          pcRef.current.addTrack(audioTrack, micStream);
        }

        setCctvMicActive(true);
        triggerCctvToast('🎙️ Mikrofon Interkom AKTIF — Bicara ke speaker CCTV', 'success');
      } catch (err: any) {
        console.error('Mic access error:', err);
        if (err?.message === 'BROWSER_INSECURE_CONTEXT') {
          triggerCctvToast('⚠️ Browser memblokir mikrofon pada IP HTTP non-lokal. Buka lewat http://localhost:3000 atau aktifkan SSL/HTTPS.', 'warning');
        } else if (err?.name === 'NotAllowedError') {
          triggerCctvToast('⚠️ Akses mikrofon ditolak browser. Izinkan akses mikrofon di ikon gembok URL browser.', 'warning');
        } else {
          triggerCctvToast(`⚠️ Gagal mengaktifkan mikrofon (${err?.name || err?.message || 'Error'})`, 'warning');
        }
      }
    } else {
      if (audioTransceiverRef.current) {
        try { await audioTransceiverRef.current.sender.replaceTrack(null); } catch { }
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(t => t.stop());
        micStreamRef.current = null;
      }
      setCctvMicActive(false);
      triggerCctvToast('🔇 Mikrofon Interkom dinonaktifkan', 'info');
    }
  };


  const handleDeleteMediaItem = (id: string) => {
    if (!window.confirm('Hapus file media ini dari galeri?')) return;
    setCctvMediaList((prev) => prev.filter((item) => item.id !== id));
    triggerCctvToast('🗑️ Media dihapus', 'info');
  };

  const handleVerifyOtp = (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    setResetError(null);

    if (!enteredOtp || enteredOtp.trim().length !== 6) {
      setResetError('Silakan masukkan 6 digit kode OTP yang telah dikirim ke email Anda.');
      return;
    }

    if (enteredOtp.trim() !== generatedOtp.trim()) {
      setResetError('Kode OTP tidak sesuai. Pastikan Anda memasukkan kode 6-digit terbaru dari email Anda.');
      return;
    }

    setResetStep('NEW_PASSWORD');
  };

  // ─── PASSWORD SECURITY & STRENGTH EVALUATOR ───
  const getPasswordStrength = (pass: string) => {
    const hasMinLength = pass.length >= 8;
    const hasUpperCase = /[A-Z]/.test(pass);
    const hasLowerCase = /[a-z]/.test(pass);
    const hasNumber = /[0-9]/.test(pass);

    let score = 0;
    if (hasMinLength) score++;
    if (hasUpperCase) score++;
    if (hasLowerCase) score++;
    if (hasNumber) score++;

    return {
      score,
      hasMinLength,
      hasUpperCase,
      hasLowerCase,
      hasNumber,
      isValid: hasMinLength && hasUpperCase && hasLowerCase && hasNumber
    };
  };

  const handleSaveNewPassword = (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    setResetError(null);

    const strength = getPasswordStrength(newPasswordInput);

    if (!strength.hasMinLength) {
      setResetError('Keamanan Kurang: Kata sandi baru minimal harus terdiri dari 8 karakter.');
      return;
    }
    if (!strength.hasUpperCase) {
      setResetError('Keamanan Kurang: Kata sandi harus mengandung setidaknya 1 huruf besar / kapital (A-Z).');
      return;
    }
    if (!strength.hasLowerCase) {
      setResetError('Keamanan Kurang: Kata sandi harus mengandung setidaknya 1 huruf kecil (a-z).');
      return;
    }
    if (!strength.hasNumber) {
      setResetError('Keamanan Kurang: Kata sandi harus mengandung setidaknya 1 angka (0-9).');
      return;
    }

    if (newPasswordInput !== confirmPasswordInput) {
      setResetError('Konfirmasi kata sandi tidak cocok. Silakan ketik ulang kata sandi dengan benar.');
      return;
    }

    const email = resetEmailInput.toLowerCase().trim();
    const updated = { ...userPasswords, [email]: newPasswordInput.trim() };
    setUserPasswords(updated);
    try {
      localStorage.setItem('fluidhe_user_passwords', JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to save to localStorage', err);
    }

    // Auto-fill login form with new credentials
    setLoginEmail(email);
    setLoginPassword(newPasswordInput.trim());
    setResetStep('SUCCESS');
  };

  // ─── LOGIN HANDLER (WITH STRICT PASSWORD VALIDATION & PERSISTENCE) ───
  const handleLogin = (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    setLoginError(null);

    const email = (loginEmail || (selectedDemoRole === 'admin' ? 'dwimeliantiistiqomah55@gmail.com' : 'dwi.melianti@mhs.itenas.ac.id')).toLowerCase().trim();

    // STRICT: Password is required to log in!
    if (!loginPassword || !loginPassword.trim()) {
      setLoginError('Silakan masukkan kata sandi akun Anda untuk masuk ke sistem.');
      return;
    }

    let activePasswords: Record<string, string> = { ...DEFAULT_PASSWORDS, ...userPasswords };
    let activeUsers: UserItem[] = usersList;
    try {
      if (typeof window !== 'undefined') {
        const storedPass = localStorage.getItem('fluidhe_user_passwords');
        if (storedPass) {
          activePasswords = { ...DEFAULT_PASSWORDS, ...activePasswords, ...JSON.parse(storedPass) };
        }
        const storedUsers = localStorage.getItem('fluidhe_user_accounts');
        if (storedUsers) {
          const parsedUsers = JSON.parse(storedUsers);
          if (Array.isArray(parsedUsers) && parsedUsers.length > 0) {
            activeUsers = parsedUsers;
          }
        }
      }
    } catch (err) {
      console.error('Storage parse error:', err);
    }

    const found = activeUsers.find(u => u.email.toLowerCase() === email) || usersList.find(u => u.email.toLowerCase() === email);

    const defaultFallback = (email === 'dwimeliantiistiqomah55@gmail.com' || email === 'admin@uad.ac.id' || (found && found.role === 'admin'))
      ? 'admin123'
      : (email === 'dwi.melianti@mhs.itenas.ac.id' || email === 'operator@uad.ac.id' || (found && found.role === 'operator'))
        ? 'operator123'
        : 'dev123';

    const expectedPassword = (activePasswords[email] || userPasswords[email] || defaultFallback).trim();
    const enteredPassword = loginPassword.trim();

    // STRICT: Password match check
    if (enteredPassword !== expectedPassword) {
      setLoginError('Kata sandi yang Anda masukkan salah. Silakan coba lagi atau gunakan verifikasi email di bawah untuk mereset kata sandi Anda.');
      return;
    }

    // 1. SINGLE ACTIVE SESSION LOCK CHECK (Hanya 1 Akun Aktif per Sesi Waktu)
    try {
      const storedActiveStr = localStorage.getItem('fluidhe_active_session');
      if (storedActiveStr) {
        const storedActive = JSON.parse(storedActiveStr);
        const now = Date.now();
        const isStale = (now - storedActive.lastHeartbeat) > 15000;
        if (!isStale && storedActive.email.toLowerCase() !== email.toLowerCase()) {
          setLoginError(`🚫 AKSES DITOLAK (KONFLIK SESI): Sesi saat ini sedang aktif digunakan oleh "${storedActive.name}" (${storedActive.email}). Untuk mencegah bentrokan kendali hardware, sistem hanya mengizinkan 1 akun aktif dalam 1 waktu. Harap minta user tersebut logout terlebih dahulu.`);
          return;
        }
      }
    } catch (err) {
      console.error('Session lock check error:', err);
    }

    // 2. JADWAL AKSES HARI & JAM CHECK (Schedule-Based Access Control)
    if (found) {
      const scheduleStatus = validateScheduleAccess(found);
      if (!scheduleStatus.allowed) {
        setLoginError(`⏰ AKSES DITOLAK (DILUAR JADWAL LAB): ${scheduleStatus.reason}`);
        return;
      }
    }

    if (found) {
      setCurrentUser({
        name: found.name,
        email: found.email,
        role: found.role
      });
      if (found.role === 'operator') {
        setOperatorSessionRemaining(operatorSessionLimit * 60);
      }
    } else if (selectedDemoRole === 'admin' || email === 'dwimeliantiistiqomah55@gmail.com' || email === 'admin@uad.ac.id') {
      setCurrentUser({
        name: 'Dwi Melianti (Admin Utama / Dosen)',
        email: email,
        role: 'admin'
      });
    } else {
      setCurrentUser({
        name: 'Dwi Melianti (Mahasiswa Operator)',
        email: email,
        role: 'operator'
      });
      setOperatorSessionRemaining(operatorSessionLimit * 60);
    }
    setIsLoggedIn(true);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('fluidhe_active_session');
    } catch (err) {
      console.error(err);
    }
    setActiveSession(null);
    setIsLoggedIn(false);
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

  // ─── DOWNSAMPLED LOGS FOR INTERVAL EXPORT & TABLE (1s, 2s, 5s, 30s, 1m) ───
  const filteredLogsData = useMemo(() => {
    // 1. Date Filter Logic: If selecting past dates with no archives, return empty list
    if (dateFilter === 'Yesterday' || dateFilter === '7Days') {
      return [];
    }

    // 2. Multi-column search filter (Timestamp, Temperatures TI1-TI4, Heater Status, Mode)
    const q = logSearchQuery.trim().toLowerCase();
    const queryFiltered = telemetryHistory.filter((d) => {
      if (!q) return true;
      return (
        d.timestamp.toLowerCase().includes(q) ||
        d.ti1.toFixed(2).includes(q) ||
        d.ti2.toFixed(2).includes(q) ||
        d.ti3.toFixed(2).includes(q) ||
        d.ti4.toFixed(2).includes(q) ||
        (d.heater1Active ? 'on' : 'off').includes(q) ||
        (d.heater2Active ? 'on' : 'off').includes(q) ||
        d.mode.toLowerCase().includes(q)
      );
    });

    // 3. Downsampling based on logInterval
    if (logInterval === '1s') {
      return queryFiltered;
    } else if (logInterval === '2s') {
      return queryFiltered.filter((_, idx) => idx % 2 === 0);
    } else if (logInterval === '5s') {
      return queryFiltered.filter((_, idx) => idx % 5 === 0);
    } else if (logInterval === '30s') {
      return queryFiltered.filter((_, idx) => idx % 6 === 0);
    } else if (logInterval === '1m') {
      return queryFiltered.filter((_, idx) => idx % 12 === 0);
    }
    return queryFiltered;
  }, [telemetryHistory, logSearchQuery, logInterval, dateFilter]);

  // ─── CLOUD DRIVE AUTO-SYNC & FLASHDISK DISABLE HANDLERS ───
  const getFormattedDateStr = (date: Date) => {
    const d = date.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const t = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/:/g, '.');
    return `${d}, ${t} WIB`;
  };

  const handleCloudDriveAccess = () => {
    setIsCloudDriveModalOpen(true);
    setCloudLastSyncTime(new Date().toLocaleTimeString('id-ID'));
  };

  const exportPDFReport = () => {
    window.print();
  };

  const handleExportAndUpload = async () => {
    try {
      setIsUploading(true);
      triggerCctvToast('⏳ Mengolah data & mengunggah file ke Cloud Storage...', 'info');

      // 1. Generate Excel (kode yang sudah ada)
      const wb = XLSX.utils.book_new();
      const wsData = [
        ['Waktu', 'TI1', 'TI2', 'TI3', 'TI4', 'Heater1', 'Heater2', 'Mode'],
        ...filteredLogsData.map((d) => [
          d.timestamp,
          d.ti1,
          d.ti2,
          d.ti3,
          d.ti4,
          d.heater1Active ? 'ON' : 'OFF',
          d.heater2Active ? 'ON' : 'OFF',
          d.mode
        ])
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, 'Telemetry');
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      // 2. Upload
      const { uploadToCloud } = await import('@/lib/upload-helper');
      const fileName = `HE_Telemetry_${new Date().toISOString().slice(0, 10)}.xlsx`;
      const result = await uploadToCloud(blob, fileName, 'telemetry-logs');

      triggerCctvToast('✅ File Excel tersimpan di Cloud Storage!', 'success');

      // 3. Berhasil!
      alert(`✅ File tersimpan di Cloud!\n🔗 ${result.url}`);
      if (result.url) {
        window.open(result.url, '_blank');
      }

    } catch (err: any) {
      console.error('Excel upload error:', err);
      triggerCctvToast('❌ Gagal upload: ' + (err?.message || 'Error'), 'warning');
      alert(`❌ Gagal upload: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
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
      lastLogin: 'Baru saja',
      isScheduleRestricted: newUserRole === 'operator' ? newUserRestricted : false,
      allowedStartDate: newUserStartDate,
      allowedEndDate: newUserEndDate,
      allowedStartTime: newUserStartTime,
      allowedEndTime: newUserEndTime
    };
    const updatedUsers = [...usersList, newUser];
    setUsersList(updatedUsers);
    try {
      localStorage.setItem('fluidhe_user_accounts', JSON.stringify(updatedUsers));
    } catch (err) {
      console.error(err);
    }
    setNewUserName('');
    setNewUserEmail('');
    setShowAddUserModal(false);
  };

  // ─── REUSABLE P&ID SCHEMATIC RENDERER WITH DUAL HEATER & SOLENOID VALVES ───
  const renderPIDDiagram = (diagramMode: 'Counter-Current' | 'Co-Current', titleExtra: string = '') => {
    return (
      <PidDiagram
        diagramMode={diagramMode}
        titleExtra={titleExtra}
        latestData={latestData}
        heaterMasterPower={heaterMasterPower}
        emergencyStopped={emergencyStopped}
        fc1Valve={fc1Valve}
        dualHeaterState={dualHeaterState}
        solenoidValves={solenoidValves}
        deltaPHot={deltaPHot}
        onHoverSensor={setActivePidHover}
      />
    );
  };

  // ─── RENDER: LOGIN SCREEN (SUPPORTING ADMIN & OPERATOR ROLES) ───
  if (!isLoggedIn) {
    return (
      <LoginScreen
        selectedDemoRole={selectedDemoRole}
        setSelectedDemoRole={setSelectedDemoRole}
        loginEmail={loginEmail}
        setLoginEmail={setLoginEmail}
        loginPassword={loginPassword}
        setLoginPassword={setLoginPassword}
        loginError={loginError}
        setLoginError={setLoginError}
        showLoginPassword={showLoginPassword}
        setShowLoginPassword={setShowLoginPassword}
        handleLogin={handleLogin}
        isResetModalOpen={isResetModalOpen}
        setIsResetModalOpen={setIsResetModalOpen}
        resetStep={resetStep}
        setResetStep={setResetStep}
        resetEmailInput={resetEmailInput}
        setResetEmailInput={setResetEmailInput}
        enteredOtp={enteredOtp}
        setEnteredOtp={setEnteredOtp}
        newPasswordInput={newPasswordInput}
        setNewPasswordInput={setNewPasswordInput}
        confirmPasswordInput={confirmPasswordInput}
        setConfirmPasswordInput={setConfirmPasswordInput}
        showNewPassword={showNewPassword}
        setShowNewPassword={setShowNewPassword}
        resetError={resetError}
        setResetError={setResetError}
        isSendingEmail={isSendingEmail}
        otpResendCountdown={otpResendCountdown}
        smtpStatusInfo={smtpStatusInfo}
        handleRequestOtp={handleRequestOtp}
        handleVerifyOtp={handleVerifyOtp}
        handleSaveNewPassword={handleSaveNewPassword}
        getPasswordStrength={getPasswordStrength}
      />
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
                <strong className={deltaPHot > deltaPMaxThreshold ? 'text-red-700 font-bold' : ''}>{deltaPHot} atm-g</strong>
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
                </select>
              </div>

              {newUserRole === 'operator' && (
                <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 space-y-3">
                  <div className="flex items-center justify-between bg-white p-2.5 border border-slate-200 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-amber-600" />
                      <div>
                        <span className="block text-xs font-bold text-slate-800">Batasi Jadwal Login</span>
                        <span className="block text-[10px] text-slate-500">Hanya bisa login pada jadwal tertentu</span>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={newUserRestricted} onChange={(e) => setNewUserRestricted(e.target.checked)} />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                  </div>

                  {newUserRestricted && (
                    <div className="space-y-2.5 pt-1">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10.5px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-amber-600" /> Mulai Tanggal
                          </label>
                          <input type="date" value={newUserStartDate} onChange={(e) => setNewUserStartDate(e.target.value)} className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800" />
                        </div>
                        <div>
                          <label className="block text-[10.5px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-amber-600" /> S.d Tanggal
                          </label>
                          <input type="date" value={newUserEndDate} onChange={(e) => setNewUserEndDate(e.target.value)} className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10.5px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-sky-600" /> Jam Mulai
                          </label>
                          <input type="time" value={newUserStartTime} onChange={(e) => setNewUserStartTime(e.target.value)} className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800" />
                        </div>
                        <div>
                          <label className="block text-[10.5px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-sky-600" /> Jam Selesai
                          </label>
                          <input type="time" value={newUserEndTime} onChange={(e) => setNewUserEndTime(e.target.value)} className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

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
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-2 sm:px-6 py-2 sm:py-3 flex items-center justify-between no-print gap-1 sm:gap-3">
        {/* Left Section: Menu Toggle + Logo + Title */}
        <div id="tour-header-title" className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="md:hidden p-1.5 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition focus:outline-none shrink-0"
            aria-label="Toggle Menu"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="w-9 h-9 sm:w-12 sm:h-12 relative flex items-center justify-center p-1 bg-white rounded-xl shadow-sm border border-slate-200/80 shrink-0">
            <img src="/uad-logo.png" alt="Logo UAD" className="w-full h-full object-contain scale-105" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-xs sm:text-lg font-bold text-slate-900 tracking-tight whitespace-nowrap">
                FluidHE<span className="hidden sm:inline"> Dashboard</span>
              </h1>
              <span className="hidden sm:inline-block px-2 py-0.5 bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-bold rounded-full whitespace-nowrap">
                UAD Kampus IV
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden md:block leading-tight mt-0.5">Laboratorium Teknik Kimia - Universitas Ahmad Dahlan</p>
          </div>
        </div>

        {/* Right Section: Status Badges & User Actions */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Interactive Guided Tour Button */}
          <button
            type="button"
            onClick={() => setIsTourOpen(true)}
            className="flex items-center gap-1 p-1.5 sm:px-3 sm:py-1 bg-gradient-to-r from-sky-50 to-indigo-50 hover:from-sky-100 hover:to-indigo-100 text-sky-800 border border-sky-200/80 rounded-full text-[10px] sm:text-xs font-extrabold shadow-sm transition active:scale-95 whitespace-nowrap cursor-pointer ring-1 ring-sky-500/10"
            title="Buka Panduan Tutorial Interaktif"
          >
            <HelpCircle className="w-3.5 h-3.5 text-sky-600 animate-pulse" />
            <span className="hidden sm:inline">Panduan</span>
          </button>

          {/* Supabase Connection Status Badge */}
          <div id="tour-iot-badge" className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold border transition whitespace-nowrap ${supabaseStatus === 'ONLINE'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : supabaseStatus === 'CONNECTING'
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-red-50 text-red-800 border-red-200'
            }`}>
            <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0 ${supabaseStatus === 'ONLINE'
              ? 'bg-emerald-500 animate-pulse'
              : supabaseStatus === 'CONNECTING'
                ? 'bg-amber-500 animate-ping'
                : 'bg-red-500'
              }`} />
            <span>
              <span className="hidden sm:inline">IoT Cloud: </span>
              <span className="sm:hidden">{supabaseStatus === 'ONLINE' ? 'ONLINE' : supabaseStatus === 'CONNECTING' ? 'CONNECT' : 'OFFLINE'}</span>
              <span className="hidden sm:inline">{supabaseStatus === 'ONLINE' ? 'ONLINE' : supabaseStatus === 'CONNECTING' ? 'CONNECTING...' : 'OFFLINE'}</span>
            </span>
          </div>

          {currentUser.role === 'operator' && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 sm:px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-[11px] sm:text-xs font-bold whitespace-nowrap">
              <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin shrink-0" />
              <span>Sesi: {Math.floor(operatorSessionRemaining / 60)}m</span>
            </div>
          )}

          {/* Emergency Stop / TRIP Button (Compact & neat on mobile) */}
          <button
            id="tour-emergency-btn"
            type="button"
            onClick={() => {
              const nextState = !emergencyStopped;
              setEmergencyStopped(nextState);
              if (nextState) {
                setHeaterMasterPower(false);
              }
            }}
            className={`flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-black shadow-sm transition active:scale-95 whitespace-nowrap cursor-pointer ${emergencyStopped
              ? 'bg-red-600 text-white animate-pulse shadow-md shadow-red-600/30'
              : isAlarmActive
                ? 'bg-amber-500 text-white animate-pulse'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
              }`}
            title="Tombol Darurat (Emergency Stop / TRIP)"
          >
            <AlertTriangle className={`w-3.5 h-3.5 ${emergencyStopped ? 'text-white' : 'text-rose-600'}`} />
            <span className="sm:hidden">{emergencyStopped ? 'TRIP' : 'TRIP'}</span>
            <span className="hidden sm:inline">{emergencyStopped ? 'TRIP AKTIF' : 'EMERGENCY TRIP'}</span>
          </button>

          {!emergencyStopped && !isAlarmActive && (
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-full text-[11px] font-semibold whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span>Normal</span>
            </div>
          )}

          {/* User Profile Pill & Logout */}
          <div className="flex items-center gap-1 sm:gap-2 pl-1 sm:pl-2 border-l border-slate-200 shrink-0">
            <div className="text-right hidden lg:block">
              <p className="text-xs font-bold text-slate-900">{currentUser.name}</p>
              <span className={`inline-block text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded ${currentUser.role === 'admin'
                ? 'bg-sky-100 text-sky-700 border border-sky-200'
                : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                }`}>
                {currentUser.role}
              </span>
            </div>

            <button
              onClick={handleLogout}
              title="Keluar Sesi"
              className="p-1 sm:p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
            >
              <LogOut className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ─── BODY CONTAINER (SIDEBAR + MAIN CONTENT) ─── */}
      <div className="flex-1 flex flex-col md:flex-row max-w-[1600px] w-full mx-auto relative">

        {/* ─── MOBILE BACKDROP OVERLAY ─── */}
        {isSidebarOpen && (
          <div
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm md:hidden transition-opacity"
          />
        )}

        {/* ─── SIDEBAR NAVIGATION (RESPONSIVE DRAWER ON MOBILE, STICKY ON DESKTOP) ─── */}
        <aside
          className={`fixed md:sticky md:top-[61px] md:h-[calc(100vh-61px)] md:overflow-y-auto inset-y-0 left-0 z-40 w-72 md:w-64 bg-white border-r border-slate-200/80 p-4 space-y-2 no-print shrink-0 transform transition-transform duration-300 ease-in-out md:transform-none ${isSidebarOpen ? 'translate-x-0 pointer-events-auto shadow-2xl' : '-translate-x-full md:translate-x-0 pointer-events-none md:pointer-events-auto'
            }`}
        >
          <div className="flex items-center justify-between px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            <span>Menu Utama</span>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => {
                setActiveTab('dashboard');
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${activeTab === 'dashboard'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
            >
              <Activity className="w-4 h-4" /> Real-Time Monitoring
            </button>

            <button
              onClick={() => {
                setActiveTab('control');
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${activeTab === 'control'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
            >
              <Sliders className="w-4 h-4" /> Control Panel
            </button>

            <button
              onClick={() => {
                setActiveTab('cctv');
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${activeTab === 'cctv'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
            >
              <Video className="w-4 h-4" /> CCTV Feed
            </button>



            <button
              onClick={() => {
                setActiveTab('logs');
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${activeTab === 'logs'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
            >
              <FileText className="w-4 h-4" /> Data Logs & Laporan
            </button>

            <button
              onClick={() => {
                setActiveTab('alarms');
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${activeTab === 'alarms'
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

            {currentUser.role === 'admin' ? (
              <button
                onClick={() => {
                  setActiveTab('users');
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${activeTab === 'users'
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
        <main className="flex-1 p-3.5 sm:p-4 md:p-6 space-y-6 overflow-y-auto pb-24 md:pb-6">

          {/* SAFETY / WARNING BANNERS */}
          {/* 🚨 CRITICAL WARNING SYSTEM POP-UP BANNER (WARN_BKA_UAP / PRESSURE & TEMP ALERT) */}
          {(supabaseTelemetry?.warning_status === 'WARN_BKA_UAP' ||
            (supabaseTelemetry && (supabaseTelemetry.pressure > 2.0 || supabaseTelemetry.temp_1 > 65.0 || supabaseTelemetry.temp_2 > 65.0))) && (
            <div className="p-4 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white border-2 border-red-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl shadow-red-600/30 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/20 rounded-xl shrink-0">
                  <AlertTriangle className="w-7 h-7 text-white animate-bounce" />
                </div>
                <div>
                  <h4 className="font-black text-sm sm:text-base text-white tracking-wide uppercase flex items-center gap-2">
                    PERINGATAN BAHAYA: Tekanan atau Suhu Kritis!
                    <span className="px-2 py-0.5 bg-white text-red-700 text-[10px] font-black rounded-full uppercase">WARN_BKA_UAP</span>
                  </h4>
                  <p className="text-xs text-red-100 font-medium mt-0.5">
                    Harap Buka Katup Uap Sekarang! Tekanan terdeteksi &gt; 2.0 Bar atau Suhu &gt; 65°C.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  handleUapStatusToggle(true);
                  triggerSyncFeedback('Katup Uap', 'DIBUKA (DARURAT BAHAYA)');
                }}
                className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-red-50 text-red-700 rounded-xl text-xs font-black shadow-lg transition active:scale-95 shrink-0 flex items-center justify-center gap-2 cursor-pointer border border-red-200"
              >
                <Power className="w-4 h-4 text-red-600" />
                BUKA KATUP UAP SEKARANG
              </button>
            </div>
          )}

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
              {/* 1. Summary Cards (Tappable to jump to controls) */}
              <TelemetryCards
                latestData={latestData}
                tempLabels={tempLabels}
                tc1Setpoint={tc1Setpoint}
                ti1MaxThreshold={ti1MaxThreshold}
                deltaPHot={deltaPHot}
                deltaPCold={deltaPCold}
                fc1Valve={fc1Valve}
                fc2Valve={fc2Valve}
                onCardClick={() => setActiveTab('control')}
              />

              {/* 2. Real-Time Temperature & Pressure Multi-Line Chart */}
              <LiveChart telemetryHistory={telemetryHistory} />

              {/* 3. Interactive Digital Twin P&ID Visual Diagram */}
              <div id="tour-pid-diagram" className="asklepios-card p-6 bg-white relative overflow-hidden space-y-6">
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

                <FlowModeSelector
                  variant="dashboard"
                  currentFlowMode={operationMode}
                  flowVisViewMode={flowVisViewMode}
                  onSelectMode={(modeCode, friendlyMode) => {
                    setOperationMode(friendlyMode);
                    setFlowVisViewMode('single');
                    handleFlowModeChange(modeCode);
                    triggerSyncFeedback('Arah Aliran', modeCode === 'CO-CURRENT' ? 'CO-CURRENT' : 'COUNTER-CURRENT');
                  }}
                  onSelectViewMode={(viewMode) => setFlowVisViewMode(viewMode)}
                />

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

          {/* TAB 2: UNIFIED REAL-TIME CONTROL PANEL & TELEMETRY */}
          {activeTab === 'control' && (
            <div className="space-y-6">
              <div className="asklepios-card p-6 bg-white shadow-xl rounded-3xl border border-slate-200 space-y-6">

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                      <Sliders className="w-6 h-6 text-sky-600" /> Pusat Kendali Operasi & Telemetri Alat (ESP32 IoT Sync)
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Pengaturan daya pemanas, setpoint temperatur, pola aliran fluida, sudut servo, dan katup aliran terpadu
                    </p>
                  </div>
                </div>

                {/* ─── LIVE VISUAL IOT TRANSMISSION ACTIVITY BAR ─── */}
                <div className={`p-3.5 rounded-2xl border transition-all duration-300 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${syncFeedback.active
                  ? syncFeedback.type === 'syncing'
                    ? 'bg-sky-500/10 border-sky-400/50 shadow-md shadow-sky-500/10'
                    : 'bg-emerald-500/10 border-emerald-400/50 shadow-md shadow-emerald-500/10'
                  : 'bg-slate-50 border-slate-200'
                  }`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl border shrink-0 transition-all ${syncFeedback.active
                      ? syncFeedback.type === 'syncing'
                        ? 'bg-sky-600 text-white border-sky-500 animate-spin'
                        : 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                      : 'bg-white text-slate-400 border-slate-200'
                      }`}>
                      {syncFeedback.active ? (
                        syncFeedback.type === 'syncing' ? <RefreshCw className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <Radio className="w-4 h-4 text-sky-600" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-xs font-bold text-slate-900">
                          {syncFeedback.active ? syncFeedback.message : 'Jalur Sinkronisasi IoT Cloud (ESP32)'}
                        </strong>
                        {syncFeedback.active && (
                          <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-extrabold uppercase tracking-wider ${syncFeedback.type === 'syncing'
                            ? 'bg-sky-100 text-sky-800 border border-sky-200 animate-pulse'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}>
                            {syncFeedback.type === 'syncing' ? 'Mengirim ke Alat...' : 'Perintah Diterima'}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {syncFeedback.active
                          ? syncFeedback.detail
                          : 'Setiap perubahan tombol & slider disinkronkan secara real-time ke mikrokontroler via tabel device_controls.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500 shrink-0 bg-white/80 px-3 py-1.5 rounded-xl border border-slate-200">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${syncFeedback.active && syncFeedback.type === 'syncing'
                      ? 'bg-sky-500 animate-ping'
                      : supabaseStatus === 'ONLINE'
                        ? 'bg-emerald-500 animate-pulse'
                        : 'bg-red-500'
                      }`} />
                    <span>Sinkronisasi: <strong>{supabaseStatus === 'ONLINE' ? 'AKTIF (~40ms)' : supabaseStatus}</strong></span>
                  </div>
                </div>

                {/* Emergency Stop Active Banner */}
                {emergencyStopped && (
                  <div className="p-4 bg-red-50 border-2 border-red-500 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-pulse">
                    <div className="flex items-center gap-3 text-red-700">
                      <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
                      <div>
                        <h4 className="font-extrabold text-sm text-red-900">EMERGENCY STOP HEATER DIBEKUKAN!</h4>
                        <p className="text-xs text-red-700">Pemanas dimatikan seketika dan katup ditutup demi keselamatan kerja.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={resetEmergencyStop}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-extrabold shadow-md transition active:scale-95 shrink-0"
                    >
                      Reset & Pulihkan
                    </button>
                  </div>
                )}

                {supabaseError && (
                  <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{supabaseError}</span>
                  </div>
                )}

                {/* 1. Real-Time Read Telemetry Sensor Cards */}
                <StatCards
                  tempLabels={tempLabels}
                  supabaseTelemetry={supabaseTelemetry}
                  latestData={latestData}
                  dualHeaterState={dualHeaterState}
                />

                {/* 2. Unified Control Command Inputs */}
                <div className="space-y-4 pt-2">
                  <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-purple-600" /> Panel Pengaturan & Perintah Kontrol Alat
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                    {/* Switch Control Mode (AUTO / MANUAL) */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <label className="text-xs font-bold text-slate-800 block">Mode Kendali Operasi</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            handleControlModeChange('AUTO');
                            applyAutoControl(supabaseControls.target_temp);
                            triggerSyncFeedback('Mode Operasi AUTO', `Target ${supabaseControls.target_temp.toFixed(1)}°C (Parameter Disesuaikan Otomatis)`);
                          }}
                          disabled={emergencyStopped}
                          className={`py-2 rounded-xl text-xs font-extrabold transition ${supabaseControls.control_mode === 'AUTO'
                            ? 'bg-purple-600 text-white shadow'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                            }`}
                        >
                          AUTO
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleControlModeChange('MANUAL');
                            triggerSyncFeedback('Mode Operasi MANUAL', 'Kendali Bebas Operator Aktif');
                          }}
                          disabled={emergencyStopped}
                          className={`py-2 rounded-xl text-xs font-extrabold transition ${supabaseControls.control_mode === 'MANUAL'
                            ? 'bg-purple-600 text-white shadow'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                            }`}
                        >
                          MANUAL
                        </button>
                      </div>
                      <span className="text-[10px] text-slate-500 block">
                        Status: <strong className={supabaseControls.control_mode === 'AUTO' ? 'text-purple-700 font-bold' : 'text-slate-800 font-bold'}>
                          {supabaseControls.control_mode === 'AUTO' ? 'Mode Otomatis (ESP32 PID)' : 'Mode Manual (Kendali Operator)'}
                        </strong>
                      </span>
                    </div>

                    {/* Switch Mode Aliran (COUNTER / CO-CURRENT) */}
                    <FlowModeSelector
                      variant="control"
                      currentFlowMode={supabaseControls.flow_mode}
                      disabled={emergencyStopped}
                      onSelectMode={(modeCode, friendlyMode) => {
                        setOperationMode(friendlyMode);
                        handleFlowModeChange(modeCode);
                        triggerSyncFeedback('Arah Aliran', modeCode === 'CO-CURRENT' ? 'CO-CURRENT' : 'COUNTER-CURRENT');
                      }}
                    />

                    {/* Tombol Heater Power + Dual Heater Status */}
                    <HeaterControl
                      controlMode={supabaseControls.control_mode}
                      heaterStatus={supabaseControls.heater_status}
                      emergencyStopped={emergencyStopped}
                      dualHeaterState={dualHeaterState}
                      onToggleHeater={(nextState) => {
                        setHeaterMasterPower(nextState);
                        handleHeaterPowerToggle(nextState);
                        triggerSyncFeedback('Daya Pemanas', nextState ? 'POWER ON' : 'POWER OFF');
                      }}
                    />

                    {/* Slider Target Suhu (TC1 Setpoint) */}
                    <TargetTempSlider
                      targetTemp={supabaseControls.target_temp}
                      controlMode={supabaseControls.control_mode}
                      emergencyStopped={emergencyStopped}
                      onChangeTargetTemp={(val) => {
                        setTc1Setpoint(val);
                        handleTargetTempChange(val);
                        if (supabaseControls.control_mode === 'AUTO') {
                          applyAutoControl(val);
                        }
                        triggerSyncFeedback('Target Suhu', `${val.toFixed(1)}°C`);
                      }}
                    />

                    {/* Slider Sudut Servo (0 - 90 Derajat) */}
                    <ServoControl
                      servoAngle={supabaseControls.servo_angle}
                      controlMode={supabaseControls.control_mode}
                      emergencyStopped={emergencyStopped}
                      onChangeServoAngle={(val) => {
                        handleServoAngleChange(val);
                        triggerSyncFeedback('Sudut Katup Servo', `${val}°`);
                      }}
                    />

                    {/* Valve FC1 (Hot Fluid Flow) */}
                    <div className={`p-4 rounded-2xl border transition-all space-y-2 ${supabaseControls.control_mode === 'AUTO' ? 'bg-purple-50/60 border-purple-200' : 'bg-slate-50 border-slate-200'
                      }`}>
                      <div className="flex justify-between text-xs font-bold text-slate-800">
                        <span className="flex items-center gap-1">
                          Bukaan Katup FC1 (Air Panas)
                          {supabaseControls.control_mode === 'AUTO' && (
                            <span className="text-[9px] text-purple-700 font-extrabold bg-purple-100 px-1.5 py-0.5 rounded border border-purple-200">
                              AUTO
                            </span>
                          )}
                        </span>
                        <span className="text-orange-600 font-extrabold text-base">{fc1Valve}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={fc1Valve}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setFc1Valve(val);
                          triggerSyncFeedback('Katup FC1 (Air Panas)', `${val}%`);
                        }}
                        disabled={emergencyStopped || supabaseControls.control_mode === 'AUTO'}
                        className={`w-full h-2 bg-slate-200 rounded-lg appearance-none ${supabaseControls.control_mode === 'AUTO' ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                          }`}
                      />
                      <div className="text-[10.5px] text-slate-500 flex justify-between font-semibold">
                        <span>Estimasi Debit:</span>
                        <strong>{((fc1Valve / 100) * 25).toFixed(1)} L/min</strong>
                      </div>
                    </div>

                    {/* Valve FC2 (Cold Fluid Flow) */}
                    <div className={`p-4 rounded-2xl border transition-all space-y-2 md:col-span-2 lg:col-span-1 ${supabaseControls.control_mode === 'AUTO' ? 'bg-purple-50/60 border-purple-200' : 'bg-slate-50 border-slate-200'
                      }`}>
                      <div className="flex justify-between text-xs font-bold text-slate-800">
                        <span className="flex items-center gap-1">
                          Bukaan Katup FC2 (Air Dingin)
                          {supabaseControls.control_mode === 'AUTO' && (
                            <span className="text-[9px] text-purple-700 font-extrabold bg-purple-100 px-1.5 py-0.5 rounded border border-purple-200">
                              AUTO
                            </span>
                          )}
                        </span>
                        <span className="text-cyan-600 font-extrabold text-base">{fc2Valve}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={fc2Valve}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setFc2Valve(val);
                          triggerSyncFeedback('Katup FC2 (Air Dingin)', `${val}%`);
                        }}
                        disabled={emergencyStopped || supabaseControls.control_mode === 'AUTO'}
                        className={`w-full h-2 bg-slate-200 rounded-lg appearance-none ${supabaseControls.control_mode === 'AUTO' ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                          }`}
                      />
                      <div className="text-[10.5px] text-slate-500 flex justify-between font-semibold">
                        <span>Estimasi Debit:</span>
                        <strong>{((fc2Valve / 100) * 30).toFixed(1)} L/min</strong>
                      </div>
                    </div>

                    {/* Slider/Input Target Flow Rate (target_flow 0.0 - 10.0 L/min) */}
                    <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 space-y-2">
                      <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                        <span className="flex items-center gap-1.5 text-emerald-900">
                          Target Flow Rate (Debit Flow)
                        </span>
                        <strong className="text-emerald-700 font-black text-base">
                          {(supabaseControls.target_flow ?? 5.0).toFixed(1)} L/min
                        </strong>
                      </div>
                      <input
                        type="range"
                        min="0.0"
                        max="10.0"
                        step="0.1"
                        value={supabaseControls.target_flow ?? 5.0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          handleTargetFlowChange(val);
                          triggerSyncFeedback('Target Flow Rate', `${val.toFixed(1)} L/min`);
                        }}
                        disabled={emergencyStopped}
                        className="w-full h-2 bg-emerald-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                      />
                      <div className="flex justify-between text-[10px] text-emerald-700 font-semibold">
                        <span>0.0 L/min</span>
                        <span>5.0 L/min</span>
                        <span>10.0 L/min</span>
                      </div>
                    </div>

                    {/* Toggle Switch Katup Uap (uap_status) */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-slate-800">Katup Uap (Uap Status)</label>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                          supabaseControls.uap_status ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {supabaseControls.uap_status ? 'OPEN (TERBUKA)' : 'CLOSED (TERTUTUP)'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const nextVal = !supabaseControls.uap_status;
                          handleUapStatusToggle(nextVal);
                          triggerSyncFeedback('Katup Uap', nextVal ? 'DIBUKA' : 'DITUTUP');
                        }}
                        disabled={emergencyStopped}
                        className={`w-full py-2.5 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-2 ${
                          supabaseControls.uap_status
                            ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md'
                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                      >
                        <Power className="w-4 h-4" />
                        {supabaseControls.uap_status ? 'Tutup Katup Uap' : 'Buka Katup Uap'}
                      </button>
                    </div>

                    {/* Toggle Switch Katup Air Dingin (air_dingin) */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-slate-800">Katup Air Dingin</label>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                          supabaseControls.air_dingin ? 'bg-cyan-100 text-cyan-800' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {supabaseControls.air_dingin ? 'OPEN (TERBUKA)' : 'CLOSED (TERTUTUP)'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const nextVal = !supabaseControls.air_dingin;
                          handleAirDinginToggle(nextVal);
                          triggerSyncFeedback('Katup Air Dingin', nextVal ? 'DIBUKA' : 'DITUTUP');
                        }}
                        disabled={emergencyStopped}
                        className={`w-full py-2.5 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-2 ${
                          supabaseControls.air_dingin
                            ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                      >
                        <Power className="w-4 h-4" />
                        {supabaseControls.air_dingin ? 'Tutup Katup Air Dingin' : 'Buka Katup Air Dingin'}
                      </button>
                    </div>

                    {/* Momentary Servo Motor Action Buttons (btn_up, btn_onoff, btn_down) */}
                    <div className="p-4 bg-gradient-to-br from-indigo-50/80 to-purple-50/80 rounded-2xl border border-indigo-200 space-y-3 col-span-1 md:col-span-2 lg:col-span-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="text-xs font-extrabold text-indigo-900 flex items-center gap-1.5">
                            <Sliders className="w-4 h-4 text-indigo-600" /> Kontrol Tombol Servo Motor (Momentary Pulse 1.5 Detik)
                          </h4>
                          <p className="text-[11px] text-indigo-600/80 mt-0.5">
                            Mengirim sinyal pulsa 1.5s (true ➔ 1500ms ➔ false) ke mikrokontroler untuk menekan tombol fisik servo.
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {/* Button UP */}
                        <button
                          type="button"
                          onClick={() => {
                            handleMomentaryButtonPress('btn_up');
                            triggerSyncFeedback('Servo Button UP', 'PULSE 1.5s TRIGGERED');
                          }}
                          disabled={emergencyStopped || activeMomentaryButtons.btn_up}
                          className={`py-3 px-4 rounded-xl text-xs font-black transition flex flex-col items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer ${
                            activeMomentaryButtons.btn_up
                              ? 'bg-emerald-600 text-white ring-4 ring-emerald-300 animate-pulse'
                              : 'bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 hover:border-emerald-400'
                          }`}
                        >
                          <span className="text-sm font-extrabold">▲ UP</span>
                          <span className="text-[9.5px] font-mono opacity-80">btn_up (1.5s)</span>
                        </button>

                        {/* Button ON/OFF */}
                        <button
                          type="button"
                          onClick={() => {
                            handleMomentaryButtonPress('btn_onoff');
                            triggerSyncFeedback('Servo Button ON/OFF', 'PULSE 1.5s TRIGGERED');
                          }}
                          disabled={emergencyStopped || activeMomentaryButtons.btn_onoff}
                          className={`py-3 px-4 rounded-xl text-xs font-black transition flex flex-col items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer ${
                            activeMomentaryButtons.btn_onoff
                              ? 'bg-purple-600 text-white ring-4 ring-purple-300 animate-pulse'
                              : 'bg-white hover:bg-purple-50 text-purple-700 border border-purple-300 hover:border-purple-400'
                          }`}
                        >
                          <span className="text-sm font-extrabold">⏻ ON / OFF</span>
                          <span className="text-[9.5px] font-mono opacity-80">btn_onoff (1.5s)</span>
                        </button>

                        {/* Button DOWN */}
                        <button
                          type="button"
                          onClick={() => {
                            handleMomentaryButtonPress('btn_down');
                            triggerSyncFeedback('Servo Button DOWN', 'PULSE 1.5s TRIGGERED');
                          }}
                          disabled={emergencyStopped || activeMomentaryButtons.btn_down}
                          className={`py-3 px-4 rounded-xl text-xs font-black transition flex flex-col items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer ${
                            activeMomentaryButtons.btn_down
                              ? 'bg-amber-600 text-white ring-4 ring-amber-300 animate-pulse'
                              : 'bg-white hover:bg-amber-50 text-amber-700 border border-amber-300 hover:border-amber-400'
                          }`}
                        >
                          <span className="text-sm font-extrabold">▼ DOWN</span>
                          <span className="text-[9.5px] font-mono opacity-80">btn_down (1.5s)</span>
                        </button>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Bottom Emergency Action Bar */}
                <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="text-xs text-slate-500">
                    *Seluruh perintah kontrol di atas disinkronkan secara real-time ke mikrokontroler ESP32 alat fisik.
                  </div>

                  <button
                    type="button"
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
            <CctvTab
              selectedCamera={selectedCamera}
              setSelectedCamera={setSelectedCamera}
              cctvStreamSource={cctvStreamSource}
              setCctvStreamSource={setCctvStreamSource}
              cctvIpUrl={cctvIpUrl}
              cctvAudioMuted={cctvAudioMuted}
              setCctvAudioMuted={setCctvAudioMuted}
              audioUserActivated={audioUserActivated}
              setAudioUserActivated={setAudioUserActivated}
              cctvVolume={cctvVolume}
              setCctvVolume={setCctvVolume}
              cctvRecording={cctvRecording}
              setCctvRecording={setCctvRecording}
              isManualRecording={isManualRecording}
              recordingSeconds={recordingSeconds}
              cctvToast={cctvToast}
              webrtcConnected={webrtcConnected}
              webrtcError={webrtcError}
              videoRef={videoRef}
              connectWebRTC={connectWebRTC}
              handleTakeSnapshot={handleTakeSnapshot}
              handleToggleManualRecord={handleToggleManualRecord}
              triggerCctvToast={triggerCctvToast}
              handlePtzAction={handlePtzAction}
              handlePtzPreset={handlePtzPreset}
              ptzMoving={ptzMoving}
              latestData={latestData}
            />
          )}

          {/* TAB 4: DATA LOGS & EXPORT LAPORAN */}
          {activeTab === 'logs' && (
            <LogsTab
              filteredLogsData={filteredLogsData}
              logInterval={logInterval}
              setLogInterval={setLogInterval}
              dateFilter={dateFilter}
              setDateFilter={setDateFilter}
              logSearchQuery={logSearchQuery}
              setLogSearchQuery={setLogSearchQuery}
              isUploading={isUploading}
              handleExportAndUpload={handleExportAndUpload}
              handleCloudDriveAccess={handleCloudDriveAccess}
              exportPDFReport={exportPDFReport}
            />
          )}

          {/* TAB 5: ALARM SYSTEM */}
          {activeTab === 'alarms' && (
            <AlarmsTab
              ti1MaxThreshold={ti1MaxThreshold}
              setTi1MaxThreshold={setTi1MaxThreshold}
              deltaPMaxThreshold={deltaPMaxThreshold}
              setDeltaPMaxThreshold={setDeltaPMaxThreshold}
              soundEnabled={soundEnabled}
              setSoundEnabled={setSoundEnabled}
              alarmLogs={alarmLogs}
              setAlarmLogs={setAlarmLogs}
            />
          )}

          {/* TAB 6: USER MANAGEMENT & SESSION LIMITS (2-TIER ROLE ACCESS) */}
          {activeTab === 'users' && (
            <UsersTab
              currentUser={currentUser}
              usersList={usersList}
              setUsersList={setUsersList}
              activeSession={activeSession}
              setActiveSession={setActiveSession}
              operatorSessionLimit={operatorSessionLimit}
              setOperatorSessionLimit={setOperatorSessionLimit}
              setOperatorSessionRemaining={setOperatorSessionRemaining}
              resendingEmailFor={resendingEmailFor}
              handleResendUserCredentials={handleResendUserCredentials}
              onOpenResetPasswordModal={(email) => {
                setIsResetModalOpen(true);
                setResetEmailInput(email);
                setResetStep('INPUT_EMAIL');
                setResetError(null);
              }}
              showAddUserModal={showAddUserModal}
              setShowAddUserModal={setShowAddUserModal}
              newUserName={newUserName}
              setNewUserName={setNewUserName}
              newUserEmail={newUserEmail}
              setNewUserEmail={setNewUserEmail}
              newUserRole={newUserRole}
              setNewUserRole={setNewUserRole}
              isAddingUser={isAddingUser}
              lastCreatedUserCredentials={lastCreatedUserCredentials}
              setLastCreatedUserCredentials={setLastCreatedUserCredentials}
              setAddUserSuccessMsg={setAddUserSuccessMsg}
              handleCreateUser={handleCreateUser}
              userToDelete={userToDelete}
              setUserToDelete={setUserToDelete}
            />
          )}



        </main>
      </div>

      {/* ─── SECURE EMAIL OTP PASSWORD RESET MODAL (ACCESSIBLE FROM USER MANAGEMENT & PROFILE) ─── */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-5 sm:p-7 shadow-2xl border border-slate-100 text-slate-800 animate-in zoom-in-95 duration-200 space-y-4">

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center border border-sky-100">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                    Verifikasi & Ganti Sandi Akun
                  </h3>
                  <p className="text-[10.5px] text-slate-500">Verifikasi OTP dikirim ke email resmi pengguna</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Progress Steps Header */}
            <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold">
              <div className={`p-1.5 rounded-xl border transition ${resetStep === 'INPUT_EMAIL' ? 'bg-sky-50 border-sky-300 text-sky-700' : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}>
                1. Email Akun
              </div>
              <div className={`p-1.5 rounded-xl border transition ${resetStep === 'VERIFY_OTP' ? 'bg-sky-50 border-sky-300 text-sky-700' : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}>
                2. Kode OTP
              </div>
              <div className={`p-1.5 rounded-xl border transition ${resetStep === 'NEW_PASSWORD' || resetStep === 'SUCCESS' ? 'bg-sky-50 border-sky-300 text-sky-700' : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}>
                3. Sandi Baru
              </div>
            </div>

            {/* Error Notice */}
            {resetError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{resetError}</span>
              </div>
            )}

            {/* STEP 1: INPUT REGISTERED EMAIL */}
            {resetStep === 'INPUT_EMAIL' && (
              <form onSubmit={handleRequestOtp} className="space-y-3.5">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Masukkan alamat email resmi akun Anda (Mahasiswa / Dosen / Admin). Sistem akan mengirimkan kode 6-digit OTP untuk memastikan hanya pemilik akun yang sah yang dapat mengganti kata sandi.
                </p>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Resmi Terdaftar</label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={resetEmailInput}
                      onChange={(e) => setResetEmailInput(e.target.value)}
                      placeholder="nama@mhs.itenas.ac.id / admin@uad.ac.id"
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-800"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>

                <div className="p-2.5 bg-sky-50 border border-sky-200 rounded-xl text-[10.5px] text-sky-800 flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                  <span>Kata sandi Anda terenkripsi secara aman & privat (Admin tidak dapat melihat sandi baru Anda).</span>
                </div>

                <button
                  type="submit"
                  disabled={isSendingEmail}
                  className="w-full py-2.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs font-extrabold rounded-xl shadow-md shadow-sky-600/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSendingEmail ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Mengirim Email OTP...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" /> Kirim Kode OTP ke Email
                    </>
                  )}
                </button>
              </form>
            )}

            {/* STEP 2: ENTER 6-DIGIT OTP CODE */}
            {resetStep === 'VERIFY_OTP' && (
              <form onSubmit={handleVerifyOtp} className="space-y-3.5">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 leading-relaxed flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span>Kode verifikasi 6-digit telah dikirim ke: <strong>{resetEmailInput}</strong>.</span>
                    <p className="text-[11px] text-emerald-700 mt-0.5">Buka email Anda (cek kotak masuk / spam), lalu ketikkan 6 digit kode yang Anda terima di bawah ini.</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 text-center">
                    Masukkan 6 Digit Kode OTP
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={enteredOtp}
                    onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="Contoh: 849201"
                    className="w-full py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center text-lg font-mono font-black tracking-widest focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-900"
                    autoFocus
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Tidak menerima email?</span>
                  <button
                    type="button"
                    disabled={otpResendCountdown > 0}
                    onClick={handleRequestOtp}
                    className={`font-bold transition ${otpResendCountdown > 0 ? 'text-slate-400 cursor-not-allowed' : 'text-sky-600 hover:text-sky-800 underline'
                      }`}
                  >
                    {otpResendCountdown > 0 ? `Kirim ulang (${otpResendCountdown}s)` : 'Kirim Ulang OTP'}
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setResetStep('INPUT_EMAIL')}
                    className="w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                  >
                    Kembali
                  </button>
                  <button
                    type="submit"
                    className="w-2/3 py-2.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs font-extrabold rounded-xl shadow-md shadow-sky-600/20 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" /> Verifikasi OTP
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: SET NEW PASSWORD WITH SECURITY CHECKLIST */}
            {resetStep === 'NEW_PASSWORD' && (() => {
              const strength = getPasswordStrength(newPasswordInput);
              return (
                <form onSubmit={handleSaveNewPassword} className="space-y-3.5">
                  <div className="p-3 bg-sky-50 border border-sky-200 rounded-2xl text-xs text-sky-800 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                    <span>Verifikasi Berhasil! Buat kata sandi baru untuk <strong>{resetEmailInput}</strong>.</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Kata Sandi Baru</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        value={newPasswordInput}
                        onChange={(e) => setNewPasswordInput(e.target.value)}
                        placeholder="Min. 8 karakter (Huruf besar, kecil, angka)"
                        className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-800"
                      />
                      <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Live Password Security Strength Indicator */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-bold text-slate-600">Kekuatan Keamanan Sandi:</span>
                      <span className={`font-black ${strength.score <= 1
                          ? 'text-rose-600'
                          : strength.score <= 3
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                        }`}>
                        {strength.score <= 1 ? 'Sangat Lemah' : strength.score <= 3 ? 'Sedang' : 'Kuat & Aman ✓'}
                      </span>
                    </div>

                    {/* Strength Progress Bar */}
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden flex gap-1">
                      <div className={`h-full flex-1 rounded-full transition-all duration-300 ${strength.score >= 1 ? (strength.score <= 2 ? 'bg-rose-500' : strength.score === 3 ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-transparent'
                        }`} />
                      <div className={`h-full flex-1 rounded-full transition-all duration-300 ${strength.score >= 2 ? (strength.score === 2 ? 'bg-rose-500' : strength.score === 3 ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-transparent'
                        }`} />
                      <div className={`h-full flex-1 rounded-full transition-all duration-300 ${strength.score >= 3 ? (strength.score === 3 ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-transparent'
                        }`} />
                      <div className={`h-full flex-1 rounded-full transition-all duration-300 ${strength.score >= 4 ? 'bg-emerald-500' : 'bg-transparent'
                        }`} />
                    </div>

                    {/* Security Requirements Checklist */}
                    <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10.5px]">
                      <div className={`flex items-center gap-1.5 ${strength.hasMinLength ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                        <CheckCircle2 className={`w-3.5 h-3.5 ${strength.hasMinLength ? 'text-emerald-600' : 'text-slate-300'}`} />
                        <span>Minimal 8 karakter</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${strength.hasUpperCase ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                        <CheckCircle2 className={`w-3.5 h-3.5 ${strength.hasUpperCase ? 'text-emerald-600' : 'text-slate-300'}`} />
                        <span>Huruf besar (A-Z)</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${strength.hasLowerCase ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                        <CheckCircle2 className={`w-3.5 h-3.5 ${strength.hasLowerCase ? 'text-emerald-600' : 'text-slate-300'}`} />
                        <span>Huruf kecil (a-z)</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${strength.hasNumber ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                        <CheckCircle2 className={`w-3.5 h-3.5 ${strength.hasNumber ? 'text-emerald-600' : 'text-slate-300'}`} />
                        <span>Angka (0-9)</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Konfirmasi Kata Sandi Baru</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        value={confirmPasswordInput}
                        onChange={(e) => setConfirmPasswordInput(e.target.value)}
                        placeholder="Ulangi kata sandi baru"
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-800"
                      />
                      <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!strength.isValid}
                    className="w-full py-2.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs font-extrabold rounded-xl shadow-md shadow-sky-600/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Check className="w-4 h-4" /> Simpan Kata Sandi Baru
                  </button>
                </form>
              );
            })()}

            {/* STEP 4: SUCCESS CONFIRMATION */}
            {resetStep === 'SUCCESS' && (
              <div className="text-center space-y-3.5 py-2">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle2 className="w-7 h-7" />
                </div>

                <div className="space-y-1">
                  <h4 className="text-base font-black text-slate-900">Kata Sandi Berhasil Diperbarui!</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Kata sandi baru untuk akun <strong>{resetEmailInput}</strong> telah tersimpan dengan aman di sistem.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="w-full py-2.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs font-extrabold rounded-xl shadow-md transition cursor-pointer"
                >
                  Tutup & Lanjutkan
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ─── MOBILE BOTTOM TAB NAVIGATION BAR (SMARTPHONE FRIENDLY & HIGH TOUCH PRIORITY) ─── */}
      <nav className="fixed bottom-0 inset-x-0 z-50 bg-white/98 backdrop-blur-md border-t border-slate-200/90 py-1 px-1.5 flex md:hidden justify-around items-center shadow-[0_-4px_25px_rgba(0,0,0,0.10)] no-print touch-manipulation select-none pointer-events-auto">
        <button
          type="button"
          onClick={() => {
            setActiveTab('dashboard');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1 px-1 rounded-2xl transition-all active:scale-90 cursor-pointer ${activeTab === 'dashboard'
              ? 'text-sky-600 font-extrabold bg-sky-50/80'
              : 'text-slate-500 font-semibold hover:text-slate-800 active:bg-slate-100'
            }`}
        >
          <Activity className="w-5 h-5 shrink-0" />
          <span className="text-[10px]">Monitoring</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('control');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1 px-1 rounded-2xl transition-all active:scale-90 cursor-pointer ${activeTab === 'control'
              ? 'text-sky-600 font-extrabold bg-sky-50/80'
              : 'text-slate-500 font-semibold hover:text-slate-800 active:bg-slate-100'
            }`}
        >
          <Sliders className="w-5 h-5 shrink-0" />
          <span className="text-[10px]">Kendali</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('cctv');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1 px-1 rounded-2xl transition-all active:scale-90 cursor-pointer ${activeTab === 'cctv'
              ? 'text-sky-600 font-extrabold bg-sky-50/80'
              : 'text-slate-500 font-semibold hover:text-slate-800 active:bg-slate-100'
            }`}
        >
          <Video className="w-5 h-5 shrink-0" />
          <span className="text-[10px]">CCTV</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('logs');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1 px-1 rounded-2xl transition-all active:scale-90 cursor-pointer ${activeTab === 'logs'
              ? 'text-sky-600 font-extrabold bg-sky-50/80'
              : 'text-slate-500 font-semibold hover:text-slate-800 active:bg-slate-100'
            }`}
        >
          <FileText className="w-5 h-5 shrink-0" />
          <span className="text-[10px]">Data Log</span>
        </button>

        {currentUser.role === 'admin' ? (
          <button
            type="button"
            onClick={() => {
              setActiveTab('users');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1 px-1 rounded-2xl transition-all active:scale-90 cursor-pointer ${activeTab === 'users'
                ? 'text-sky-600 font-extrabold bg-sky-50/80'
                : 'text-slate-500 font-semibold hover:text-slate-800 active:bg-slate-100'
              }`}
          >
            <Users className="w-5 h-5 shrink-0" />
            <span className="text-[10px]">Users</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setActiveTab('alarms');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1 px-1 rounded-2xl transition-all active:scale-90 cursor-pointer ${activeTab === 'alarms'
                ? 'text-sky-600 font-extrabold bg-sky-50/80'
                : 'text-slate-500 font-semibold hover:text-slate-800 active:bg-slate-100'
              }`}
          >
            <Bell className="w-5 h-5 shrink-0" />
            <span className="text-[10px]">Alarm</span>
          </button>
        )}
      </nav>

      {/* ─── MODAL CLOUD DRIVE EXPLORER & FLASHDISK PROTECTION NOTICE ─── */}
      {isCloudDriveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden space-y-0">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/30 rounded-2xl border border-emerald-400/30">
                  <Cloud className="w-6 h-6 text-emerald-300 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold flex items-center gap-2">
                    Google Drive Cloud Storage
                    <span className="px-2 py-0.5 bg-emerald-400/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-bold rounded-full">
                      Auto-Sync Active
                    </span>
                  </h3>
                  <p className="text-xs text-emerald-200/90 mt-0.5">Repositori Penyimpanan Otomatis Data Heat Exchanger UAD</p>
                </div>
              </div>
              <button
                onClick={() => setIsCloudDriveModalOpen(false)}
                className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 text-xs text-slate-700">
              {/* Alert Banner Flashdisk Disabled */}
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex items-start gap-3">
                <div className="p-2 bg-amber-500/20 text-amber-800 rounded-xl shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-amber-900 text-sm">Ambil Data via Flashdisk Dinonaktifkan</h4>
                  <p className="text-amber-800/90 mt-0.5 leading-relaxed">
                    Sesuai standar operasional keamanan laboratorium, ekstraksi data manual menggunakan USB Flashdisk telah dinonaktifkan secara otomatis. Seluruh berkas telemetri HE diproteksi dan tersinkron langsung ke Cloud Drive institusi.
                  </p>
                </div>
              </div>


              {/* Status Sync Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 block font-semibold">Status Koneksi</span>
                  <div className="flex items-center gap-1.5 mt-1 font-extrabold text-emerald-600">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /> Terhubung
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 block font-semibold">Sinkron Terakhir</span>
                  <div className="font-extrabold text-slate-800 mt-1">{cloudLastSyncTime} WIB</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-slate-400 block font-semibold">Total Log Terunggah</span>
                  <div className="font-extrabold text-sky-600 mt-1">{telemetryHistory.length} Baris Data</div>
                </div>
              </div>

              {/* Folder Location Info */}
              <div className="p-3 bg-slate-900 text-slate-200 rounded-2xl font-mono text-[11px] flex items-center justify-between gap-2 overflow-x-auto">
                <div className="flex items-center gap-2 truncate">
                  <HardDrive className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="truncate">GoogleDrive://Lab_UAD/Heat_Exchanger_Data/2026/</span>
                </div>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 font-bold rounded text-[10px] whitespace-nowrap">
                  Protected
                </span>
              </div>

              {/* Auto Saved Files List */}
              <div>
                <h4 className="font-bold text-slate-900 mb-2 flex items-center justify-between">
                  <span>Berkas Otomatis Tersimpan di Cloud</span>
                  <span className="text-[10px] font-normal text-slate-400">Penyimpanan Terenkripsi</span>
                </h4>
                <div className="space-y-2">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between hover:bg-slate-100/80 transition">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <div className="font-bold text-slate-800">HE_Telemetry_Logs_Realtime_AutoSave.xlsx</div>
                        <div className="text-[10px] text-slate-400">Spreadsheet • Auto-Updated tiap interval</div>
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-lg flex items-center gap-1">
                      <CloudCheck className="w-3 h-3" /> Auto-Saved
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between hover:bg-slate-100/80 transition">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-sky-600 shrink-0" />
                      <div>
                        <div className="font-bold text-slate-800">HE_Daily_Thermal_Analytics_Report.pdf</div>
                        <div className="text-[10px] text-slate-400">Ringkasan Grafik & Status Aktuator</div>
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-lg flex items-center gap-1">
                      <CloudCheck className="w-3 h-3" /> Auto-Saved
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between hover:bg-slate-100/80 transition">
                    <div className="flex items-center gap-3">
                      <Database className="w-5 h-5 text-purple-600 shrink-0" />
                      <div>
                        <div className="font-bold text-slate-800">Supabase_Telemetry_Backup_Store</div>
                        <div className="text-[10px] text-slate-400">Tabel PostgreSQL Telemetri Realtime</div>
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 font-bold text-[10px] rounded-lg flex items-center gap-1">
                      <CloudCheck className="w-3 h-3" /> Database Live
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText('https://drive.google.com/drive/folders/uad-heat-exchanger-lab');
                  alert('Link repositori Google Drive berhasil disalin ke clipboard!');
                }}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Salin Link Drive
              </button>
              <button
                type="button"
                onClick={() => setIsCloudDriveModalOpen(false)}
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-700/20 active:scale-95"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}



      {/* ─── INTERACTIVE BEGINNER GUIDED TOUR OVERLAY ─── */}
      <GuidedTour
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

    </div>
  );
}
