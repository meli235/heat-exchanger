import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL || '';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const folder = (formData.get('folder') as string) || 'cctv-recordings';

    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });
    if (!GOOGLE_SCRIPT_URL) return NextResponse.json({ error: 'URL not set' }, { status: 500 });

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');

    const res = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        mimeType: file.type,
        fileData: base64,
        folder: folder,
      }),
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    return NextResponse.json({
      success: true,
      fileName: data.fileName,
      viewUrl: data.viewUrl,
      deleted: data.deletedOldFiles,
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const folder = new URL(req.url).searchParams.get('folder') || 'cctv-recordings';
    const res = await fetch(`${GOOGLE_SCRIPT_URL}?folder=${folder}`);
    return NextResponse.json(await res.json());
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
