// ===== 상세 페이지 =====

function getSlug() {
  const params = new URLSearchParams(location.search);
  const fromQuery = params.get('slug');
  if (fromQuery) return fromQuery;
  const match = location.pathname.match(/\/v\/([^/?#]+)/);
  if (match) return decodeURIComponent(match[1]);
  return null;
}

const vtuberSlug = getSlug();
const vtuberIdParam = new URLSearchParams(location.search).get('id');
let currentVtuberId = null;

async function loadDetail() {
  if (!vtuberSlug && !vtuberIdParam) {
    location.href = '/';
    return;
  }

  try {
    let query;
    if (vtuberSlug) {
      query = 'select=*&slug=eq.' + encodeURIComponent(vtuberSlug);
    } else {
      query = 'select=*&id=eq.' + encodeURIComponent(vtuberIdParam);
    }

    const data = await proxyGet('vtubers', query);
    const v = data && data.length > 0 ? data[0] : null;

    if (!v) {
      document.getElementById('detail').innerHTML =
        `<div class="empty-state">해당하는 버튜버를 찾을 수 없습니다.<br><br><a href="/" style="color:var(--accent);">← 메인으로</a></div>`;
      return;
    }

    currentVtuberId = v.id;
    renderDetail(v);
  } catch (err) {
    document.getElementById('detail').innerHTML =
      `<div class="empty-state">데이터 조회 오류: ${err.message}<br><br><a href="/" style="color:var(--accent);">← 메인으로</a></div>`;
  }
}

function calcTotal(v) {
  const items = [v.rating_avatar||0, v.rating_comm||0, v.rating_singing||0, v.rating_attend||0];
  const filled = items.filter(x => x > 0);
  if (filled.length === 0) return 0;
  return filled.reduce((a, b) => a + b, 0) / filled.length;
}

function starsHTML(n) {
  const full = Math.round(n);
  return Array.from({length:5}, (_,i) =>
    i < full ? '★' : '<span class="empty">★</span>'
  ).join('');
}

function categoryClass(cat) {
  if (cat === '데뷔정보') return 'cat-debut';
  if (cat === '근황') return 'cat-update';
  if (cat === '소식') return 'cat-archive';
  if (cat === '예정') return 'cat-upcoming';
  if (cat === '10분 리뷰') return 'cat-quick';
  return 'cat-review';
}

function renderDetail(v) {
  const total = calcTotal(v);
  const cat = v.category || '리뷰';
  const catCls = categoryClass(cat);

  const platforms = v.platforms || {};
  const platformLabels = {
    soop: '방송국 바로가기',
    etc: '풍투데이',
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

  const reviewDate = v.review_date || (v.updated_at ? v.updated_at.split('T')[0] : '');

  // 스탯 (값이 있는 것만 표시)
  const stats = [];
  if (v.broadcast_hours) stats.push({ label: '방송시간', value: v.broadcast_hours + 'h' });
  if (v.fans) stats.push({ label: '애청자', value: v.fans.toLocaleString() });
  if (v.fanclub) stats.push({ label: '팬클럽', value: v.fanclub.toLocaleString() });
  if (v.subscribers) stats.push({ label: '구독', value: v.subscribers.toLocaleString() });

  const statsHTML = stats.length > 0 ? `
    <div class="stats-grid">
      ${stats.map(s => `
        <div class="stat-item">
          <div class="stat-label">${s.label}</div>
          <div class="stat-value">${s.value}</div>
        </div>
      `).join('')}
    </div>
  ` : '';

  // 월별 히스토리 차트
  function buildHistoryHTML(vdata) {
    function buildHistoryChart(history, unit, color) {
    if (!history || Object.keys(history).length === 0) return '';
    const sorted = Object.entries(history)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .filter(([, v]) => v > 0)
      .slice(-6);
    const maxVal = Math.max(...sorted.map(([, v]) => v || 0), 1);
    const rows = sorted.map(([ym, val]) => {
      const [year, month] = ym.split('-');
      const label = `${parseInt(month)}월`;
      const pct = Math.round((val || 0) / maxVal * 100);
      const display = unit === 'h' ? `${val}h` : (val || 0).toLocaleString();
      return `
        <div class="hist-row">
          <div class="hist-label">${label}</div>
          <div class="hist-bar-wrap">
            <div class="hist-bar" style="width:${pct}%; background:${color};"></div>
          </div>
          <div class="hist-value">${display}</div>
        </div>`;
    }).join('');
    return rows;
  }

    const balloonRows = buildHistoryChart(vdata.balloon_history, 'b', 'var(--accent)');
    const broadcastRows = buildHistoryChart(vdata.broadcast_history, 'h', 'var(--accent-2)');

    return (balloonRows || broadcastRows) ? `
      <div class="history-grid">
        ${balloonRows ? `<div class="history-box">
          <div class="history-title">별풍선</div>
          ${balloonRows}
        </div>` : ''}
        ${broadcastRows ? `<div class="history-box">
          <div class="history-title">방송시간</div>
          ${broadcastRows}
        </div>` : ''}
      </div>
    ` : '';
  }

  const historyHTML = buildHistoryHTML(v);

  // 세부 별점
  const ratingItems = [
    { label: '아바타', val: v.rating_avatar || 0 },
    { label: '소통', val: v.rating_comm || 0 },
    { label: '노래', val: v.rating_singing || 0 },
    { label: '출석률', val: v.rating_attend || 0 },
  ];

  const ratingDetailHTML = `
    <div class="rating-detail">
      ${ratingItems.map(r => `
        <div class="rating-detail-item">
          <span class="rating-detail-label">${r.label}</span>
          <span class="rating-detail-stars">${starsHTML(r.val)}</span>
          <span class="rating-detail-num">${r.val.toFixed(1)}</span>
        </div>
      `).join('')}
      <div class="rating-total">
        <span class="rating-total-label">TOTAL</span>
        <span class="rating-total-score">${total.toFixed(1)} / 5.0</span>
      </div>
    </div>
  `;

  const reviewHTML = renderMarkdown(v.my_review);

  const isNews = v.category === '소식';

  const heroHTML = isNews
    ? `<div class="detail-hero" style="flex-direction:column; align-items:center; text-align:center;">
        <div class="detail-thumb">
          <img src="${escapeHtml(proxyImageUrl(v.thumbnail_url) || '')}" alt="${escapeHtml(v.name)}" onerror="this.style.display='none'">
        </div>
        <div style="width:100%;">
          <div class="card-category ${catCls}" style="margin:0.5rem auto;">${escapeHtml(cat)}</div>
          <h1 class="detail-name">${escapeHtml(v.name)}</h1>
          <div class="detail-meta" style="justify-content:center;">
            ${reviewDate ? '<div class="detail-meta-item"><span>REVIEW</span>' + reviewDate + '</div>' : ''}
          </div>
        </div>
      </div>`
    : `<div class="detail-hero">
        <div class="detail-thumb">
          <img src="${escapeHtml(proxyImageUrl(v.thumbnail_url) || '')}" alt="${escapeHtml(v.name)}" onerror="this.style.display='none'">
        </div>
        <div>
          <div class="card-category ${catCls}">${escapeHtml(cat)}</div>
          <h1 class="detail-name">${escapeHtml(v.name)}</h1>
          <div class="card-tags" style="margin-bottom:1rem;">${tags}</div>
          ${ratingDetailHTML}
          <div class="detail-meta">
            ${v.debut_date ? '<div class="detail-meta-item"><span>DEBUT</span>' + v.debut_date + '</div>' : ''}
            ${reviewDate ? '<div class="detail-meta-item"><span>REVIEW</span>' + reviewDate + '</div>' : ''}
            ${v.last_broadcast ? '<div class="detail-meta-item"><span>LAST CAST</span>' + v.last_broadcast + '</div>' : ''}
          </div>
          ${statsHTML}
          ${historyHTML}
          ${platformLinks ? '<div class="platform-links">' + platformLinks + '</div>' : ''}
        </div>
      </div>`;

  document.getElementById('detail').innerHTML = heroHTML + `

${reviewHTML ? `
      <h2 class="section-title">리뷰</h2>
      <div class="md-content" id="reviewContent">${reviewHTML}</div>
    ` : ''}

    <h2 class="section-title">댓글</h2>
    <div class="rating-form">
      <textarea id="commentInput" placeholder="댓글을 남겨주세요..."></textarea>
      <button class="btn" id="submitComment">SUBMIT</button>
      <div id="commentMsg" style="margin-top:0.8rem; font-family: var(--font-mono); font-size: 0.8rem;"></div>
    </div>
    <div class="review-list" id="commentList"></div>
  `;

const reviewContent = document.getElementById('reviewContent');
  if (reviewContent) attachImageLightbox(reviewContent);

  document.getElementById('submitComment').addEventListener('click', submitComment);
  loadComments();

  // 풍투데이 히스토리 백그라운드 갱신
  if (vtuberSlug) {
    const session = db.auth ? (await db.auth.getSession())?.data?.session : null;
    const authHeader = session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {};
    fetch(`/sync/poong?slug=${encodeURIComponent(vtuberSlug)}`, { headers: authHeader })
      .then(r => r.json())
      .then(data => {
        if (data.ok && data.balloon_history) {
          v.balloon_history = data.balloon_history;
          v.broadcast_history = data.broadcast_history;
          const histEl = document.querySelector('.history-grid');
          const newHTML = buildHistoryHTML(v);
          if (newHTML) {
            if (histEl) {
              const tmp = document.createElement('div');
              tmp.innerHTML = newHTML;
              histEl.replaceWith(tmp.firstElementChild);
            } else {
              const statsEl = document.querySelector('.stats-grid');
              if (statsEl) {
                const tmp = document.createElement('div');
                tmp.innerHTML = newHTML;
                statsEl.insertAdjacentElement('afterend', tmp.firstElementChild);
              }
            }
          }
        }
      }).catch(() => {});
  }
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

async function submitComment() {
  const msg = document.getElementById('commentMsg');
  const comment = document.getElementById('commentInput').value.trim();
  if (!comment) { msg.textContent = '댓글을 입력해주세요.'; msg.style.color = 'var(--accent)'; return; }

  const fp = getVisitorFingerprint();

const { error } = await db.from('visitor_ratings').upsert({
    vtuber_id: currentVtuberId,
    rating: 0,
    comment: comment,
    visitor_fingerprint: fp
  }, { onConflict: 'vtuber_id,visitor_fingerprint' });

  if (error) {
    msg.textContent = '등록 실패: ' + error.message;
    msg.style.color = 'var(--accent)';
  } else {
    msg.textContent = '댓글이 등록되었습니다.';
    msg.style.color = 'var(--accent-2)';
    document.getElementById('commentInput').value = '';
    loadComments();
  }
}

async function loadComments() {
  try {
    const comments = await proxyGet('visitor_ratings',
      `select=*&vtuber_id=eq.${currentVtuberId}&order=created_at.desc&limit=50`);

    const list = document.getElementById('commentList');
    if (!list) return;

    if (!comments || comments.length === 0) {
      list.innerHTML = '<div class="empty-state">아직 댓글이 없습니다.</div>';
      return;
    }

    list.innerHTML = comments.map(r => {
      const date = new Date(r.created_at).toLocaleDateString('ko-KR');
      return `
        <div class="review-item">
          <div class="review-item-head">
            <span class="review-date">${date}</span>
          </div>
          ${r.comment ? `<div class="review-comment">${escapeHtml(r.comment)}</div>` : ''}
        </div>
      `;
    }).join('');
  } catch (err) {
    const list = document.getElementById('commentList');
    if (list) list.innerHTML = '<div class="empty-state">댓글 로드 실패</div>';
  }
}

loadDetail();
