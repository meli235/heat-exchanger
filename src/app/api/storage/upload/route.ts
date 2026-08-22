import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://upcdnlqytwiebykybval.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_blciMJhn8B2D0jSIecBOtw_E6okFbsf';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function ensureBucketExists(bucketName: string): Promise<string> {
  try {
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (!listError && buckets && buckets.length > 0) {
      const found = buckets.find((b) => b.name === bucketName || b.id === bucketName);
      if (found) return found.name;
    }

    // Try to create the bucket automatically if it doesn't exist
    const { data: newBucket, error: createError } = await supabase.storage.createBucket(bucketName, {
      public: true,
      allowedMimeTypes: undefined,
      fileSizeLimit: undefined,
    });

    if (!createError && newBucket) {
      return bucketName;
    }

    if (!listError && buckets && buckets.length > 0) {
      return buckets[0].name;
    }
  } catch (e) {
    console.error('Bucket check error:', e);
  }
  return bucketName;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || 'telemetry-logs';

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    const fileName = file.name || `file_${Date.now()}`;
    const filePath = `${folder}/${Date.now()}_${fileName}`;
    const fileBuffer = await file.arrayBuffer();

    let targetBucket = 'fluidhe-storage';
    targetBucket = await ensureBucketExists(targetBucket);

    // Upload to target bucket
    let { data: uploadData, error: uploadError } = await supabase.storage
      .from(targetBucket)
      .upload(filePath, fileBuffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: true,
      });

    if (uploadError && (uploadError.message?.toLowerCase().includes('not found') || uploadError.message?.toLowerCase().includes('bucket'))) {
      // Try creating bucket on-demand
      await supabase.storage.createBucket(targetBucket, { public: true });
      const retryResult = await supabase.storage
        .from(targetBucket)
        .upload(filePath, fileBuffer, {
          contentType: file.type || 'application/octet-stream',
          upsert: true,
        });
      uploadData = retryResult.data;
      uploadError = retryResult.error;
    }

    if (uploadError) {
      console.error('Supabase Storage upload error:', uploadError);
      return NextResponse.json({
        success: false,
        error: `Supabase Storage error: ${uploadError.message}. Pastikan bucket 'fluidhe-storage' (Public) sudah dibuat di Dashboard Supabase.`,
      }, { status: 400 });
    }

    const { data: publicUrlData } = supabase.storage.from(targetBucket).getPublicUrl(filePath);
    const publicUrl = publicUrlData?.publicUrl || `${SUPABASE_URL}/storage/v1/object/public/${targetBucket}/${filePath}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      path: filePath,
      fileName: fileName,
      bucket: targetBucket,
    });
  } catch (err: any) {
    console.error('Storage upload route error:', err);
    return NextResponse.json({
      success: false,
      error: err?.message || 'Internal server error during upload',
    }, { status: 500 });
  }
}
