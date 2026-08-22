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
  CloudCheck,
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
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    targetId: 'tour-header-title',
    tab: 'dashboard',
    badge: 'Pengenalan Sistem',
    icon: <Compass className="w-5 h-5 text-sky-500" />,
    title: 'Selamat Datang di FluidHE Dashboard!',
    description: 'Aplikasi pemantauan & kendali alat penukar panas (Heat Exchanger) laboratorium secara real-time berbasis IoT Cloud.',
    tips: 'Ikuti 9 langkah interaktif ini untuk memahami alur pemantauan dan kontrol alat dengan mudah.'
  },
  {
    id: 'iot-status',
    targetId: 'tour-iot-badge',
    tab: 'dashboard',
    badge: 'Koneksi Cloud',
    icon: <Server className="w-5 h-5 text-emerald-500" />,
    title: 'Status Koneksi IoT Cloud (ESP32)',
    description: 'Lampu hijau "ONLINE" di atas menandakan sistem web sudah terhubung langsung ke mikrokontroler ESP32. Seluruh data sensor diperbarui otomatis secara real-time.',
    tips: 'Jika berstatus OFFLINE, pastikan alat Heat Exchanger sudah dinyalakan & tersambung WiFi laboratorium.'
  },
  {
    id: 'temp-cards',
    targetId: 'tour-temp-cards',
    tab: 'dashboard',
    badge: 'Sensor Suhu',
    icon: <Activity className="w-5 h-5 text-orange-500" />,
    title: '4 Sensor Suhu Utama (TI1, TI2, TI3, TI4)',
    description: 'Memantau perubahan temperatur air panas dan air dingin secara langsung:\n• TI1: Suhu air panas masuk (Hot Inlet)\n• TI2: Suhu air panas keluar (Hot Outlet)\n• TI3: Suhu air dingin masuk (Cold Inlet)\n• TI4: Suhu air dingin keluar (Cold Outlet)',
    tips: 'Perbedaan TI1 dan TI2 menunjukkan besaran energi kalor yang berhasil dilepaskan pada penukar panas.'
  },
  {
    id: 'pid-diagram',
    targetId: 'tour-pid-diagram',
    tab: 'dashboard',
    badge: 'Skematik Mesin',
    icon: <Layers className="w-5 h-5 text-indigo-500" />,
    title: 'Diagram Skematik Aliran (P&ID)',
    description: 'Visualisasi interaktif jalur perpipaan fluida: Pipa merah dialiri air panas dari tangki pemanas, sedangkan pipa biru dialiri air pendingin. Animasi partikel bergerak menunjukkan arah dan laju sirkulasi fluida.',
    tips: 'Titik sensor interaktif pada diagram menampilkan nilai suhu dan tekanan aktual secara langsung.'
  },
  {
    id: 'control-heater',
    targetId: 'tour-heater-control',
    tab: 'control',
    badge: 'Pusat Kendali',
    icon: <Flame className="w-5 h-5 text-orange-500" />,
    title: 'Daya Utama Pemanas (Dual Heater)',
    description: 'Pada panel yang disorot: Anda dapat menyalakan/mematikan pemanas (Heater ON/OFF) atau mengaktifkan mode AUTO untuk pengelolaan suhu otomatis via PID ESP32.',
    tips: 'Dual Heater Cerdas: 1000W saat dingin untuk pemanasan cepat, dan 500W otomatis saat mendekati target suhu.'
  },
  {
    id: 'flow-mode',
    targetId: 'tour-flow-mode-control',
    tab: 'control',
    badge: 'Mode Aliran',
    icon: <ArrowRightLeft className="w-5 h-5 text-sky-500" />,
    title: 'Pilihan Arah Aliran Fluida (Flow Mode)',
    description: 'Pada panel yang disorot: Anda dapat mengubah arah aliran fluida hanya dengan satu klik:\n• COUNTER (Lawan Arah): Efisiensi perpindahan panas maksimal.\n• CO-CURRENT (Searah): Kedua fluida mengalir searah.',
    tips: 'Empat katup solenoid (SV1 - SV4) akan otomatis beralih konfigurasi sesuai mode yang Anda pilih.'
  },
  {
    id: 'alarm-system',
    targetId: 'tour-alarm-settings',
    tab: 'alarms',
    badge: 'Keamanan & Alarm',
    icon: <Bell className="w-5 h-5 text-rose-500" />,
    title: 'Sistem Ambang Batas Alarm & Sirene',
    description: 'Atur batas aman suhu maksimum (TI1) dan beda tekanan maksimum (ΔP Hot). Jika pembacaan sensor melampaui batas aman, sirene audio berbunyi dan log peringatan otomatis tercatat.',
    tips: 'Tersedia tombol Mute / Aktifkan Sirene untuk kenyamanan selama praktikum laboratorium berlangsung.'
  },
  {
    id: 'logs-export',
    targetId: 'tour-logs-tab',
    tab: 'logs',
    badge: 'Data & Cloud Storage',
    icon: <CloudCheck className="w-5 h-5 text-emerald-500" />,
    title: 'Otomatisasi Cloud Drive & Proteksi Data',
    description: 'Seluruh riwayat telemetri sensor tersimpan per detik secara otomatis ke Google Drive / Cloud Storage UAD. Fasilitas ekstraksi data via Flashdisk dinonaktifkan demi keamanan data.',
    tips: 'Anda dapat meninjau repositori berkas laporan Excel dan log real-time melalui tombol "Akses Cloud Drive".'
  },
  {
    id: 'emergency-stop',
    targetId: 'tour-emergency-btn',
    tab: 'dashboard',
    badge: 'Keamanan Darurat',
    icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
    title: 'Tombol Darurat (Emergency TRIP)',
    description: 'Tombol merah darurat di bilah atas: Jika terjadi kondisi kritis atau kebocoran, tekan tombol ini untuk seketika mematikan seluruh daya pemanas dan pompa demi keselamatan alat dan operator.',
    tips: 'Tombol proteksi darurat ini selalu siaga di bagian atas layar pada semua halaman sistem.'
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
  right: number;
  bottom: number;
}

