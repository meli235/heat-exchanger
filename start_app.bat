@echo off
title FluidHE Dashboard - Start Server & CCTV NVR
echo ===================================================
echo   Memulai Service CCTV (go2rtc), NVR & Upload Queue
echo ===================================================
echo.
echo [1/4] Memeriksa & Menjalankan Server CCTV (go2rtc)...
powershell -Command "if (-not (Get-Process go2rtc -ErrorAction SilentlyContinue)) { Start-Process -FilePath '%~dp0scripts\go2rtc.exe' -ArgumentList '-config %~dp0scripts\go2rtc.yaml' -WorkingDirectory '%~dp0scripts' -WindowStyle Hidden; Write-Host 'Server CCTV go2rtc berhasil dijalankan!' } else { Write-Host 'Server CCTV go2rtc sudah aktif.' }"

echo.
echo [2/4] Menjalankan NVR CCTV Recorder (1 Jam segmentasi)...
powershell -Command "if (-not (Get-Process ffmpeg -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like '*records\temp*' })) { Start-Process -FilePath '%~dp0nvr-drive.bat' -WorkingDirectory '%~dp0' -WindowStyle Minimized; Write-Host 'NVR Recorder berhasil dijalankan!' } else { Write-Host 'NVR Recorder sudah aktif.' }"

echo.
echo [3/4] Menjalankan Worker Upload Queue Google Drive (Tiap 5 menit)...
powershell -Command "if (-not (Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like '*upload-queue*' })) { Start-Process node -ArgumentList '%~dp0scripts\upload-queue.js' -WorkingDirectory '%~dp0' -WindowStyle Hidden; Write-Host 'Worker Upload Queue berhasil dijalankan!' } else { Write-Host 'Worker Upload Queue sudah aktif.' }"

echo.
echo [4/4] Menjalankan Dashboard Next.js (port 3000)...
npm run dev
