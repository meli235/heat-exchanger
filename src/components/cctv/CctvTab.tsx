'use client';

import React from 'react';
import {
  Video,
  Disc,
  Pause,
  Play,
  Maximize2,
  Camera,
  Folder,
  Volume2,
  VolumeX,
  Volume1,
  AlertTriangle
} from 'lucide-react';
import { TelemetryPoint } from '@/types';
import { PtzController } from './PtzController';

export interface CctvTabProps {
  selectedCamera: 'cam1' | 'cam2' | 'cam3';
  setSelectedCamera: (cam: 'cam1' | 'cam2' | 'cam3') => void;
  cctvStreamSource: 'local' | 'demo' | 'custom' | string;
  setCctvStreamSource: (source: any) => void;
  cctvIpUrl: string;
  cctvAudioMuted: boolean;
  setCctvAudioMuted: (muted: boolean) => void;
  audioUserActivated: boolean;
  setAudioUserActivated: (active: boolean) => void;
  cctvVolume: number;
  setCctvVolume: (volume: number) => void;
  cctvRecording: boolean;
  setCctvRecording: (rec: boolean) => void;
  isManualRecording: boolean;
  recordingSeconds: number;
  cctvToast: { message: string; type: 'success' | 'info' | 'warning' | 'error' | string } | null;
  webrtcConnected: boolean;
  webrtcError: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  connectWebRTC: () => void;
  handleTakeSnapshot: () => void;
  handleToggleManualRecord: () => void;
  triggerCctvToast: (message: string, type?: any) => void;
  handlePtzAction: (direction: 'up' | 'down' | 'left' | 'right' | 'center' | 'rig' | 'tank' | 'valve') => void;
  handlePtzPreset: (label: string, presetKey: string) => void;
  ptzMoving: string | null;
  latestData: TelemetryPoint;
}

export const CctvTab: React.FC<CctvTabProps> = ({
  selectedCamera,
  setSelectedCamera,
  cctvStreamSource,
  setCctvStreamSource,
  cctvIpUrl,
  cctvAudioMuted,
  setCctvAudioMuted,
  audioUserActivated,
  setAudioUserActivated,
  cctvVolume,
  setCctvVolume,
  cctvRecording,
  setCctvRecording,
  isManualRecording,
  recordingSeconds,
  cctvToast,
  webrtcConnected,
  webrtcError,
  videoRef,
  connectWebRTC,
  handleTakeSnapshot,
  handleToggleManualRecord,
  triggerCctvToast,
  handlePtzAction,
  handlePtzPreset,
  ptzMoving,
  latestData
}) => {
  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              CCTV Live Monitoring — Heat Exchanger Lab
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            FluidHE IP Cam (1080p Full HD) • Transmisi RTSP Real-Time
          </p>
        </div>

        {/* Channel Switchers */}
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
                            videoRef.current.play().catch(() => { });
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

            {/* Bottom Status & Snapshot Bar */}
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

          {/* Quick Action Bar */}
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

              <a
                href="https://drive.google.com/drive/folders/1unHOfUZuYtNFLB2EMVwbPEa-THia2SIQ"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 transition text-zinc-200 text-xs font-medium gap-1 cursor-pointer"
                title="Buka Rekaman CCTV di Google Drive"
              >
                <Folder className="w-4 h-4 text-emerald-400" />
                <span className="text-[11px]">History</span>
              </a>
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

        {/* Right (1 Col): PTZ D-Pad Controller & Real-Time Telemetry */}
        <PtzController
          ptzMoving={ptzMoving}
          onPtzAction={handlePtzAction}
          onPtzPreset={handlePtzPreset}
          latestData={latestData}
        />

      </div>
    </div>
  );
};
export default CctvTab;
