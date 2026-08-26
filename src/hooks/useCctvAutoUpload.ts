/**
 * useCctvAutoUpload.ts
 * Custom Hook untuk Auto-Capture & Auto-Upload CCTV ke Google Drive
 * Interval: 5 menit | Retry: 3x | Queue: retry setiap 2 menit
 * 
 * Cara pakai:
 * const { status, lastUploadTime, queueLength, logs, isEnabled, toggleAutoUpload } = useCctvAutoUpload({
 *   videoRef,
 *   webrtcConnected,
 *   latestData,
 *   triggerToast,
 * });
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export type AutoUploadStatus = 'idle' | 'capturing' | 'uploading' | 'success' | 'error' | 'disabled';

export interface AutoUploadLog {
  time: string;
  status: 'success' | 'error';
  message: string;
  url?: string;
}

export interface AutoUploadQueueItem {
  blob: Blob;
  fileName: string;
  retryCount: number;
  timestamp: number;
}

export interface UseCctvAutoUploadOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  webrtcConnected: boolean;
  latestData: {
    ti1: number;
    ti2: number;
    ti3: number;
    ti4: number;
  };
  triggerToast: (message: string, type?: 'info' | 'success' | 'warning') => void;
  intervalMs?: number;        // default: 300000 (5 menit)
  queueIntervalMs?: number;   // default: 120000 (2 menit)
  maxRetries?: number;        // default: 3
  uploadTimeoutMs?: number;   // default: 30000 (30 detik)
  enabled?: boolean;          // default: true
}

export interface UseCctvAutoUploadReturn {
  status: AutoUploadStatus;
  lastUploadTime: string | null;
  queueLength: number;
  logs: AutoUploadLog[];
  isEnabled: boolean;
  toggleAutoUpload: () => void;
  forceUploadNow: () => Promise<void>;
  clearLogs: () => void;
  clearQueue: () => void;
}

export function useCctvAutoUpload({
  videoRef,
  webrtcConnected,
  latestData,
  triggerToast,
  intervalMs = 300000,       // 5 menit
  queueIntervalMs = 120000,  // 2 menit
  maxRetries = 3,
  uploadTimeoutMs = 30000,   // 30 detik
  enabled = true,
}: UseCctvAutoUploadOptions): UseCctvAutoUploadReturn {

  const [status, setStatus] = useState<AutoUploadStatus>(enabled ? 'idle' : 'disabled');
  const [lastUploadTime, setLastUploadTime] = useState<string | null>(null);
  const [queue, setQueue] = useState<AutoUploadQueueItem[]>([]);
  const [logs, setLogs] = useState<AutoUploadLog[]>([]);
  const [isEnabled, setIsEnabled] = useState(enabled);

  const isUploadingRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const queueIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ─── Helper: DataURL → Blob ───
  const dataURLtoBlob = useCallback((dataUrl: string): Blob => {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new Blob([u8arr], { type: mime });
  }, []);

  // ─── Helper: Capture frame dari video ───
  const captureFrame = useCallback((): { dataUrl: string | null; fileName: string } => {
    const video = videoRef.current;
    if (!video || !webrtcConnected || video.readyState < 2) {
      return { dataUrl: null, fileName: '' };
    }

    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1920;
      canvas.height = video.videoHeight || 1080;
      const ctx = canvas.getContext('2d');
      if (!ctx) return { dataUrl: null, fileName: '' };

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Watermark
      const barHeight = 56;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, canvas.height - barHeight, canvas.width, barHeight);
      ctx.font = 'bold 18px monospace';
      ctx.fillStyle = '#38bdf8';
      const now = new Date();
      const dateStr = now.toLocaleDateString('id-ID');
      const timeStr = now.toLocaleTimeString('id-ID');
      ctx.fillText(`FluidHE Auto-Capture • ${dateStr} ${timeStr} WIB`, 16, canvas.height - 32);
      ctx.font = '14px monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`TI1: ${latestData.ti1}°C | TI2: ${latestData.ti2}°C | TI3: ${latestData.ti3}°C | TI4: ${latestData.ti4}°C`, 16, canvas.height - 10);

      const dataUrl = canvas.toDataURL('image/png');
      const fileName = `CCTV_Auto_${now.toISOString().slice(0, 10)}_${timeStr.replace(/:/g, '-')}.png`;

      return { dataUrl, fileName };
    } catch (err) {
      console.error('[useCctvAutoUpload] Capture error:', err);
      return { dataUrl: null, fileName: '' };
    }
  }, [videoRef, webrtcConnected, latestData]);

  // ─── Core: Upload dengan Retry ───
  const uploadWithRetry = useCallback(async (
    blob: Blob,
    fileName: string,
    retryCount: number = 0
  ): Promise<{ success: boolean; url?: string; error?: string }> => {
    const backoffMs = Math.min(2000 * Math.pow(2, retryCount), 10000);

    try {
      const formData = new FormData();
      formData.append('file', new File([blob], fileName, { type: 'image/png' }));
      formData.append('folder', 'CCTV_Snapshots');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), uploadTimeoutMs);

      const res = await fetch('/api/drive/upload', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      return { success: true, url: data.viewUrl };
    } catch (err: any) {
      console.warn(`[useCctvAutoUpload] Attempt ${retryCount + 1} failed:`, err.message);

      if (retryCount < maxRetries) {
        await new Promise(r => setTimeout(r, backoffMs));
        return uploadWithRetry(blob, fileName, retryCount + 1);
      }

      return { success: false, error: err.message || 'Upload failed after retries' };
    }
  }, [maxRetries, uploadTimeoutMs]);

  // ─── Core: Proses upload satu kali ───
  const processUpload = useCallback(async () => {
    if (isUploadingRef.current) {
      console.log('[useCctvAutoUpload] Skip: already uploading');
      return;
    }

    if (!webrtcConnected || !videoRef.current) {
      const now = new Date().toLocaleTimeString('id-ID');
      setLogs(prev => [{ time: now, status: 'error' as const, message: 'Kamera offline — skip capture' }, ...prev].slice(0, 50));
      return;
    }

    isUploadingRef.current = true;
    setStatus('capturing');

    try {
      const { dataUrl, fileName } = captureFrame();
      if (!dataUrl || !fileName) {
        throw new Error('Gagal capture frame dari video');
      }

      const blob = dataURLtoBlob(dataUrl);
      setStatus('uploading');

      const result = await uploadWithRetry(blob, fileName);
      const now = new Date().toLocaleTimeString('id-ID');

      if (result.success) {
        setLastUploadTime(now);
        setStatus('success');
        setLogs(prev => [{ time: now, status: 'success' as const, message: `Uploaded: ${fileName}`, url: result.url }, ...prev].slice(0, 50));
        triggerToast('📸 Auto-snapshot tersimpan di Google Drive!', 'success');
      } else {
        setQueue(prev => [...prev, { blob, fileName, retryCount: 0, timestamp: Date.now() }]);
        setStatus('error');
        setLogs(prev => [{ time: now, status: 'error' as const, message: `Failed ${fileName}: ${result.error} (queued)` }, ...prev].slice(0, 50));
        triggerToast('⚠️ Auto-upload gagal — masuk queue retry', 'warning');
      }
    } catch (err: any) {
      const now = new Date().toLocaleTimeString('id-ID');
      setStatus('error');
      setLogs(prev => [{ time: now, status: 'error' as const, message: err.message || 'Capture error' }, ...prev].slice(0, 50));
    } finally {
      isUploadingRef.current = false;
      setTimeout(() => setStatus(prev => prev === 'success' || prev === 'error' ? 'idle' : prev), 3000);
    }
  }, [webrtcConnected, videoRef, captureFrame, dataURLtoBlob, uploadWithRetry, triggerToast]);

  // ─── Queue Processor ───
  const processQueue = useCallback(async () => {
    if (queue.length === 0 || isUploadingRef.current) return;

    const item = queue[0];
    if (Date.now() - item.timestamp < 60000) return; // Tunggu 1 menit sebelum retry

    isUploadingRef.current = true;
    try {
      const result = await uploadWithRetry(item.blob, item.fileName, item.retryCount);
      if (result.success) {
        setQueue(prev => prev.slice(1));
        const now = new Date().toLocaleTimeString('id-ID');
        setLogs(prev => [{ time: now, status: 'success' as const, message: `Queue retry OK: ${item.fileName}`, url: result.url }, ...prev].slice(0, 50));
        triggerToast('✅ Queue retry berhasil!', 'success');
      } else {
        setQueue(prev => {
          const [first, ...rest] = prev;
          if (first.retryCount >= 2) return rest; // Hapus setelah 3x total
          return [{ ...first, retryCount: first.retryCount + 1, timestamp: Date.now() }, ...rest];
        });
      }
    } finally {
      isUploadingRef.current = false;
    }
  }, [queue, uploadWithRetry, triggerToast]);

  // ─── Setup Intervals ───
  useEffect(() => {
    if (!isEnabled) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (queueIntervalRef.current) clearInterval(queueIntervalRef.current);
      setStatus('disabled');
      return;
    }

    setStatus('idle');
    intervalRef.current = setInterval(() => {
      processUpload();
    }, intervalMs);

    queueIntervalRef.current = setInterval(() => {
      processQueue();
    }, queueIntervalMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (queueIntervalRef.current) clearInterval(queueIntervalRef.current);
    };
  }, [isEnabled, intervalMs, queueIntervalMs, processUpload, processQueue]);

  // ─── Public Methods ───
  const toggleAutoUpload = useCallback(() => {
    setIsEnabled(prev => !prev);
  }, []);

  const forceUploadNow = useCallback(async () => {
    if (!isEnabled) {
      triggerToast('Auto-upload sedang disabled. Aktifkan dulu.', 'warning');
      return;
    }
    await processUpload();
  }, [isEnabled, processUpload, triggerToast]);

  const clearLogs = useCallback(() => setLogs([]), []);
  const clearQueue = useCallback(() => setQueue([]), []);

  return {
    status,
    lastUploadTime,
    queueLength: queue.length,
    logs,
    isEnabled,
    toggleAutoUpload,
    forceUploadNow,
    clearLogs,
    clearQueue,
  };
}
