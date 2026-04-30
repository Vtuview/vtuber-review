// 캐시 퍼지 엔드포인트
// POST /api/purge?table=vtubers

const SUPABASE_URL = 'https://nwebukcpkcqvtvddxpiz.supabase.co';

export async function onRequest(context) {
  const auth = context.request.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const url = new URL(context.request.url);
  const table = url.searchParams.get('table') || 'vtubers';
  const slug = url.searchParams.get('slug') || null;

  const allowed = ['vtubers', 'visitor_ratings', 'messages'];
  if (!allowed.includes(table)) {
    return new Response(JSON.stringify({ error: 'invalid table' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const cache = caches.default;

  // 퍼지할 캐시 키 목록
  const keys = [
    `${SUPABASE_URL}/rest/v1/${table}?select=*&order=created_at.desc`,
    `${SUPABASE_URL}/rest/v1/${table}?select=*`,
  ];

  // slug 지정된 경우 해당 항목 캐시도 삭제
  if (slug) {
    keys.push(`${SUPABASE_URL}/rest/v1/${table}?select=*&slug=eq.${encodeURIComponent(slug)}`);
  }

  let purged = 0;
  for (const key of keys) {
    const deleted = await cache.delete(new Request(key));
    if (deleted) purged++;
  }

  return new Response(JSON.stringify({ ok: true, purged }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
