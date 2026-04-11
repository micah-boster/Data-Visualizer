import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/snowflake/queries';

export const dynamic = 'force-dynamic';

export async function GET() {
  const health: Record<string, unknown> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'local',
  };

  try {
    const start = Date.now();
    await executeQuery('SELECT 1 AS ping');
    health.snowflake = {
      status: 'connected',
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    health.status = 'degraded';
    health.snowflake = {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
    return NextResponse.json(health, { status: 503 });
  }

  return NextResponse.json(health);
}
