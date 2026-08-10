'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle2,
  Sparkles,
  Flame,
  Activity,
  ArrowRightLeft,
  Download,
  AlertTriangle,
  Server,
  Layers,
  Compass,
  Target,
  Bell
} from 'lucide-react';

export interface TourStep {
  id: string;
  targetId: string;
  tab: 'dashboard' | 'control' | 'cctv' | 'logs' | 'alarms' | 'users';
  title: string;
  badge: string;
  icon: React.ReactNode;
  description: string;
  tips?: string;
  dockPosition: 'bottom-right' | 'bottom-left' | 'side-right' | 'side-left' | 'top-right';
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    targetId: 'tour-header-title',
    tab: 'dashboard',
    badge: 'Pengenalan Sistem',
    icon: <Compass className="w-5 h-5 text-sky-500" />,
    title: 'Selamat Datang di FluidHE Dashboard!',
    description: 'Aplikasi pemantauan & kendali alat penukar panas (Heat Exchanger) laboratorium secara real-time berbasis IoT.',
    tips: 'Ikuti 9 langkah interaktif ini untuk memahami seluruh fungsi alat dengan mudah.',
    dockPosition: 'bottom-right'
  },
  {
    id: 'iot-status',
    targetId: 'tour-iot-badge',
    tab: 'dashboard',
    badge: 'Koneksi Cloud',
    icon: <Server className="w-5 h-5 text-emerald-500" />,
    title: 'Status Koneksi IoT Cloud',
    description: 'Lampu hijau "ONLINE" di atas menandakan sistem web sudah tersambung langsung ke mikrokontroler (ESP32). Seluruh data sensor diperbarui otomatis setiap detik.',
    tips: 'Jika berstatus OFFLINE, pastikan alat sudah dinyalakan & tersambung WiFi.',
    dockPosition: 'bottom-right'
  },
  {
    id: 'temp-cards',
    targetId: 'tour-temp-cards',
    tab: 'dashboard',
    badge: 'Sensor Suhu',
    icon: <Activity className="w-5 h-5 text-orange-500" />,
    title: '4 Sensor Suhu Utama (T1, T2, T3, T4)',
    description: 'Memantau perubahan temperatur air panas dan air dingin secara langsung:\n• T1: Suhu air panas masuk (Inlet)\n• T2: Suhu air panas keluar (Outlet)\n• T3: Suhu air dingin suplai\n• T4: Suhu air dingin setelah menyerap panas.',
    tips: 'Perbedaan T1 dan T2 menunjukkan seberapa banyak energi panas yang berhasil dilepaskan.',
    dockPosition: 'bottom-right'
  },
  {
    id: 'pid-diagram',
    targetId: 'tour-pid-diagram',
    tab: 'dashboard',
    badge: 'Skematik Mesin',
    icon: <Layers className="w-5 h-5 text-indigo-500" />,
    title: 'Diagram Skematik Aliran (P&ID)',
    description: 'Visualisasi interaktif jalur pipa fluida. Pipa merah dialiri air panas dari pemanas, dan pipa biru dialiri air dingin pendingin. Partikel bergerak menunjukkan arah dan laju aliran fluida.',
    tips: 'Titik sensor pada diagram menunjukkan suhu dan tekanan pada pipa penukar panas.',
    dockPosition: 'bottom-right'
  },
  {
    id: 'control-heater',
    targetId: 'tour-heater-control',
    tab: 'control',
    badge: 'Pusat Kendali',
    icon: <Flame className="w-5 h-5 text-orange-500" />,
    title: 'Daya Pemanas & Target Suhu',
    description: 'Lihat kotak yang disorot di sebelah kiri: Anda dapat menyalakan/mematikan pemanas (Heater ON/OFF) dan menentukan target suhu air panas (misal: 60°C). Sistem akan memanaskan air secara otomatis dan bertahap.',
    tips: 'Dual Heater cerdas: 1000W saat dingin untuk pemanasan cepat, dan 500W saat mendekati target.',
    dockPosition: 'side-right'
  },
  {
    id: 'flow-mode',
    targetId: 'tour-flow-mode-control',
    tab: 'control',
    badge: 'Mode Aliran',
    icon: <ArrowRightLeft className="w-5 h-5 text-sky-500" />,
    title: 'Pilihan Arah Aliran Fluida (Flow Mode)',
    description: 'Lihat tombol yang disorot di sebelah kanan: Anda dapat mengubah arah aliran fluida hanya dengan satu klik:\n• COUNTER (Lawan Arah): Efisiensi perpindahan panas maksimal.\n• CO-CURRENT (Searah): Kedua fluida mengalir searah.',
    tips: 'Katup solenoid (SV1-SV4) akan beralih posisi secara otomatis sesuai mode pilihan.',
    dockPosition: 'side-left'
  },
  {
    id: 'alarm-system',
    targetId: 'tour-alarm-settings',
    tab: 'alarms',
    badge: 'Keamanan & Alarm',
    icon: <Bell className="w-5 h-5 text-rose-500" />,
    title: 'Sistem Ambang Batas Alarm & Sirene',
    description: 'Atur batas aman suhu maksimum (TI1) dan beda tekanan maksimum (ΔP Hot). Jika sensor mendeteksi nilai melebihi batas aman, sirene audio akan berbunyi dan log peringatan otomatis tercatat.',
    tips: 'Anda dapat mengatur tombol Siren Audio Aktif/Mute untuk kebutuhan praktikum di laboratorium.',
    dockPosition: 'bottom-right'
  },
  {
    id: 'logs-export',
    targetId: 'tour-logs-tab',
    tab: 'logs',
    badge: 'Data & Laporan',
    icon: <Download className="w-5 h-5 text-emerald-500" />,
    title: 'Riwayat Sensor & Ekspor Excel',
    description: 'Seluruh riwayat bacaan sensor tercatat otomatis per detik. Klik tombol "Export Excel (.xlsx)" di atas untuk mengunduh data mentah ke spreadsheet untuk laporan praktikum atau penelitian.',
    tips: 'Data Excel sudah otomatis terformat lengkap dengan tanggal, jam, dan nilai tiap sensor.',
    dockPosition: 'bottom-right'
  },
  {
    id: 'emergency-stop',
    targetId: 'tour-emergency-btn',
    tab: 'dashboard',
    badge: 'Keamanan Darurat',
    icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
    title: 'Tombol Darurat (Emergency TRIP)',
    description: 'Lihat tombol merah berkedip di header atas: Jika terjadi situasi darurat (kebocoran pipa atau panas berlebih), tekan tombol ini untuk seketika mematikan seluruh pemanas dan pompa demi keamanan.',
    tips: 'Tombol darurat ini selalu siaga di bagian atas layar pada seluruh menu.',
    dockPosition: 'bottom-right'
  }
];

