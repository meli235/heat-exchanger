import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://upcdnlqytwiebykybval.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_blciMJhn8B2D0jSIecBOtw_E6okFbsf';

const supabase = createClient(supabaseUrl, supabaseKey);

async function ensureBucketExists(bucketName: string): Promise<string> {
  try {
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (!listError && buckets && buckets.length > 0) {
      const found = buckets.find((b) => b.name === bucketName || b.id === bucketName);
      if (found) return found.name;
    }
    const { data: newBucket, error: createError } = await supabase.storage.createBucket(bucketName, {
      public: true,
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

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const folder = (formData.get('folder') as string) || 'telemetry-logs';

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${folder}/${timestamp}_${file.name}`;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let bucketName = 'fluidhe-lab';
    bucketName = await ensureBucketExists(bucketName);

    let { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error && (error.message?.toLowerCase().includes('not found') || error.message?.toLowerCase().includes('bucket'))) {
      await supabase.storage.createBucket(bucketName, { public: true });
      const retry = await supabase.storage
        .from(bucketName)
        .upload(fileName, buffer, {
          contentType: file.type,
          upsert: false,
        });
      data = retry.data;
      error = retry.error;
    }

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    return NextResponse.json({
      success: true,
      fileName: file.name,
      path: fileName,
      url: publicUrl,
    });

  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}
