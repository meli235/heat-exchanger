import subprocess
import datetime

ffmpeg_path = r"C:\Users\mrwin\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg.Essentials_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.1-essentials_build\bin\ffmpeg.exe"
cam_ip = "192.168.1.12"
cam_pass = "TJPCYS"

now = datetime.datetime.now(datetime.timezone.utc)
# Check last 30 minutes
start_dt = now - datetime.timedelta(minutes=30)
end_dt = now

start_str = start_dt.strftime("%Y%m%dT%H%M%SZ")
end_str = end_dt.strftime("%Y%m%dT%H%M%SZ")

test_paths = [
    f"rtsp://admin:{cam_pass}@{cam_ip}:554/Streaming/tracks/101?starttime={start_str}&endtime={end_str}",
    f"rtsp://admin:{cam_pass}@{cam_ip}:554/Streaming/tracks/1?starttime={start_str}&endtime={end_str}",
    f"rtsp://admin:{cam_pass}@{cam_ip}:554/Streaming/Channels/101?starttime={start_str}&endtime={end_str}",
    f"rtsp://admin:{cam_pass}@{cam_ip}:554/Streaming/Channels/1?starttime={start_str}&endtime={end_str}",
    f"rtsp://admin:{cam_pass}@{cam_ip}:554/tracks/101?starttime={start_str}&endtime={end_str}",
    f"rtsp://admin:{cam_pass}@{cam_ip}:554/h264/ch1/main/av_stream?starttime={start_str}&endtime={end_str}"
]

for idx, url in enumerate(test_paths):
    print(f"\n--- Testing Path [{idx+1}]: {url} ---")
    cmd = [
        ffmpeg_path,
        "-rtsp_transport", "tcp",
        "-i", url,
        "-t", "2",
        "-f", "null", "-"
    ]
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=8)
        stderr = res.stderr
        if "Stream #0:" in stderr:
            print("SUCCESS! Found valid streams:")
            for line in stderr.splitlines():
                if "Stream #0:" in line or "Input #0" in line:
                    print("  ", line)
        else:
            print("Failed / No video stream returned.")
    except Exception as e:
        print("Timeout or Error:", e)
