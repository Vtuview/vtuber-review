// POST /sync/trigger — GitHub Actions workflow_dispatch 트리거

export async function onRequest(context) {
  const { request, env } = context;
  const GITHUB_TOKEN = env.GITHUB_TOKEN;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const auth = request.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
  if (!GITHUB_TOKEN) return json({ error: 'GITHUB_TOKEN not configured' }, 500);

  const res = await fetch(
    'https://api.github.com/repos/Vtuview/vtuber-review/actions/workflows/sync-soop-stats.yml/dispatches',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref: 'main' }),
    }
  );

  if (res.ok || res.status === 204) {
    return json({ ok: true, message: '동기화 시작됨 (약 1-2분 소요)' }, 200);
  }
  const err = await res.text();
  return json({ error: 'GitHub trigger failed', detail: err }, 500);
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
