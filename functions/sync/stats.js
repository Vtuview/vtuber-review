// POST /sync/stats — SOOP 통계 동기화 (배치 처리)
// body: { slug: 'xxx' } 단일 또는 { offset: 0 } 배치

const SUPABASE_URL = 'https://nwebukcpkcqvtvddxpiz.supabase.co';
const BATCH_SIZE = 20;

export async function onRequest(context) {
  const { request, env } = context;
  const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_KEY;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!SUPABASE_SERVICE_KEY) return json({ error: 'SUPABASE_SERVICE_KEY not configured' }, 500);

  const auth = request.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

  let slug = null, offset = 0;
  try {
    const body = await request.json();
    slug = body.slug || null;
    offset = body.offset || 0;
  } catch {}

  const dbHeaders = {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal',
  };

  // 단일 slug 처리
  if (slug) {
    const result = await syncOne(slug, SUPABASE_SERVICE_KEY, dbHeaders);
    return json({ success: result ? 1 : 0, fail: result ? 0 : 1, total: 1 }, 200);
  }

  // 전체 배치 처리
  const listUrl = `${SUPABASE_URL}/rest/v1/vtubers?select=id,slug,name&slug=not.is.null&category=neq.소식&order=created_at.asc&offset=${offset}&limit=${BATCH_SIZE}`;
  const listRes = await fetch(listUrl, { headers: dbHeaders });
  if (!listRes.ok) return json({ error: 'DB fetch failed' }, 500);
  const vtubers = await listRes.json();

  let success = 0, fail = 0;
  for (const v of vtubers) {
    const ok = await syncOne(v.slug, SUPABASE_SERVICE_KEY, dbHeaders, v.id);
    if (ok) success++; else fail++;
  }

  // 다음 배치가 있으면 비동기로 트리거 (최대 50배치 = 1000개 제한으로 무한루프 방지)
  if (vtubers.length === BATCH_SIZE && offset < BATCH_SIZE * 50) {
    const nextUrl = new URL(request.url);
    context.waitUntil(
      fetch(nextUrl.toString(), {
        method: 'POST',
        headers: {
          'Authorization': auth,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ offset: offset + BATCH_SIZE }),
      })
    );
  }

  return json({
    success,
    fail,
    total: vtubers.length,
    offset,
    hasMore: vtubers.length === BATCH_SIZE,
  }, 200);
}

async function syncOne(slug, serviceKey, dbHeaders, id = null) {
  try {
    const apiRes = await fetch(
      `https://api-channel.sooplive.com/v1.1/channel/${slug}/dashboard`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (!apiRes.ok) return false;

    const data = await apiRes.json();
    const fans = data.upd?.fanCnt ?? null;
    const fanclub = data.fanclubCnt ?? null;
    const subscribers = data.subscription?.total ? parseInt(data.subscription.total) : null;
    const broadcastHours = data.station?.totalBroadTime ? Math.floor(data.station.totalBroadTime / 3600) : null;
    const lastBroadcast = data.station?.broadStart ? data.station.broadStart.split(' ')[0] : null;

    const query = id ? `id=eq.${id}` : `slug=eq.${slug}`;
    const patch = await fetch(
      `https://nwebukcpkcqvtvddxpiz.supabase.co/rest/v1/vtubers?${query}`,
      {
        method: 'PATCH',
        headers: dbHeaders,
        body: JSON.stringify({
          fans, fanclub, subscribers,
          broadcast_hours: broadcastHours,
          last_broadcast: lastBroadcast,
        }),
      }
    );
    return patch.ok;
  } catch { return false; }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}
