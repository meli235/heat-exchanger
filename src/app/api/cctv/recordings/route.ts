import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

function getRecordsDir(): string {
  if (process.env.RECORDS_PATH && fs.existsSync(process.env.RECORDS_PATH)) {
    return process.env.RECORDS_PATH;
  }
  const root = process.cwd();
  const possiblePaths = [
    path.join(root, 'records', 'he_cctv'),
    path.join(root, 'scripts', 'records', 'he_cctv'),
    path.join(root, '..', 'records', 'he_cctv'),
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  return path.join(root, 'records', 'he_cctv');
}

export async function GET() {
  try {
    const RECORDS_PATH = getRecordsDir();

    if (!fs.existsSync(RECORDS_PATH)) {
      return NextResponse.json({
        recordings: [],
        message: 'Folder recording belum ada. Pastikan go2rtc recording sudah aktif.'
      });
    }

    const files = fs.readdirSync(RECORDS_PATH)
      .filter(f => f.endsWith('.mp4'))
      .map(f => {
        const stat = fs.statSync(path.join(RECORDS_PATH, f));
        const parts = f.replace('.mp4', '').split('_');
        const date = parts[0] || 'Unknown';
        const time = parts[1] ? parts[1].replace(/-/g, ':') : '00:00:00';

        return {
          id: f,
          name: f,
          date,
          time,
          size: (stat.size / 1024 / 1024).toFixed(2) + ' MB',
          duration: '60 min',
          url: `/api/cctv/recordings/stream?file=${encodeURIComponent(f)}`,
        };
      })
      .sort((a, b) => b.name.localeCompare(a.name));

    return NextResponse.json({ recordings: files, total: files.length });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
