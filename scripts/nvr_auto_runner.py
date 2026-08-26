import subprocess
import time
import os
import sys

FFMPEG_PATH = r"C:\Users\mrwin\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg.Essentials_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.1-essentials_build\bin\ffmpeg.exe"
RTSP_URL = "rtsp://admin:TJPCYS@192.168.101.7:554/Streaming/Channels/101"

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
TEMP_DIR = os.path.join(BASE_DIR, "records", "temp")
os.makedirs(TEMP_DIR, exist_ok=True)

def start_ffmpeg_recorder():
    output_pattern = os.path.join(TEMP_DIR, "%Y-%m-%d_%H-%M-%S.mp4")
    cmd = [
        FFMPEG_PATH, "-y",
        "-rtsp_transport", "tcp",
        "-i", RTSP_URL,
        "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "64k",
        "-movflags", "+faststart",
        "-f", "segment",
        "-segment_time", "300",  # 5 MINUTES (300 SECONDS)
        "-reset_timestamps", "1",
        "-strftime", "1",
        output_pattern
    ]
    print(f"[NVR Recorder] Starting 5-minute continuous playable RTSP recording to {TEMP_DIR}...")
    return subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)

def start_upload_worker():
    script_path = os.path.join(BASE_DIR, "scripts", "upload-queue.js")
    print(f"[Upload Worker] Starting Google Drive upload queue worker...")
    return subprocess.Popen(["node", script_path], cwd=BASE_DIR)

if __name__ == "__main__":
    ffmpeg_proc = start_ffmpeg_recorder()
    upload_proc = start_upload_worker()

    try:
        while True:
            time.sleep(10)
            if ffmpeg_proc.poll() is not None:
                print("[NVR Recorder] FFmpeg process exited. Restarting in 5s...")
                time.sleep(5)
                ffmpeg_proc = start_ffmpeg_recorder()

            if upload_proc.poll() is not None:
                print("[Upload Worker] Worker process exited. Restarting in 5s...")
                time.sleep(5)
                upload_proc = start_upload_worker()
    except KeyboardInterrupt:
        print("[NVR Manager] Stopping processes...")
        ffmpeg_proc.terminate()
        upload_proc.terminate()
