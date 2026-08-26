/**
 * src/app/api/drive/upload/route.ts
 * Perbaikan: Timeout, validasi, error handling yang lebih baik
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

    // Validasi ukuran file (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB, max 10MB)` },
        { status: 413 }
      );
    }

    // Validasi tipe file
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'video/webm', 'video/mp4'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `File type ${file.type} not allowed` },
        { status: 415 }
      );
    }

    // ─── Convert ke Base64 ───
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Data = buffer.toString('base64');

    // ─── Upload ke Google Apps Script dengan Timeout ───
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 detik

    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        mimeType: file.type,
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
      fileName: data.fileName,
      viewUrl: data.viewUrl,
      downloadUrl: data.downloadUrl,
    });

  } catch (error: any) {
    console.error('[Drive Upload API] Error:', error);

    // Tangani AbortError (timeout)
    if (error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Upload timeout — Google Script tidak merespons dalam 25 detik', code: 'TIMEOUT' },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Upload failed', code: 'UNKNOWN' },
      { status: 500 }
    );
  }
}
