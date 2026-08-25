"use client";
import { useState, useEffect } from "react";
import { Video, ImageIcon, RefreshCw, ExternalLink, Play } from "lucide-react";

export default function CCTVDriveHistory() {
  const [files, setFiles] = useState<any[]>([]);
  const [tab, setTab] = useState<"video" | "snapshot">("video");
  const [loading, setLoading] = useState(true);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const folder = tab === "video" ? "cctv-recordings" : "cctv-snapshots";
      const res = await fetch(`/api/drive?folder=${folder}`);
      const data = await res.json();
      setFiles(data.files || []);
    } catch (err) {
      console.error("Failed to fetch files from drive:", err);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [tab]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span>📹</span> Arsip CCTV (Google Drive)
        </h2>
        <button
          onClick={fetchFiles}
          className="text-sm text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setTab("video")}
          className={`px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-1.5 ${
            tab === "video" ? "bg-sky-600 text-white font-medium" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
          }`}
        >
          <Video className="w-4 h-4" /> Video
        </button>
        <button
          onClick={() => setTab("snapshot")}
          className={`px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-1.5 ${
            tab === "snapshot" ? "bg-sky-600 text-white font-medium" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
          }`}
        >
          <ImageIcon className="w-4 h-4" /> Snapshot
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Memuat...</div>
      ) : files.length === 0 ? (
        <div className="text-center py-12 text-gray-500 border border-dashed border-gray-800 rounded-xl">
          Belum ada file di Google Drive
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {files.map((f) => (
            <div key={f.id || f.name} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="aspect-video bg-black flex items-center justify-center">
                <Play className="w-8 h-8 text-white/50" />
              </div>
              <div className="p-3">
                <p className="text-xs text-gray-400 truncate" title={f.name}>{f.name}</p>
                <p className="text-xs text-gray-600">{f.size}</p>
                <a
                  href={f.viewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-sky-400 flex items-center gap-1 mt-1 hover:underline"
                >
                  <ExternalLink className="w-3 h-3" /> Buka
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
