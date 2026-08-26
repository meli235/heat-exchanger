@echo off
chcp 65001 >nul

:: Auto-detect FFmpeg path if not in global PATH
where ffmpeg >nul 2>nul
if %errorlevel% neq 0 (
  set "PATH=%PATH%;C:\Users\mrwin\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg.Essentials_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.1-essentials_build\bin"
)

set TEMP_DIR=records\temp
if not exist "%TEMP_DIR%" mkdir "%TEMP_DIR%"

echo [%time%] Memulai perekaman RTSP 24/7 (Segment 5 Menit ke %TEMP_DIR%)...

ffmpeg -rtsp_transport tcp -i rtsp://admin:TJPCYS@192.168.101.7:554/Streaming/Channels/101 ^
  -c:v copy -c:a aac -b:a 64k ^
  -f segment -segment_time 300 -reset_timestamps 1 -strftime 1 ^
  "%TEMP_DIR%\%%Y-%%m-%%d_%%H-%%M-%%S.mp4"

pause
