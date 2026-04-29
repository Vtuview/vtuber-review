// ===== 관리자 페이지 =====

let session = null;
let mdEditor = null;
let uploadedImages = [];

async function checkAuth() {
  const { data } = await db.auth.getSession();
  session = data.session;
  if (session) {
    document.getElementById('authStatus').textContent = `· ${session.user.email}`;
    renderAdmin();
  } else {
    renderLogin();
  }
}

function renderLogin() {
  document.getElementById('adminRoot').innerHTML = `
    <h2 class="section-title">Admin Login</h2>
    <div class="form-grid">
      <div class="form-row">
        <label>EMAIL</label>
        <input type="email" id="loginEmail" placeholder="admin@example.com">
      </div>
      <div class="form-row">
        <label>PASSWORD</label>
        <input type="password" id="loginPw">
      </div>
      <button class="btn" id="loginBtn">LOGIN</button>
      <div id="loginMsg" style="font-family: var(--font-mono); font-size: 0.8rem;"></div>
    </div>
  `;

  document.getElementById('loginBtn').addEventListener('click', async () => {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPw').value;
    const { error } = await db.auth.signInWithPassword({ email, password });
    if (error) {
      document.getElementById('loginMsg').textContent = error.message;
      document.getElementById('loginMsg').style.color = 'var(--accent)';
    } else {
      location.reload();
    }
  });
}