interface GuidedTourProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  setActiveTab: (tab: any) => void;
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export default function GuidedTour({ isOpen, onClose, activeTab, setActiveTab }: GuidedTourProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [bubblePosition, setBubblePosition] = useState<{ top: number; left: number }>({
    top: 100,
    left: 100
  });
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  const bubbleRef = useRef<HTMLDivElement>(null);
  const step = TOUR_STEPS[currentStepIndex];

  // Smart non-overlapping position calculator
  const updateTargetPosition = useCallback(() => {
    if (!isOpen || !step) return;

    const el = document.getElementById(step.targetId);
    if (el) {
      // Scroll element smoothly into view (offset slightly above center)
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });

      const rect = el.getBoundingClientRect();
      const padding = 6;

      setTargetRect({
        top: Math.max(0, rect.top - padding),
        left: Math.max(0, rect.left - padding),
        width: rect.width + padding * 2,
        height: rect.height + padding * 2
      });

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const cardW = Math.min(380, vw - 32);
      const cardH = bubbleRef.current ? bubbleRef.current.offsetHeight : 320;

      let top = 0;
      let left = 0;

      if (vw < 768) {
        // Mobile layout: Fixed bottom sheet, target scrolled to upper half
        top = vh - cardH - 16;
        left = Math.max(16, (vw - cardW) / 2);
      } else {
        // Desktop: Intelligent Side-by-Side Docking (NEVER OVERLAPS THE TARGET FEATURE!)
        if (step.dockPosition === 'side-right') {
          // Place card firmly on the RIGHT side of the screen
          left = vw - cardW - 24;
          top = Math.max(80, Math.min(vh - cardH - 24, rect.top));
        } else if (step.dockPosition === 'side-left') {
          // Place card firmly on the LEFT side of the screen (clear of sidebar)
          left = Math.max(24, Math.min(vw - cardW - 24, rect.left > cardW + 30 ? rect.left - cardW - 24 : 270));
          top = Math.max(80, Math.min(vh - cardH - 24, rect.top));
        } else if (step.dockPosition === 'top-right') {
          left = vw - cardW - 24;
          top = 80;
        } else if (step.dockPosition === 'bottom-left') {
          left = 270;
          top = vh - cardH - 24;
        } else {
          // Default 'bottom-right' docked card (Corner placement, 0% overlap with center diagrams/headers)
          left = vw - cardW - 24;
          top = vh - cardH - 24;
        }
      }

      // STRICT VIEWPORT CLAMPING:
      const minTop = 72;
      const maxTop = Math.max(minTop, vh - cardH - 16);
      const clampedTop = Math.max(minTop, Math.min(top, maxTop));
      const clampedLeft = Math.max(16, Math.min(left, vw - cardW - 16));

      setBubblePosition({ top: clampedTop, left: clampedLeft });
    } else {
      setTargetRect(null);
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const cardW = Math.min(380, vw - 32);
      const cardH = bubbleRef.current ? bubbleRef.current.offsetHeight : 320;
      setBubblePosition({
        top: Math.max(80, vh - cardH - 24),
        left: Math.max(16, vw - cardW - 24)
      });
    }
  }, [isOpen, step]);

  // Tab switching sync
  useEffect(() => {
    if (!isOpen || !step) return;

    if (activeTab !== step.tab) {
      setActiveTab(step.tab);
    }

    const timer1 = setTimeout(() => {
      updateTargetPosition();
    }, 100);

    const timer2 = setTimeout(() => {
      updateTargetPosition();
    }, 350);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [isOpen, currentStepIndex, step, activeTab, setActiveTab, updateTargetPosition]);

  // Window resize & scroll sync
  useEffect(() => {
    if (!isOpen) return;

    const handleUpdate = () => updateTargetPosition();
    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, true);

    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
    };
  }, [isOpen, updateTargetPosition]);

  // Re-calculate after bubble DOM renders
  useEffect(() => {
    if (isOpen && bubbleRef.current) {
      updateTargetPosition();
    }
  }, [isOpen, currentStepIndex, updateTargetPosition]);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0);
      setIsCompleted(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      setIsCompleted(true);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleFinish = () => {
    setIsCompleted(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-auto overflow-hidden font-sans">
      
      {/* ─── CRYSTAL-CLEAR SVG SPOTLIGHT CUTOUT (NO BLUR OVER TARGET!) ─── */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
        <defs>
          <mask id="tour-spotlight-mask">
            {/* White covers entire screen (semi-transparent darkened area) */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Black hole cuts out the target element so it is 100% clear and sharp */}
            {targetRect && !isCompleted && (
              <rect
                x={targetRect.left}
                y={targetRect.top}
                width={targetRect.width}
                height={targetRect.height}
                rx="16"
                ry="16"
                fill="black"
              />
            )}
          </mask>
        </defs>
        
        {/* Soft darkened backdrop (no blur, clear readability everywhere) */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(15, 23, 42, 0.55)"
          mask="url(#tour-spotlight-mask)"
          className="pointer-events-auto cursor-pointer"
          onClick={onClose}
        />
      </svg>

      {/* ─── HIGHLIGHT BORDER & TARGET INDICATOR OVER THE FEATURE ─── */}
      {targetRect && !isCompleted && (
        <div
          className="absolute transition-all duration-300 ease-out rounded-2xl pointer-events-none z-20 ring-4 ring-sky-400 shadow-[0_0_35px_rgba(56,189,248,0.85)]"
          style={{
            top: `${targetRect.top}px`,
            left: `${targetRect.left}px`,
            width: `${targetRect.width}px`,
            height: `${targetRect.height}px`
          }}
        >
          {/* Animated pulsing highlight border */}
          <div className="absolute inset-0 rounded-2xl border-2 border-white animate-pulse" />
          
          {/* Glowing Target Pointer Badge */}
          <div className="absolute -top-3 left-3 px-2.5 py-0.5 bg-gradient-to-r from-sky-600 to-blue-600 text-white text-[9.5px] font-black rounded-full shadow-lg uppercase tracking-wider flex items-center gap-1">
            <Target className="w-3 h-3 text-amber-300 animate-spin" />
            <span>Target Fitur</span>
          </div>
        </div>
      )}

      {/* ─── COMPLETION CELEBRATION CARD ─── */}
      {isCompleted ? (
        <div className="absolute inset-0 flex items-center justify-center p-4 z-30">
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-100 text-center animate-in zoom-in-95 duration-200 space-y-4">
            <div className="w-12 h-12 bg-gradient-to-tr from-emerald-400 to-teal-500 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <span className="inline-block px-3 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-extrabold rounded-full border border-emerald-200 uppercase tracking-wider">
                Panduan Selesai
              </span>
              <h3 className="text-base font-black text-slate-900">
                Siap Mengoperasikan Alat!
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Anda sudah mempelajari seluruh alur pemantauan sensor, kontrol pemanas, sistem alarm, dan ekspor data Excel.
              </p>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-200 text-[10.5px] text-slate-600 text-left flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <span>
                Anda bisa membuka kembali panduan ini kapan saja lewat tombol <strong>"❓ Panduan"</strong> di pojok kanan atas.
              </span>
            </div>

            <button
              type="button"
              onClick={handleFinish}
              className="w-full py-2.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-sky-600/30 transition active:scale-[0.98]"
            >
              Mulai Eksplorasi Dashboard
            </button>
          </div>
        </div>
      ) : (
        /* ─── INTELLIGENT NON-OVERLAPPING DOCKED TOUR CARD ─── */
        <div
          ref={bubbleRef}
          className="absolute transition-all duration-300 ease-out z-30 pointer-events-auto max-h-[calc(100vh-80px)] flex flex-col"
          style={{
            top: `${bubblePosition.top}px`,
            left: `${bubblePosition.left}px`,
            maxWidth: '380px',
            width: 'calc(100vw - 32px)'
          }}
        >
          <div className="relative bg-white/98 backdrop-blur-sm rounded-3xl p-4 sm:p-5 shadow-2xl border border-slate-100 ring-1 ring-slate-900/10 space-y-3 overflow-y-auto max-h-[calc(100vh-80px)]">
            
            {/* Header: Badge Step & Close Button */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-sky-50 rounded-xl border border-sky-100 shrink-0">
                  {step.icon}
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-600 block">
                    {step.badge}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    Langkah {currentStepIndex + 1} dari {TOUR_STEPS.length}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
                title="Tutup Panduan"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Title & Description */}
            <div className="space-y-1">
              <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 leading-snug">
                {step.title}
              </h4>
              <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                {step.description}
              </p>

              {step.tips && (
                <div className="mt-1.5 p-2 bg-amber-50/90 rounded-xl border border-amber-200/80 text-[10px] sm:text-[10.5px] text-amber-900 leading-relaxed font-medium">
                  {step.tips}
                </div>
              )}
            </div>

            {/* Progress Dots Indicator */}
            <div className="flex items-center justify-center gap-1.5 pt-0.5">
              {TOUR_STEPS.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentStepIndex(idx)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentStepIndex
                      ? 'w-5 bg-sky-600'
                      : idx < currentStepIndex
                      ? 'w-2 bg-sky-300'
                      : 'w-1.5 bg-slate-200'
                  }`}
                  title={`Lompat ke Langkah ${idx + 1}`}
                />
              ))}
            </div>

            {/* Navigation Action Buttons */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="text-[11px] font-bold text-slate-400 hover:text-slate-600 px-2 py-1 transition"
              >
                Lewati
              </button>

              <div className="flex items-center gap-1.5">
                {currentStepIndex > 0 && (
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition active:scale-95"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Sebelumnya
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleNext}
                  className="flex items-center gap-1 px-3.5 py-1.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow-md shadow-sky-600/20 transition active:scale-95"
                >
                  {currentStepIndex === TOUR_STEPS.length - 1 ? (
                    <>
                      Selesai <CheckCircle2 className="w-3.5 h-3.5" />
                    </>
                  ) : (
                    <>
                      Lanjut <ChevronRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
