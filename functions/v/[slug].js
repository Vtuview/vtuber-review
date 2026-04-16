// /v/슬러그 접근 시 vtuber.html을 서빙
// detail.js가 URL pathname에서 슬러그를 직접 파싱함

export async function onRequest(context) {
  const url = new URL(context.request.url);
  // vtuber.html의 내용을 가져와서 응답
  url.pathname = '/vtuber.html';
  const response = await context.env.ASSETS.fetch(new Request(url, context.request));
  // 원본 응답의 헤더를 유지하면서 반환
  return new Response(response.body, {
    status: 200,
    headers: response.headers,
  });
}
