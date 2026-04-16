export async function onRequest(context) {
  // /v/슬러그 접근 시 vtuber.html 내용을 그대로 서빙
  // URL은 /v/슬러그로 유지됨 (detail.js가 pathname에서 슬러그 파싱)
  try {
    const asset = await context.env.ASSETS.fetch(
      new URL('/vtuber.html', context.request.url)
    );
    
    return new Response(asset.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=0, must-revalidate',
      },
    });
  } catch (e) {
    return new Response('Error: ' + e.message, { status: 500 });
  }
}
