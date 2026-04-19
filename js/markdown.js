// ===== 마크다운 → HTML 렌더링 =====
// marked.js + DOMPurify 사용
// YouTube / Twitch / SOOP URL 자동 임베드 + iframe 직접 붙여넣기 지원

marked.setOptions({
  gfm: true,
  breaks: true,
  headerIds: true,
  mangle: false,
});

// ---------- 커스텀 임베드 래퍼 생성 ----------
function embedBox(src, extraAllow = '') {
  const allow = 'clipboard-write; web-share; autoplay; encrypted-media; picture-in-picture' + (extraAllow ? '; ' + extraAllow : '');
  return `<div class="embed-wrap"><iframe src="${src}" allow="${allow}" allowfullscreen loading="lazy" frameborder="0"></iframe></div>`;
}

// ---------- URL → iframe 자동 변환 ----------
function autoEmbed(html) {
  // 1) YouTube: watch?v= 또는 youtu.be
  html = html.replace(
    /<p><a href="(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)[^"]*)"[^>]*>[^<]*<\/a><\/p>/g,
    (_, url, id) => embedBox(`https://www.youtube.com/embed/${id}`)
  );

  // 2) Twitch clips
  html = html.replace(
    /<p><a href="(https?:\/\/clips\.twitch\.tv\/([\w-]+))"[^>]*>[^<]*<\/a><\/p>/g,
    (_, url, id) => embedBox(`https://clips.twitch.tv/embed?clip=${id}&parent=${location.hostname}&autoplay=false`)
  );

  // 3) SOOP VOD 플레이어 (vod.sooplive.com/player/숫자ID)
  html = html.replace(
    /<p><a href="(https?:\/\/vod\.sooplive\.com\/player\/(\d+)(?:\/embed)?[^"]*)"[^>]*>[^<]*<\/a><\/p>/g,
    (_, url, id) => embedBox(`https://vod.sooplive.com/player/${id}/embed?showChat=false&autoPlay=false&mutePlay=true`)
  );

  // 4) SOOP 클립/VOD 공유 링크 (vod.sooplive.com/player/숫자ID 형식은 위에서 처리됨)
  //    구형 afreecatv.com 도메인 호환
  html = html.replace(
    /<p><a href="(https?:\/\/vod\.afreecatv\.com\/player\/(\d+)[^"]*)"[^>]*>[^<]*<\/a><\/p>/g,
    (_, url, id) => embedBox(`https://vod.sooplive.com/player/${id}/embed?showChat=false&autoPlay=false&mutePlay=true`)
  );

  // 5) 커스텀 문법 ::soop[id] / ::youtube[id] / ::twitch[id]
  //    줄 단위로 처리되도록 <p>::soop[...]</p> 형태를 감지
  html = html.replace(/<p>::soop\[(\d+)\]<\/p>/g, (_, id) =>
    embedBox(`https://vod.sooplive.com/player/${id}/embed?showChat=false&autoPlay=false&mutePlay=true`)
  );
  html = html.replace(/<p>::youtube\[([\w-]+)\]<\/p>/g, (_, id) =>
    embedBox(`https://www.youtube.com/embed/${id}`)
  );
  html = html.replace(/<p>::twitch\[([\w-]+)\]<\/p>/g, (_, id) =>
    embedBox(`https://clips.twitch.tv/embed?clip=${id}&parent=${location.hostname}&autoplay=false`)
  );

  return html;
}

// ---------- 렌더링 파이프라인 ----------
function renderMarkdown(md) {
  if (!md) return '';
  let html = marked.parse(md);
    // Supabase 이미지 URL을 프록시 경유로 변환
  html = html.replace(
    /https:\/\/nwebukcpkcqvtvddxpiz\.supabase\.co\/storage\/v1\/object\/public\/review-images\//g,
    '/img/'
  );
  html = autoEmbed(html);

  // DOMPurify로 XSS 방지. iframe은 신뢰 도메인만 허용.
  html = DOMPurify.sanitize(html, {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'loading'],
  });

  // 추가: iframe src 화이트리스트 필터 (DOMPurify 통과 후 2차 검증)
  html = filterIframes(html);

  return html;
}

// ---------- iframe src 도메인 화이트리스트 ----------
const ALLOWED_IFRAME_HOSTS = [
  'youtube.com',
  'www.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
  'clips.twitch.tv',
  'player.twitch.tv',
  'vod.sooplive.com',
  'play.sooplive.com',
  'sooplive.com',
  'vod.afreecatv.com',
  'play.afreecatv.com',
];

function filterIframes(html) {
  // DOM 파서로 안전하게 처리
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  doc.querySelectorAll('iframe').forEach(iframe => {
    const src = iframe.getAttribute('src') || '';
    try {
      const url = new URL(src, location.origin);
      if (!ALLOWED_IFRAME_HOSTS.includes(url.hostname)) {
        // 허용되지 않은 도메인은 제거
        iframe.replaceWith(
          Object.assign(doc.createElement('div'), {
            className: 'empty-state',
            textContent: `⚠ 허용되지 않은 임베드 도메인: ${url.hostname}`
          })
        );
      } else {
        // iframe을 embed-wrap으로 감싸기 (이미 감싸져 있지 않으면)
        if (!iframe.parentElement?.classList.contains('embed-wrap')) {
          const wrap = doc.createElement('div');
          wrap.className = 'embed-wrap';
          iframe.replaceWith(wrap);
          wrap.appendChild(iframe);
          // width/height 제거 (반응형 처리 위임)
          iframe.removeAttribute('width');
          iframe.removeAttribute('height');
        }
      }
    } catch (e) {
      iframe.remove();
    }
  });
  return doc.body.firstChild.innerHTML;
}

// ---------- 이미지 라이트박스 ----------
function attachImageLightbox(container) {
  const lightbox = document.getElementById('lightbox');
  const lbImg = document.getElementById('lightboxImg');
  if (!lightbox || !lbImg) return;

  container.querySelectorAll('img').forEach(img => {
    img.addEventListener('click', (e) => {
      e.preventDefault();
      lbImg.src = img.src;
      lightbox.classList.add('active');
    });
  });
}
