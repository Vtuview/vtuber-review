// ===== 관리자 페이지 =====
// 마크다운 에디터 + Supabase Storage 드래그&드롭 업로드 + 이미지 라이브러리

let session = null;
let mdEditor = null;           // EasyMDE 인스턴스
let uploadedImages = [];       // 스토리지 이미지 목록 캐시

// ---------- 인증 ----------
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

// ---------- 관리자 폼 ----------
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

      <div class="form-row">
        <label>썸네일 URL</label>
        <input type="url" id="f_thumb" placeholder="https://... 또는 아래 이미지 라이브러리에서 선택">
        <div style="font-size:0.7rem; color:var(--text-dim); margin-top:0.3rem; font-family:var(--font-mono);">
          ↓ 이미지 라이브러리에서 우클릭 → '썸네일로 설정'
        </div>
      </div>

      <div class="form-row two">
        <div class="form-row">
          <label>데뷔일</label>
          <input type="date" id="f_debut">
        </div>
        <div class="form-row">
          <label>본인 별점 (0~5)</label>
          <input type="number" id="f_rating" min="0" max="5" step="0.1" value="0">
        </div>
      </div>

      <div class="form-row">
        <label>태그 (쉼표로 구분)</label>
        <input type="text" id="f_tags" placeholder="노래, 게임, 수다, ASMR">
      </div>

      <div class="form-row two">
        <div class="form-row">
          <label>SOOP URL</label>
          <input type="url" id="f_soop" placeholder="https://ch.sooplive.co.kr/...">
        </div>
        <div class="form-row">
          <label>기타 URL</label>
          <input type="url" id="f_etc" placeholder="트위터, 유튜브 채널 등">
        </div>
      </div>

      <!-- 이미지 업로드 영역 -->
      <div class="form-row">
        <label>📁 이미지 라이브러리 (WebP / GIF / PNG / JPG, 최대 10MB)</label>
        <div class="upload-zone" id="uploadZone">
          <div class="upload-icon">⬆</div>
          <p>파일을 드래그하거나 클릭해서 업로드</p>
          <p style="color:var(--text-dim); font-size:0.7rem;">움직이는 WebP · GIF 지원</p>
          <input type="file" id="fileInput" multiple accept="image/*" style="display:none;">
        </div>
        <div class="upload-progress" id="uploadProgress"></div>
        <button type="button" class="library-toggle" id="libraryToggle">
          기존 이미지 보기 ▾
        </button>
        <div class="image-library hidden" id="imageLibrary">
          <div style="grid-column: 1/-1; text-align:center; color:var(--text-dim); font-family:var(--font-mono); font-size:0.75rem; padding:1rem;">로딩 중...</div>
        </div>
        <div style="font-size:0.7rem; color:var(--text-dim); margin-top:0.5rem; font-family:var(--font-mono);">
          업로드 직후 자동 삽입 · 라이브러리 이미지 좌클릭 → 리뷰 삽입 · 우클릭 → 썸네일로 설정 · ✕ → 삭제
        </div>
      </div>

      <!-- 마크다운 에디터 -->
      <div class="form-row">
        <label>리뷰 (마크다운)</label>
        <textarea id="f_review"></textarea>
        <div style="font-size:0.7rem; color:var(--text-dim); margin-top:0.3rem; font-family:var(--font-mono); line-height:1.6;">
          💡 <strong>##</strong> 제목 · <strong>**굵게**</strong> · <strong>*기울임*</strong> · <strong>&gt;</strong> 인용 · 이미지는 라이브러리에서 클릭<br>
          🎬 <strong>임베드</strong>: 한 줄에 URL만 붙여넣으면 자동 변환 (YouTube, Twitch clips, SOOP VOD)<br>
          🎬 또는 <code>::soop[192718357]</code> / <code>::youtube[ID]</code> / <code>::twitch[clipname]</code> 문법 사용 가능<br>
          🎬 iframe 코드 직접 붙여넣기도 지원 (허용 도메인만 렌더됨)
        </div>
      </div>

      <div style="display:flex; gap:0.8rem;">
        <button class="btn" id="saveBtn">저장</button>
        <button class="btn btn-ghost" id="resetBtn">새로 작성</button>
      </div>
      <div id="saveMsg" style="font-family: var(--font-mono); font-size: 0.8rem;"></div>
    </div>

    <h2 class="section-title">등록된 목록</h2>
    <div class="admin-list" id="adminList"><div class="loading">Loading...</div></div>
  `;

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await db.auth.signOut();
    location.reload();
  });
  document.getElementById('saveBtn').addEventListener('click', saveVtuber);
  document.getElementById('resetBtn').addEventListener('click', resetForm);

  // 라이브러리 토글 버튼
  document.getElementById('libraryToggle').addEventListener('click', toggleLibrary);

  // 마크다운 에디터 초기화
  initEditor();
  // 업로드 영역 이벤트
  initUpload();
  // 신규 작성 모드 - 이미지 라이브러리는 토글로 열 때만 로드
  // 버튜버 목록
  loadAdminList();
}

// 라이브러리 토글 (숨김 <-> 표시)
let libraryLoaded = false;
function toggleLibrary(forceShow = false) {
  const lib = document.getElementById('imageLibrary');
  const btn = document.getElementById('libraryToggle');
  if (!lib || !btn) return;

  const willShow = forceShow === true || lib.classList.contains('hidden');

  if (willShow) {
    lib.classList.remove('hidden');
    btn.textContent = '기존 이미지 숨기기 ▴';
    if (!libraryLoaded) {
      loadImageLibrary();
      libraryLoaded = true;
    }
  } else {
    lib.classList.add('hidden');
    btn.textContent = '기존 이미지 보기 ▾';
  }
}

// ---------- 마크다운 에디터 ----------
function initEditor() {
  mdEditor = new EasyMDE({
    element: document.getElementById('f_review'),
    spellChecker: false,
    autofocus: false,
    placeholder: '리뷰를 마크다운으로 작성하세요...\n\n예:\n## 첫인상\n데뷔 방송부터 인상이 강렬했다.\n\n![데뷔 포스터](이미지 URL)\n\n- 장점: ...\n- 단점: ...',
    status: ['lines', 'words'],
    toolbar: [
      'bold', 'italic', 'heading', '|',
      'quote', 'unordered-list', 'ordered-list', '|',
      'link', 'image', 'table', 'horizontal-rule', '|',
      'preview', 'side-by-side', 'fullscreen', '|',
      'guide'
    ],
    previewRender: (plainText) => renderMarkdown(plainText),
  });
}

// ---------- 업로드 ----------
function initUpload() {
  const zone = document.getElementById('uploadZone');
  const input = document.getElementById('fileInput');

  zone.addEventListener('click', () => input.click());
  input.addEventListener('change', e => handleFiles(e.target.files));

  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
  });

  // 에디터 내에서 클립보드 붙여넣기로 이미지 업로드
  document.addEventListener('paste', e => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files = [];
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) handleFiles(files);
  });
}

async function handleFiles(files) {
  const progress = document.getElementById('uploadProgress');
  const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
  if (validFiles.length === 0) return;

  for (let i = 0; i < validFiles.length; i++) {
    const file = validFiles[i];
    progress.textContent = `업로드 중... (${i + 1}/${validFiles.length}) ${file.name}`;
    progress.style.color = 'var(--accent-2)';

    if (file.size > 10 * 1024 * 1024) {
      progress.textContent = `❌ ${file.name}: 10MB 초과`;
      progress.style.color = 'var(--accent)';
      continue;
    }

    const ext = file.name.split('.').pop().toLowerCase();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error } = await db.storage
      .from('review-images')
      .upload(fileName, file, {
        contentType: file.type,
        cacheControl: '31536000',
      });

    if (error) {
      progress.textContent = `❌ ${file.name}: ${error.message}`;
      progress.style.color = 'var(--accent)';
      console.error(error);
      continue;
    }

    // 업로드된 이미지를 에디터에 바로 삽입
    const url = publicUrl(fileName);
    insertImageToEditor(url, file.name.replace(/\.[^.]+$/, ''));
  }

  progress.textContent = `✓ ${validFiles.length}개 파일 업로드 완료`;
  progress.style.color = 'var(--accent-2)';
  setTimeout(() => { progress.textContent = ''; }, 3000);

  // 라이브러리 캐시 무효화. 열려있으면 즉시 새로고침
  libraryLoaded = false;
  const lib = document.getElementById('imageLibrary');
  if (lib && !lib.classList.contains('hidden')) {
    loadImageLibrary();
    libraryLoaded = true;
  }
}

function publicUrl(fileName) {
  const { data } = db.storage.from('review-images').getPublicUrl(fileName);
  return data.publicUrl;
}

function insertImageToEditor(url, alt = '') {
  const cm = mdEditor.codemirror;
  const doc = cm.getDoc();
  const cursor = doc.getCursor();
  const md = `\n![${alt}](${url})\n`;
  doc.replaceRange(md, cursor);
  cm.focus();
}

// ---------- 이미지 라이브러리 ----------
async function loadImageLibrary() {
  const lib = document.getElementById('imageLibrary');
  const { data, error } = await db.storage
    .from('review-images')
    .list('', { limit: 200, sortBy: { column: 'created_at', order: 'desc' } });

  if (error) {
    lib.innerHTML = `<div style="grid-column:1/-1; color:var(--accent);">로딩 실패: ${error.message}</div>`;
    return;
  }

  uploadedImages = data.filter(item => item.name && !item.name.startsWith('.'));

  if (uploadedImages.length === 0) {
    lib.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:var(--text-dim); font-family:var(--font-mono); font-size:0.75rem; padding:1rem;">아직 업로드된 이미지가 없습니다</div>`;
    return;
  }

  lib.innerHTML = uploadedImages.map(item => {
    const url = publicUrl(item.name);
    return `
      <div class="image-lib-item" data-url="${url}" data-name="${escapeHtml(item.name)}" title="${escapeHtml(item.name)}">
        <img src="${url}" loading="lazy" alt="">
        <div class="lib-overlay">클릭해서 삽입</div>
        <button class="lib-delete" title="삭제">✕</button>
      </div>
    `;
  }).join('');

  // 이벤트 바인딩
  lib.querySelectorAll('.image-lib-item').forEach(item => {
    const url = item.dataset.url;
    const name = item.dataset.name;

    // 좌클릭: 에디터에 삽입
    item.addEventListener('click', (e) => {
      if (e.target.classList.contains('lib-delete')) return;
      insertImageToEditor(url, name.replace(/\.[^.]+$/, ''));
    });

    // 우클릭: 썸네일로 설정
    item.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      document.getElementById('f_thumb').value = url;
      flashMsg(`썸네일로 설정: ${name}`);
    });

    // 삭제 버튼
    item.querySelector('.lib-delete').addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm(`"${name}" 삭제하시겠습니까? (리뷰에 사용 중인 경우 깨질 수 있음)`)) return;
      const { error } = await db.storage.from('review-images').remove([name]);
      if (error) alert('삭제 실패: ' + error.message);
      else {
        libraryLoaded = false;
        loadImageLibrary();
        libraryLoaded = true;
      }
    });
  });
}

