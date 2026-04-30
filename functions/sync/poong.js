// GET /sync/poong?slug=aangdoxx
// 해당 slug의 풍투데이 현재월+이전월 데이터 가져와서 DB 업데이트

const SUPABASE_URL = 'https://nwebukcpkcqvtvddxpiz.supabase.co';

export async function onRequest(context) {
  const { request, env } = context;
  const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_KEY;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }

  // 인증 체크 (Supabase JWT)
  const auth = context.request.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

  const url = new URL(request.url);
  const slug = url.searchParams.get('slug');
  if (!slug) return json({ error: 'slug required' }, 400);

  const dbHeaders = {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal',
  };

  // DB에서 해당 버시 가져오기
  const vRes = await fetch(
    `${SUPABASE_URL}/rest/v1/vtubers?select=id,platforms,balloon_history,broadcast_history&slug=eq.${slug}`,
    { headers: dbHeaders }
  );
  const vtubers = await vRes.json();
  if (!vtubers.length) return json({ error: 'not found' }, 404);
  const v = vtubers[0];

  // 풍투데이 slug 추출
  const poongUrl = v.platforms?.etc;
  const poongMatch = poongUrl?.match(/poong\.today\/broadcast\/([^/?]+)/);
  if (!poongMatch) return json({ ok: true, skipped: 'no poong url' }, 200);
  const poongSlug = poongMatch[1];

  // 현재월 + 이전월
  const months = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  const balloonHistory = { ...(v.balloon_history || {}) };
  const broadcastHistory = { ...(v.broadcast_history || {}) };

  for (const ym of months) {
    const [year, month] = ym.split('-');
    try {
      const res = await fetch(
        `https://static.poong.today/bj/detail/get?id=${poongSlug}&year=${year}&month=${parseInt(month)}`,
        { headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Referer': 'https://www.poong.today/',
            'Origin': 'https://www.poong.today',
            'Accept': 'application/json, text/plain, */*',
          }}
      );
      if (res.ok) {
        const data = await res.json();
        balloonHistory[ym] = data.b ?? 0;
        const sec = (data.c || []).reduce((s, c) => s + (c.t || 0), 0);
        broadcastHistory[ym] = Math.round(sec / 3600 * 10) / 10;
      }
      // 실패 시 해당 달 skip — 기존 데이터 보존
    } catch (e) {
      // 풍투데이 장애 시 skip
    }
  }

  // DB 업데이트
  await fetch(
    `${SUPABASE_URL}/rest/v1/vtubers?id=eq.${v.id}`,
    {
      method: 'PATCH',
      headers: dbHeaders,
      body: JSON.stringify({ balloon_history: balloonHistory, broadcast_history: broadcastHistory }),
    }
  );

  return json({ ok: true, balloon_history: balloonHistory, broadcast_history: broadcastHistory }, 200);
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization',
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}
