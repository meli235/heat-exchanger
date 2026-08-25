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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('file');
    if (!fileName) return NextResponse.json({ error: 'File required' }, { status: 400 });

    const RECORDS_PATH = getRecordsDir();
    const filePath = path.join(RECORDS_PATH, path.basename(fileName));
    if (!fs.existsSync(filePath)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const stat = fs.statSync(filePath);
    const range = request.headers.get('range');

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      const chunkSize = end - start + 1;
      const stream = fs.createReadStream(filePath, { start, end });

      return new Response(stream as any, {
        status: 206,
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Length': chunkSize.toString(),
          'Content-Range': `bytes ${start}-${end}/${stat.size}`,
          'Accept-Ranges': 'bytes',
        },
      });
    }

    const stream = fs.createReadStream(filePath);

    return new Response(stream as any, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': stat.size.toString(),
        'Accept-Ranges': 'bytes',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Stream failed' }, { status: 500 });
  }
}
