// ===== 갤러리 페이지 로직 =====

let allVtubers = [];
let currentSort = 'newest';

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
    return { ...v, visitor_avg: avg, visitor_count: arr.length };
  });

  render();
}

function sortVtubers(arr, key) {
  const sorted = [...arr];
  switch (key) {
    case 'newest':
      return sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    case 'oldest':
      return sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    case 'rating_desc':
      return sorted.sort((a, b) => (b.my_rating || 0) - (a.my_rating || 0));
    case 'rating_asc':
      return sorted.sort((a, b) => (a.my_rating || 0) - (b.my_rating || 0));
    case 'visitor_desc':
      return sorted.sort((a, b) => {
        // 평가 없는 건 뒤로
        if (a.visitor_count === 0 && b.visitor_count === 0) return 0;
        if (a.visitor_count === 0) return 1;
        if (b.visitor_count === 0) return -1;
        return b.visitor_avg - a.visitor_avg;
      });
    case 'visitor_asc':
      return sorted.sort((a, b) => {
        if (a.visitor_count === 0 && b.visitor_count === 0) return 0;
        if (a.visitor_count === 0) return 1;
        if (b.visitor_count === 0) return -1;
        return a.visitor_avg - b.visitor_avg;
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
    if (!query) return true;
    const haystack = [
      v.name, ...(v.tags || []), v.my_review || ''
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
  const rating = v.my_rating || 0;
  const stars = renderStars(rating);
  const tags = (v.tags || []).slice(0, 3).map(t => `<span class="card-tag">${escapeHtml(t)}</span>`).join('');
  const visitorInfo = v.visitor_count > 0
    ? `<span class="rating-count">${v.visitor_avg.toFixed(1)} · ${v.visitor_count}명</span>`
    : `<span class="rating-count">—</span>`;

  // 슬러그 있으면 /v/슬러그, 없으면 fallback
  const href = v.slug ? `/v/${encodeURIComponent(v.slug)}` : `vtuber.html?id=${v.id}`;

  return `
    <a href="${href}" class="card" style="animation-delay: ${Math.min(idx * 0.04, 0.5)}s">
      <div class="card-thumb">
        <img src="${v.thumbnail_url || placeholderImg()}" alt="${escapeHtml(v.name)}" loading="lazy"
             onerror="this.src='${placeholderImg()}'">
      </div>
      <div class="card-body">
        <div class="card-name">${escapeHtml(v.name)}</div>
        <div class="card-tags">${tags}</div>
        <div class="card-rating">
          <span class="stars">${stars}</span>
          <span class="rating-num">${rating.toFixed(1)}</span>
          ${visitorInfo}
        </div>
      </div>
    </a>
  `;
}

function renderStars(n) {
  const full = Math.round(n);
  return Array.from({ length: 5 }, (_, i) =>
    i < full ? '★' : '<span class="empty">★</span>'
  ).join('');
}

function placeholderImg() {
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#2a2a38"/><stop offset="1" stop-color="#13131a"/>
      </linearGradient></defs>
      <rect width="300" height="400" fill="url(#g)"/>
      <text x="150" y="210" text-anchor="middle" fill="#4a4a5a" font-family="monospace" font-size="14">NO IMAGE</text>
    </svg>`
  );
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// 이벤트 바인딩
document.getElementById('searchInput').addEventListener('input', render);
document.getElementById('sortSelect').addEventListener('change', (e) => {
  currentSort = e.target.value;
  render();
});

loadVtubers();
