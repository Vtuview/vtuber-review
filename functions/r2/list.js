// R2 이미지 목록 조회
// GET /r2/list

const R2_BUCKET = 'review-images';

export async function onRequest(context) {
  const { request, env } = context;
  const CF_ACCOUNT_ID = env.CF_ACCOUNT_ID;
  const CF_API_TOKEN = env.CF_API_TOKEN;
  const R2_PUBLIC_URL = env.R2_PUBLIC_URL;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/r2/buckets/${R2_BUCKET}/objects?limit=1000`,
    { headers: { 'Authorization': `Bearer ${CF_API_TOKEN}` } }
  );

  if (!res.ok) return json({ error: 'R2 list failed' }, 500);

  const data = await res.json();
  const objects = (data.result?.objects || []).map(obj => ({
    name: obj.key,
    url: `${R2_PUBLIC_URL}/${obj.key}`,
    size: obj.size,
    uploaded: obj.uploaded,
  }));
  objects.sort((a, b) => new Date(b.uploaded) - new Date(a.uploaded));

  return json(objects, 200);
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