function flashMsg(text) {
  const el = document.getElementById('uploadProgress');
  el.textContent = '✓ ' + text;
  el.style.color = 'var(--accent-2)';
  setTimeout(() => { el.textContent = ''; }, 2500);
}

// ---------- 저장 / 수정 / 삭제 ----------
async function saveVtuber() {
  const msg = document.getElementById('saveMsg');
  const id = document.getElementById('editId').value;
  const name = document.getElementById('f_name').value.trim();
  const slug = normalizeSlug(document.getElementById('f_slug').value);

  if (!name) {
    msg.textContent = '이름은 필수입니다.';
    msg.style.color = 'var(--accent)';
    return;
  }
  if (!slug) {
    msg.textContent = '슬러그는 필수입니다. (URL에 쓰일 영문)';
    msg.style.color = 'var(--accent)';
    return;
  }

  const tags = document.getElementById('f_tags').value
    .split(',').map(s => s.trim()).filter(Boolean);
  const platforms = {
    soop: document.getElementById('f_soop').value || null,
    etc: document.getElementById('f_etc').value || null,
  };

  const payload = {
    name,
    slug,
    agency: null,
    thumbnail_url: document.getElementById('f_thumb').value.trim() || null,
    debut_date: document.getElementById('f_debut').value || null,
    my_rating: parseFloat(document.getElementById('f_rating').value) || 0,
    tags,
    platforms,
    my_review: mdEditor.value() || null,
  };

  const res = id
    ? await db.from('vtubers').update(payload).eq('id', id)
    : await db.from('vtubers').insert(payload);

  if (res.error) {
    if (res.error.code === '23505' || res.error.message?.includes('slug')) {
      msg.textContent = '이미 사용 중인 슬러그입니다. 다른 걸 입력해주세요.';
    } else {
      msg.textContent = '저장 실패: ' + res.error.message;
    }
    msg.style.color = 'var(--accent)';
  } else {
    msg.textContent = id ? '수정 완료' : '등록 완료';
    msg.style.color = 'var(--accent-2)';
    resetForm();
    loadAdminList();
  }
}

