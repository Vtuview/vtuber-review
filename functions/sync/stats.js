// POST /sync/stats — 전체 또는 특정 slug 통계 동기화

const SUPABASE_URL = 'https://nwebukcpkcqvtvddxpiz.supabase.co';

export async function onRequest(context) {
  const { request, env } = context;
  const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_KEY;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!SUPABASE_SERVICE_KEY) return json({ error: 'SUPABASE_SERVICE_KEY not configured' }, 500);

  // 인증 확인
  const auth = request.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

  let targetSlug = null;
  try {
    const body = await request.json();
    targetSlug = body.slug || null;
  } catch {}

  const dbHeaders = {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal',
  };

  // slug 목록 가져오기
  let url = `${SUPABASE_URL}/rest/v1/vtubers?select=id,slug,name&slug=not.is.null&category=neq.예정&category=neq.소식`;
  if (targetSlug) url += `&slug=eq.${encodeURIComponent(targetSlug)}`;

  const listRes = await fetch(url, { headers: dbHeaders });
  if (!listRes.ok) return json({ error: 'DB fetch failed', status: listRes.status }, 500);
  const vtubers = await listRes.json();

  let success = 0, fail = 0;

  for (const v of vtubers) {
    try {
      const apiRes = await fetch(
        `https://api-channel.sooplive.com/v1.1/channel/${v.slug}/dashboard`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      );
      if (!apiRes.ok) { fail++; continue; }

      const data = await apiRes.json();
      const fans = data.upd?.fanCnt ?? null;
      const fanclub = data.fanclubCnt ?? null;
      const subscribers = data.subscription?.total ? parseInt(data.subscription.total) : null;
      const broadcastHours = data.station?.totalBroadTime ? Math.floor(data.station.totalBroadTime / 3600) : null;

      const patch = await fetch(
        `${SUPABASE_URL}/rest/v1/vtubers?id=eq.${v.id}`,
        {
          method: 'PATCH',
          headers: dbHeaders,
          body: JSON.stringify({ fans, fanclub, subscribers, broadcast_hours: broadcastHours }),
        }
      );

      if (patch.ok) success++; else fail++;
    } catch { fail++; }
  }

  return json({ success, fail, total: vtubers.length }, 200);
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
