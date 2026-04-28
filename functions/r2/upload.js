// R2 이미지 업로드 엔드포인트
// POST /r2/upload — multipart/form-data { file }

const R2_BUCKET = 'review-images';

export async function onRequest(context) {
  const { request, env } = context;
  const R2_PUBLIC_URL = env.R2_PUBLIC_URL;
  const CF_ACCOUNT_ID = env.CF_ACCOUNT_ID;
  const CF_API_TOKEN = env.CF_API_TOKEN;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const auth = request.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

  let formData;
  try { formData = await request.formData(); }
  catch { return json({ error: 'Invalid form data' }, 400); }

  const file = formData.get('file');
  if (!file || typeof file === 'string') return json({ error: 'No file' }, 400);
  if (file.size > 10 * 1024 * 1024) return json({ error: '10MB 초과' }, 400);

  const ext = file.name.split('.').pop().toLowerCase();
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/r2/buckets/${R2_BUCKET}/objects/${fileName}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${CF_API_TOKEN}`,
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: arrayBuffer,
    }
  );

  if (!res.ok) {
    const err = await res.text();
    return json({ error: 'R2 upload failed', detail: err }, 500);
  }

  return json({ url: `${R2_PUBLIC_URL}/${fileName}`, fileName }, 200);
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
