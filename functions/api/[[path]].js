// Supabase REST API 프록시
// Worker 내부 캐시 사용 안 함 — Cloudflare CDN 캐시에 위임
// Purge Everything으로 확실하게 퍼지 가능

const SUPABASE_URL = 'https://nwebukcpkcqvtvddxpiz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_KD9aq6S7pQHDm2BEkhC4UA_FRgg7cKh';

const CACHE_TTL = {
  'vtubers': 300,         // 5분
  'visitor_ratings': 60,  // 1분
};
const DEFAULT_TTL = 300;

export async function onRequest(context) {
  const { request, params } = context;
  const path = params.path?.join('/') || '';

  if (!path) return new Response('No API path', { status: 400 });

  const url = new URL(request.url);
  const supabaseTarget = `${SUPABASE_URL}/rest/v1/${path}${url.search}`;

  // 쓰기 요청: Supabase로 직접 전달
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

    const headers = new Headers(resp.headers);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.delete('set-cookie');
    return new Response(resp.body, { status: resp.status, headers });
  }

  // GET 요청: Supabase에서 가져와서 Cloudflare CDN이 캐시하도록 응답
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
  const body = await resp.text();

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