async function renderAdmin() {
  document.getElementById('adminRoot').innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem;">
      <h2 class="section-title" style="margin:0;">버추얼 스트리머 등록 / 수정</h2>
      <button class="btn btn-ghost" id="logoutBtn">LOGOUT</button>
    </div>

    <div class="form-grid">
      <input type="hidden" id="editId" value="">

      <div class="form-row two">
        <div class="form-row">
          <label>이름 *</label>
          <input type="text" id="f_name" required>
        </div>
        <div class="form-row">
          <label>슬러그 (URL용 영문) *</label>
          <input type="text" id="f_slug" placeholder="banjucca" pattern="[a-z0-9-]+">
          <div style="font-size:0.65rem; color:var(--text-dim); margin-top:0.2rem; font-family:var(--font-mono);">
            URL: /v/슬러그 · 영문 소문자, 숫자, - 만 허용
          </div>
        </div>
      </div>

      <div class="form-row two">
        <div class="form-row">
          <label>카테고리 *</label>
          <select id="f_category">
            <option value="데뷔정보">데뷔정보</option>
            <option value="10분 리뷰">10분 리뷰</option>
            <option value="리뷰" selected>리뷰</option>
            <option value="근황">근황</option>
            <option value="소식">소식</option>
            <option value="예정">예정</option>
          </select>
        </div>
        <div class="form-row">
          <label>데뷔일</label>
          <input type="date" id="f_debut">
        </div>
        <div class="form-row">
          <label>리뷰 날짜</label>
          <input type="date" id="f_review_date">
        </div>
      </div>

      <div class="form-row">
        <label>썸네일 URL</label>
        <input type="url" id="f_thumb" placeholder="https://... 또는 아래 이미지 라이브러리에서 선택">
      </div>

      <div class="form-row">
        <label>태그 (쉼표로 구분)</label>
        <input type="text" id="f_tags" placeholder="노래, 게임, 수다, ASMR">
      </div>

      <!-- 수치 필드 -->
      <div class="form-row two">
        <div class="form-row">
          <label>누적 방송시간 (h)</label>
          <input type="number" id="f_hours" min="0" step="1" placeholder="123">
        </div>
        <div class="form-row">
          <label>애청자 수</label>
          <input type="number" id="f_fans" min="0" step="1" placeholder="500">
        </div>
      </div>

      <div class="form-row two">
        <div class="form-row">
          <label>팬클럽 수</label>
          <input type="number" id="f_fanclub" min="0" step="1" placeholder="200">
        </div>
        <div class="form-row">
          <label>구독 수</label>
          <input type="number" id="f_subs" min="0" step="1" placeholder="1000">
        </div>
      </div>

      <!-- 세부 별점 -->
      <div class="form-row">
        <label>세부 별점</label>
        <div class="admin-rating-group">
          <div class="admin-rating-item">
            <label>아바타</label>
            <div class="admin-star-input" data-field="f_r_avatar">
              ${[1,2,3,4,5].map(n => `<button type="button" data-value="${n}">★</button>`).join('')}
            </div>
            <input type="hidden" id="f_r_avatar" value="0">
          </div>
          <div class="admin-rating-item">
            <label>소통</label>
            <div class="admin-star-input" data-field="f_r_comm">
              ${[1,2,3,4,5].map(n => `<button type="button" data-value="${n}">★</button>`).join('')}
            </div>
            <input type="hidden" id="f_r_comm" value="0">
          </div>
          <div class="admin-rating-item">
            <label>노래</label>
            <div class="admin-star-input" data-field="f_r_singing">
              ${[1,2,3,4,5].map(n => `<button type="button" data-value="${n}">★</button>`).join('')}
            </div>
            <input type="hidden" id="f_r_singing" value="0">
          </div>
          <div class="admin-rating-item">
            <label>출석률</label>
            <div class="admin-star-input" data-field="f_r_attend">
              ${[1,2,3,4,5].map(n => `<button type="button" data-value="${n}">★</button>`).join('')}
            </div>
            <input type="hidden" id="f_r_attend" value="0">
          </div>
        </div>
      </div>

      <div class="form-row two">
        <div class="form-row">
          <label>SOOP URL</label>
          <input type="url" id="f_soop" placeholder="https://ch.sooplive.co.kr/...">
        </div>
        <div class="form-row">
          <label>기타 URL</label>
          <input type="url" id="f_etc" placeholder="풍투데이 등">
        </div>
      </div>

      <!-- 이미지 업로드 -->
      <div class="form-row">
        <label>📁 이미지 라이브러리 (WebP / GIF / PNG / JPG, 최대 10MB)</label>
        <div class="upload-zone" id="uploadZone">
          <div class="upload-icon">⬆</div>
          <p>파일을 드래그하거나 클릭해서 업로드</p>
          <p style="color:var(--text-dim); font-size:0.7rem;">움직이는 WebP · GIF 지원</p>
          <input type="file" id="fileInput" multiple accept="image/*" style="display:none;">
        </div>
        <div class="upload-progress" id="uploadProgress"></div>
        <button type="button" class="library-toggle" id="libraryToggle">기존 이미지 보기 ▾</button>
        <div class="image-library hidden" id="imageLibrary">
          <div style="grid-column: 1/-1; text-align:center; color:var(--text-dim); font-family:var(--font-mono); font-size:0.75rem; padding:1rem;">로딩 중...</div>
        </div>
      </div>

      <!-- 마크다운 에디터 -->
      <div class="form-row">
        <label>리뷰 (마크다운)</label>
        <textarea id="f_review"></textarea>
        <div style="font-size:0.7rem; color:var(--text-dim); margin-top:0.3rem; font-family:var(--font-mono); line-height:1.6;">
          💡 <strong>##</strong> 제목 · <strong>**굵게**</strong> · <strong>*기울임*</strong> · <strong>&gt;</strong> 인용 · 이미지는 라이브러리에서 클릭<br>
          🎬 <strong>임베드</strong>: SOOP VOD URL 또는 <code>::soop[ID]</code> 문법
        </div>
      </div>

      <div style="display:flex; gap:0.8rem;">
        <button class="btn" id="saveBtn">저장</button>
        <button class="btn btn-ghost" id="resetBtn">새로 작성</button>
      </div>
      <div id="saveMsg" style="font-family: var(--font-mono); font-size: 0.8rem;"></div>
    </div>
    <div style="display:flex; align-items:center; gap:1rem; margin-bottom:1rem;">
      <button class="btn btn-ghost" id="syncAllBtn" style="font-size:0.8rem;">🔄 전체 통계 동기화</button>
      <span id="syncStatus" style="font-family:var(--font-mono); font-size:0.75rem; color:var(--text-dim);"></span>
    </div>
    <h2 class="section-title">수신 메시지</h2>
    <div class="admin-list" id="msgList"><div class="loading">Loading...</div></div>
    <h2 class="section-title">신규 댓글</h2>
    <div class="admin-list" id="commentMgmtList"><div class="loading">Loading...</div></div>
    <h2 class="section-title">등록된 목록</h2>
    <div class="admin-list" id="adminList"><div class="loading">Loading...</div></div>
  `;

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await db.auth.signOut();
    location.reload();
  });
  document.getElementById('saveBtn').addEventListener('click', saveVtuber);
  document.getElementById('resetBtn').addEventListener('click', resetForm);
  document.getElementById('libraryToggle').addEventListener('click', toggleLibrary);

document.querySelectorAll('.admin-star-input').forEach(group => {
    const fieldId = group.dataset.field;
    const hidden = document.getElementById(fieldId);
    group.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = parseInt(btn.dataset.value);
        const current = parseInt(hidden.value) || 0;
        const newVal = (val === current) ? 0 : val;
        hidden.value = newVal;
        group.querySelectorAll('button').forEach((b, i) =>
          b.classList.toggle('active', i < newVal)
        );
      });
    });
  });

  initEditor();
  initUpload();
  loadAdminList();
  loadMessages();
  loadCommentMgmt();

  document.getElementById('syncAllBtn')?.addEventListener('click', () => syncStats());
}

let libraryLoaded = false;
function toggleLibrary(forceShow = false) {
  const lib = document.getElementById('imageLibrary');
  const btn = document.getElementById('libraryToggle');
  if (!lib || !btn) return;
  const willShow = forceShow === true || lib.classList.contains('hidden');
  if (willShow) {
    lib.classList.remove('hidden');
    btn.textContent = '기존 이미지 숨기기 ▴';
    if (!libraryLoaded) { loadImageLibrary(); libraryLoaded = true; }
  } else {
    lib.classList.add('hidden');
    btn.textContent = '기존 이미지 보기 ▾';
  }
}

function initEditor() {
  mdEditor = new EasyMDE({
    element: document.getElementById('f_review'),
    spellChecker: false,
    autofocus: false,
    placeholder: '리뷰를 마크다운으로 작성하세요...',
    status: ['lines', 'words'],
    toolbar: [
      'bold', 'italic', 'heading', '|',
      'quote', 'unordered-list', 'ordered-list', '|',
      'link', 'image', 'table', 'horizontal-rule', '|',
      'preview', 'side-by-side', 'fullscreen', '|', 'guide'
    ],
    previewRender: (plainText) => renderMarkdown(plainText),
  });
}

function initUpload() {
  const zone = document.getElementById('uploadZone');
  const input = document.getElementById('fileInput');
  zone.addEventListener('click', () => input.click());
  input.addEventListener('change', e => handleFiles(e.target.files));
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', e => {
    e.preventDefault(); zone.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
  });
  document.addEventListener('paste', e => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files = [];
    for (const item of items) {
      if (item.type.startsWith('image/')) { const f = item.getAsFile(); if (f) files.push(f); }
    }
    if (files.length > 0) handleFiles(files);
  });
}

async function handleFiles(files) {
  const progress = document.getElementById('uploadProgress');
  const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
  if (validFiles.length === 0) return;
  const newlyUploadedUrls = [];
  for (let i = 0; i < validFiles.length; i++) {
    const file = validFiles[i];
    progress.textContent = `업로드 중... (${i+1}/${validFiles.length}) ${file.name}`;
    progress.style.color = 'var(--accent-2)';
    if (file.size > 10*1024*1024) {
      progress.textContent = `❌ ${file.name}: 10MB 초과`;
      progress.style.color = 'var(--accent)'; continue;
    }
    const formData = new FormData();
    formData.append('file', file);
    const token = session?.access_token || '';
    const res = await fetch('/r2/upload', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      progress.textContent = `❌ ${file.name}: ${err.error || res.status}`;
      progress.style.color = 'var(--accent)'; continue;
    }
    const { url, fileName } = await res.json();
    insertImageToEditor(url, file.name.replace(/\.[^.]+$/, ''));
    newlyUploadedUrls.push({ url, name: fileName });
  }
  progress.textContent = `✓ ${validFiles.length}개 파일 업로드 완료`;
  progress.style.color = 'var(--accent-2)';
  setTimeout(() => { progress.textContent = ''; }, 3000);
  // 전체 재로드 없이 라이브러리가 열려있으면 새 아이템만 맨 앞에 추가
  const lib = document.getElementById('imageLibrary');
  if (lib && !lib.classList.contains('hidden') && libraryLoaded) {
    newlyUploadedUrls.forEach(({ url, name }) => prependLibraryItem(lib, url, name));
  }
}

function publicUrl(fileName) {
  return `https://pub-8e76ac052fdd4082b8c8c6a11958cf51.r2.dev/${fileName}`;
}

