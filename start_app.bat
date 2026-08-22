@echo off
title FluidHE Dashboard - Start Server & CCTV
echo ===================================================
echo   Memulai Service CCTV (go2rtc) & Aplikasi FluidHE
echo ===================================================
echo.
echo [1/2] Memeriksa & Menjalankan Server CCTV (go2rtc)...
powershell -Command "if (-not (Get-Process go2rtc -ErrorAction SilentlyContinue)) { Start-Process -FilePath '%~dp0scripts\go2rtc.exe' -ArgumentList '-config %~dp0scripts\go2rtc.yaml' -WorkingDirectory '%~dp0scripts' -WindowStyle Hidden; Write-Host 'Server CCTV go2rtc berhasil dijalankan!' } else { Write-Host 'Server CCTV go2rtc sudah aktif.' }"

echo.
echo [2/2] Menjalankan Dashboard Next.js (port 3000)...
npm run dev
