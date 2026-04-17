// ===== 상세 페이지 =====

const params = new URLSearchParams(location.search);
const slugParam = params.get('slug');
const idParam = params.get('id');

let currentVtuberId = null;
let selectedRating = 0;

async function loadDetail() {
  if (!slugParam && !idParam) { location.href = 'index.html'; return; }

  let query = db.from('vtubers').select('*');
  if (slugParam) {
    query = query.eq('slug', slugParam);
  } else {
    query = query.eq('id', idParam);
  }

  const { data: v, error } = await query.single();

  if (error || !v) {
    document.getElementById('detail').innerHTML =
      '<div class="empty-state">찾을 수 없는 버추얼 스트리머입니다.</div>';
    return;
  }

  currentVtuberId = v.id;
  renderDetail(v);
  loadReviews();
}

function renderDetail(v) {
  // 세분화 별점 4항목 평균 → 총점
  const totalScore = calcTotalScore(v);
  const stars = renderStars(totalScore);

  const tags = (v.tags || []).map(t =>
    `<span class="card-tag">${escapeHtml(t)}</span>`
  ).join('');

  // 카테고리
  const category = v.category || '리뷰';
  const catClass = category === '데뷔정보' ? 'cat-debut' : category === '근황' ? 'cat-update' : 'cat-review';

  // 작성날짜
  const dateStr = formatDate(v.created_date || v.created_at);

  // SOOP 링크
  const soopLink = v.soop_id
    ? `<a href="https://www.sooplive.com/${escapeHtml(v.soop_id)}" target="_blank" rel="noopener" class="platform-link soop-link">SOOP</a>`
    : '';

  // 세분화 별점 UI
  const detailRatings = `
    <div class="detail-ratings-grid">
      <div class="detail-rating-item">
        <span class="detail-rating-label">아바타</span>
        <span class="stars">${renderStars(v.rating_avatar || 0)}</span>
        <span class="rating-num">${(v.rating_avatar || 0).toFixed(1)}</span>
      </div>
      <div class="detail-rating-item">
        <span class="detail-rating-label">소통</span>
        <span class="stars">${renderStars(v.rating_comm || 0)}</span>
        <span class="rating-num">${(v.rating_comm || 0).toFixed(1)}</span>
      </div>
      <div class="detail-rating-item">
        <span class="detail-rating-label">노래</span>
        <span class="stars">${renderStars(v.rating_song || 0)}</span>
        <span class="rating-num">${(v.rating_song || 0).toFixed(1)}</span>
      </div>
      <div class="detail-rating-item">
        <span class="detail-rating-label">출석률</span>
        <span class="stars">${renderStars(v.rating_attendance || 0)}</span>
        <span class="rating-num">${(v.rating_attendance || 0).toFixed(1)}</span>
      </div>
    </div>
  `;

  // 상세 정보 필드 (누적방송시간, 애청자, 팬클럽, 구독)
  const infoFields = [];
  if (v.total_hours) infoFields.push(`<div class="detail-meta-item"><span>누적 방송시간</span>${escapeHtml(String(v.total_hours))}</div>`);
  if (v.favorites) infoFields.push(`<div class="detail-meta-item"><span>애청자</span>${escapeHtml(String(v.favorites))}</div>`);
  if (v.fanclub) infoFields.push(`<div class="detail-meta-item"><span>팬클럽</span>${escapeHtml(String(v.fanclub))}</div>`);
  if (v.subscribers) infoFields.push(`<div class="detail-meta-item"><span>구독</span>${escapeHtml(String(v.subscribers))}</div>`);

  document.getElementById('detail').innerHTML = `
    <div class="detail-hero">
      <div class="detail-thumb">
        <img src="${escapeHtml(v.thumbnail_url || '')}" alt="${escapeHtml(v.name)}"
             onerror="this.style.display='none'">
      </div>
      <div>
        <div class="detail-top-row">
          <span class="card-category ${catClass}">${escapeHtml(category)}</span>
          <span class="detail-date">${dateStr}</span>
        </div>
        <h1 class="detail-name">${escapeHtml(v.name)}</h1>

        <!-- 총점 -->
        <div class="card-rating" style="border:none; padding:0; margin-bottom:0.8rem;">
          <span class="stars">${stars}</span>
          <span class="rating-num">${totalScore.toFixed(1)} / 5.0</span>
          <span class="rating-count">총점 (평균)</span>
        </div>

        <!-- 세분화 별점 -->
        ${detailRatings}

        <div class="card-tags">${tags}</div>

        <div class="detail-meta">
          ${v.debut_date ? `<div class="detail-meta-item"><span>DEBUT</span>${v.debut_date}</div>` : ''}
          ${infoFields.join('')}
        </div>
        ${soopLink ? `<div class="platform-links">${soopLink}</div>` : ''}
      </div>
    </div>

    ${v.my_review ? `<section class="detail-review"><h2>리뷰</h2><div class="review-content">${renderMarkdown(v.my_review)}</div></section>` : ''}

    <section class="detail-visitor-rating">
      <h2>방문자 평가</h2>
      <div class="visitor-rating-box">
        <div class="star-select" id="starSelect">
          ${[1,2,3,4,5].map(i => `<span class="star-btn" data-val="${i}">☆</span>`).join('')}
        </div>
        <textarea id="visitorComment" placeholder="한줄 코멘트 (선택)" maxlength="200"></textarea>
        <button class="btn btn-accent" onclick="submitRating()">평가하기</button>
        <div id="ratingMsg" style="margin-top:0.5rem; font-size:0.75rem;"></div>
      </div>
      <div id="reviewsList"></div>
    </section>
  `;

  // 별 클릭 이벤트
  document.querySelectorAll('.star-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedRating = parseInt(btn.dataset.val);
      document.querySelectorAll('.star-btn').forEach((b, i) => {
        b.textContent = i < selectedRating ? '★' : '☆';
        b.classList.toggle('active', i < selectedRating);
      });
    });
  });
}

