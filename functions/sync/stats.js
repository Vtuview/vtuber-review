// POST /sync/stats — 전체 또는 특정 slug 통계 동기화
// body: { slug: 'apple100l' } 또는 {} (전체)

const SUPABASE_URL = 'https://nwebukcpkcqvtvddxpiz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_KD9aq6S7pQHDm2BEkhC4UA_FRgg7cKh';

export async function onRequest(context) {
  const { request, env } = context;
  const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_KEY;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  // 인증 확인 (Supabase JWT)
  const auth = request.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

  let targetSlug = null;
  try {
    const body = await request.json();
    targetSlug = body.slug || null;
  } catch {}

  // DB에서 slug 목록 가져오기
  const headers = {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
  };

  let url = `${SUPABASE_URL}/rest/v1/vtubers?select=id,slug,name&category=neq.예정&category=neq.소식&slug=not.is.null`;
  if (targetSlug) url += `&slug=eq.${targetSlug}`;

  const res = await fetch(url, { headers });
  const vtubers = await res.json();

  let success = 0, fail = 0;
  const results = [];

  for (const v of vtubers) {
    try {
      const apiRes = await fetch(
        `https://api-channel.sooplive.com/v1.1/channel/${v.slug}/dashboard`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      );

      if (!apiRes.ok) { fail++; results.push({ name: v.name, ok: false }); continue; }

      const data = await apiRes.json();
      const fans = data.upd?.fanCnt ?? null;
      const fanclub = data.fanclubCnt ?? null;
      const subscribers = data.subscription?.total ? parseInt(data.subscription.total) : null;
      const broadcastHours = data.station?.totalBroadTime ? Math.floor(data.station.totalBroadTime / 3600) : null;

      const patch = await fetch(
        `${SUPABASE_URL}/rest/v1/vtubers?id=eq.${v.id}`,
        {
          method: 'PATCH',
          headers: { ...headers, 'Prefer': 'return=minimal' },
          body: JSON.stringify({ fans, fanclub, subscribers, broadcast_hours: broadcastHours }),
        }
      );

      if (patch.ok) { success++; results.push({ name: v.name, ok: true, fans, fanclub, subscribers, broadcastHours }); }
      else { fail++; results.push({ name: v.name, ok: false }); }

    } catch (e) {
      fail++;
      results.push({ name: v.name, ok: false, error: e.message });
    }
  }

  return json({ success, fail, results }, 200);
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
