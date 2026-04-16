// ===== 상세 페이지 =====

// 슬러그 추출: 두 가지 경로 모두 지원
// 1. /vtuber.html?slug=xxx  (기존 방식)
// 2. /v/xxx                  (Cloudflare Functions 또는 Netlify 리라이트)
function getSlug() {
  console.log('[getSlug] pathname:', location.pathname);
  console.log('[getSlug] search:', location.search);
  console.log('[getSlug] href:', location.href);

  const params = new URLSearchParams(location.search);
  const fromQuery = params.get('slug');
  if (fromQuery) {
    console.log('[getSlug] from query:', fromQuery);
    return fromQuery;
  }

  // /v/슬러그 형태 직접 파싱
  const match = location.pathname.match(/\/v\/([^/?#]+)/);
  if (match) {
    console.log('[getSlug] from pathname:', match[1]);
    return decodeURIComponent(match[1]);
  }

  console.log('[getSlug] no slug found');
  return null;
}

const vtuberSlug = getSlug();
const vtuberIdParam = new URLSearchParams(location.search).get('id');

let currentVtuberId = null;
let selectedRating = 0;

async function loadDetail() {
  console.log('[detail] slug:', vtuberSlug, 'id:', vtuberIdParam);

  // 둘 다 없으면 에러 표시 (디버깅용 - 바로 리다이렉트하지 않음)
  if (!vtuberSlug && !vtuberIdParam) {
    console.error('[detail] 슬러그/ID 둘 다 없음. pathname:', location.pathname);
    document.getElementById('detail').innerHTML =
      `<div class="empty-state">
        [DEBUG] 슬러그 파싱 실패<br>
        pathname: ${location.pathname}<br>
        search: ${location.search}<br>
        href: ${location.href}<br><br>
        <a href="/" style="color:var(--accent);">← 메인으로</a>
      </div>`;
    return;
  }

  // slug 우선, 없으면 id로 조회
  let query = db.from('vtubers').select('*');
  if (vtuberSlug) {
    query = query.eq('slug', vtuberSlug);
  } else {
    query = query.eq('id', vtuberIdParam);
  }

  const { data: v, error } = await query.maybeSingle();

  if (error) {
    console.error('[detail] DB error:', error);
    document.getElementById('detail').innerHTML =
      `<div class="empty-state">데이터 조회 오류: ${error.message}<br><br><a href="/" style="color:var(--accent);">← 메인으로</a></div>`;
    return;
  }

  if (!v) {
    document.getElementById('detail').innerHTML =
      `<div class="empty-state">
        슬러그 "${vtuberSlug || vtuberIdParam}" 에 해당하는 버튜버를 찾을 수 없습니다.
        <br><br>
        <a href="/" style="color:var(--accent);">← 메인으로</a>
      </div>`;
    return;
  }

  currentVtuberId = v.id;
  renderDetail(v);
  loadReviews();
}

function renderDetail(v) {
  const stars = Array.from({ length: 5 }, (_, i) =>
    i < Math.round(v.my_rating || 0) ? '★' : '<span class="empty">★</span>'
  ).join('');

  const platforms = v.platforms || {};
  // SOOP를 항상 맨 앞으로 정렬, 라벨 한글화
  const platformLabels = {
    soop: '방송국 바로가기',
    etc: '기타 링크',
    youtube: 'YOUTUBE',
    twitch: 'TWITCH',
  };
  const platformOrder = ['soop', 'etc', 'youtube', 'twitch'];
  const platformLinks = platformOrder
    .filter(key => platforms[key])
    .map(key => {
      const url = platforms[key];
      const label = platformLabels[key] || key.toUpperCase();
      const cls = key === 'soop' ? 'platform-link soop' : 'platform-link';
      return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener" class="${cls}">${label}</a>`;
    }).join('');

  const tags = (v.tags || []).map(t =>
    `<span class="card-tag">${escapeHtml(t)}</span>`
  ).join(' ');

  // 리뷰 마크다운 렌더링
  const reviewHTML = renderMarkdown(v.my_review);

  document.getElementById('detail').innerHTML = `
    <div class="detail-hero">
      <div class="detail-thumb">
        <img src="${escapeHtml(v.thumbnail_url || '')}" alt="${escapeHtml(v.name)}"
             onerror="this.style.display='none'">
      </div>
      <div>
        <h1 class="detail-name">${escapeHtml(v.name)}</h1>
        <div class="card-rating" style="border: none; padding: 0; margin-bottom: 1.5rem;">
          <span class="stars">${stars}</span>
          <span class="rating-num">${(v.my_rating || 0).toFixed(1)} / 5.0</span>
          <span class="rating-count">본인 평점</span>
        </div>
        <div class="card-tags">${tags}</div>
        <div class="detail-meta">
          ${v.debut_date ? `<div class="detail-meta-item"><span>DEBUT</span>${v.debut_date}</div>` : ''}
        </div>
        ${platformLinks ? `<div class="platform-links">${platformLinks}</div>` : ''}
      </div>
    </div>

    ${reviewHTML ? `
      <h2 class="section-title">리뷰</h2>
      <div class="md-content" id="reviewContent">${reviewHTML}</div>
    ` : ''}

    <h2 class="section-title">방문자 별점</h2>
    <div class="rating-form">
      <div>당신의 평점을 남겨주세요</div>
      <div class="star-input" id="starInput">
        ${[1,2,3,4,5].map(n => `<button data-value="${n}">★</button>`).join('')}
      </div>
      <textarea id="commentInput" placeholder="코멘트 (선택)"></textarea>
      <button class="btn" id="submitRating">SUBMIT</button>
      <div id="ratingMsg" style="margin-top:1rem; font-family: var(--font-mono); font-size: 0.8rem;"></div>
    </div>

    <div class="review-list" id="reviewList"></div>
  `;

  // 이미지 라이트박스
  const reviewContent = document.getElementById('reviewContent');
  if (reviewContent) attachImageLightbox(reviewContent);

  // 별 입력
  const starBtns = document.querySelectorAll('#starInput button');
  starBtns.forEach(b => {
    b.addEventListener('click', () => {
      selectedRating = parseInt(b.dataset.value);
      starBtns.forEach((x, i) => x.classList.toggle('active', i < selectedRating));
    });
  });

  document.getElementById('submitRating').addEventListener('click', submitRating);
}

async function submitRating() {
  const msg = document.getElementById('ratingMsg');
  if (!selectedRating) {
    msg.textContent = '별점을 선택해주세요.';
    msg.style.color = 'var(--accent)';
    return;
  }

  const fp = getVisitorFingerprint();
  const comment = document.getElementById('commentInput').value.trim();

  const { error } = await db.from('visitor_ratings').upsert({
    vtuber_id: currentVtuberId,
    rating: selectedRating,
    comment: comment || null,
    visitor_fingerprint: fp
  }, { onConflict: 'vtuber_id,visitor_fingerprint' });

  if (error) {
    msg.textContent = '등록 실패: ' + error.message;
    msg.style.color = 'var(--accent)';
  } else {
    msg.textContent = '평점이 등록되었습니다. 감사합니다!';
    msg.style.color = 'var(--accent-2)';
    document.getElementById('commentInput').value = '';
    loadReviews();
  }
}

async function loadReviews() {
  const { data: reviews } = await db
    .from('visitor_ratings')
    .select('*')
    .eq('vtuber_id', currentVtuberId)
    .order('created_at', { ascending: false })
    .limit(50);

  const list = document.getElementById('reviewList');
  if (!list) return;

  if (!reviews || reviews.length === 0) {
    list.innerHTML = '<div class="empty-state">아직 방문자 평점이 없습니다.</div>';
    return;
  }

  list.innerHTML = reviews.map(r => {
    const stars = Array.from({length:5}, (_,i) =>
      i < r.rating ? '★' : '<span class="empty">★</span>'
    ).join('');
    const date = new Date(r.created_at).toLocaleDateString('ko-KR');
    return `
      <div class="review-item">
        <div class="review-item-head">
          <span class="stars">${stars}</span>
          <span class="review-date">${date}</span>
        </div>
        ${r.comment ? `<div class="review-comment">${escapeHtml(r.comment)}</div>` : ''}
      </div>
    `;
  }).join('');
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

loadDetail();
