import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://upcdnlqytwiebykybval.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_blciMJhn8B2D0jSIecBOtw_E6okFbsf';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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

    const bucketName = 'fluidhe-storage';

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, fileBuffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: true,
      });

    if (uploadError) {
      console.error('Supabase Storage upload error:', uploadError);
      const { data: fallbackData, error: fallbackError } = await supabase.storage
        .from('public')
        .upload(filePath, fileBuffer, {
          contentType: file.type || 'application/octet-stream',
          upsert: true,
        });

      if (fallbackError) {
        return NextResponse.json({
          success: false,
          error: uploadError.message || fallbackError.message || 'Supabase storage upload failed',
        }, { status: 500 });
      }

      const { data: publicUrlData } = supabase.storage.from('public').getPublicUrl(filePath);
      return NextResponse.json({
        success: true,
        url: publicUrlData?.publicUrl || `${SUPABASE_URL}/storage/v1/object/public/public/${filePath}`,
        path: filePath,
        fileName: fileName,
      });
    }

    const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      url: publicUrlData?.publicUrl || `${SUPABASE_URL}/storage/v1/object/public/${bucketName}/${filePath}`,
      path: filePath,
      fileName: fileName,
    });
  } catch (err: any) {
    console.error('Storage upload route error:', err);
    return NextResponse.json({
      success: false,
      error: err?.message || 'Internal server error during upload',
    }, { status: 500 });
  }
}
