// Supabase REST API 프록시 + Cloudflare 캐시
// GET 요청만 캐싱, POST/PATCH/PUT/DELETE는 Supabase로 직접 전달

const SUPABASE_URL = 'https://nwebukcpkcqvtvddxpiz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_KD9aq6S7pQHDm2BEkhC4UA_FRgg7cKh';

// 테이블별 캐시 시간 (초)
const CACHE_TTL = {
  'vtubers': 86400,        // 24시간
  'visitor_ratings': 600,  // 10분
};
const DEFAULT_TTL = 3600;

export async function onRequest(context) {
  const { request, params } = context;
  const path = params.path?.join('/') || '';

  if (!path) {
    return new Response('No API path', { status: 400 });
  }

  const url = new URL(request.url);
  const supabaseTarget = `${SUPABASE_URL}/rest/v1/${path}${url.search}`;

  // 쓰기 요청: Supabase로 직접 전달 + 캐시 퍼지
  if (request.method !== 'GET') {
    const body = await request.text();
    const resp = await fetch(supabaseTarget, {
      method: request.method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${request.headers.get('Authorization')?.replace('Bearer ', '') || SUPABASE_ANON_KEY}`,
        'Prefer': request.headers.get('Prefer') || '',
      },
      body: body || undefined,
    });

    // 쓰기 성공 시 관련 캐시 전부 퍼지
    if (resp.ok) {
      const table = path.split('?')[0].split('/')[0];
      const cache = caches.default;

      // 갤러리 목록 캐시 삭제
      const keysToDelete = [
        `${SUPABASE_URL}/rest/v1/${table}?select=*&order=created_at.desc`,
        `${SUPABASE_URL}/rest/v1/${table}?select=*`,
      ];

      // slug 기반 개별 캐시도 삭제 (URL 쿼리에서 slug 추출)
      const slugMatch = url.search.match(/slug=eq\.([^&]+)/);
      if (slugMatch) {
        keysToDelete.push(`${SUPABASE_URL}/rest/v1/${table}?select=*&slug=eq.${slugMatch[1]}`);
      }

      context.waitUntil(
        Promise.all(keysToDelete.map(key => cache.delete(new Request(key))))
      );
    }

    const headers = new Headers(resp.headers);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.delete('set-cookie');

    return new Response(resp.body, { status: resp.status, headers });
  }

  // GET 요청: Cloudflare 캐시 확인
  const cacheKey = new Request(supabaseTarget);
  const cache = caches.default;
  let cached = await cache.match(cacheKey);

  if (cached) {
    const headers = new Headers(cached.headers);
    headers.set('X-Cache', 'HIT');
    return new Response(cached.body, { status: cached.status, headers });
  }

  // 캐시 미스: Supabase에서 가져오기
  // Pragma + Cache-Control 으로 Supabase CDN 완전 우회
  const resp = await fetch(supabaseTarget, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Accept': 'application/json',
      'Cache-Control': 'no-cache, no-store',
      'Pragma': 'no-cache',
      'Prefer': request.headers.get('Prefer') || '',
    },
    cache: 'no-store',
  });

  if (!resp.ok) {
    return new Response(resp.body, {
      status: resp.status,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const table = path.split('?')[0].split('/')[0];
  const ttl = CACHE_TTL[table] || DEFAULT_TTL;

  const headers = new Headers();
  headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.set('Cache-Control', `public, max-age=${ttl}, s-maxage=${ttl}`);
  headers.set('CDN-Cache-Control', `max-age=${ttl}`);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('X-Cache', 'MISS');

  const bodyText = await resp.text();
  const cachedResponse = new Response(bodyText, { status: 200, headers });

  context.waitUntil(cache.put(cacheKey, cachedResponse.clone()));

  return cachedResponse;
}
