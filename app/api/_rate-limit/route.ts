import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

// Server-side rate limit API. Uses Redis when REDIS_URL is present, else
// falls back to an in-memory Map (single-node).
let redisClient: any = null
try {
  // ioredis requires Node runtime, but this file runs in Node (API route).
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Redis = require('ioredis')
  if (process.env.REDIS_URL) {
    redisClient = new Redis(process.env.REDIS_URL)
  }
} catch (e) {
  // ignore if ioredis can't be initialized
  // eslint-disable-next-line no-console
  console.warn('Redis not initialized for rate-limit API', e)
}

const localMap = new Map<string, { count: number; expiresAt: number }>()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const key: string = body.key
    const limit: number = body.limit || 5
    const windowSeconds: number = body.windowSeconds || 15 * 60

    if (redisClient) {
      const redisKey = `rl:${key}`
      const count = await redisClient.incr(redisKey)
      if (count === 1) {
        await redisClient.expire(redisKey, windowSeconds)
      }
      if (count > limit) {
        const ttl = await redisClient.ttl(redisKey)
        const res = NextResponse.json({ allowed: false, remaining: 0 })
        res.headers.set('Retry-After', String(ttl ?? windowSeconds))
        return new Response('Rate limit exceeded', { status: 429, headers: { 'Retry-After': String(ttl ?? windowSeconds) } })
      }
      return NextResponse.json({ allowed: true, remaining: Math.max(0, limit - count) })
    }

    // In-memory fallback
    const now = Date.now()
    const entry = localMap.get(key)
    if (!entry || entry.expiresAt < now) {
      localMap.set(key, { count: 1, expiresAt: now + windowSeconds * 1000 })
      return NextResponse.json({ allowed: true, remaining: limit - 1 })
    }

    if (entry.count + 1 > limit) {
      const retryAfter = Math.ceil((entry.expiresAt - now) / 1000)
      return new Response('Rate limit exceeded', { status: 429, headers: { 'Retry-After': String(retryAfter) } })
    }

    entry.count += 1
    localMap.set(key, entry)
    return NextResponse.json({ allowed: true, remaining: Math.max(0, limit - entry.count) })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Rate-limit API error', err)
    return NextResponse.json({ allowed: true, remaining: 9999 })
  }
}

export const runtime = 'nodejs'
