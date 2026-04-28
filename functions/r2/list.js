const R2_BUCKET = 'review-images';

export async function onRequest(context) {
  const { request, env } = context;
  const CF_ACCOUNT_ID = env.CF_ACCOUNT_ID;
  const CF_API_TOKEN = env.CF_API_TOKEN;
  const R2_PUBLIC_URL = env.R2_PUBLIC_URL;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }

  // Cloudflare 캐시 확인 (5분)
  const cacheKey = new Request('https://r2-list-cache.internal/list');
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const allObjects = [];
  let cursor = null;

  while (true) {
    const url = new URL(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/r2/buckets/${R2_BUCKET}/objects`);
    url.searchParams.set('per_page', '1000');
    if (cursor) url.searchParams.set('cursor', cursor);

    const res = await fetch(url.toString(), {
      headers: { 'Authorization': `Bearer ${CF_API_TOKEN}` }
    });

    if (!res.ok) {
      const body = await res.text();
      return json({ error: 'R2 list failed', status: res.status, body }, 500);
    }

    const data = await res.json();
    allObjects.push(...(data.result || []));
    if (!data.result_info?.is_truncated) break;
    cursor = data.result_info.cursor;
  }

  const mapped = allObjects.map(obj => ({
    name: obj.key,
    url: `${R2_PUBLIC_URL}/${obj.key}`,
    size: obj.size,
    uploaded: obj.last_modified,
  }));
  mapped.sort((a, b) => new Date(b.uploaded) - new Date(a.uploaded));

  const response = json(mapped, 200, { 'Cache-Control': 'public, max-age=300, s-maxage=300' });
  context.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization',
  };
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(), ...extraHeaders },
  });
}
