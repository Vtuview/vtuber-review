// ===== 갤러리 페이지 로직 =====

let allVtubers = [];
let currentSort = 'newest';
let currentCategory = 'all';  // 카테고리 필터 (전체/데뷔정보/리뷰/근황)

async function loadVtubers() {
  const { data: vtubers, error } = await db
    .from('vtubers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    document.getElementById('gallery').innerHTML =
      `<div class="empty-state">데이터 불러오기 실패: ${error.message}</div>`;
    return;
  }

  // 방문자 별점 집계
  const { data: ratings } = await db
    .from('visitor_ratings')
    .select('vtuber_id, rating');

  const ratingMap = {};
  (ratings || []).forEach(r => {
    if (!ratingMap[r.vtuber_id]) ratingMap[r.vtuber_id] = [];
    ratingMap[r.vtuber_id].push(r.rating);
  });

  allVtubers = vtubers.map(v => {
    const arr = ratingMap[v.id] || [];
    const avg = arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    // 세분화 별점 총점(평균) 계산
    const totalScore = calcTotalScore(v);
    return { ...v, visitor_avg: avg, visitor_count: arr.length, total_score: totalScore };
  });

  render();
}

// 세분화 별점 4항목 평균 (0이면 미평가)
function calcTotalScore(v) {
  const scores = [
    v.rating_avatar || 0,
    v.rating_comm || 0,
    v.rating_song || 0,
    v.rating_attendance || 0
  ].filter(s => s > 0);
  if (scores.length === 0) return 0;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

function sortVtubers(arr, key) {
  const sorted = [...arr];
  switch (key) {
    case 'newest':
      return sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    case 'oldest':
      return sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    case 'rating_desc':
      return sorted.sort((a, b) => (b.total_score || 0) - (a.total_score || 0));
    case 'rating_asc':
      return sorted.sort((a, b) => (a.total_score || 0) - (b.total_score || 0));
    case 'visitor_desc':
      return sorted.sort((a, b) => {
        if (a.visitor_count === 0 && b.visitor_count === 0) return 0;
        if (a.visitor_count === 0) return 1;
        if (b.visitor_count === 0) return -1;
        return b.visitor_avg - a.visitor_avg;
      });
    case 'name':
      return sorted.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko'));
    default:
      return sorted;
  }
}

function render() {
  const query = document.getElementById('searchInput').value.toLowerCase().trim();
  const gallery = document.getElementById('gallery');

  let filtered = allVtubers.filter(v => {
    // 카테고리 필터
    if (currentCategory !== 'all') {
      if ((v.category || '리뷰') !== currentCategory) return false;
    }
    // 검색
    if (!query) return true;
    const haystack = [
      v.name, ...(v.tags || []), v.my_review || '', v.category || ''
    ].join(' ').toLowerCase();
    return haystack.includes(query);
  });

  filtered = sortVtubers(filtered, currentSort);

  if (filtered.length === 0) {
    gallery.innerHTML = '<div class="empty-state">매칭되는 버추얼 스트리머가 없습니다.</div>';
    return;
  }

  gallery.innerHTML = filtered.map((v, i) => cardHTML(v, i)).join('');
}

function cardHTML(v, idx) {
  const totalScore = v.total_score || 0;
  const stars = renderStars(totalScore);
  const tags = (v.tags || []).slice(0, 3).map(t => `<span class="card-tag">${escapeHtml(t)}</span>`).join('');
  const visitorInfo = v.visitor_count > 0
    ? `<span class="rating-count">${v.visitor_avg.toFixed(1)} · ${v.visitor_count}명</span>`
    : `<span class="rating-count">—</span>`;

  const href = v.slug
    ? `/v/${encodeURIComponent(v.slug)}`
    : `vtuber.html?id=${v.id}`;

  // 카테고리 라벨
  const category = v.category || '리뷰';
  const catClass = category === '데뷔정보' ? 'cat-debut' : category === '근황' ? 'cat-update' : 'cat-review';

  // 작성날짜 (created_date 우선, 없으면 created_at)
  const dateStr = formatDate(v.created_date || v.created_at);

  return `
    <a href="${href}" class="card" style="animation-delay: ${idx * 0.05}s">
      <div class="card-thumb">
        <span class="card-category ${catClass}">${escapeHtml(category)}</span>
        <img src="${v.thumbnail_url || placeholderImg()}" alt="${escapeHtml(v.name)}" loading="lazy"
             onerror="this.src='${placeholderImg()}'">
      </div>
      <div class="card-body">
        <div class="card-name">${escapeHtml(v.name)}</div>
        <div class="card-tags">${tags}</div>
        <div class="card-rating">
          <span class="stars">${stars}</span>
          <span class="rating-num">${totalScore.toFixed(1)}</span>
          ${visitorInfo}
        </div>
        <div class="card-date">${dateStr}</div>
      </div>
    </a>
  `;
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

function placeholderImg() {
  return `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" fill="%231a1a2e"><rect width="400" height="400"/><text x="200" y="210" text-anchor="middle" fill="%23555" font-size="48">?</text></svg>')}`;
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

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ===== 이벤트 바인딩 =====
document.getElementById('searchInput').addEventListener('input', render);

// 정렬 드롭다운
const sortSelect = document.getElementById('sortSelect');
if (sortSelect) {
  sortSelect.addEventListener('change', () => {
    currentSort = sortSelect.value;
    render();
  });
}

// 카테고리 드롭다운
const categorySelect = document.getElementById('categorySelect');
if (categorySelect) {
  categorySelect.addEventListener('change', () => {
    currentCategory = categorySelect.value;
    render();
  });
}

loadVtubers();