function calcTotalScore(v) {
  const scores = [
    v.rating_avatar || 0,
    v.rating_comm || 0,
    v.rating_song || 0,
    v.rating_attendance || 0
  ].filter(s => s > 0);
  if (scores.length === 0) return v.my_rating || 0;  // fallback to old my_rating
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

async function submitRating() {
  const msg = document.getElementById('ratingMsg');
  if (!selectedRating) { msg.textContent = '별점을 선택해주세요.'; return; }

  const fp = getFingerprint();
  const comment = document.getElementById('visitorComment').value.trim();

  const { error } = await db.from('visitor_ratings').upsert({
    vtuber_id: currentVtuberId,
    rating: selectedRating,
    comment: comment || null,
    visitor_fingerprint: fp
  }, { onConflict: 'vtuber_id,visitor_fingerprint' });

  if (error) {
    msg.textContent = '저장 실패: ' + error.message;
    msg.style.color = 'var(--accent)';
  } else {
    msg.textContent = '감사합니다!';
    msg.style.color = 'var(--accent-secondary)';
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

  const container = document.getElementById('reviewsList');
  if (!reviews || reviews.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding:1rem;">아직 방문자 평가가 없습니다.</div>';
    return;
  }

  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;

  container.innerHTML = `
    <div class="reviews-summary">
      <span class="stars">${renderStars(avg)}</span>
      <span class="rating-num">${avg.toFixed(1)}</span>
      <span class="rating-count">${reviews.length}명 평가</span>
    </div>
    ${reviews.map(r => `
      <div class="review-item">
        <span class="stars" style="font-size:0.8rem;">${renderStars(r.rating)}</span>
        ${r.comment ? `<span class="review-comment">${escapeHtml(r.comment)}</span>` : ''}
        <span class="review-date">${formatDate(r.created_at)}</span>
      </div>
    `).join('')}
  `;
}

function getFingerprint() {
  let fp = localStorage.getItem('vtuview_fp');
  if (!fp) {
    fp = 'fp_' + Math.random().toString(36).substr(2, 12) + Date.now().toString(36);
    localStorage.setItem('vtuview_fp', fp);
  }
  return fp;
}

function formatDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt)) return '';
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

function renderStars(rating) {
  let s = '';
  for (let i = 1; i <= 5; i++) {
    if (rating >= i) s += '★';
    else if (rating >= i - 0.5) s += '★';
    else s += '☆';
  }
  return s;
}

function renderMarkdown(text) {
  if (typeof marked !== 'undefined') return marked.parse(text);
  return text.replace(/\n/g, '<br>');
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

loadDetail();
