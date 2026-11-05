import {getDatabase} from '@/lib/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  try {
    const database = await getDatabase();
    await database.command({ping: 1});

    return Response.json(
      {
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {'Cache-Control': 'no-store, max-age=0'},
      },
    );
  } catch {
    // Do not expose MongoDB errors, connection details, or credentials publicly.
    return Response.json(
      {
        status: 'error',
        database: 'unavailable',
        timestamp: new Date().toISOString(),
      },
      {
        status: 503,
        headers: {'Cache-Control': 'no-store, max-age=0'},
      },
    );
  }
}
