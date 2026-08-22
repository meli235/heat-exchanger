import { NextResponse } from 'next/server';
import { execFile } from 'child_process';
import path from 'path';

const SCRIPT_PATH = path.join(process.cwd(), 'scripts', 'ezviz_ptz_service.py');

// Map frontend action strings to Ezviz PTZ directions
const DIRECTION_MAP: Record<string, string> = {
  up: 'UP',
  down: 'DOWN',
  left: 'LEFT',
  right: 'RIGHT',
  upLeft: 'UP',
  upRight: 'UP',
  downLeft: 'DOWN',
  downRight: 'DOWN',
  zoomIn: 'ZOOMIN',
  zoomOut: 'ZOOMOUT',
  center: 'UP',
  rig: 'LEFT',
  tank: 'RIGHT',
  valve: 'DOWN',
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, speed = 50 } = body;

    const ezvizDirection = DIRECTION_MAP[action] || 'UP';
    const duration = action === 'zoomIn' || action === 'zoomOut' ? '0.4' : '0.55';

    return new Promise<NextResponse>((resolve) => {
      execFile('python', [SCRIPT_PATH, 'move', ezvizDirection, duration], (error, stdout, stderr) => {
        if (error) {
          console.error('PTZ Service execution error:', error, stderr);
          resolve(NextResponse.json({
            success: false,
            action,
            direction: ezvizDirection,
            error: stderr || error.message,
          }, { status: 500 }));
          return;
        }

        try {
          const parsed = JSON.parse(stdout.trim());
          resolve(NextResponse.json({
            success: parsed.success !== false,
            action,
            direction: ezvizDirection,
            details: parsed,
          }));
        } catch (parseErr) {
          resolve(NextResponse.json({
            success: true,
            action,
            direction: ezvizDirection,
            rawOutput: stdout.trim(),
          }));
        }
      });
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to dispatch PTZ command' },
      { status: 500 }
    );
  }
}
