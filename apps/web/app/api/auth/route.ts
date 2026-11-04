import {createHmac, timingSafeEqual} from 'node:crypto';
import {cookies} from 'next/headers';

const TOKEN_COOKIE = 'milkbook_session';
const USER_COOKIE = 'milkbook_user';
const SESSION_MAX_AGE = 60 * 60 * 24 * 14;

type ApiUser = {id: string | number; name?: string; phone?: string};

function apiBaseUrl() {
  const configured = process.env.MILKBOOK_API_BASE_URL;
  const fallback = process.env.NODE_ENV === 'development'
    ? 'https://test-milk-app-api.vercel.app'
    : 'https://milk-app-api.vercel.app';
  return (configured || fallback).replace(/\/$/, '');
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_MAX_AGE,
  };
}

function encodeUserCookie(user: {id: string; name: string; phone: string}, token: string) {
  const payload = Buffer.from(JSON.stringify(user)).toString('base64url');
  const signature = createHmac('sha256', token).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function decodeUserCookie(value: string, token: string) {
  const [payload, signature] = value.split('.');
  if (!payload || !signature) return null;
  const expected = createHmac('sha256', token).update(payload).digest();
  let supplied: Buffer;
  try {
    supplied = Buffer.from(signature, 'base64url');
  } catch {
    return null;
  }
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
  try {
    const user = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as ApiUser;
    if (user.id === undefined || user.id === null) return null;
    return {id: String(user.id), name: user.name || '', phone: user.phone || ''};
  } catch {
    return null;
  }
}

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_COOKIE)?.value;
  const serializedUser = cookieStore.get(USER_COOKIE)?.value;
  if (!token || !serializedUser) return Response.json({user: null});

  const user = decodeUserCookie(serializedUser, token);
  if (user) return Response.json({user});
  else {
    cookieStore.delete(TOKEN_COOKIE);
    cookieStore.delete(USER_COOKIE);
    return Response.json({user: null});
  }
}

export async function POST(request: Request) {
  let credentials: {phone?: unknown; password?: unknown};
  try {
    credentials = await request.json();
  } catch {
    return Response.json({error: 'Enter your phone number and password.'}, {status: 400});
  }

  if (typeof credentials.phone !== 'string' || typeof credentials.password !== 'string' || !credentials.phone.trim() || !credentials.password) {
    return Response.json({error: 'Enter your phone number and password.'}, {status: 400});
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${apiBaseUrl()}/auth/login`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({phone: credentials.phone.trim(), password: credentials.password}),
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    return Response.json({error: 'MilkBook sign-in is unavailable right now. Please try again.'}, {status: 502});
  }

  const result = await upstream.json().catch(() => ({})) as {token?: unknown; user?: ApiUser; error?: string; message?: string};
  if (!upstream.ok) {
    return Response.json({error: result.error || result.message || 'Phone number or password is incorrect.'}, {status: upstream.status >= 400 && upstream.status < 500 ? upstream.status : 502});
  }

  if (typeof result.token !== 'string' || !result.user || result.user.id === undefined || result.user.id === null) {
    return Response.json({error: 'MilkBook returned an incomplete sign-in response.'}, {status: 502});
  }

  const user = {id: String(result.user.id), name: result.user.name || '', phone: result.user.phone || credentials.phone.trim()};
  const cookieStore = await cookies();
  cookieStore.set(TOKEN_COOKIE, result.token, cookieOptions());
  cookieStore.set(USER_COOKIE, encodeUserCookie(user, result.token), cookieOptions());
  return Response.json({user});
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(TOKEN_COOKIE);
  cookieStore.delete(USER_COOKIE);
  return Response.json({ok: true});
}
