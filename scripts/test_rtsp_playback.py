import subprocess
import datetime

now = datetime.datetime.utcnow()
start_dt = now - datetime.timedelta(hours=1)
end_dt = now

start_str = start_dt.strftime("%Y%m%dT%H%M%SZ")
end_str = end_dt.strftime("%Y%m%dT%H%M%SZ")

ffmpeg_path = r"C:\Users\mrwin\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg.Essentials_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.1-essentials_build\bin\ffmpeg.exe"

# Test RTSP Playback with recent time range
rtsp_playback_url = f"rtsp://admin:TJPCYS@192.168.101.4:554/Streaming/tracks/101?starttime={start_str}&endtime={end_str}"
print(f"Testing RTSP Playback URL: {rtsp_playback_url}")

cmd = [
    ffmpeg_path,
    "-rtsp_transport", "tcp",
    "-i", rtsp_playback_url,
    "-t", "5",
    "-f", "null", "-"
]

res = subprocess.run(cmd, capture_output=True, text=True, timeout=12)
print("FFmpeg Output:\n", res.stderr)
