'use client';

import React from 'react';
import {
  Shield,
  Users,
  Mail,
  Key,
  AlertTriangle,
  Info,
  ChevronRight,
  Eye,
  EyeOff,
  Lock,
  RefreshCw,
  Send,
  CheckCircle2,
  Check,
  X
} from 'lucide-react';
import { UserRole } from '@/types';

export interface LoginScreenProps {
  selectedDemoRole: UserRole;
  setSelectedDemoRole: (role: UserRole) => void;
  loginEmail: string;
  setLoginEmail: (email: string) => void;
  loginPassword: string;
  setLoginPassword: (pw: string) => void;
  loginError: string | null;
  setLoginError: (err: string | null) => void;
  showLoginPassword: boolean;
  setShowLoginPassword: (show: boolean) => void;
  handleLogin: () => void;

  // Reset Password Modal Props
  isResetModalOpen: boolean;
  setIsResetModalOpen: (open: boolean) => void;
  resetStep: 'INPUT_EMAIL' | 'VERIFY_OTP' | 'NEW_PASSWORD' | 'SUCCESS';
  setResetStep: (step: 'INPUT_EMAIL' | 'VERIFY_OTP' | 'NEW_PASSWORD' | 'SUCCESS') => void;
  resetEmailInput: string;
  setResetEmailInput: (email: string) => void;
  enteredOtp: string;
  setEnteredOtp: (otp: string) => void;
  newPasswordInput: string;
  setNewPasswordInput: (pw: string) => void;
  confirmPasswordInput: string;
  setConfirmPasswordInput: (pw: string) => void;
  showNewPassword: boolean;
  setShowNewPassword: (show: boolean) => void;
  resetError: string | null;
  setResetError: (err: string | null) => void;
  isSendingEmail: boolean;
  otpResendCountdown: number;
  smtpStatusInfo: string | null;
  handleRequestOtp: (e: React.FormEvent) => void;
  handleVerifyOtp: (e: React.FormEvent) => void;
  handleSaveNewPassword: (e: React.FormEvent) => void;
  getPasswordStrength: (pw: string) => {
    score: number;
    hasMinLength: boolean;
    hasUpperCase: boolean;
    hasLowerCase: boolean;
    hasNumber: boolean;
    isValid: boolean;
  };
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  selectedDemoRole,
  setSelectedDemoRole,
  loginEmail,
  setLoginEmail,
  loginPassword,
  setLoginPassword,
  loginError,
  setLoginError,
  showLoginPassword,
  setShowLoginPassword,
  handleLogin,
  isResetModalOpen,
  setIsResetModalOpen,
  resetStep,
  setResetStep,
  resetEmailInput,
  setResetEmailInput,
  enteredOtp,
  setEnteredOtp,
  newPasswordInput,
  setNewPasswordInput,
  confirmPasswordInput,
  setConfirmPasswordInput,
  showNewPassword,
  setShowNewPassword,
  resetError,
  setResetError,
  isSendingEmail,
  otpResendCountdown,
  smtpStatusInfo,
  handleRequestOtp,
  handleVerifyOtp,
  handleSaveNewPassword,
  getPasswordStrength
}) => {
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

          {/* Main Lab Role Switcher (Admin & Operator) */}
          <div className="mb-5 p-1 bg-slate-100 rounded-2xl flex border border-slate-200/80 gap-1">
            <button
              type="button"
              onClick={() => {
                setSelectedDemoRole('admin');
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

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
            autoComplete="off"
            className="space-y-3.5 sm:space-y-4"
          >
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email / Username</label>
              <div className="relative">
                <input
                  type="email"
                  name="email"
                  autoComplete="off"
                  value={loginEmail}
                  onChange={(e) => {
                    setLoginEmail(e.target.value);
                    setLoginError(null);
                  }}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-800 transition font-medium"
                  placeholder="Masukkan email Anda..."
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
                    setResetEmailInput(loginEmail || '');
                  }}
                  className="text-[11px] font-bold text-sky-600 hover:text-sky-800 transition"
                >
                  Lupa / Ganti Sandi?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="new-password"
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
              type="submit"
              className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-700 hover:to-cyan-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-sky-500/25 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
            >
              Masuk ke Dashboard Lab
              <ChevronRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </main>

      <footer className="text-center text-[10px] sm:text-xs text-slate-400 z-10 py-2.5 px-4 leading-relaxed">
        © 2026 Heat Exchanger Control System • Universitas Ahmad Dahlan
      </footer>

      {/* ─── SECURE EMAIL OTP PASSWORD RESET MODAL ─── */}
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
                      placeholder="nama@uad.ac.id / email@domain.com"
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
};
export default LoginScreen;
