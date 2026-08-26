@echo off
echo Starting Audio Bridge: Laptop -> CCTV...
:loop
ffmpeg -re -f lavfi -i anullsrc=r=8000:cl=mono -acodec pcm_mulaw -ar 8000 -ac 1 -f rtp rtp://192.168.1.12:554/Streaming/Channels/102
timeout /t 2
goto loop
