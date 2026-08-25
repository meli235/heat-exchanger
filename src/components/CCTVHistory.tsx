'use client';

import React, { useState, useEffect } from 'react';
import { Film, Play, RefreshCw, X, Clock, HardDrive, Calendar } from 'lucide-react';

export default function CCTVHistory() {
  const [recordings, setRecordings] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeRecording, setActiveRecording] = useState<string | null>(null);
  const [activeRecordingName, setActiveRecordingName] = useState<string>('');

  const fetchRecordings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/cctv/recordings');
      const data = await res.json();
      setRecordings(data.recordings || []);
    } catch (err) {
      console.error('Fetch recordings error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecordings();
  }, []);

  return (
    <div className="space-y-6">
      <div className="asklepios-card p-6 bg-white shadow-xl rounded-3xl border border-slate-200 space-y-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <Film className="w-6 h-6 text-sky-600" /> Rekaman CCTV 24/7 (DVR Archive)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Daftar rekaman video otomatis 24 jam yang tersimpan di server go2rtc (Arsip MP4)
            </p>
          </div>

          <button
            type="button"
            onClick={fetchRecordings}
            disabled={loading}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Rekaman
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-slate-900/5 rounded-2xl p-4 animate-pulse space-y-3">
                <div className="aspect-video bg-slate-200 rounded-xl" />
                <div className="h-4 bg-slate-200 rounded w-3/4" />
                <div className="h-3 bg-slate-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : recordings.length === 0 ? (
          <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-slate-400 space-y-2">
            <Film className="w-10 h-10 mx-auto text-slate-300 animate-pulse" />
            <p className="text-sm font-bold text-slate-600">Belum ada berkas rekaman MP4 24/7</p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Server go2rtc otomatis menyimpan berkas video ke folder <code className="text-sky-600 font-mono">./records/he_cctv/</code> saat kamera aktif.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recordings.map((rec) => (
              <div
                key={rec.id}
                className="bg-slate-900 hover:bg-slate-800 rounded-2xl p-4 cursor-pointer transition border border-slate-800 shadow-md group"
                onClick={() => {
                  setActiveRecording(rec.url);
                  setActiveRecordingName(rec.name);
                }}
              >
                <div className="aspect-video bg-black rounded-xl mb-3 flex items-center justify-center relative overflow-hidden group-hover:border-sky-500 border border-slate-800">
                  <Play className="w-10 h-10 text-white group-hover:scale-110 transition" />
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-red-600 text-white rounded text-[10px] font-bold">
                    MP4 24/7
                  </div>
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/70 backdrop-blur-md text-slate-300 rounded text-[10px] font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3 text-sky-400" /> {rec.time}
                  </div>
                </div>
                <h4 className="text-xs font-bold text-white tracking-wide line-clamp-1">{rec.name}</h4>
                <div className="flex justify-between items-center mt-2 text-[11px] font-mono text-slate-400">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-slate-500" /> {rec.date}</span>
                  <span className="flex items-center gap-1"><HardDrive className="w-3 h-3 text-slate-500" /> {rec.size}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Video Playback Modal Overlay */}
      {activeRecording && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4">
          <div className="relative max-w-4xl w-full bg-slate-950 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl p-3 space-y-3">
            <div className="flex justify-between items-center px-3 pt-2 text-white">
              <h3 className="text-sm font-bold truncate flex items-center gap-2">
                <Film className="w-4 h-4 text-sky-400" /> {activeRecordingName}
              </h3>
              <button
                type="button"
                onClick={() => setActiveRecording(null)}
                className="p-1.5 bg-slate-800 hover:bg-red-600 text-white rounded-full transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <video
              src={activeRecording}
              controls
              autoPlay
              className="w-full aspect-video rounded-2xl bg-black object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
