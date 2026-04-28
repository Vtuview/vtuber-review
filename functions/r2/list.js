// R2 이미지 목록 조회
const R2_BUCKET = 'review-images';

export async function onRequest(context) {
  const { request, env } = context;
  const CF_ACCOUNT_ID = env.CF_ACCOUNT_ID;
  const CF_API_TOKEN = env.CF_API_TOKEN;
  const R2_PUBLIC_URL = env.R2_PUBLIC_URL;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }

  if (!CF_ACCOUNT_ID || !CF_API_TOKEN) {
    return json({ error: 'Missing env vars' }, 500);
  }

  // prefix 없이 전체 조회 + delimiter 제거
  const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/r2/buckets/${R2_BUCKET}/objects?limit=1000`;

  const res = await fetch(apiUrl, {
    headers: { 'Authorization': `Bearer ${CF_API_TOKEN}` }
  });

  if (!res.ok) {
    const body = await res.text();
    return json({ error: 'R2 list failed', status: res.status, body }, 500);
  }

  const data = await res.json();
  
  // review-images/ 프리픽스 제거해서 실제 파일명만 추출
  const objects = (data.result?.objects || []).map(obj => {
    const name = obj.key.replace(/^review-images\//, '');
    return {
      name,
      url: `${R2_PUBLIC_URL}/${name}`,
      size: obj.size,
      uploaded: obj.uploaded,
    };
  }).filter(obj => obj.name);

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
