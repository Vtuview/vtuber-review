// 캐시 퍼지 엔드포인트
// POST /api/purge?table=vtubers → 해당 테이블 캐시 삭제

const SUPABASE_URL = 'https://nwebukcpkcqvtvddxpiz.supabase.co';

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const table = url.searchParams.get('table') || 'vtubers';

  // 허용된 테이블만
  const allowed = ['vtubers', 'visitor_ratings', 'messages'];
  if (!allowed.includes(table)) {
    return new Response(JSON.stringify({ error: 'invalid table' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const cache = caches.default;

  // 갤러리 목록 캐시 삭제 (가장 자주 쓰이는 쿼리)
  const commonKeys = [
    `${SUPABASE_URL}/rest/v1/${table}?select=*&order=created_at.desc`,
    `${SUPABASE_URL}/rest/v1/${table}?select=*`,
  ];

  let purged = 0;
  for (const key of commonKeys) {
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
