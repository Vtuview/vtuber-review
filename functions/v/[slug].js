export async function onRequest(context) {
  try {
    const baseUrl = new URL(context.request.url);
    baseUrl.pathname = '/vtuber.html';

    let response = await context.env.ASSETS.fetch(
      new Request(baseUrl.toString(), { redirect: 'manual' })
    );

    if (response.status === 301 || response.status === 302 || response.status === 308) {
      const redirectUrl = response.headers.get('Location');
      if (redirectUrl) {
        const fullUrl = new URL(redirectUrl, baseUrl.origin);
        response = await context.env.ASSETS.fetch(fullUrl.toString());
      }
    }

    return new Response(response.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=0, must-revalidate',
      },
    });
  } catch (e) {
    return new Response('Error loading page: ' + e.message, { status: 500 });
  }
}