// Helper: Check if two rectangular boxes overlap with a safety margin
function checkOverlap(
  boxA: { top: number; left: number; width: number; height: number },
  boxB: { top: number; left: number; width: number; height: number },
  margin = 12
): boolean {
  return !(
    boxA.left + boxA.width + margin < boxB.left ||
    boxA.left > boxB.left + boxB.width + margin ||
    boxA.top + boxA.height + margin < boxB.top ||
    boxA.top > boxB.top + boxB.height + margin
  );
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
      // Scroll element smoothly into view (offset slightly so it is comfortably in the center)
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });

      const rect = el.getBoundingClientRect();
      const padding = 8;

      const tRect: TargetRect = {
        top: Math.max(0, rect.top - padding),
        left: Math.max(0, rect.left - padding),
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
        right: rect.right + padding,
        bottom: rect.bottom + padding
      };
      setTargetRect(tRect);

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const cardW = Math.min(390, vw - 32);
      const cardH = bubbleRef.current ? bubbleRef.current.offsetHeight : 340;

      // Safe boundaries considering fixed header (65px) and sidebar (256px on desktop)
      const safeLeft = vw >= 768 ? 276 : 16;
      const safeTop = 72;
      const safeRight = vw - 16;
      const safeBottom = vh - 16;

      let finalTop = safeBottom - cardH - 12;
      let finalLeft = safeRight - cardW - 12;

      if (vw < 768) {
        // Mobile view: Place card at bottom or top depending on target vertical position
        const targetCenterY = tRect.top + tRect.height / 2;
        if (targetCenterY < vh / 2) {
          finalTop = Math.max(safeTop, vh - cardH - 16);
        } else {
          finalTop = safeTop + 8;
        }
        finalLeft = Math.max(16, (vw - cardW) / 2);
      } else {
        // Desktop View: Intelligent Collision-Free Placement
        const tCenterX = tRect.left + tRect.width / 2;
        const mainContentCenterX = safeLeft + (vw - safeLeft) / 2;
        const isTargetOnRightSide = tCenterX >= mainContentCenterX;
        const isTargetInUpperHalf = (tRect.top + tRect.height / 2) < vh / 2;

        // Generate list of non-overlapping candidate positions in order of visual elegance
        const candidates: { left: number; top: number; score: number }[] = [];

        if (isTargetOnRightSide) {
          // Target is on the Right: Prioritize placing card on the LEFT side so target is fully clear
          // Priority 1: Adjacent to the left of the target element
          const adjLeft = tRect.left - cardW - 24;
          if (adjLeft >= safeLeft) {
            candidates.push({
              left: adjLeft,
              top: Math.max(safeTop, Math.min(safeBottom - cardH, tRect.top)),
              score: 100
            });
          }

          // Priority 2: Left side docked (Bottom-Left)
          candidates.push({
            left: safeLeft + 12,
            top: safeBottom - cardH - 12,
            score: 80
          });

          // Priority 3: Left side docked (Top-Left)
          candidates.push({
            left: safeLeft + 12,
            top: safeTop + 12,
            score: 70
          });

          // Priority 4: Below or above target
          if (tRect.bottom + cardH + 20 <= safeBottom) {
            candidates.push({
              left: Math.max(safeLeft, Math.min(safeRight - cardW, tRect.left)),
              top: tRect.bottom + 16,
              score: 60
            });
          }
        } else {
          // Target is on the Left side: Prioritize placing card on the RIGHT side so target is fully clear
          // Priority 1: Adjacent to the right of target element
          const adjRight = tRect.right + 24;
          if (adjRight + cardW <= safeRight) {
            candidates.push({
              left: adjRight,
              top: Math.max(safeTop, Math.min(safeBottom - cardH, tRect.top)),
              score: 100
            });
          }

          // Priority 2: Right side docked (Bottom-Right)
          candidates.push({
            left: safeRight - cardW - 12,
            top: safeBottom - cardH - 12,
            score: 80
          });

          // Priority 3: Right side docked (Top-Right)
          candidates.push({
            left: safeRight - cardW - 12,
            top: safeTop + 12,
            score: 70
          });

          // Priority 4: Below or above target
          if (tRect.bottom + cardH + 20 <= safeBottom) {
            candidates.push({
              left: Math.max(safeLeft, Math.min(safeRight - cardW, tRect.left)),
              top: tRect.bottom + 16,
              score: 60
            });
          }
        }

        // Add opposite-side fallbacks in case target is very wide
        candidates.push({
          left: isTargetOnRightSide ? safeLeft + 12 : safeRight - cardW - 12,
          top: isTargetInUpperHalf ? safeBottom - cardH - 12 : safeTop + 12,
          score: 40
        });

        // Find first candidate that has 0% overlap with target
        let bestCandidate = candidates.find(c => {
          return !checkOverlap(
            { top: c.top, left: c.left, width: cardW, height: cardH },
            tRect,
            16
          );
        });

        if (!bestCandidate && candidates.length > 0) {
          bestCandidate = candidates[0];
        }

        if (bestCandidate) {
          finalLeft = bestCandidate.left;
          finalTop = bestCandidate.top;
        }
      }

      // Strict clamping inside visible viewport
      const clampedTop = Math.max(safeTop, Math.min(finalTop, safeBottom - cardH));
      const clampedLeft = Math.max(16, Math.min(finalLeft, vw - cardW - 16));

      setBubblePosition({ top: clampedTop, left: clampedLeft });
    } else {
      setTargetRect(null);
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const cardW = Math.min(390, vw - 32);
      const cardH = bubbleRef.current ? bubbleRef.current.offsetHeight : 340;
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
    }, 80);

    const timer2 = setTimeout(() => {
      updateTargetPosition();
    }, 300);

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

  // Keyboard navigation shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (currentStepIndex < TOUR_STEPS.length - 1) {
          setCurrentStepIndex(prev => prev + 1);
        } else {
          setIsCompleted(true);
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentStepIndex > 0) {
          setCurrentStepIndex(prev => prev - 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIndex, onClose]);

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
      
      {/* ─── CRYSTAL-CLEAR SVG SPOTLIGHT CUTOUT (NO OVERLAY OR BLUR OVER TARGET!) ─── */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
        <defs>
          <mask id="tour-spotlight-mask">
            {/* White covers entire screen (semi-transparent darkened area) */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Black hole cuts out the target element so it is 100% visible, sharp, and unobstructed */}
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
        
        {/* Soft darkened backdrop (click anywhere on backdrop to dismiss) */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(15, 23, 42, 0.52)"
          mask="url(#tour-spotlight-mask)"
          className="pointer-events-auto cursor-pointer"
          onClick={onClose}
        />
      </svg>

      {/* ─── HIGHLIGHT BORDER & TARGET INDICATOR OVER THE FEATURE ─── */}
      {targetRect && !isCompleted && (
        <div
          className="absolute transition-all duration-300 ease-out rounded-2xl pointer-events-none z-20 ring-4 ring-sky-400/90 shadow-[0_0_35px_rgba(56,189,248,0.75)]"
          style={{
            top: `${targetRect.top}px`,
            left: `${targetRect.left}px`,
            width: `${targetRect.width}px`,
            height: `${targetRect.height}px`
          }}
        >
          {/* Animated pulsing highlight border */}
          <div className="absolute inset-0 rounded-2xl border-2 border-white/90 animate-pulse" />
          
          {/* Glowing Target Pointer Badge */}
          <div className="absolute -top-3.5 left-4 px-2.5 py-0.5 bg-gradient-to-r from-sky-600 via-indigo-600 to-blue-600 text-white text-[9.5px] font-black rounded-full shadow-xl uppercase tracking-wider flex items-center gap-1.5 ring-2 ring-white/90">
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
                Anda sudah memahami seluruh alur pemantauan sensor, kontrol pemanas, sistem alarm, dan ekspor data Excel.
              </p>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-200 text-[10.5px] text-slate-600 text-left flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <span>
                Anda bisa membuka kembali panduan ini kapan saja lewat tombol <strong>"Panduan"</strong> di pojok kanan atas.
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
            maxWidth: '390px',
            width: 'calc(100vw - 32px)'
          }}
        >
          <div className="relative bg-white/98 backdrop-blur-md rounded-3xl p-4 sm:p-5 shadow-2xl border border-slate-100 ring-1 ring-slate-900/10 space-y-3 overflow-y-auto max-h-[calc(100vh-80px)]">
            
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

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
                title="Tutup Panduan (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Title & Description */}
            <div className="space-y-1.5">
              <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 leading-snug">
                {step.title}
              </h4>
              <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                {step.description}
              </p>

              {step.tips && (
                <div className="mt-1.5 p-2.5 bg-amber-50/90 rounded-xl border border-amber-200/80 text-[10px] sm:text-[10.5px] text-amber-900 leading-relaxed font-medium">
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

