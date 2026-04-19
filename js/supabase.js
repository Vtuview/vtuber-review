// ===== Supabase 클라이언트 초기화 =====
// Supabase 프로젝트 생성 후 아래 두 값을 본인 것으로 교체하세요
// Project Settings > API 에서 확인 가능


const SUPABASE_URL = 'https://nwebukcpkcqvtvddxpiz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_KD9aq6S7pQHDm2BEkhC4UA_FRgg7cKh';


// CDN 방식으로 Supabase 로드 (HTML에서 <script>로 먼저 로드)
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 방문자 지문 생성 (별점 중복 방지용, 간단한 브라우저 기반)
function getVisitorFingerprint() {
  let fp = localStorage.getItem('visitor_fp');
  if (!fp) {
    fp = crypto.randomUUID();
    localStorage.setItem('visitor_fp', fp);
  }
  return fp;
}

// 이미지 프록시 URL 변환
// Supabase Storage URL → Cloudflare 프록시 경유
function proxyImageUrl(url) {
  if (!url) return url;
  const match = url.match(/\/storage\/v1\/object\/public\/review-images\/(.+)/);
  if (match) {
    return '/img/' + match[1];
  }
  return url;
}