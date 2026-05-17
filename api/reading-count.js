// 누적 리딩 수 — Upstash Redis 카운터 + 베이스 100
// 환경변수 없으면(아직 KV 미연결) 베이스만 반환 (실패 안 함)

import { Redis } from '@upstash/redis';

const BASE = 100;
const KEY  = 'reading_count';

const redis = (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  ? Redis.fromEnv()
  : null;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=30');  // 30초 캐시로 부하 절감
  if (!redis) {
    return res.status(200).json({ count: BASE, source: 'base-only' });
  }
  try {
    const n = await redis.get(KEY);
    const count = BASE + (Number(n) || 0);
    return res.status(200).json({ count });
  } catch (e) {
    console.error('reading-count failed:', e.message);
    return res.status(200).json({ count: BASE, source: 'fallback' });
  }
}