function insertImageToEditor(url, alt = '') {
  const cm = mdEditor.codemirror;
  const doc = cm.getDoc();
  doc.replaceRange(`\n![${alt}](${url})\n`, doc.getCursor());
  cm.focus();
}

function prependLibraryItem(lib, url, name) {
  const div = document.createElement('div');
  div.className = 'image-lib-item';
  div.dataset.url = url;
  div.dataset.name = name;
  div.innerHTML = `<img src="${url}" loading="lazy" alt=""><div class="lib-overlay">클릭해서 삽입</div><button class="lib-delete" title="삭제">✕</button>`;
  div.addEventListener('click', e => {
    if (e.target.classList.contains('lib-delete')) return;
    insertImageToEditor(url, name.replace(/\.[^.]+$/, ''));
  });
  div.addEventListener('contextmenu', e => {
    e.preventDefault();
    document.getElementById('f_thumb').value = url;
    flashMsg(`썸네일로 설정: ${name}`);
  });
  div.querySelector('.lib-delete').addEventListener('click', async e => {
    e.stopPropagation();
    if (!confirm(`"${name}" 삭제?`)) return;
    const token = session?.access_token || '';
    const res = await fetch(`/r2/delete?name=${encodeURIComponent(name)}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) alert('삭제 실패');
    else { div.remove(); }
  });
  lib.prepend(div);
}

async function loadImageLibrary() {
  const lib = document.getElementById('imageLibrary');
  const res = await fetch('/r2/list');
  if (!res.ok) { lib.innerHTML = `<div style="grid-column:1/-1; color:var(--accent);">로딩 실패</div>`; return; }
  uploadedImages = await res.json();
  if (uploadedImages.length === 0) {
    lib.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:var(--text-dim); font-family:var(--font-mono); font-size:0.75rem; padding:1rem;">업로드된 이미지 없음</div>`;
    return;
  }
  lib.innerHTML = uploadedImages.map(item => {
    return `<div class="image-lib-item" data-url="${item.url}" data-name="${escapeHtml(item.name)}">
      <img src="${item.url}" loading="lazy" alt=""><div class="lib-overlay">클릭해서 삽입</div>
      <button class="lib-delete" title="삭제">✕</button></div>`;
  }).join('');

  lib.querySelectorAll('.image-lib-item').forEach(item => {
    const url = item.dataset.url, name = item.dataset.name;
    item.addEventListener('click', e => {
      if (e.target.classList.contains('lib-delete')) return;
      insertImageToEditor(url, name.replace(/\.[^.]+$/, ''));
    });
    item.addEventListener('contextmenu', e => {
      e.preventDefault();
      document.getElementById('f_thumb').value = url;
      flashMsg(`썸네일로 설정: ${name}`);
    });
    item.querySelector('.lib-delete').addEventListener('click', async e => {
      e.stopPropagation();
      if (!confirm(`"${name}" 삭제?`)) return;
      const token = session?.access_token || '';
      const res = await fetch(`/r2/delete?name=${encodeURIComponent(name)}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) alert('삭제 실패');
      else { item.remove(); }
    });
  });
}

function flashMsg(text) {
  const el = document.getElementById('uploadProgress');
  el.textContent = '✓ ' + text;
  el.style.color = 'var(--accent-2)';
  setTimeout(() => { el.textContent = ''; }, 2500);
}

async function saveVtuber() {
  const msg = document.getElementById('saveMsg');
  const id = document.getElementById('editId').value;
  const name = document.getElementById('f_name').value.trim();
  const slug = normalizeSlug(document.getElementById('f_slug').value);

  if (!name) { msg.textContent = '이름은 필수입니다.'; msg.style.color = 'var(--accent)'; return; }
  if (!slug) { msg.textContent = '슬러그는 필수입니다.'; msg.style.color = 'var(--accent)'; return; }

  const rAvatar = parseFloat(document.getElementById('f_r_avatar').value) || 0;
  const rComm = parseFloat(document.getElementById('f_r_comm').value) || 0;
  const rSinging = parseFloat(document.getElementById('f_r_singing').value) || 0;
  const rAttend = parseFloat(document.getElementById('f_r_attend').value) || 0;
  const items = [rAvatar, rComm, rSinging, rAttend].filter(x => x > 0);
  const totalRating = items.length ? items.reduce((a,b) => a+b, 0) / items.length : 0;

  const tags = document.getElementById('f_tags').value.split(',').map(s => s.trim()).filter(Boolean);
  const platforms = {
    soop: document.getElementById('f_soop').value || null,
    etc: document.getElementById('f_etc').value || null,
  };

  const payload = {
    name, slug,
    category: document.getElementById('f_category').value,
    agency: null,
    thumbnail_url: document.getElementById('f_thumb').value.trim() || null,
    debut_date: document.getElementById('f_debut').value || null,
    review_date: document.getElementById('f_review_date').value || null,
    updated_at: new Date().toISOString(),
    my_rating: Math.round(totalRating * 10) / 10,
    tags, platforms,
    broadcast_hours: parseFloat(document.getElementById('f_hours').value) || null,
    fans: parseInt(document.getElementById('f_fans').value) || null,
    fanclub: parseInt(document.getElementById('f_fanclub').value) || null,
    subscribers: parseInt(document.getElementById('f_subs').value) || null,
    rating_avatar: rAvatar, rating_comm: rComm,
    rating_singing: rSinging, rating_attend: rAttend,
    my_review: mdEditor.value() || null,
  };

  const res = id
    ? await db.from('vtubers').update(payload).eq('id', id)
    : await db.from('vtubers').insert(payload);

  if (res.error) {
    msg.textContent = res.error.code === '23505' ? '이미 사용 중인 슬러그입니다.' : '저장 실패: ' + res.error.message;
    msg.style.color = 'var(--accent)';
  } else {
    // 캐시 퍼지 — 저장 후 즉시 반영
    fetch(`/api/purge?table=vtubers&slug=${encodeURIComponent(slug)}`, { method: 'POST' }).catch(() => {});
    msg.textContent = id ? '수정 완료' : '등록 완료';
    msg.style.color = 'var(--accent-2)';
    resetForm();
    loadAdminList();
  }
}

function normalizeSlug(input) {
  return String(input || '').toLowerCase().trim()
    .replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function resetForm() {
  ['editId','f_name','f_slug','f_thumb','f_debut','f_review_date','f_tags','f_soop','f_etc','f_hours','f_fans','f_fanclub','f_subs']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.getElementById('f_category').value = '리뷰';
  ['f_r_avatar','f_r_comm','f_r_singing','f_r_attend'].forEach(id => {
    document.getElementById(id).value = '0';
  });
  document.querySelectorAll('.admin-star-input button').forEach(b => b.classList.remove('active'));
  document.getElementById('saveMsg').textContent = '';
  if (mdEditor) mdEditor.value('');
  const lib = document.getElementById('imageLibrary');
  const btn = document.getElementById('libraryToggle');
  if (lib && btn) { lib.classList.add('hidden'); btn.textContent = '기존 이미지 보기 ▾'; }
}

let adminAllData = [];
let adminPage = 0;
const ADMIN_PAGE_SIZE = 10;
let adminSearchQuery = '';

async function loadAdminList() {
  const { data } = await db.from('vtubers').select('*').order('created_at', { ascending: false });
  adminAllData = data || [];
  adminPage = 0;
  renderAdminList();
}

function renderAdminList() {
  const list = document.getElementById('adminList');
  if (!list) return;

  // 검색창이 없으면 최초 한 번만 생성
  if (!document.getElementById('adminSearch')) {
    const searchWrap = document.createElement('div');
    searchWrap.style.cssText = 'display:flex; gap:0.5rem; margin-bottom:0.8rem;';
    searchWrap.innerHTML = `<input type="text" id="adminSearch" placeholder="이름 또는 슬러그 검색..."
      style="flex:1; padding:0.4rem 0.6rem; background:var(--bg); border:1px solid var(--border); color:var(--text); border-radius:2px; font-size:0.8rem;">`;
    list.before(searchWrap);
    document.getElementById('adminSearch').addEventListener('input', (e) => {
      adminSearchQuery = e.target.value;
      adminPage = 0;
      renderAdminList();
    });
  }

  const filtered = adminAllData.filter(v =>
    !adminSearchQuery ||
    v.name?.toLowerCase().includes(adminSearchQuery.toLowerCase()) ||
    v.slug?.toLowerCase().includes(adminSearchQuery.toLowerCase())
  );

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  const start = adminPage * ADMIN_PAGE_SIZE;
  const paged = filtered.slice(start, start + ADMIN_PAGE_SIZE);

  if (total === 0) {
    list.innerHTML = '<div class="empty-state">검색 결과 없음</div>';
    return;
  }

  list.innerHTML = `
    ${paged.map(v => `
      <div class="admin-row">
        <img src="${escapeHtml(v.thumbnail_url || '')}" onerror="this.style.visibility='hidden'">
        <div class="admin-row-name">
          <div style="font-weight:700;">${escapeHtml(v.name)}</div>
          <div style="font-size:0.75rem; color:var(--text-dim); font-family:var(--font-mono);">
            ${escapeHtml(v.category || '리뷰')} · /v/${escapeHtml(v.slug || '—')}
          </div>
        </div>
        <button class="btn btn-ghost" onclick="editVtuber('${v.id}')">수정</button>
        <button class="btn btn-ghost" onclick="deleteVtuber('${v.id}', '${escapeHtml(v.name).replace(/'/g,"\\'")}')">삭제</button>
      </div>
    `).join('')}
    <div style="display:flex; align-items:center; justify-content:space-between; margin-top:0.8rem; font-family:var(--font-mono); font-size:0.75rem; color:var(--text-dim);">
      <span>${start + 1}–${Math.min(start + ADMIN_PAGE_SIZE, total)} / ${total}개</span>
      <div style="display:flex; gap:0.4rem;">
        <button class="btn btn-ghost" style="padding:0.3rem 0.6rem; font-size:0.7rem;" onclick="adminPageChange(-1)" ${adminPage === 0 ? 'disabled' : ''}>◀</button>
        <span style="padding:0.3rem 0.4rem;">${adminPage + 1} / ${totalPages}</span>
        <button class="btn btn-ghost" style="padding:0.3rem 0.6rem; font-size:0.7rem;" onclick="adminPageChange(1)" ${adminPage >= totalPages - 1 ? 'disabled' : ''}>▶</button>
      </div>
    </div>
  `;
}

function adminPageChange(dir) {
  adminPage += dir;
  renderAdminList();
}
window.adminPageChange = adminPageChange;

async function editVtuber(id) {
  const { data: v } = await db.from('vtubers').select('*').eq('id', id).single();
  if (!v) return;
  document.getElementById('editId').value = v.id;
  document.getElementById('f_name').value = v.name || '';
  document.getElementById('f_slug').value = v.slug || '';
  document.getElementById('f_category').value = v.category || '리뷰';
  document.getElementById('f_thumb').value = v.thumbnail_url || '';
  document.getElementById('f_debut').value = v.debut_date || '';
  document.getElementById('f_review_date').value = v.review_date || '';
  document.getElementById('f_tags').value = (v.tags || []).join(', ');
  document.getElementById('f_soop').value = v.platforms?.soop || '';
  document.getElementById('f_etc').value = v.platforms?.etc || '';
  document.getElementById('f_hours').value = v.broadcast_hours || '';
  document.getElementById('f_fans').value = v.fans || '';
  document.getElementById('f_fanclub').value = v.fanclub || '';
  document.getElementById('f_subs').value = v.subscribers || '';

  // 별점 복원
  const ratingFields = {
    f_r_avatar: v.rating_avatar || 0,
    f_r_comm: v.rating_comm || 0,
    f_r_singing: v.rating_singing || 0,
    f_r_attend: v.rating_attend || 0,
  };
  Object.entries(ratingFields).forEach(([fieldId, val]) => {
    document.getElementById(fieldId).value = val;
    const group = document.querySelector(`.admin-star-input[data-field="${fieldId}"]`);
    if (group) group.querySelectorAll('button').forEach((b, i) => b.classList.toggle('active', i < val));
  });

  if (mdEditor) mdEditor.value(v.my_review || '');
  toggleLibrary(true);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteVtuber(id, name) {
  if (!confirm(`"${name}" 삭제하시겠습니까?`)) return;
  const { error } = await db.from('vtubers').delete().eq('id', id);
  if (error) alert('삭제 실패: ' + error.message);
  else {
    fetch('/api/purge?table=vtubers', { method: 'POST' }).catch(() => {});
    loadAdminList();
  }
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

window.editVtuber = editVtuber;
window.deleteVtuber = deleteVtuber;
async function loadMessages() {
  const { data } = await db.from('messages').select('*').order('created_at', { ascending: false }).limit(50);
  const list = document.getElementById('msgList');
  if (!data || data.length === 0) { list.innerHTML = '<div class="empty-state">수신 메시지 없음</div>'; return; }
  list.innerHTML = data.map(m => {
    const date = new Date(m.created_at).toLocaleDateString('ko-KR');
    const readCls = m.is_read ? 'color:var(--text-dim)' : 'color:var(--accent-2)';
    return `
      <div class="admin-row" style="flex-direction:column; align-items:flex-start; gap:0.4rem;">
        <div style="display:flex; width:100%; justify-content:space-between; align-items:center;">
          <div style="font-family:var(--font-mono); font-size:0.75rem; ${readCls};">
            ${escapeHtml(m.name || '익명')} · ${date}
            ${m.is_read ? '' : ' · 🔴 NEW'}
          </div>
          <div style="display:flex; gap:0.4rem;">
            ${m.is_read ? '' : `<button class="btn btn-ghost" style="padding:0.3rem 0.6rem; font-size:0.65rem;" onclick="markRead('${m.id}')">읽음</button>`}
            <button class="btn btn-ghost" style="padding:0.3rem 0.6rem; font-size:0.65rem;" onclick="deleteMsg('${m.id}')">삭제</button>
          </div>
        </div>
        <div style="font-size:0.9rem; line-height:1.5; color:var(--text);">${escapeHtml(m.content)}</div>
      </div>
    `;
  }).join('');
}

async function markRead(id) {
  await db.from('messages').update({ is_read: true }).eq('id', id);
  loadMessages();
}

async function deleteMsg(id) {
  if (!confirm('삭제하시겠습니까?')) return;
  await db.from('messages').delete().eq('id', id);
  loadMessages();
}

window.markRead = markRead;
window.deleteMsg = deleteMsg;

async function loadCommentMgmt() {
  const { data } = await db.from('visitor_ratings')
    .select('*, vtubers(name, slug)')
    .eq('is_read', false)
    .not('comment', 'is', null)
    .neq('comment', '')
    .order('created_at', { ascending: false })
    .limit(100);
  const list = document.getElementById('commentMgmtList');
  if (!data || data.length === 0) {
    list.innerHTML = '<div class="empty-state">미확인 댓글 없음</div>';
    return;
  }
  list.innerHTML = data.map(c => {
    const date = new Date(c.created_at).toLocaleDateString('ko-KR');
    const vtuberName = c.vtubers?.name || '알 수 없음';
    const slug = c.vtubers?.slug || '';
    return `
      <div class="admin-row" style="flex-direction:column; align-items:flex-start; gap:0.4rem;">
        <div style="display:flex; width:100%; justify-content:space-between; align-items:center;">
          <div style="font-family:var(--font-mono); font-size:0.75rem; color:var(--accent-2);">
            🔴 <a href="/v/${slug}" target="_blank" style="color:var(--accent-2);">${escapeHtml(vtuberName)}</a> · ${date}
          </div>
          <div style="display:flex; gap:0.4rem;">
            <button class="btn btn-ghost" style="padding:0.3rem 0.6rem; font-size:0.65rem;" onclick="markCommentRead('${c.id}')">읽음</button>
            <button class="btn btn-ghost" style="padding:0.3rem 0.6rem; font-size:0.65rem;" onclick="deleteComment('${c.id}')">삭제</button>
          </div>
        </div>
        <div style="font-size:0.9rem; line-height:1.5; color:var(--text);">${escapeHtml(c.comment)}</div>
      </div>
    `;
  }).join('');
}

async function markCommentRead(id) {
  await db.from('visitor_ratings').update({ is_read: true }).eq('id', id);
  loadCommentMgmt();
}

async function deleteComment(id) {
  if (!confirm('댓글을 삭제하시겠습니까?')) return;
  await db.from('visitor_ratings').delete().eq('id', id);
  loadCommentMgmt();
}

window.markCommentRead = markCommentRead;
window.deleteComment = deleteComment;
checkAuth();

// ===== 통계 동기화 =====
async function syncStats(slug = null) {
  const status = document.getElementById('syncStatus');
  const token = session?.access_token || '';

  if (slug) {
    // 단일 slug: Worker 직접 호출 (빠름)
    if (status) { status.textContent = '동기화 중...'; status.style.color = 'var(--accent-2)'; }
    try {
      const res = await fetch('/sync/stats', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      const data = await res.json();
      if (status) {
        status.textContent = `완료: 성공 ${data.success} / 실패 ${data.fail}`;
        status.style.color = data.fail > 0 ? 'var(--accent)' : 'var(--accent-2)';
        setTimeout(() => { status.textContent = ''; }, 5000);
      }
      loadAdminList();
    } catch (e) {
      if (status) { status.textContent = '동기화 실패'; status.style.color = 'var(--accent)'; }
    }
  } else {
    // 전체: Worker 배치 처리
    if (status) { status.textContent = '동기화 중...'; status.style.color = 'var(--accent-2)'; }
    try {
      const res = await fetch('/sync/stats', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ offset: 0 }),
      });
      const data = await res.json();
      if (status) {
        const msg = data.hasMore ? `1차 완료 (${data.success}건), 나머지 백그라운드 처리 중...` : `완료: 성공 ${data.success} / 실패 ${data.fail}`;
        status.textContent = msg;
        status.style.color = data.fail > 0 ? 'var(--accent)' : 'var(--accent-2)';
        setTimeout(() => { status.textContent = ''; loadAdminList(); }, 5000);
      }
    } catch (e) {
      if (status) { status.textContent = '동기화 실패'; status.style.color = 'var(--accent)'; }
    }
  }
}

async function syncSingleStats(slug) {
  await syncStats(slug);
}

window.syncStats = syncStats;
window.syncSingleStats = syncSingleStats;
