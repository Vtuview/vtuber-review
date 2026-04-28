// R2 퍼블릭 버킷에서 이미지 서빙

export async function onRequest(context) {
  const { params, env } = context;
  const R2_PUBLIC_URL = env.R2_PUBLIC_URL;
  const path = params.path?.join('/') || '';

  if (!path) return new Response('No image path', { status: 400 });

  const r2Url = `${R2_PUBLIC_URL}/${path}`;
  const cacheKey = new Request(r2Url);
  const cache = caches.default;
  let response = await cache.match(cacheKey);

  if (response) {
    const headers = new Headers(response.headers);
    headers.set('X-Cache', 'HIT');
    return new Response(response.body, { status: response.status, headers });
  }

  response = await fetch(r2Url);
  if (!response.ok) return new Response('Image not found', { status: 404 });

  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'public, max-age=2592000, s-maxage=2592000');
  headers.set('CDN-Cache-Control', 'max-age=2592000');
  headers.set('Access-Control-Allow-Origin', '*');
  headers.delete('set-cookie');

  const cachedResponse = new Response(response.body, { status: 200, headers });
  context.waitUntil(cache.put(cacheKey, cachedResponse.clone()));
  return cachedResponse;
}
