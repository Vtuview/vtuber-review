export async function onRequest(context) {
  const { params } = context;
  const path = params.path?.join('/') || '';

  if (!path) {
    return new Response('No image path', { status: 400 });
  }

  // Supabase Storage URL 조합
  const supabaseUrl = 'https://nwebukcpkcqvtvddxpiz.supabase.co/storage/v1/object/public/review-images/' + path;

  // Cloudflare 캐시 확인
  const cacheKey = new Request(supabaseUrl);
  const cache = caches.default;
  let response = await cache.match(cacheKey);

  if (response) {
    // 캐시 히트 - Supabase 안 건드림
    return response;
  }

  // 캐시 미스 - Supabase에서 가져오기
  response = await fetch(supabaseUrl, {
    headers: { 'Accept': 'image/*' },
  });

  if (!response.ok) {
    return new Response('Image not found', { status: 404 });
  }

  // 응답 복제해서 캐시에 저장 (30일)
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'public, max-age=2592000, s-maxage=2592000');
  headers.set('CDN-Cache-Control', 'max-age=2592000');
  headers.delete('set-cookie');

  const cachedResponse = new Response(response.body, {
    status: 200,
    headers: headers,
  });

  // 캐시에 저장 (비동기, 응답 차단 안 함)
  context.waitUntil(cache.put(cacheKey, cachedResponse.clone()));

  return cachedResponse;
}