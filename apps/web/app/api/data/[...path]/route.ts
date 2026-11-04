import {cookies} from 'next/headers';

const TOKEN_COOKIE = 'milkbook_session';

function apiBaseUrl() {
  const configured = process.env.MILKBOOK_API_BASE_URL;
  const fallback = process.env.NODE_ENV === 'development'
    ? 'https://test-milk-app-api.vercel.app'
    : 'https://milk-app-api.vercel.app';
  return (configured || fallback).replace(/\/$/, '');
}

function allowedPath(segments: string[]) {
  return segments.length === 1 && ['customers', 'milk', 'rates'].includes(segments[0])
    || segments.length === 2 && ['customers', 'milk'].includes(segments[0]) && /^[\w-]+$/.test(segments[1]);
}

async function proxy(request: Request, context: {params: Promise<{path: string[]}>}) {
  const {path} = await context.params;
  if (!allowedPath(path)) return Response.json({error: 'Unsupported data endpoint.'}, {status: 404});

  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_COOKIE)?.value;
  if (!token) return Response.json({error: 'Sign in to access MilkBook data.'}, {status: 401});

  const incoming = new URL(request.url);
  const target = `${apiBaseUrl()}/${path.join('/').split('/').map(encodeURIComponent).join('/')}${incoming.search}`;
  const headers = new Headers({'Authorization': `Bearer ${token}`, 'Cache-Control': 'no-cache'});
  let body: string | undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    body = await request.text();
    headers.set('Content-Type', request.headers.get('Content-Type') || 'application/json');
  }

  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
    const responseBody = await upstream.text();
    return new Response(responseBody, {
      status: upstream.status,
      headers: {'Content-Type': upstream.headers.get('Content-Type') || 'application/json', 'Cache-Control': 'no-store'},
    });
  } catch {
    return Response.json({error: 'MilkBook data service is unavailable right now.'}, {status: 502});
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const DELETE = proxy;
