// R2 이미지 삭제
// DELETE /r2/delete?name=filename.jpg

const R2_BUCKET = 'review-images';

export async function onRequest(context) {
  const { request, env } = context;
  const CF_ACCOUNT_ID = env.CF_ACCOUNT_ID;
  const CF_API_TOKEN = env.CF_API_TOKEN;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }
  if (request.method !== 'DELETE') return json({ error: 'Method not allowed' }, 405);

  const auth = request.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

  const url = new URL(request.url);
  const name = url.searchParams.get('name');
  if (!name) return json({ error: 'name required' }, 400);

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/r2/buckets/${R2_BUCKET}/objects/${name}`,
    {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${CF_API_TOKEN}` },
    }
  );

  if (!res.ok) return json({ error: 'R2 delete failed' }, 500);
  return json({ ok: true }, 200);
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization',
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}
