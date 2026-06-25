import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Note: Next.js middleware runs in the Edge runtime where Node APIs are not available.
// Therefore we do NOT initialize a Redis client here (ioredis requires Node APIs).
// If you want Redis-backed rate limiting, implement it in server Node code (API route)
// or via an external rate-limiter service and call it from middleware.

// Simple rate limiting en memoria (para pre-producción)
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Headers de seguridad (sin HSTS)
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Rate limiting for login — middleware runs in the Edge runtime so avoid
  // importing Node-only libraries here. Delegate to an internal API route
  // which runs in the Node runtime and can use Redis.
  if (request.nextUrl.pathname === '/api/auth/login') {
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : (request.ip as string) || '127.0.0.1';

    try {
      const url = new URL('/api/_rate-limit', request.url)
      const res = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ key: `login:${ip}`, limit: 5, windowSeconds: 15 * 60 }),
      })

      if (res.status === 429) {
        const retryAfter = res.headers.get('retry-after') || '900'
        return new NextResponse('Demasiados intentos. Espere 15 minutos.', {
          status: 429,
          headers: { 'Retry-After': retryAfter },
        })
      }
    } catch (err) {
      // Fail open: allow the request if rate-limit API is unavailable.
      // The server-side rate-limit API logs errors for debugging.
      // eslint-disable-next-line no-console
      console.warn('Rate-limit API call failed; allowing request', err)
    }
  }

  return response;
}

export const config = {
  matcher: ['/api/:path*', '/admin/:path*'],
};
