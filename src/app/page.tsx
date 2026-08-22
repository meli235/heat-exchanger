'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { uploadToCloud } from '@/lib/supabase-upload';
import { useSupabaseIntegration } from '@/lib/supabaseService';
import GuidedTour from '@/components/GuidedTour';
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

// ─── TYPES & INTERFACES ───
type UserRole = 'admin' | 'operator';

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'Active' | 'Inactive';
  lastLogin: string;
  isScheduleRestricted?: boolean;
  allowedStartDate?: string; // YYYY-MM-DD
  allowedEndDate?: string;   // YYYY-MM-DD
  allowedDays?: string[];
  allowedStartTime?: string;
  allowedEndTime?: string;
}

interface TelemetryPoint {
  timestamp: string;
  ti1: number; // Hot Inlet (°C)
  ti2: number; // Hot Outlet (°C - Monitored at Heater 2 Outlet)
  ti3: number; // Cold Inlet (°C)
  ti4: number; // Cold Outlet (°C)
  ti5: number; // Shell Mid 1 (°C)
  ti6: number; // Shell Mid 2 (°C)
  pi1: number; // Hot Inlet Press (atm-g)
  pi2: number; // Hot Outlet Press (atm-g)
  pi3: number; // Cold Inlet Press (atm-g)
  pi4: number; // Cold Outlet Press (atm-g)
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
    // 1. Calculate optimal servo angle based on setpoint
    const autoServo = Math.round(Math.min(90, Math.max(15, (targetTemp / 90) * 75)));
    // 2. Calculate optimal valve opening:
    const autoFc1 = 85; // Hot water valve open 85% for full heater immersion
    const autoFc2 = Math.round(Math.min(90, Math.max(40, 100 - (targetTemp / 90) * 45))); // Cold water valve

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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'control' | 'cctv' | 'logs' | 'alarms' | 'users'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isTourOpen, setIsTourOpen] = useState<boolean>(false);
  const [isCloudDriveModalOpen, setIsCloudDriveModalOpen] = useState<boolean>(false);
  const [cloudLastSyncTime, setCloudLastSyncTime] = useState<string>(new Date().toLocaleTimeString('id-ID'));

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

      await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === 'complete') return resolve();
        const handler = () => {
          if (pc.iceGatheringState === 'complete') {
            pc.removeEventListener('icegatheringstatechange', handler);
            resolve();
          }
        };
        pc.addEventListener('icegatheringstatechange', handler);
        setTimeout(resolve, 3000);
      });

      const host = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
      let resp: Response | null = null;
      try {
        resp = await fetch(`http://${host}:8889/api/webrtc?src=he_cctv`, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: pc.localDescription?.sdp,
        });
      } catch (fErr) {
        if (host !== 'localhost') {
          resp = await fetch('http://localhost:8889/api/webrtc?src=he_cctv', {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: pc.localDescription?.sdp,
          });
        } else {
          throw fErr;
        }
      }

      if (!resp || !resp.ok) throw new Error(`Server go2rtc error: HTTP ${resp?.status || 'Unknown'}`);

      const answer = await resp.text();
      await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: answer }));
    } catch (err: any) {
      console.error('WebRTC connect error:', err);
      setWebrtcError(err?.message || 'Gagal menyambung ke kamera via WebRTC');
      setWebrtcConnected(false);
    }
  };

  useEffect(() => {
    if (cctvStreamSource === 'local') {
      connectWebRTC();
    }
    return () => {
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cctvStreamSource]);

  // Sync audio mute with video element — uses ref to bypass browser autoplay restrictions
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = cctvAudioMuted;
      if (!cctvAudioMuted) {
        videoRef.current.volume = cctvVolume / 100;
        // Force play to resume audio after unmuting
        videoRef.current.play().catch(() => {});
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
        try { await audioTransceiverRef.current.sender.replaceTrack(null); } catch {}
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
      triggerCctvToast('⏳ Mengolah data & mengunggah file ke Supabase Cloud...', 'info');

      const wb = XLSX.utils.book_new();
      const wsData = [
        ['Waktu Timestamp', 'TI1 Hot In (°C)', 'TI2 Hot Out (°C)', 'TI3 Cold In (°C)', 'TI4 Cold Out (°C)', 'FC1 Laju Alir (L/m)', 'Mode Aliran', 'Status Heater'],
        ...filteredLogsData.map((d) => [
          d.timestamp,
          d.ti1,
          d.ti2,
          d.ti3,
          d.ti4,
          d.fc1,
          d.mode,
          d.heater1Active || d.heater2Active ? 'ON' : 'OFF'
        ])
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, 'Telemetry');
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const fileName = `HE_Telemetry_${new Date().toISOString().slice(0, 10)}.xlsx`;
      
      const result = await uploadToCloud(blob, fileName, 'telemetry-logs');
      XLSX.writeFile(wb, fileName);

      triggerCctvToast('✅ File Excel tersimpan di Cloud Storage!', 'success');
      alert(`✅ File tersimpan di Supabase Cloud Storage!\n\n🔗 URL: ${result.url}`);
    } catch (err: any) {
      console.error('Excel upload error:', err);
      triggerCctvToast('❌ Gagal upload Excel ke Cloud: ' + (err?.message || 'Error'), 'warning');
      alert(`❌ Gagal upload: ${err?.message || 'Error'}`);
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
            <span className={`px-2.5 py-1 rounded-xl text-xs font-extrabold uppercase shadow-sm ${isCounter
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
              <text x="180" y="30" textAnchor="middle" className="text-[9px] font-extrabold fill-slate-800">{latestData.pi1} atm-g</text>
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
            <span className={`inline-block font-extrabold text-[11px] px-2 py-0.5 rounded ${isCounter ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-sky-100 text-sky-800 border border-sky-200'
              }`}>
              {isCounter ? 'Fail-Safe Pasif (SV1&3 OFF, SV2&4 ON)' : 'Active Co-Current (SV1&3 ON, SV2&4 OFF)'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // ─── RENDER: LOGIN SCREEN (SUPPORTING ADMIN & OPERATOR ROLES) ───
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-3.5 sm:p-6 md:p-8 relative overflow-hidden font-sans">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-sky-200/50 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-cyan-200/50 rounded-full blur-3xl pointer-events-none" />

        <header className="flex flex-col sm:flex-row justify-between items-center max-w-7xl mx-auto w-full z-10 gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 relative flex items-center justify-center p-1 bg-white rounded-2xl shadow-md border border-slate-200/80 shrink-0">
                <img src="/uad-logo.png" alt="Logo UAD" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-base sm:text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-1.5 sm:gap-2">
                  FluidHE <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 font-semibold border border-sky-200">v2.5 IoT</span>
                </h1>
                <p className="text-[11px] sm:text-xs text-slate-500 line-clamp-1 sm:line-clamp-none">Universitas Ahmad Dahlan - Dual Heater & Solenoid Control</p>
              </div>
            </div>

            {/* Mobile-only status badge */}
            <div className="sm:hidden flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-slate-200/80 shadow-sm text-[10px] font-bold text-slate-600 shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span>ONLINE</span>
            </div>
          </div>

          {/* Desktop & Tablet status badge */}
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200/80 shadow-sm text-xs font-medium text-slate-600 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span>Connected to UAD Campus Intranet</span>
          </div>
        </header>

        <main className="max-w-md w-full mx-auto my-auto py-4 sm:py-8 z-10">
          <div className="asklepios-card p-5 sm:p-8 bg-white/95 backdrop-blur-md shadow-2xl border border-slate-200/80 rounded-3xl">
            <div className="text-center mb-5 sm:mb-6">
              <div className="inline-flex p-2.5 bg-white rounded-2xl mb-3 border border-slate-200/80 shadow-md w-20 h-20 sm:w-24 sm:h-24 items-center justify-center">
                <img src="/uad-logo.png" alt="Logo UAD" className="w-full h-full object-contain scale-110" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">Masuk ke Sistem</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5 sm:mt-1">Laboratorium Teknik Kimia & IoT Industri UAD</p>
            </div>

            {/* Main Lab Role Switcher (Admin & Operator) - perfectly balanced */}
            <div className="mb-5 p-1 bg-slate-100 rounded-2xl flex border border-slate-200/80 gap-1">
              <button
                type="button"
                onClick={() => {
                  setSelectedDemoRole('admin');
                  setLoginEmail('dwimeliantiistiqomah55@gmail.com');
                  setLoginPassword('');
                  setLoginError(null);
                }}
                className={`flex-1 py-2 px-2 sm:px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${selectedDemoRole === 'admin'
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
              >
                <Shield className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Admin <span className="font-normal opacity-85 text-[10px] hidden xs:inline">(Dosen/KaLab)</span></span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedDemoRole('operator');
                  setLoginEmail('dwi.melianti@mhs.itenas.ac.id');
                  setLoginPassword('');
                  setLoginError(null);
                }}
                className={`flex-1 py-2 px-2 sm:px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${selectedDemoRole === 'operator'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
              >
                <Users className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Operator <span className="font-normal opacity-85 text-[10px] hidden xs:inline">(Mahasiswa)</span></span>
              </button>
            </div>

            <div className="space-y-3.5 sm:space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email / Username</label>
                <div className="relative">
                  <input
                    type="text"
                    value={loginEmail}
                    onChange={(e) => {
                      setLoginEmail(e.target.value);
                      setLoginError(null);
                    }}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-800 transition font-medium"
                    placeholder="user@uad.ac.id"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-slate-700">Kata Sandi</label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsResetModalOpen(true);
                      setResetStep('INPUT_EMAIL');
                      setResetError(null);
                      setResetEmailInput(loginEmail || 'admin@uad.ac.id');
                    }}
                    className="text-[11px] font-bold text-sky-600 hover:text-sky-800 transition"
                  >
                    Lupa / Ganti Sandi?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => {
                      setLoginPassword(e.target.value);
                      setLoginError(null);
                    }}
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-800 transition font-medium"
                    placeholder="••••••••"
                  />
                  <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {loginError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-start gap-2 animate-in fade-in duration-200">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">{loginError}</p>
                  </div>
                </div>
              )}

              <div className="p-3 rounded-2xl bg-sky-50/90 border border-sky-100 text-[11px] sm:text-xs text-sky-800 flex items-start gap-2 leading-relaxed">
                <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <span>
                  Role <strong className="uppercase font-bold">{selectedDemoRole}</strong>:{' '}
                  {selectedDemoRole === 'admin'
                    ? 'Akses penuh kendali hardware, verifikasi alarm & ganti kata sandi via email resmi.'
                    : 'Pengoperasian praktikum mahasiswa, pemantauan sensor real-time & unduh data Excel.'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleLogin()}
                className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-700 hover:to-cyan-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-sky-500/25 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
              >
                Masuk ke Dashboard Lab
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </main>

        <footer className="text-center text-[10px] sm:text-xs text-slate-400 z-10 py-2.5 px-4 leading-relaxed">
          © 2026 Heat Exchanger Control System • Universitas Ahmad Dahlan
        </footer>

        {/* ─── SECURE EMAIL OTP PASSWORD RESET MODAL (FOR ALL REGISTERED USERS) ─── */}
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

                  {smtpStatusInfo === 'UNCONFIGURED' && (
                    <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl text-[11px] text-amber-900 leading-relaxed space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-amber-800">
                        <Info className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Pengiriman Email Memerlukan Kredensial SMTP</span>
                      </div>
                      <p>
                        Agar email terkirim ke Gmail asli Anda, isi <code>SMTP_USER</code> dan <code>SMTP_PASS</code> (Google App Password) di file <code>.env.local</code>.
                      </p>
                    </div>
                  )}

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
                        <span className={`font-black ${
                          strength.score <= 1
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
                        <div className={`h-full flex-1 rounded-full transition-all duration-300 ${
                          strength.score >= 1 ? (strength.score <= 2 ? 'bg-rose-500' : strength.score === 3 ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-transparent'
                        }`} />
                        <div className={`h-full flex-1 rounded-full transition-all duration-300 ${
                          strength.score >= 2 ? (strength.score === 2 ? 'bg-rose-500' : strength.score === 3 ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-transparent'
                        }`} />
                        <div className={`h-full flex-1 rounded-full transition-all duration-300 ${
                          strength.score >= 3 ? (strength.score === 3 ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-transparent'
                        }`} />
                        <div className={`h-full flex-1 rounded-full transition-all duration-300 ${
                          strength.score >= 4 ? 'bg-emerald-500' : 'bg-transparent'
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
                      Kata sandi baru untuk akun <strong>{resetEmailInput}</strong> telah tersimpan dengan aman. Anda sekarang dapat langsung masuk ke dashboard.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsResetModalOpen(false);
                      setLoginEmail(resetEmailInput);
                    }}
                    className="w-full py-2.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs font-extrabold rounded-xl shadow-md transition cursor-pointer"
                  >
                    Masuk Sekarang
                  </button>
                </div>
              )}

            </div>
          </div>
        )}
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
              <div id="tour-temp-cards" className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div
                  onClick={() => setActiveTab('control')}
                  className="asklepios-card p-3.5 sm:p-4 relative overflow-hidden cursor-pointer hover:border-orange-300 hover:shadow-md transition active:scale-[0.98] select-none"
                  title="Klik untuk membuka Kontrol Pemanas & Suhu"
                >
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

                <div
                  onClick={() => setActiveTab('control')}
                  className="asklepios-card p-3.5 sm:p-4 relative overflow-hidden cursor-pointer hover:border-orange-300 hover:shadow-md transition active:scale-[0.98] select-none"
                  title="Klik untuk membuka Kontrol Pemanas & Suhu"
                >
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

                <div
                  onClick={() => setActiveTab('control')}
                  className="asklepios-card p-3.5 sm:p-4 relative overflow-hidden cursor-pointer hover:border-cyan-300 hover:shadow-md transition active:scale-[0.98] select-none"
                  title="Klik untuk membuka Kontrol Pemanas & Suhu"
                >
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

                <div
                  onClick={() => setActiveTab('control')}
                  className="asklepios-card p-3.5 sm:p-4 relative overflow-hidden cursor-pointer hover:border-cyan-300 hover:shadow-md transition active:scale-[0.98] select-none"
                  title="Klik untuk membuka Kontrol Pemanas & Suhu"
                >
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

                <div
                  onClick={() => setActiveTab('control')}
                  className="asklepios-card p-3.5 sm:p-4 relative overflow-hidden cursor-pointer hover:border-sky-300 hover:shadow-md transition active:scale-[0.98] select-none"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold text-slate-500">PI1 / PI2 (Hot Press)</span>
                    <span className="p-1.5 bg-sky-50 text-sky-600 rounded-xl">
                      <Gauge className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-xl font-extrabold text-slate-900">{latestData.pi1} / {latestData.pi2}</span>
                    <span className="text-xs font-semibold text-slate-500">atm-g</span>
                  </div>
                  <div className="mt-2 text-[11px] flex justify-between items-center p-1 bg-slate-50 rounded-lg">
                    <span className="text-slate-500">ΔP Hot:</span>
                    <strong className="text-sky-700">{deltaPHot} atm-g</strong>
                  </div>
                </div>

                <div
                  onClick={() => setActiveTab('control')}
                  className="asklepios-card p-3.5 sm:p-4 relative overflow-hidden cursor-pointer hover:border-cyan-300 hover:shadow-md transition active:scale-[0.98] select-none"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold text-slate-500">PI3 / PI4 (Cold Press)</span>
                    <span className="p-1.5 bg-cyan-50 text-cyan-600 rounded-xl">
                      <Gauge className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-xl font-extrabold text-slate-900">{latestData.pi3} / {latestData.pi4}</span>
                    <span className="text-xs font-semibold text-slate-500">atm-g</span>
                  </div>
                  <div className="mt-2 text-[11px] flex justify-between items-center p-1 bg-slate-50 rounded-lg">
                    <span className="text-slate-500">ΔP Cold:</span>
                    <strong className="text-cyan-700">{deltaPCold} atm-g</strong>
                  </div>
                </div>

                <div
                  onClick={() => setActiveTab('control')}
                  className="asklepios-card p-3.5 sm:p-4 relative overflow-hidden cursor-pointer hover:border-orange-300 hover:shadow-md transition active:scale-[0.98] select-none"
                >
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

                <div
                  onClick={() => setActiveTab('control')}
                  className="asklepios-card p-3.5 sm:p-4 relative overflow-hidden cursor-pointer hover:border-cyan-300 hover:shadow-md transition active:scale-[0.98] select-none"
                >
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
                    <div className={`p-2.5 rounded-xl border flex justify-between items-center font-bold ${dualHeaterState.h1 ? 'bg-orange-50 border-orange-200 text-orange-900' : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}>
                      <span>Heater 1 (500W)</span>
                      <span>{dualHeaterState.h1 ? '⚡ ON' : 'OFF'}</span>
                    </div>
                    <div className={`p-2.5 rounded-xl border flex justify-between items-center font-bold ${dualHeaterState.h2 ? 'bg-orange-50 border-orange-200 text-orange-900' : 'bg-slate-50 border-slate-200 text-slate-500'
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
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${solenoidValves.isFailSafeActive ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'
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

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
                    <label className="text-xs font-extrabold text-slate-800 flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-sky-600" /> Tombol Pemilihan Mode Aliran:
                    </label>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Pengalihan 4 katup solenoid (Counter-Current vs Co-Current)
                    </span>
                  </div>

                  <div id="tour-flow-mode" className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setOperationMode('Co-Current');
                        setFlowVisViewMode('single');
                      }}
                      className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${operationMode === 'Co-Current' && flowVisViewMode === 'single'
                        ? 'bg-gradient-to-br from-sky-600 to-cyan-600 text-white border-sky-600 shadow-lg shadow-sky-600/25 ring-2 ring-sky-300'
                        : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="font-extrabold text-sm flex items-center gap-2">
                          <span className="p-1 rounded-lg bg-white/20">🔄</span> Co-Current
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${operationMode === 'Co-Current' && flowVisViewMode === 'single'
                          ? 'bg-white/25 text-white'
                          : 'bg-sky-100 text-sky-700'
                          }`}>
                          Aliran Searah
                        </span>
                      </div>
                      <p className={`text-[11px] mt-2 leading-relaxed ${operationMode === 'Co-Current' && flowVisViewMode === 'single' ? 'text-sky-50' : 'text-slate-500'
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
                      className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${operationMode === 'Counter-Current' && flowVisViewMode === 'single'
                        ? 'bg-gradient-to-br from-sky-600 to-cyan-600 text-white border-sky-600 shadow-lg shadow-sky-600/25 ring-2 ring-sky-300'
                        : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="font-extrabold text-sm flex items-center gap-2">
                          <span className="p-1 rounded-lg bg-white/20">⇄</span> Counter-Current
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${operationMode === 'Counter-Current' && flowVisViewMode === 'single'
                          ? 'bg-white/25 text-white'
                          : 'bg-emerald-100 text-emerald-700'
                          }`}>
                          Fail-Safe Pasif
                        </span>
                      </div>
                      <p className={`text-[11px] mt-2 leading-relaxed ${operationMode === 'Counter-Current' && flowVisViewMode === 'single' ? 'text-sky-50' : 'text-slate-500'
                        }`}>
                        SV1 & 3 (OFF/Closed), SV2 & 4 (ON/Open). Otomatis aktif saat mati daya.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFlowVisViewMode('compare')}
                      className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${flowVisViewMode === 'compare'
                        ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white border-purple-600 shadow-lg shadow-purple-600/25 ring-2 ring-purple-300'
                        : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="font-extrabold text-sm flex items-center gap-2">
                          <span className="p-1 rounded-lg bg-white/20">📊</span> Bandingkan Both Mode
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${flowVisViewMode === 'compare' ? 'bg-white/25 text-white' : 'bg-purple-100 text-purple-700'
                          }`}>
                          Dual View
                        </span>
                      </div>
                      <p className={`text-[11px] mt-2 leading-relaxed ${flowVisViewMode === 'compare' ? 'text-purple-50' : 'text-slate-500'
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
                      {syncFeedback.active && (
                        <>
                          <div className="flex items-center gap-2">
                            <strong className="text-xs font-bold text-slate-900">
                              {syncFeedback.message}
                            </strong>
                            <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-extrabold uppercase tracking-wider ${syncFeedback.type === 'syncing'
                                ? 'bg-sky-100 text-sky-800 border border-sky-200 animate-pulse'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              }`}>
                              {syncFeedback.type === 'syncing' ? 'Mengirim ke Alat...' : 'Perintah Diterima'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                            {syncFeedback.detail}
                          </p>
                        </>
                      )}
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
                <div className="space-y-3">
                  <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-emerald-600" /> Pembacaan Sensor Real-Time
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 text-xs">
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-semibold block">TI1 (Hot In)</span>
                      <strong className="text-orange-600 font-extrabold text-sm sm:text-base">
                        {supabaseTelemetry ? supabaseTelemetry.temp_1.toFixed(1) : latestData.ti1.toFixed(1)} °C
                      </strong>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-semibold block">TI2 (Hot Out)</span>
                      <strong className="text-orange-600 font-extrabold text-sm sm:text-base">
                        {supabaseTelemetry ? supabaseTelemetry.temp_2.toFixed(1) : latestData.ti2.toFixed(1)} °C
                      </strong>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-semibold block">TI3 (Cold In)</span>
                      <strong className="text-cyan-600 font-extrabold text-sm sm:text-base">
                        {supabaseTelemetry ? supabaseTelemetry.temp_3.toFixed(1) : latestData.ti3.toFixed(1)} °C
                      </strong>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-semibold block">TI4 (Cold Out)</span>
                      <strong className="text-cyan-600 font-extrabold text-sm sm:text-base">
                        {supabaseTelemetry ? supabaseTelemetry.temp_4.toFixed(1) : latestData.ti4.toFixed(1)} °C
                      </strong>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-semibold block">Tekanan (PI1)</span>
                      <strong className="text-sky-600 font-extrabold text-sm sm:text-base">
                        {supabaseTelemetry ? supabaseTelemetry.pressure.toFixed(2) : latestData.pi1.toFixed(2)} atm-g
                      </strong>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-semibold block">Debit Alir (FC1)</span>
                      <strong className="text-emerald-600 font-extrabold text-sm sm:text-base">
                        {supabaseTelemetry ? supabaseTelemetry.flow_rate.toFixed(1) : latestData.fc1.toFixed(1)} L/m
                      </strong>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-semibold block">Status Heater</span>
                      <span className={`inline-block px-2 py-0.5 mt-0.5 rounded text-[10px] font-extrabold ${(supabaseTelemetry?.heater_status === 'ON' || dualHeaterState.powerWatt > 0)
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-slate-200 text-slate-700'
                        }`}>
                        {dualHeaterState.powerWatt > 0 ? `${dualHeaterState.powerWatt}W` : 'OFF'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-semibold block">Status Alarm</span>
                      <span className={`inline-block px-2 py-0.5 mt-0.5 rounded text-[10px] font-extrabold ${(supabaseTelemetry?.warning_status === 'NORMAL')
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                        }`}>
                        {supabaseTelemetry ? supabaseTelemetry.warning_status : 'NORMAL'}
                      </span>
                    </div>
                  </div>
                </div>

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
                    <div id="tour-flow-mode-control" className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <label className="text-xs font-bold text-slate-800 block">Arah Aliran Fluida (Flow Mode)</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setOperationMode('Counter-Current');
                            handleFlowModeChange('COUNTER');
                            triggerSyncFeedback('Arah Aliran', 'COUNTER-CURRENT');
                          }}
                          disabled={emergencyStopped}
                          className={`py-2 rounded-xl text-xs font-extrabold transition ${supabaseControls.flow_mode === 'COUNTER'
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
                            triggerSyncFeedback('Arah Aliran', 'CO-CURRENT');
                          }}
                          disabled={emergencyStopped}
                          className={`py-2 rounded-xl text-xs font-extrabold transition ${supabaseControls.flow_mode === 'CO-CURRENT'
                              ? 'bg-sky-600 text-white shadow'
                              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                            }`}
                        >
                          CO-CURRENT
                        </button>
                      </div>
                      <span className="text-[10px] text-slate-500 block">Status Saat Ini: <strong>{supabaseControls.flow_mode}</strong></span>
                    </div>

                    {/* Tombol Heater Power + Dual Heater Status */}
                    <div id="tour-heater-control" className={`p-4 rounded-2xl border transition-all space-y-2 ${supabaseControls.control_mode === 'AUTO' ? 'bg-purple-50/60 border-purple-200' : 'bg-slate-50 border-slate-200'
                      }`}>
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-slate-800">Daya Utama Pemanas</label>
                        {supabaseControls.control_mode === 'AUTO' ? (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                            AUTO PID HEATING
                          </span>
                        ) : (
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${supabaseControls.heater_status ? 'bg-orange-100 text-orange-800' : 'bg-slate-200 text-slate-600'
                            }`}>
                            {supabaseControls.heater_status ? 'POWER ON' : 'POWER OFF'}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const nextState = !supabaseControls.heater_status;
                          setHeaterMasterPower(nextState);
                          handleHeaterPowerToggle(nextState);
                          triggerSyncFeedback('Daya Pemanas', nextState ? 'POWER ON' : 'POWER OFF');
                        }}
                        disabled={emergencyStopped || supabaseControls.control_mode === 'AUTO'}
                        className={`w-full py-2.5 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-2 ${supabaseControls.control_mode === 'AUTO'
                            ? 'bg-purple-600 text-white opacity-90 cursor-not-allowed shadow-sm'
                            : supabaseControls.heater_status
                              ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md'
                              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                          }`}
                      >
                        <Power className="w-4 h-4" />
                        {supabaseControls.control_mode === 'AUTO'
                          ? 'Otomatis Dikelola (Mode AUTO)'
                          : supabaseControls.heater_status
                            ? 'Matikan Heater'
                            : 'Nyalakan Heater'}
                      </button>
                      <span className="text-[10.5px] text-sky-700 font-semibold block truncate">
                        Tahap: {
                          dualHeaterState.stage === 'STAGE_1'
                            ? 'Tahap 1 (Pemanasan Penuh 1000W)'
                            : dualHeaterState.stage === 'STAGE_2'
                              ? 'Tahap 2 (Kontrol Halus 500W)'
                              : dualHeaterState.stage === 'SETPOINT_REACHED'
                                ? 'Siaga (Target Suhu Tercapai 0W)'
                                : 'Nonaktif (0W)'
                        }
                      </span>
                    </div>

                    {/* Slider Target Suhu (TC1 Setpoint) */}
                    <div className={`p-4 rounded-2xl border transition-all space-y-2 ${supabaseControls.control_mode === 'AUTO'
                        ? 'bg-purple-50/70 border-purple-300 ring-2 ring-purple-400/20'
                        : 'bg-slate-50 border-slate-200'
                      }`}>
                      <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                        <span className="flex items-center gap-1.5">
                          Target Suhu (TC₁ Setpoint)
                          {supabaseControls.control_mode === 'AUTO' && (
                            <span className="px-1.5 py-0.2 bg-purple-600 text-white text-[9px] font-extrabold rounded-md uppercase">
                              Parameter Utama
                            </span>
                          )}
                        </span>
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
                          if (supabaseControls.control_mode === 'AUTO') {
                            applyAutoControl(val);
                          }
                          triggerSyncFeedback('Target Suhu', `${val.toFixed(1)}°C`);
                        }}
                        disabled={emergencyStopped}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                        <span>30.0 °C</span>
                        <span>60.0 °C</span>
                        <span>90.0 °C</span>
                      </div>
                    </div>

                    {/* Slider Sudut Servo (0 - 90 Derajat) */}
                    <div className={`p-4 rounded-2xl border transition-all space-y-2 ${supabaseControls.control_mode === 'AUTO' ? 'bg-purple-50/60 border-purple-200' : 'bg-slate-50 border-slate-200'
                      }`}>
                      <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                        <span className="flex items-center gap-1">
                          Sudut Bukaan Katup Servo
                          {supabaseControls.control_mode === 'AUTO' && (
                            <span className="text-[9px] text-purple-700 font-extrabold bg-purple-100 px-1.5 py-0.5 rounded border border-purple-200">
                              AUTO PID
                            </span>
                          )}
                        </span>
                        <strong className="text-indigo-600 font-extrabold text-base">{supabaseControls.servo_angle}°</strong>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="90"
                        value={supabaseControls.servo_angle}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          handleServoAngleChange(val);
                          triggerSyncFeedback('Sudut Katup Servo', `${val}°`);
                        }}
                        disabled={emergencyStopped || supabaseControls.control_mode === 'AUTO'}
                        className={`w-full h-2 bg-slate-200 rounded-lg appearance-none ${supabaseControls.control_mode === 'AUTO' ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                          }`}
                      />
                      <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                        <span>0° (Closed)</span>
                        <span>{supabaseControls.control_mode === 'AUTO' ? 'Otomatis ESP32' : '45° (Half)'}</span>
                        <span>90° (Open)</span>
                      </div>
                    </div>

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

          {/* TAB 3: CCTV LIVE MONITORING (MODERN MINIMALIST INDUSTRIAL DESIGN) */}
          {activeTab === 'cctv' && (
            <div className="space-y-6">
              
              {/* Header Bar: Clean & Minimalist */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                      CCTV Live Monitoring — Heat Exchanger Lab
                    </h2>
                  </div>

                </div>

                {/* Channel Switchers: Minimalist Tabs */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCamera('cam1');
                      handlePtzAction('rig');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${selectedCamera === 'cam1'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Rig Shell & Tube
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCamera('cam2');
                      handlePtzAction('tank');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${selectedCamera === 'cam2'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Tangki Fluida
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCamera('cam3');
                      handlePtzAction('valve');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${selectedCamera === 'cam3'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Panel Valve
                  </button>
                </div>
              </div>

              {/* Main Monitoring Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left (2 Cols): Live Video Canvas & Floating Quick Actions */}
                <div className="lg:col-span-2 space-y-4">
                  
                  {/* Video Player Container */}
                  <div
                    id="cctv-player-container"
                    className="relative bg-zinc-950 rounded-2xl overflow-hidden shadow-xl aspect-video flex flex-col justify-between p-4 border border-zinc-800 group"
                  >
                    
                    {/* Top Floating Badges */}
                    <div className="relative z-20 flex justify-between items-center text-xs text-white/90 font-mono pointer-events-none">
                      <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-[11px] font-semibold tracking-wider">
                          LIVE • {selectedCamera === 'cam1' ? 'RIG SHELL & TUBE' : selectedCamera === 'cam2' ? 'STORAGE TANK' : 'VALVE MANIFOLD'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 pointer-events-auto">
                        {cctvStreamSource === 'demo' && (
                          <div className="bg-sky-600/90 text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide">
                            SIMULATED FEED
                          </div>
                        )}
                        {isManualRecording && (
                          <div className="flex items-center gap-1.5 bg-red-600/90 text-white px-2.5 py-0.5 rounded-full text-[11px] font-bold animate-pulse">
                            <Disc className="w-3 h-3 animate-spin" />
                            <span>REC {String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:{String(recordingSeconds % 60).padStart(2, '0')}</span>
                          </div>
                        )}

                        <div className="bg-black/60 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/10 text-[10px] font-semibold text-zinc-300">
                          1080P
                        </div>
                      </div>
                    </div>

                    {/* Toast Notification Pill */}
                    {cctvToast && (
                      <div className="absolute top-12 left-1/2 -translate-x-1/2 z-30 px-3.5 py-1.5 bg-zinc-900/95 border border-zinc-700 backdrop-blur-md text-white text-xs font-medium rounded-xl shadow-lg animate-fade-in flex items-center gap-2">
                        <span>{cctvToast.message}</span>
                      </div>
                    )}

                    {/* Video Stream Element */}
                    <div className="absolute inset-0 z-10 w-full h-full flex items-center justify-center bg-black overflow-hidden rounded-2xl">
                      {cctvStreamSource === 'demo' ? (
                        <div className="flex flex-col items-center justify-center text-center p-6 space-y-3">
                          <div className="w-14 h-14 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center animate-pulse">
                            <Video className="w-7 h-7" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white">Mode Simulasi Video CCTV Active</h4>
                            <p className="text-xs text-zinc-400 max-w-sm mt-1">
                              Server streaming RTSP (<code className="text-sky-300 font-mono">go2rtc</code> port 8889) belum aktif di komputer host.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setCctvStreamSource('local');
                              triggerCctvToast('Mencoba menyambung via WebRTC ke go2rtc...', 'info');
                            }}
                            className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl border border-zinc-700 transition"
                          >
                            Sambung Ulang ke go2rtc (Port 8889)
                          </button>
                        </div>
                      ) : cctvStreamSource === 'local' ? (
                        <>
                          {!cctvAudioMuted && !audioUserActivated && (
                            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 rounded-2xl">
                              <button
                                type="button"
                                onClick={() => {
                                  setAudioUserActivated(true);
                                  if (videoRef.current) {
                                    videoRef.current.muted = false;
                                    videoRef.current.play().catch(() => {});
                                  }
                                }}
                                className="px-6 py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition cursor-pointer shadow-lg shadow-sky-600/30"
                              >
                                <Volume2 className="w-5 h-5" /> Klik untuk Nyalakan Audio Lab
                              </button>
                            </div>
                          )}
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted={!audioUserActivated || cctvAudioMuted}
                            className="w-full h-full object-contain rounded-2xl"
                          />
                          {!webrtcConnected && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 space-y-3 bg-black/90 z-20">
                              {webrtcError ? (
                                <>
                                  <div className="w-14 h-14 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center">
                                    <AlertTriangle className="w-7 h-7" />
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-bold text-white">Gagal Terhubung ke Kamera</h4>
                                    <p className="text-xs text-zinc-400 max-w-sm mt-1">{webrtcError}</p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => connectWebRTC()}
                                    className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-xl transition"
                                  >
                                    Coba Sambung Ulang
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => { setCctvStreamSource('demo'); triggerCctvToast('Beralih ke Mode Simulasi', 'info'); }}
                                    className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg border border-zinc-700 transition"
                                  >
                                    Beralih ke Simulasi Feed
                                  </button>
                                </>
                              ) : (
                                <>
                                  <div className="w-14 h-14 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center animate-pulse">
                                    <Video className="w-7 h-7" />
                                  </div>
                                  <p className="text-sm font-bold text-white">Menyambungkan ke Kamera via WebRTC...</p>
                                  <p className="text-xs text-zinc-500 font-mono">go2rtc &bull; localhost:8889</p>
                                </>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <iframe
                          src={cctvIpUrl}
                          className="w-full h-full border-0 rounded-2xl"
                          allow="autoplay; encrypted-media; picture-in-picture; camera; microphone"
                          allowFullScreen
                          title="Live CCTV Feed"
                        />
                      )}
                    </div>
                    {/* Bottom Status & Floating Snapshot Action Bar */}
                    <div className="relative z-20 flex justify-between items-center bg-black/60 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10 mt-auto">
                      <div className="flex items-center gap-2 text-white text-xs">
                        <button
                          type="button"
                          onClick={() => setCctvRecording(!cctvRecording)}
                          className="p-1 hover:bg-white/10 rounded-md transition text-zinc-300 hover:text-white"
                          title={cctvRecording ? 'Jeda Perekaman NVR' : 'Mulai Merekam NVR'}
                        >
                          {cctvRecording ? <Pause className="w-3.5 h-3.5 text-emerald-400" /> : <Play className="w-3.5 h-3.5" />}
                        </button>
                        <span className="text-[11px] text-zinc-300 font-medium">
                          NVR: <strong className="text-emerald-400">{cctvRecording ? '24/7 Aktif' : 'Jeda'}</strong>
                        </span>

                        {cctvStreamSource === 'local' && (
                          <button
                            type="button"
                            onClick={() => {
                              setCctvStreamSource('demo');
                              triggerCctvToast('Mengalihkan ke Mode Simulasi Video Lab', 'success');
                            }}
                            className="ml-2 px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded text-[10px] hover:bg-amber-500/30 transition"
                          >
                            Refused to connect? Klik Beralih ke Simulasi Feed
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const el = document.getElementById('cctv-player-container');
                            if (el && !document.fullscreenElement) {
                              el.requestFullscreen?.();
                            } else if (document.exitFullscreen) {
                              document.exitFullscreen();
                            }
                          }}
                          className="p-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs transition"
                          title="Layar Penuh"
                        >
                          <Maximize2 className="w-3.5 h-3.5 text-zinc-300" />
                        </button>
                      </div>
                    </div>

                  </div>

                  {/* Clean Quick Action Bar */}
                  <div className="p-4 bg-zinc-900 text-white rounded-2xl border border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between text-xs text-zinc-400 pb-1 border-b border-zinc-800">
                      <span className="font-semibold text-zinc-300">Kontrol Cepat Kamera</span>
                      <span>IP Camera 360 Series</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={handleTakeSnapshot}
                        className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 transition text-zinc-200 text-xs font-medium gap-1"
                      >
                        <Camera className="w-4 h-4 text-sky-400" />
                        <span className="text-[11px]">Snapshot</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleToggleManualRecord}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl transition text-xs font-medium gap-1 ${isManualRecording
                          ? 'bg-red-600 text-white'
                          : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200'
                        }`}
                      >
                        <Disc className={`w-4 h-4 ${isManualRecording ? 'animate-spin' : 'text-red-400'}`} />
                        <span className="text-[11px]">{isManualRecording ? 'Stop Rekam' : 'Rekam Video'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const nextMuted = !cctvAudioMuted;
                          setCctvAudioMuted(nextMuted);
                          if (videoRef.current) {
                            videoRef.current.muted = nextMuted;
                            if (!nextMuted) {
                              videoRef.current.volume = cctvVolume / 100;
                              videoRef.current.play().catch((err) => console.log('Audio play error:', err));
                            }
                          }
                          triggerCctvToast(!nextMuted ? '🔊 Suara CCTV AKTIF (Dengarkan Lab)' : '🔇 Suara CCTV Muted', 'info');
                        }}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl transition text-xs font-medium gap-1 ${!cctvAudioMuted
                          ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                          : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200'
                        }`}
                      >
                        {!cctvAudioMuted ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-zinc-400" />}
                        <span className="text-[11px]">{!cctvAudioMuted ? 'Suara ON' : 'Suara OFF'}</span>
                      </button>
                    </div>

                    {!cctvAudioMuted && (
                      <div className="pt-2 flex items-center gap-3 px-3 py-1.5 bg-zinc-800/50 rounded-xl border border-zinc-700/50 text-xs">
                        <Volume1 className="w-4 h-4 text-zinc-400 shrink-0" />
                        <span className="text-[11px] text-zinc-300 shrink-0">Volume Suara Lab:</span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={cctvVolume}
                          onChange={(e) => setCctvVolume(Number(e.target.value))}
                          className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
                        />
                        <span className="font-mono text-zinc-300 w-8 text-right text-[11px]">{cctvVolume}%</span>
                      </div>
                    )}
                  </div>

                </div>

                {/* Right (1 Col): Minimalist PTZ D-Pad Controller & Real-Time Telemetry */}
                <div className="space-y-6">
                  
                  {/* PTZ Rotasi Controller Card */}
                  <div className="p-5 bg-zinc-900 text-white rounded-2xl border border-zinc-800 space-y-4 shadow-sm">
                    <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                        <Compass className="w-4 h-4 text-sky-400" /> Kontrol Rotasi Kamera
                      </h3>
                      <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded-full font-mono">
                        Connected
                      </span>
                    </div>

                    {/* Minimalist Matte D-Pad */}
                    <div className="flex flex-col items-center justify-center py-2">
                      <div className="relative w-40 h-40 rounded-full bg-zinc-800/90 border border-zinc-700/80 shadow-lg flex items-center justify-center">
                        
                        {/* UP */}
                        <button
                          type="button"
                          onClick={() => handlePtzAction('up')}
                          className={`absolute top-2 left-1/2 -translate-x-1/2 w-10 h-8 rounded-t-xl bg-zinc-700/70 hover:bg-sky-600 text-zinc-200 hover:text-white flex items-center justify-center transition active:scale-95 ${ptzMoving === 'up' ? 'bg-sky-500 text-white scale-95' : ''}`}
                          title="Putar Atas"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>

                        {/* DOWN */}
                        <button
                          type="button"
                          onClick={() => handlePtzAction('down')}
                          className={`absolute bottom-2 left-1/2 -translate-x-1/2 w-10 h-8 rounded-b-xl bg-zinc-700/70 hover:bg-sky-600 text-zinc-200 hover:text-white flex items-center justify-center transition active:scale-95 ${ptzMoving === 'down' ? 'bg-sky-500 text-white scale-95' : ''}`}
                          title="Putar Bawah"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>

                        {/* LEFT */}
                        <button
                          type="button"
                          onClick={() => handlePtzAction('left')}
                          className={`absolute left-2 top-1/2 -translate-y-1/2 w-8 h-10 rounded-l-xl bg-zinc-700/70 hover:bg-sky-600 text-zinc-200 hover:text-white flex items-center justify-center transition active:scale-95 ${ptzMoving === 'left' ? 'bg-sky-500 text-white scale-95' : ''}`}
                          title="Putar Kiri"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>

                        {/* RIGHT */}
                        <button
                          type="button"
                          onClick={() => handlePtzAction('right')}
                          className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-10 rounded-r-xl bg-zinc-700/70 hover:bg-sky-600 text-zinc-200 hover:text-white flex items-center justify-center transition active:scale-95 ${ptzMoving === 'right' ? 'bg-sky-500 text-white scale-95' : ''}`}
                          title="Putar Kanan"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>

                        {/* CENTER: Auto Reset */}
                        <button
                          type="button"
                          onClick={() => handlePtzAction('center')}
                          className="w-12 h-12 rounded-full bg-zinc-700 hover:bg-sky-600 text-white shadow-md flex items-center justify-center text-[10px] font-bold transition active:scale-90 border border-zinc-600"
                          title="Reset Posisi"
                        >
                          <RotateCw className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Presets */}
                    <div className="space-y-2 pt-2 border-t border-zinc-800">
                      <span className="text-[11px] font-medium text-zinc-400">Sudut Sorot Cepat:</span>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => handlePtzPreset('Rig Shell & Tube', 'rig')}
                          className="px-2.5 py-1.5 bg-zinc-800/80 hover:bg-zinc-700 rounded-lg text-[11px] font-medium text-zinc-200 text-left transition truncate border border-zinc-700/50"
                        >
                          • Rig Shell & Tube
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePtzPreset('Tangki Fluida', 'tank')}
                          className="px-2.5 py-1.5 bg-zinc-800/80 hover:bg-zinc-700 rounded-lg text-[11px] font-medium text-zinc-200 text-left transition truncate border border-zinc-700/50"
                        >
                          • Tangki & Pompa
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePtzPreset('Panel Solenoid', 'valve')}
                          className="px-2.5 py-1.5 bg-zinc-800/80 hover:bg-zinc-700 rounded-lg text-[11px] font-medium text-zinc-200 text-left transition truncate border border-zinc-700/50"
                        >
                          • Panel Solenoid
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePtzPreset('Reset Tengah', 'center')}
                          className="px-2.5 py-1.5 bg-zinc-800/80 hover:bg-zinc-700 rounded-lg text-[11px] font-medium text-zinc-200 text-left transition truncate border border-zinc-700/50"
                        >
                          • Reset Tengah
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Telemetry Live Data Card */}
                  <div className="p-5 bg-zinc-900 text-white rounded-2xl border border-zinc-800 space-y-3 shadow-sm">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2 border-b border-zinc-800 pb-3">
                      <Activity className="w-4 h-4 text-emerald-400" /> Sensor Terhubung
                    </h3>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 bg-zinc-800/60 rounded-xl border border-zinc-700/40">
                        <span className="text-zinc-400 text-[10.5px] block">TI1 (Hot In):</span>
                        <strong className="text-amber-400 font-mono text-sm">{latestData.ti1}°C</strong>
                      </div>
                      <div className="p-2.5 bg-zinc-800/60 rounded-xl border border-zinc-700/40">
                        <span className="text-zinc-400 text-[10.5px] block">TI2 (Hot Out):</span>
                        <strong className="text-rose-400 font-mono text-sm">{latestData.ti2}°C</strong>
                      </div>
                      <div className="p-2.5 bg-zinc-800/60 rounded-xl border border-zinc-700/40">
                        <span className="text-zinc-400 text-[10.5px] block">TI3 (Cold In):</span>
                        <strong className="text-cyan-400 font-mono text-sm">{latestData.ti3}°C</strong>
                      </div>
                      <div className="p-2.5 bg-zinc-800/60 rounded-xl border border-zinc-700/40">
                        <span className="text-zinc-400 text-[10.5px] block">TI4 (Cold Out):</span>
                        <strong className="text-cyan-400 font-mono text-sm">{latestData.ti4}°C</strong>
                      </div>
                    </div>
                  </div>

                </div>

              </div>

              {/* Bottom Section: Media History Gallery */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Camera className="w-4 h-4 text-sky-600" /> Galeri Media & Rekaman CCTV Lab
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Foto snapshot dan rekaman video tersimpan beserta data telemetri sensor suhu
                    </p>
                  </div>

                    {/* Filter Tabs */}
                    <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setActiveMediaTab('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${activeMediaTab === 'all'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                          }`}
                      >
                        Semua ({cctvMediaList.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveMediaTab('snapshot')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${activeMediaTab === 'snapshot'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                          }`}
                      >
                        <Camera className="w-3.5 h-3.5 text-sky-600" /> Foto ({cctvMediaList.filter(m => m.type === 'snapshot').length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveMediaTab('video')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${activeMediaTab === 'video'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                          }`}
                      >
                        <Film className="w-3.5 h-3.5 text-red-600" /> Video ({cctvMediaList.filter(m => m.type === 'video').length})
                      </button>
                    </div>
                  </div>

                  {/* Media Grid Cards */}
                  {cctvMediaList.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-slate-400 text-xs">
                      Belum ada foto snapshot atau rekaman video yang diambil. Klik tombol <strong>Snapshot</strong> atau <strong>Rekam Video</strong> di atas.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-1">
                      {cctvMediaList
                        .filter(item => activeMediaTab === 'all' ? true : item.type === activeMediaTab)
                        .map((media) => (
                          <div
                            key={media.id}
                            className="p-4 bg-slate-50 hover:bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition space-y-3 group"
                          >
                            <div className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center border border-slate-800">
                              {media.type === 'snapshot' && media.url ? (
                                <img src={media.url} alt={media.title} className="w-full h-full object-cover" />
                              ) : media.type === 'video' && media.url ? (
                                <video src={media.url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                              ) : (
                                <div className="text-center p-2 text-slate-400">
                                  {media.type === 'snapshot' ? (
                                    <Camera className="w-8 h-8 text-sky-400 mx-auto mb-1" />
                                  ) : (
                                    <Film className="w-8 h-8 text-red-400 mx-auto mb-1" />
                                  )}
                                  <span className="text-[10px] font-mono font-bold text-slate-300 block">
                                    {media.type === 'snapshot' ? 'SNAPSHOT FOTO' : `VIDEO (${media.metadata?.duration || '15s'})`}
                                  </span>
                                </div>
                              )}

                              <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 backdrop-blur-md rounded-md text-[10px] font-bold text-white">
                                {media.type === 'snapshot' ? '📸 FOTO' : '🎥 VIDEO'}
                              </div>
                            </div>

                            <div>
                              <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{media.title}</h4>
                              <p className="text-[11px] text-slate-500 font-mono mt-0.5">{media.timestamp}</p>
                            </div>

                            {/* Watermark Telemetry Badges */}
                            {media.metadata && (
                              <div className="p-2 bg-white rounded-xl border border-slate-200/80 text-[10px] grid grid-cols-2 gap-1 font-mono text-slate-600">
                                <div>TI1: <strong className="text-orange-600">{media.metadata.ti1}°C</strong></div>
                                <div>TI2: <strong className="text-red-600">{media.metadata.ti2}°C</strong></div>
                                <div>TI3: <strong className="text-cyan-600">{media.metadata.ti3}°C</strong></div>
                                <div>FC1: <strong className="text-emerald-600">{media.metadata.flow} L/m</strong></div>
                              </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                              <button
                                type="button"
                                onClick={() => setPreviewMediaItem(media)}
                                className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
                              >
                                <Eye className="w-3.5 h-3.5" /> Lihat
                              </button>
                              <div className="flex items-center gap-1">
                                {media.url && (
                                  <a
                                    href={media.url}
                                    download={media.type === 'snapshot'
                                      ? `FluidHE_Snapshot_${media.id}.png`
                                      : `FluidHE_Rekaman_${media.id}.webm`}
                                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 p-1 hover:bg-emerald-50 rounded-lg transition"
                                    title="Download"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </a>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMediaItem(media.id)}
                                  className="text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1 p-1 hover:bg-red-50 rounded-lg transition"
                                  title="Hapus Media"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

              {/* Media Preview Modal */}
              {previewMediaItem && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl animate-fade-in">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                      <div>
                        <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                          {previewMediaItem.type === 'snapshot' ? <Camera className="w-5 h-5 text-sky-400" /> : <Film className="w-5 h-5 text-red-400" />}
                          {previewMediaItem.title}
                        </h3>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">{previewMediaItem.timestamp}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPreviewMediaItem(null)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="aspect-video bg-black rounded-2xl border border-slate-800 flex items-center justify-center relative overflow-hidden">
                      {previewMediaItem.type === 'snapshot' && previewMediaItem.url ? (
                        <img src={previewMediaItem.url} alt="Snapshot" className="w-full h-full object-cover" />
                      ) : previewMediaItem.type === 'video' && previewMediaItem.url ? (
                        <video
                          src={previewMediaItem.url}
                          controls
                          autoPlay
                          className="w-full h-full object-contain rounded-2xl"
                        />
                      ) : (
                        <div className="text-center p-6 space-y-2">
                          <Video className="w-16 h-16 text-sky-400 mx-auto animate-pulse" />
                          <p className="text-sm font-bold text-slate-200">Pratinjau Hasil Tangkapan Kamera CCTV Lab</p>
                          <p className="text-xs text-slate-400 font-mono">Resolusi: 1920x1080 FHD • Lab HE Kampus IV UAD</p>
                        </div>
                      )}
                    </div>

                    {/* Sensor Metadata Stamp Card */}
                    {previewMediaItem.metadata && (
                      <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700 space-y-2">
                        <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                          <Activity className="w-4 h-4" /> Telemetri Suhu & Debit Saat Tangkapan Diambil:
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                          <div className="p-2 bg-slate-900/90 rounded-xl border border-slate-700/60">
                            <span className="text-slate-400 block text-[10px]">TI1 (Hot In)</span>
                            <strong className="text-orange-400 text-sm">{previewMediaItem.metadata.ti1}°C</strong>
                          </div>
                          <div className="p-2 bg-slate-900/90 rounded-xl border border-slate-700/60">
                            <span className="text-slate-400 block text-[10px]">TI2 (Hot Out)</span>
                            <strong className="text-red-400 text-sm">{previewMediaItem.metadata.ti2}°C</strong>
                          </div>
                          <div className="p-2 bg-slate-900/90 rounded-xl border border-slate-700/60">
                            <span className="text-slate-400 block text-[10px]">TI3 (Cold In)</span>
                            <strong className="text-cyan-400 text-sm">{previewMediaItem.metadata.ti3}°C</strong>
                          </div>
                          <div className="p-2 bg-slate-900/90 rounded-xl border border-slate-700/60">
                            <span className="text-slate-400 block text-[10px]">TI4 (Cold Out)</span>
                            <strong className="text-cyan-400 text-sm">{previewMediaItem.metadata.ti4}°C</strong>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                      {previewMediaItem.url && (
                        <a
                          href={previewMediaItem.url}
                          download={previewMediaItem.type === 'snapshot'
                            ? `FluidHE_Snapshot_${previewMediaItem.id}.png`
                            : `FluidHE_Rekaman_${previewMediaItem.id}.webm`}
                          className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                        >
                          <Download className="w-4 h-4" /> Download {previewMediaItem.type === 'snapshot' ? 'PNG' : 'WebM'}
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          triggerCctvToast('File CCTV tersimpan otomatis di Cloud Drive UAD.', 'info');
                          setIsCloudDriveModalOpen(true);
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                      >
                        <CloudCheck className="w-4 h-4 text-emerald-200" /> Cloud Drive
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewMediaItem(null)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
                      >
                        Tutup
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}



          {/* TAB 4: DATA LOGS & EXPORT LAPORAN */}
          {activeTab === 'logs' && (
            <div className="space-y-6">
              <div id="tour-logs-tab" className="asklepios-card p-6 bg-white shadow-xl rounded-3xl border border-slate-200">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                      <FileText className="w-6 h-6 text-sky-600" /> Laporan Monitoring Heat Exchanger
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">Sinkronisasi otomatis telemetri real-time ke Cloud Drive</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 no-print">
                    <button
                      type="button"
                      onClick={handleExportAndUpload}
                      disabled={isUploading}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-2 transition active:scale-95 cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-emerald-200" /> {isUploading ? 'Mengunggah ke Cloud...' : 'Ekspor & Upload Excel (Cloud)'}
                    </button>
                    <button
                      onClick={handleCloudDriveAccess}
                      className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-md shadow-sky-600/20 flex items-center gap-2 transition active:scale-95"
                    >
                      <CloudCheck className="w-4 h-4 text-sky-200 animate-pulse" /> Akses Supabase Storage
                    </button>
                    <button
                      onClick={exportPDFReport}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 transition active:scale-95"
                    >
                      <FileText className="w-4 h-4" /> Cetak / PDF Laporan
                    </button>
                  </div>
                </div>



                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/90 mb-6 space-y-1.5 text-xs">
                  <h1 className="text-base font-extrabold text-slate-900 tracking-wide">LAPORAN MONITORING HEAT EXCHANGER UAD</h1>
                  <p className="text-slate-600 font-medium">Sistem: <strong className="text-slate-800">Heat Exchanger Thermal Analytics (Interval Sampling: {logInterval})</strong></p>
                  <p className="text-slate-600 font-medium">
                    Rentang Data: <strong className="text-slate-800">
                      {filteredLogsData.length > 0
                        ? `${new Date().toLocaleDateString('id-ID')}, ${filteredLogsData[0]?.timestamp} WIB s.d. ${new Date().toLocaleDateString('id-ID')}, ${filteredLogsData[filteredLogsData.length - 1]?.timestamp} WIB`
                        : `Tidak ada data log (${dateFilter === 'Yesterday' ? 'Kemarin' : dateFilter === '7Days' ? '7 Hari Terakhir' : 'Kriteria Pencarian'})`}
                    </strong>
                  </p>
                </div>

                {/* Filter Controls Bar with 2s, 30s option */}
                <div className="p-4 bg-white rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 no-print shadow-sm">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Cari Waktu / Sensor</label>
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={logSearchQuery}
                        onChange={(e) => setLogSearchQuery(e.target.value)}
                        placeholder="Contoh: 12.31, 25.00, ON, Counter..."
                        className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Interval Sampling Pencatatan</label>
                    <select
                      value={logInterval}
                      onChange={(e) => setLogInterval(e.target.value as '1s' | '2s' | '5s' | '30s' | '1m')}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-bold focus:outline-none"
                    >
                      <option value="1s">1 Detik (High Frequency)</option>
                      <option value="2s">2 Detik (Rekomendasi Praktikum)</option>
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
                      {filteredLogsData.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-10 text-center bg-slate-50/50">
                            <div className="flex flex-col items-center justify-center gap-2 py-6">
                              <FileText className="w-9 h-9 text-slate-300" />
                              <span className="font-bold text-sm text-slate-800">Tidak Ada Data Telemetri Tercatat</span>
                              <span className="text-xs text-slate-500 max-w-sm">
                                {dateFilter === 'Yesterday'
                                  ? 'Tidak ada rekaman sesi praktikum pada tanggal kemarin.'
                                  : dateFilter === '7Days'
                                    ? 'Tidak ada arsip riwayat pada 7 hari terakhir (hanya tersedia sesi hari ini).'
                                    : 'Tidak ada data sensor yang sesuai dengan kriteria pencarian.'}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredLogsData.map((row, idx) => (
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
                        ))
                      )}
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

          {/* TAB 6: USER MANAGEMENT & SESSION LIMITS (2-TIER ROLE ACCESS) */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              {currentUser.role !== 'admin' ? (
                <div className="asklepios-card p-8 bg-white text-center space-y-3">
                  <div className="inline-flex p-4 bg-red-50 text-red-600 rounded-full mb-2">
                    <Lock className="w-8 h-8" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">Akses Dibatasi (Admin Only)</h2>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Halaman Manajemen User hanya dapat diakses oleh akun dengan Role <strong>ADMIN</strong>.
                  </p>
                </div>
              ) : (
                <div className="asklepios-card p-6 bg-white space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Users className="w-5 h-5 text-sky-600" /> User Management & Hak Akses (Admin & Operator)
                      </h2>
                      <p className="text-xs text-slate-500">Kelola akun Admin (Dosen/KaLab) dan Operator (Mahasiswa)</p>
                    </div>

                    <button
                      onClick={() => setShowAddUserModal(true)}
                      className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-md shadow-sky-600/20 flex items-center gap-1.5 transition"
                    >
                      <UserPlus className="w-4 h-4" /> Tambah User Baru
                    </button>
                  </div>

                  {/* Single Active Session Lock Panel */}
                  <div className="p-4 bg-sky-50/90 rounded-2xl border border-sky-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-sky-600" />
                        <h4 className="text-xs font-bold text-sky-900">
                          Status Kunci Sesi Tunggal (Single Active Session Lock)
                        </h4>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${activeSession ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : 'bg-slate-100 text-slate-500'}`}>
                          {activeSession ? '🟢 1 SESI AKTIF' : '⚪ BEBAS / SIAP'}
                        </span>
                      </div>
                      <p className="text-[11.5px] text-sky-800 leading-relaxed">
                        {activeSession ? (
                          <>
                            Sesi aktif oleh: <strong>{activeSession.name}</strong> (<code>{activeSession.email}</code>) — Terhubung sejak {activeSession.loginTime}. Pengguna lain diblokir dari login untuk mencegah konflik data kendali hardware.
                          </>
                        ) : (
                          'Sistem dalam keadaan bebas. Belum ada pengguna lain yang mengunci sesi.'
                        )}
                      </p>
                    </div>

                    {activeSession && (
                      <button
                        onClick={() => {
                          try {
                            localStorage.removeItem('fluidhe_active_session');
                          } catch (e) {}
                          setActiveSession(null);
                          alert('✅ Kunci sesi berhasil diakhiri! Pengguna lain sekarang dapat melakukan login.');
                        }}
                        className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition whitespace-nowrap cursor-pointer"
                      >
                        ⚠️ Akhiri / Reset Sesi Aktif
                      </button>
                    )}
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
                          <th className="p-3">Jadwal & Tanggal Akses Login</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Login Terakhir</th>
                          <th className="p-3">Aksi (Kontrol Admin)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {usersList.map((u) => (
                          <tr key={u.id} className="hover:bg-slate-50/80 transition">
                            <td className="p-3 font-mono font-bold text-slate-600">{u.id}</td>
                            <td className="p-3 font-bold text-slate-900">{u.name}</td>
                            <td className="p-3 text-slate-600">{u.email}</td>
                            <td className="p-3">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${u.role === 'admin'
                                     ? 'bg-sky-100 text-sky-700 border border-sky-200'
                                     : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                 }`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="p-3">
                              {u.isScheduleRestricted ? (
                                <div className="flex flex-col gap-0.5">
                                  <span className="px-2.5 py-0.5 bg-amber-50 text-amber-900 border border-amber-200/80 rounded-lg text-[10.5px] font-bold inline-flex items-center gap-1 w-fit">
                                    <Calendar className="w-3 h-3 text-amber-600 shrink-0" />
                                    {u.allowedStartDate} s.d. {u.allowedEndDate}
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1 pl-0.5">
                                    <Clock className="w-2.5 h-2.5 text-slate-400 shrink-0" /> Jam {u.allowedStartTime || '07:00'} - {u.allowedEndTime || '18:00'} WIB
                                  </span>
                                </div>
                              ) : (
                                <span className="px-2.5 py-1 bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-[10.5px] font-bold inline-flex items-center gap-1">
                                  <Sparkles className="w-3 h-3 text-slate-500" />
                                  24/7 Akses Bebas
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${u.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                                }`}>
                                {u.status}
                              </span>
                            </td>
                            <td className="p-3 text-slate-500">{u.lastLogin}</td>
                            <td className="p-3">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <button
                                  disabled={resendingEmailFor === u.id}
                                  onClick={() => handleResendUserCredentials(u)}
                                  className="p-1 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-100 transition disabled:opacity-50"
                                  title="Kirim / Resend Kredensial & Sandi ke Email User"
                                >
                                  {resendingEmailFor === u.id ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                                  ) : (
                                    <Mail className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <button
                                  onClick={() => {
                                    setIsResetModalOpen(true);
                                    setResetEmailInput(u.email);
                                    setResetStep('INPUT_EMAIL');
                                    setResetError(null);
                                  }}
                                  className="p-1 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-slate-100 transition"
                                  title="Reset / Ganti Kata Sandi (Verifikasi OTP)"
                                >
                                  <Key className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    const nextRole: UserRole = u.role === 'operator' ? 'admin' : 'operator';
                                    setUsersList(usersList.map((x) => (x.id === u.id ? { ...x, role: nextRole } : x)));
                                  }}
                                  className="p-1 text-slate-400 hover:text-sky-600 rounded-lg hover:bg-slate-100 transition"
                                  title="Ubah Role"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setUserToDelete(u)}
                                  className="p-1 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 transition"
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

          {/* ─── MODAL KONFIRMASI HAPUS USER ─── */}
          {userToDelete && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-sm bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-100 text-slate-800 animate-in zoom-in-95 duration-200 space-y-4">
                
                <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                  <Trash2 className="w-6 h-6" />
                </div>

                <div className="text-center space-y-1.5">
                  <h3 className="text-base font-extrabold text-slate-900">
                    Hapus Akun Pengguna?
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Apakah Anda yakin ingin menghapus akun <strong className="text-slate-800">{userToDelete.name}</strong> (<code>{userToDelete.email}</code>) dengan peran <span className="font-bold uppercase text-slate-700">[{userToDelete.role}]</span>?
                  </p>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Akun yang dihapus tidak dapat login kembali.</span>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setUserToDelete(null)}
                    className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = usersList.filter((x) => x.id !== userToDelete.id);
                      setUsersList(updated);
                      try {
                        localStorage.setItem('fluidhe_user_accounts', JSON.stringify(updated));
                      } catch (e) {
                        console.error(e);
                      }
                      setUserToDelete(null);
                    }}
                    className="w-1/2 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl shadow-md shadow-rose-600/20 transition cursor-pointer"
                  >
                    Ya, Hapus
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* ─── MODAL TAMBAH USER BARU (DENGAN AUTO GENERATE RANDOM PASSWORD KE EMAIL) ─── */}
          {showAddUserModal && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-md bg-white rounded-3xl p-5 sm:p-7 shadow-2xl border border-slate-100 text-slate-800 animate-in zoom-in-95 duration-200 space-y-4">
                
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center border border-sky-100">
                      <UserPlus className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                        Tambah User Baru
                      </h3>
                      <p className="text-[10.5px] text-slate-500">Kredensial otomatis dikirim ke email pengguna</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setShowAddUserModal(false);
                      setAddUserSuccessMsg(null);
                    }}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {lastCreatedUserCredentials ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs space-y-3 animate-in fade-in">
                    <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-sm">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span>User Berhasil Didaftarkan!</span>
                    </div>
                    <p className="text-emerald-700 leading-relaxed">
                      Kredensial login untuk <strong>{lastCreatedUserCredentials.name}</strong> (<code>{lastCreatedUserCredentials.email}</code>) telah disimpan & dikirim ke email.
                    </p>
                    <div className="p-3 bg-white border border-emerald-300 rounded-xl space-y-1.5 font-mono">
                      <div className="text-[11px] text-slate-500 font-sans">Kata Sandi Awal Pengguna:</div>
                      <div className="text-base font-black text-emerald-800 tracking-wider flex items-center justify-between">
                        <span className="bg-emerald-50 px-2 py-1 rounded border border-emerald-200">{lastCreatedUserCredentials.password}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(lastCreatedUserCredentials.password);
                            alert('Kata sandi berhasil disalin ke clipboard!');
                          }}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg font-sans transition"
                        >
                          Salin Sandi
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddUserModal(false);
                        setLastCreatedUserCredentials(null);
                      }}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition"
                    >
                      Selesai & Tutup
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleCreateUser} className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap Pengguna</label>
                      <input
                        type="text"
                        required
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        placeholder="Contoh: Anisa Rahmawati"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Alamat Email Pengguna</label>
                      <div className="relative">
                        <input
                          type="email"
                          required
                          value={newUserEmail}
                          onChange={(e) => setNewUserEmail(e.target.value)}
                          placeholder="user@mhs.itenas.ac.id / user@gmail.com"
                          className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-800"
                        />
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Role / Hak Akses</label>
                      <select
                        value={newUserRole}
                        onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                      >
                        <option value="operator">Operator (Mahasiswa Praktikum)</option>
                        <option value="admin">Admin (Dosen / KaLab)</option>
                      </select>
                    </div>

                    <div className="p-3 bg-sky-50 border border-sky-200 rounded-2xl text-[11px] text-sky-800 flex items-start gap-2 leading-relaxed">
                      <Lock className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                      <span>
                        <strong>Keamanan Sandi Terenkripsi:</strong> Sistem akan otomatis men-generate kata sandi awal acak yang aman dan mengirimkannya ke email user. Admin tidak perlu mengatur kata sandi manual dan tidak mengetahui kata sandi pribadi pengguna.
                      </span>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddUserModal(false)}
                        className="w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        disabled={isAddingUser}
                        className="w-2/3 py-2.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs font-extrabold rounded-xl shadow-md shadow-sky-600/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isAddingUser ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Mendaftarkan & Mengirim Email...
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" /> Daftarkan & Kirim Sandi
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}

              </div>
            </div>
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
                      <span className={`font-black ${
                        strength.score <= 1
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
                      <div className={`h-full flex-1 rounded-full transition-all duration-300 ${
                        strength.score >= 1 ? (strength.score <= 2 ? 'bg-rose-500' : strength.score === 3 ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-transparent'
                      }`} />
                      <div className={`h-full flex-1 rounded-full transition-all duration-300 ${
                        strength.score >= 2 ? (strength.score === 2 ? 'bg-rose-500' : strength.score === 3 ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-transparent'
                      }`} />
                      <div className={`h-full flex-1 rounded-full transition-all duration-300 ${
                        strength.score >= 3 ? (strength.score === 3 ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-transparent'
                      }`} />
                      <div className={`h-full flex-1 rounded-full transition-all duration-300 ${
                        strength.score >= 4 ? 'bg-emerald-500' : 'bg-transparent'
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
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1 px-1 rounded-2xl transition-all active:scale-90 cursor-pointer ${
            activeTab === 'dashboard'
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
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1 px-1 rounded-2xl transition-all active:scale-90 cursor-pointer ${
            activeTab === 'control'
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
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1 px-1 rounded-2xl transition-all active:scale-90 cursor-pointer ${
            activeTab === 'cctv'
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
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1 px-1 rounded-2xl transition-all active:scale-90 cursor-pointer ${
            activeTab === 'logs'
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
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1 px-1 rounded-2xl transition-all active:scale-90 cursor-pointer ${
              activeTab === 'users'
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
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1 px-1 rounded-2xl transition-all active:scale-90 cursor-pointer ${
              activeTab === 'alarms'
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
