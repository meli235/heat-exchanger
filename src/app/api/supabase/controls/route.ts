import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kkxfbjpbaxnmgsnxrbpj.supabase.co';
const DEFAULT_KEY = 'sb_secret_oXE1SgqHQS1TrYPfa9SCmw_plDrix1H';

// Daftar kolom valid di tabel device_controls Supabase
const VALID_COLUMNS = new Set([
  'flow_mode',
  'control_mode',
  'heater_status',
  'target_temp',
  'target_flow',
  'servo_angle',
  'uap_status',
  'air_dingin',
  'btn_up',
  'btn_onoff',
  'btn_down',
  'updated_at',
]);

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

function getSupabaseKey(req: NextRequest): string {
  const clientKey = req.headers.get('x-supabase-key');
  if (clientKey && clientKey.trim().length > 5) {
    return clientKey.trim();
  }
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_KEY;
}

export async function GET(req: NextRequest) {
  try {
    const supabaseKey = getSupabaseKey(req);
    const endpoint = `${SUPABASE_URL}/rest/v1/device_controls?id=eq.1&select=*`;

    const res = await fetchWithRetry(endpoint, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      cache: 'no-store'
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: errText }, { status: res.status });
    }

    const data = await res.json();
    const row = Array.isArray(data) && data.length > 0 ? data[0] : null;
    return NextResponse.json({ data: row });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabaseKey = getSupabaseKey(req);
    const body = await req.json();

    // Pemetaan khusus jika frontend mengirim heater_1_status atau heater_2_status
    const mappedBody: Record<string, any> = { ...body };
    if ('heater_1_status' in mappedBody || 'heater_2_status' in mappedBody) {
      const newStatus = Boolean(mappedBody.heater_1_status ?? mappedBody.heater_2_status);
      mappedBody.heater_status = newStatus;
      mappedBody.btn_onoff = newStatus;
    }

    // Filter payload hanya ke kolom yang valid di database device_controls
    const sanitizedPayload: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    for (const key of Object.keys(mappedBody)) {
      if (VALID_COLUMNS.has(key)) {
        sanitizedPayload[key] = mappedBody[key];
      }
    }

    const endpoint = `${SUPABASE_URL}/rest/v1/device_controls?id=eq.1`;

    const res = await fetchWithRetry(endpoint, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(sanitizedPayload)
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: errText }, { status: res.status });
    }

    const data = await res.json();
    const row = Array.isArray(data) && data.length > 0 ? data[0] : null;
    return NextResponse.json({ success: true, data: row });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
