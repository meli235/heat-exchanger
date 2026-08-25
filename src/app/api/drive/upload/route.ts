import { NextRequest, NextResponse } from 'next/server';

// URL dari Google Apps Script
const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycby0O1mlLd-szQIrWjhUFw8YsibiyFM2kdVcVyM0w9h9QaDQDPDSPYggKf3rjKOxYAWu/exec';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const folder = (formData.get('folder') as string) || 'Telemetry_Logs';

    if (!file) {
      return NextResponse.json({ error: 'No file' }, { status: 400 });
    }

    // Convert file ke base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Data = buffer.toString('base64');

    // Kirim ke Google Apps Script
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        mimeType: file.type,
        fileData: base64Data,
        folder: folder,
      }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Upload failed');
    }

    return NextResponse.json({
      success: true,
      fileName: data.fileName,
      viewUrl: data.viewUrl,
      downloadUrl: data.downloadUrl,
    });

  } catch (error: any) {
    console.error('Drive upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}
