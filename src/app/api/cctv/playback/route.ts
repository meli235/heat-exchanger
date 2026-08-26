import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { date, timeMinutes } = body; // date: 'YYYY-MM-DD', timeMinutes: 135 (02:15)

    if (!date || timeMinutes === undefined) {
      return NextResponse.json({ error: 'Missing date or timeMinutes' }, { status: 400 });
    }

    const hours = Math.floor(timeMinutes / 60).toString().padStart(2, '0');
    const minutes = (timeMinutes % 60).toString().padStart(2, '0');
    const dateFormatted = date.replace(/-/g, '');

    // Format RTSP start and end time (15 minute window)
    const startTime = `${dateFormatted}T${hours}${minutes}00Z`;
    const endMinutesNum = (timeMinutes + 30) % 1440;
    const endHours = Math.floor(endMinutesNum / 60).toString().padStart(2, '0');
    const endMins = (endMinutesNum % 60).toString().padStart(2, '0');
    const endTime = `${dateFormatted}T${endHours}${endMins}00Z`;

    const camIp = '192.168.101.7';
    const camPass = 'TJPCYS';
    // Verified working Hikvision/EZVIZ MicroSD playback track path
    const rtspPlaybackUrl = `rtsp://admin:${camPass}@${camIp}:554/Streaming/Channels/101?starttime=${startTime}&endtime=${endTime}#backchannel=0`;

    // Register dynamic playback stream with go2rtc
    const go2rtcApiUrl = `http://localhost:8889/api/streams?src=he_playback&val=${encodeURIComponent(rtspPlaybackUrl)}`;

    let res = await fetch(go2rtcApiUrl, { method: 'PUT' });
    if (!res.ok) {
      res = await fetch(go2rtcApiUrl, { method: 'POST' });
    }

    return NextResponse.json({
      success: true,
      streamName: 'he_playback',
      streamUrl: `http://localhost:8889/stream.html?src=he_playback`,
      startTime,
      endTime,
      rtspPlaybackUrl,
    });
  } catch (error: any) {
    console.error('Playback stream setup error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to setup playback stream' },
      { status: 500 }
    );
  }
}
