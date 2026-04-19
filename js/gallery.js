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

  allVtubers = vtubers.map(v => {
    const totalRating = calcTotalRating(v);
    return { ...v, totalRating };
  });

  render();
}

// 4개 항목 평균 계산
function calcTotalRating(v) {
  const items = [
    v.rating_avatar || 0,
    v.rating_comm || 0,
    v.rating_singing || 0,
    v.rating_attend || 0
  ];
  const filled = items.filter(x => x > 0);
  if (filled.length === 0) return 0;
  return filled.reduce((a, b) => a + b, 0) / filled.length;
}

function sortVtubers(arr, key) {
  const sorted = [...arr];
  switch (key) {
    case 'newest':
      return sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    case 'oldest':
      return sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    case 'rating_desc':
      return sorted.sort((a, b) => (b.totalRating || 0) - (a.totalRating || 0));
    case 'rating_asc':
      return sorted.sort((a, b) => (a.totalRating || 0) - (b.totalRating || 0));
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
      v.name, v.category || '', ...(v.tags || []), v.my_review || ''
    ].join(' ').toLowerCase();
    return haystack.includes(query);
  });

  filtered = sortVtubers(filtered, currentSort);

  if (filtered.length === 0) {
    gallery.innerHTML = '<div class="empty-state">매칭되는 버추얼 스트리머가 없습니다.</div>';
    return;
  }

  gallery.innerHTML = filtered.map((v, i) => cardHTML(v, i)).join('');
  setTimeout(freezeAnimatedThumbs, 100);
}

function categoryClass(cat) {
  if (cat === '데뷔정보') return 'cat-debut';
  if (cat === '근황') return 'cat-update';
  return 'cat-review';
}

function cardHTML(v, idx) {
  const tags = (v.tags || []).slice(0, 4).map(t => `<span class="card-tag">${escapeHtml(t)}</span>`).join('');
  const cat = v.category || '리뷰';
  const catCls = categoryClass(cat);


  const href = v.slug ? `/v/${encodeURIComponent(v.slug)}` : `vtuber.html?id=${v.id}`;

  return `
    <a href="${href}" class="card" style="animation-delay: ${Math.min(idx * 0.04, 0.5)}s">
      <div class="card-thumb">
        <img src="${v.thumbnail_url || placeholderImg()}" alt="${escapeHtml(v.name)}" loading="lazy"
             crossorigin="anonymous" onerror="this.src='${placeholderImg()}'">
      </div>
      <div class="card-body">
        <div class="card-category ${catCls}">${escapeHtml(cat)}</div>
        <div class="card-name">${escapeHtml(v.name)}</div>
        <div class="card-tags">${tags}</div>
        ${v.debut_date ? `<div style="font-family:var(--font-mono); font-size:0.62rem; color:var(--text-faint); margin-top:0.3rem; letter-spacing:0.1em;">DEBUT ${v.debut_date}</div>` : ''}
      </div>
    </a>
  `;
}

// WebP/GIF 첫 프레임 정지 처리
function freezeAnimatedThumbs() {
  document.querySelectorAll('.card-thumb img').forEach(img => {
    if (img.dataset.frozen) return;
    img.dataset.frozen = 'true';
    const src = img.src;
    if (!src || src.includes('svg+xml')) return; // placeholder 제외

    const card = img.closest('.card');
    if (!card) return;

    // 이미지 로드 후 canvas로 첫 프레임 캡처
    const captureFrame = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 300;
        canvas.height = img.naturalHeight || 400;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const staticSrc = canvas.toDataURL('image/webp', 0.85);
        img.src = staticSrc;
        img.dataset.animSrc = src;
      } catch(e) {}
    };

    if (img.complete) captureFrame();
    else img.addEventListener('load', captureFrame, { once: true });

    // 호버 시 원본 애니메이션 복원
    card.addEventListener('mouseenter', () => {
      if (img.dataset.animSrc) img.src = img.dataset.animSrc;
    });
    card.addEventListener('mouseleave', () => {
      if (img.dataset.animSrc) {
        // 다시 정지 프레임으로
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || 300;
          canvas.height = img.naturalHeight || 400;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          img.src = canvas.toDataURL('image/webp', 0.85);
        } catch(e) {
          img.src = img.dataset.animSrc;
        }
      }
    });
  });
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

document.getElementById('searchInput').addEventListener('input', render);
document.getElementById('sortSelect').addEventListener('change', (e) => {
  currentSort = e.target.value;
  render();
});

// 갤러리 호버 효과 - 카드에 호버할 때만 다른 카드 어둡게
const galleryEl = document.getElementById('gallery');
galleryEl.addEventListener('mouseover', (e) => {
  const card = e.target.closest('.card');
  if (card) {
    galleryEl.classList.add('has-hover');
  }
});
galleryEl.addEventListener('mouseout', (e) => {
  const card = e.target.closest('.card');
  if (card && !card.contains(e.relatedTarget)) {
    // 다른 카드로 이동하는 게 아니면 has-hover 해제
    const next = e.relatedTarget?.closest('.card');
    if (!next) {
      galleryEl.classList.remove('has-hover');
    }
  }
});
galleryEl.addEventListener('mouseleave', () => {
  galleryEl.classList.remove('has-hover');
});

loadVtubers();
