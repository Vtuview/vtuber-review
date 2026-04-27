// Supabase REST API 프록시 + Cloudflare 캐시
// GET 요청만 캐싱, POST/PATCH/PUT/DELETE는 Supabase로 직접 전달

const SUPABASE_URL = 'https://nwebukcpkcqvtvddxpiz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_KD9aq6S7pQHDm2BEkhC4UA_FRgg7cKh';

// 테이블별 캐시 시간 (초)
const CACHE_TTL = {
  'vtubers': 300,        // 5분 — 자주 안 바뀜
  'visitor_ratings': 60, // 1분 — 댓글은 좀 더 자주 갱신
};
const DEFAULT_TTL = 120; // 기본 2분

export async function onRequest(context) {
  const { request, params } = context;
  const path = params.path?.join('/') || '';

  if (!path) {
    return new Response('No API path', { status: 400 });
  }

  // 원본 Supabase URL 조합
  const url = new URL(request.url);
  const supabaseTarget = `${SUPABASE_URL}/rest/v1/${path}${url.search}`;

  // 쓰기 요청은 캐시 없이 Supabase로 직접 전달
  if (request.method !== 'GET') {
    const body = await request.text();
    const resp = await fetch(supabaseTarget, {
      method: request.method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': request.headers.get('Prefer') || '',
      },
      body: body || undefined,
    });

    // 쓰기 성공 시 해당 테이블 캐시 퍼지
    if (resp.ok) {
      const table = path.split('?')[0];
      const cache = caches.default;
      // 정확한 키 매칭은 어려우므로 다음 GET에서 자연 만료되도록 TTL을 짧게 유지
    }

    const headers = new Headers(resp.headers);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.delete('set-cookie');

    return new Response(resp.body, {
      status: resp.status,
      headers,
    });
  }

  // === GET 요청: 캐시 확인 ===
  const cacheKey = new Request(supabaseTarget);
  const cache = caches.default;
  let cached = await cache.match(cacheKey);

  if (cached) {
    // 캐시 히트 — Supabase egress 0
    const headers = new Headers(cached.headers);
    headers.set('X-Cache', 'HIT');
    return new Response(cached.body, {
      status: cached.status,
      headers,
    });
  }

  // === 캐시 미스: Supabase에서 가져오기 ===
  const resp = await fetch(supabaseTarget, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Accept': 'application/json',
      'Prefer': request.headers.get('Prefer') || '',
    },
  });

  if (!resp.ok) {
    return new Response(resp.body, {
      status: resp.status,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  // 테이블명 추출해서 TTL 결정
  const table = path.split('?')[0].split('/')[0];
  const ttl = CACHE_TTL[table] || DEFAULT_TTL;

  const headers = new Headers();
  headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.set('Cache-Control', `public, max-age=${ttl}, s-maxage=${ttl}`);
  headers.set('CDN-Cache-Control', `max-age=${ttl}`);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('X-Cache', 'MISS');

  const body = await resp.text();
  const cachedResponse = new Response(body, {
    status: 200,
    headers,
  });

  // 캐시에 저장
  context.waitUntil(cache.put(cacheKey, cachedResponse.clone()));

  return cachedResponse;
}
