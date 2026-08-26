import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kkxfbjpbaxnmgsnxrbpj.supabase.co';
const DEFAULT_KEY = 'sb_secret_oXE1SgqHQS1TrYPfa9SCmw_plDrix1H';

async function fetchWithRetry(url: string, options: RequestInit, retries = 1): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      return res;
    } catch (err) {
      if (i === retries) throw err;
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  throw new Error('Fetch failed after retries');
}

export async function GET(req: NextRequest) {
  try {
    const clientKey = req.headers.get('x-supabase-key');
    const supabaseKey = (clientKey && clientKey.trim().length > 5)
      ? clientKey.trim()
      : (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_KEY);

    const limit = new URL(req.url).searchParams.get('limit') || '20';
    const endpoint = `${SUPABASE_URL}/rest/v1/telemetry_data?select=*&order=created_at.desc&limit=${limit}`;

    const res = await fetchWithRetry(endpoint, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      cache: 'no-store'
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: errText, code: 'SUPABASE_HTTP_ERROR' }, { status: res.status });
    }

    const data = await res.json();
    const sorted = Array.isArray(data) ? data.reverse() : [];
    return NextResponse.json({ data: sorted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error fetching telemetry', data: [] }, { status: 500 });
  }
}
