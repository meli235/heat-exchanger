/**
 * src/app/api/drive/upload/route.ts
 * Google Drive Auto-Upload Proxy Route
 */

import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL || '';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const folder = (formData.get('folder') as string) || 'CCTV_Snapshots';

    // ─── Validasi Input ───
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!GOOGLE_SCRIPT_URL) {
      return NextResponse.json(
        { error: 'GOOGLE_SCRIPT_URL not configured in environment' },
        { status: 500 }
      );
    }

    // Validasi ukuran file (max 50MB)
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB, max 50MB)` },
        { status: 413 }
      );
    }

    // Validasi tipe file (fleksibel untuk MIME type video/webm;codecs=...)
    const mime = (file.type || '').toLowerCase();
    const isImage = mime.startsWith('image/');
    const isVideo = mime.startsWith('video/') || mime.includes('webm') || mime.includes('mp4');
    const isDocument = mime.includes('pdf') || mime.includes('sheet') || mime.includes('excel') || mime.includes('csv');

    if (!isImage && !isVideo && !isDocument) {
      return NextResponse.json(
        { error: `File type ${file.type} not allowed` },
        { status: 415 }
      );
    }

    // ─── Convert ke Base64 ───
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Data = buffer.toString('base64');

    // Ubah nama file .webm ke .mp4 agar Google Drive membuat preview thumbnail visual
    let targetFileName = file.name;
    if (isVideo && targetFileName.endsWith('.webm')) {
      targetFileName = targetFileName.replace(/\.webm$/i, '.mp4');
    }

    // Tentukan mimeType yang akan dikirim ke Google Apps Script / DriveApp
    let targetMimeType = file.type || 'application/octet-stream';
    if (isVideo) {
      targetMimeType = 'video/mp4';
    } else if (isImage) {
      targetMimeType = file.type || 'image/png';
    }

    // ─── Upload ke Google Apps Script dengan Timeout 35 detik ───
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000); // 35 detik

    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: targetFileName,
        mimeType: targetMimeType,
        fileData: base64Data,
        folder: folder,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Google Script responded with HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Google Script returned failure');
    }

    return NextResponse.json({
      success: true,
      fileName: data.fileName || targetFileName,
      viewUrl: data.viewUrl,
      downloadUrl: data.downloadUrl,
    });

  } catch (error: any) {
    console.error('[Drive Upload API] Error:', error);

    // Tangani AbortError (timeout)
    if (error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Upload timeout — Google Script tidak merespons dalam 35 detik', code: 'TIMEOUT' },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Upload failed', code: 'UNKNOWN' },
      { status: 500 }
    );
  }
}