// 슬러그 정규화: 영문 소문자 + 숫자 + 하이픈만 허용
function normalizeSlug(input) {
  return String(input || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')   // 허용 외 문자는 하이픈으로
    .replace(/-+/g, '-')             // 연속 하이픈 하나로
    .replace(/^-|-$/g, '');          // 앞뒤 하이픈 제거
}

function resetForm() {
  ['editId','f_name','f_slug','f_thumb','f_debut','f_tags','f_soop','f_etc']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.getElementById('f_rating').value = '0';
  document.getElementById('saveMsg').textContent = '';
  if (mdEditor) mdEditor.value('');

  // 신규 작성 상태로 돌아갈 때 라이브러리 접기
  const lib = document.getElementById('imageLibrary');
  const btn = document.getElementById('libraryToggle');
  if (lib && btn) {
    lib.classList.add('hidden');
    btn.textContent = '기존 이미지 보기 ▾';
  }
}

async function loadAdminList() {
  const { data } = await db.from('vtubers').select('*').order('created_at', { ascending: false });
  const list = document.getElementById('adminList');
  if (!data || data.length === 0) {
    list.innerHTML = '<div class="empty-state">등록된 항목이 없습니다.</div>';
    return;
  }
  list.innerHTML = data.map(v => `
    <div class="admin-row">
      <img src="${escapeHtml(v.thumbnail_url || '')}" onerror="this.style.visibility='hidden'">
      <div class="admin-row-name">
        <div style="font-weight:700;">${escapeHtml(v.name)}</div>
        <div style="font-size:0.75rem; color:var(--text-dim); font-family:var(--font-mono);">
          ${v.slug ? '/v/' + escapeHtml(v.slug) : '—'} · ★ ${v.my_rating || 0}
        </div>
      </div>
      <button class="btn btn-ghost" onclick="editVtuber('${v.id}')">수정</button>
      <button class="btn btn-ghost" onclick="deleteVtuber('${v.id}', '${escapeHtml(v.name).replace(/'/g,"\\'")}')">삭제</button>
    </div>
  `).join('');
}

async function editVtuber(id) {
  const { data: v } = await db.from('vtubers').select('*').eq('id', id).single();
  if (!v) return;
  document.getElementById('editId').value = v.id;
  document.getElementById('f_name').value = v.name || '';
  document.getElementById('f_slug').value = v.slug || '';
  document.getElementById('f_thumb').value = v.thumbnail_url || '';
  document.getElementById('f_debut').value = v.debut_date || '';
  document.getElementById('f_rating').value = v.my_rating || 0;
  document.getElementById('f_tags').value = (v.tags || []).join(', ');
  document.getElementById('f_soop').value = v.platforms?.soop || '';
  document.getElementById('f_etc').value = v.platforms?.etc || '';
  if (mdEditor) mdEditor.value(v.my_review || '');

  // 수정 모드에서는 이미지 라이브러리 자동으로 펼치기
  toggleLibrary(true);

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteVtuber(id, name) {
  if (!confirm(`"${name}" 삭제하시겠습니까?`)) return;
  const { error } = await db.from('vtubers').delete().eq('id', id);
  if (error) alert('삭제 실패: ' + error.message);
  else loadAdminList();
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

window.editVtuber = editVtuber;
window.deleteVtuber = deleteVtuber;

checkAuth();
