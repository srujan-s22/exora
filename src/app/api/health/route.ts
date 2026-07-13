import { isDatabaseHealthy } from '@/lib/db/connection';

export const dynamic = 'force-dynamic';

export async function GET() {
  let dbHealthy = false;
  try {
    dbHealthy = await isDatabaseHealthy();
  } catch {
    dbHealthy = false;
  }

  // Only expose minimal health status — no server internals
  return Response.json({
    status: dbHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
  }, {
    status: dbHealthy ? 200 : 503,
  });
}

