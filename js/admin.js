// ===== 관리자 페이지 =====
// Supabase Auth + 동적 폼 렌더링

let session = null;
let easyMDE = null;

// ===== 인증 =====
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
        <input type="password" id="loginPw" placeholder="••••••••"
               onkeydown="if(event.key==='Enter')doLogin()">
      </div>
      <button class="btn btn-accent" onclick="doLogin()">LOGIN</button>
      <div id="loginMsg" style="margin-top:0.5rem; font-size:0.75rem; color:var(--accent);"></div>
    </div>
  `;
}

async function doLogin() {
  const email = document.getElementById('loginEmail').value;
  const pw = document.getElementById('loginPw').value;
  const { error } = await db.auth.signInWithPassword({ email, password: pw });
  if (error) {
    document.getElementById('loginMsg').textContent = '로그인 실패: ' + error.message;
  } else {
    location.reload();
  }
}

// ===== 별점 클릭 헬퍼 (5개 별 HTML 생성) =====
function starInputHTML(fieldId, label) {
  return `
    <div class="star-input-row">
      <span class="star-input-label">${label}</span>
      <div class="star-input-group" data-field="${fieldId}" data-value="0">
        <button type="button" class="star-input-btn" data-val="1">☆</button>
        <button type="button" class="star-input-btn" data-val="2">☆</button>
        <button type="button" class="star-input-btn" data-val="3">☆</button>
        <button type="button" class="star-input-btn" data-val="4">☆</button>
        <button type="button" class="star-input-btn" data-val="5">☆</button>
      </div>
    </div>
  `;
}

// ===== 관리자 메인 UI =====
function renderAdmin() {
  document.getElementById('adminRoot').innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem;">
      <h2 class="section-title" style="margin:0;">버추얼 스트리머 관리</h2>
      <div style="display:flex; gap:0.5rem;">
        <button class="btn btn-accent" onclick="newVtuber()">+ 새 등록</button>
        <button class="btn btn-ghost" onclick="doLogout()">LOGOUT</button>
      </div>
    </div>

    <div id="adminList"><div class="loading">Loading...</div></div>

    <div id="formSection" style="display:none; margin-top:2rem;">
      <h3 class="section-title" id="formTitle">새 버추얼 스트리머 등록</h3>

      <div class="form-grid">
        <input type="hidden" id="editId" value="">

        <!-- 이름 + 슬러그 -->
        <div class="form-row two">
          <div class="form-row">
            <label>이름 *</label>
            <input type="text" id="f_name" required>
          </div>
          <div class="form-row">
            <label>슬러그 (URL용 영문)</label>
            <input type="text" id="f_slug" placeholder="banjucca" pattern="[a-z0-9-]+">
            <div style="font-size:0.65rem; color:var(--text-dim); margin-top:0.2rem; font-family:var(--font-mono);">
              URL: /v/슬러그 · 영문 소문자, 숫자, - 만 허용
            </div>
          </div>
        </div>

        <!-- 카테고리 + 데뷔일 + 작성날짜 -->
        <div class="form-row" style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:0.8rem;">
          <div class="form-row">
            <label>카테고리</label>
            <select id="f_category">
              <option value="데뷔정보">데뷔정보</option>
              <option value="리뷰" selected>리뷰</option>
              <option value="근황">근황</option>
            </select>
          </div>
          <div class="form-row">
            <label>데뷔일</label>
            <input type="text" id="f_debut" placeholder="2025-01-01">
          </div>
          <div class="form-row">
            <label>작성날짜</label>
            <input type="date" id="f_created_date">
          </div>
        </div>

        <!-- 태그 -->
        <div class="form-row">
          <label>태그 (쉼표 구분)</label>
          <input type="text" id="f_tags" placeholder="소통, 노래, 게임">
        </div>

        <!-- 썸네일 + SOOP 아이디 -->
        <div class="form-row two">
          <div class="form-row">
            <label>썸네일 URL</label>
            <input type="url" id="f_thumb" placeholder="https://...">
            <div style="font-size:0.7rem; color:var(--text-dim); margin-top:0.3rem; font-family:var(--font-mono);">
              ↓ 이미지 라이브러리에서 우클릭 → '썸네일로 설정'
            </div>
          </div>
          <div class="form-row">
            <label>SOOP 아이디</label>
            <input type="text" id="f_soop_id" placeholder="banjucca">
          </div>
        </div>

        <!-- 상세 필드: 누적방송시간, 애청자, 팬클럽, 구독 -->
        <div class="form-row four">
          <div class="form-row">
            <label>누적 방송시간</label>
            <input type="text" id="f_total_hours" placeholder="120시간">
          </div>
          <div class="form-row">
            <label>애청자</label>
            <input type="text" id="f_favorites" placeholder="350">
          </div>
          <div class="form-row">
            <label>팬클럽</label>
            <input type="text" id="f_fanclub" placeholder="120">
          </div>
          <div class="form-row">
            <label>구독</label>
            <input type="text" id="f_subscribers" placeholder="80">
          </div>
        </div>

        <!-- 세분화 별점 (클릭 UI) -->
        <div class="form-row">
          <label>별점 (각 항목 클릭 — 총점은 4항목 평균으로 자동 계산)</label>
          ${starInputHTML('f_rating_avatar', '아바타')}
          ${starInputHTML('f_rating_comm', '소통')}
          ${starInputHTML('f_rating_song', '노래')}
          ${starInputHTML('f_rating_attendance', '출석률')}
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
            <div style="grid-column:1/-1; text-align:center; color:var(--text-dim); font-family:var(--font-mono); font-size:0.75rem; padding:1rem;">로딩 중...</div>
          </div>
          <div style="font-size:0.7rem; color:var(--text-dim); margin-top:0.5rem; font-family:var(--font-mono);">
            업로드 직후 자동 삽입 · 라이브러리 이미지 좌클릭 → 리뷰 삽입 · 우클릭 → 썸네일로 설정 · ✕ → 삭제
          </div>
        </div>

        <!-- 리뷰 (마크다운) -->
        <div class="form-row">
          <label>리뷰 (마크다운)</label>
          <textarea id="f_review" rows="12"></textarea>
        </div>

        <!-- 저장/취소 -->
        <div style="display:flex; gap:0.8rem; margin-top:1rem;">
          <button class="btn btn-accent" onclick="saveVtuber()">저장</button>
          <button class="btn btn-ghost" onclick="cancelEdit()">취소</button>
        </div>
        <div id="saveMsg" style="margin-top:0.5rem; font-size:0.75rem;"></div>
      </div>
    </div>
  `;

  // 이벤트 바인딩
  document.getElementById('libraryToggle').addEventListener('click', () => {
    const lib = document.getElementById('imageLibrary');
    lib.classList.toggle('hidden');
    if (!lib.classList.contains('hidden')) loadImageLibrary();
  });

  // 업로드 존 이벤트
  const uploadZone = document.getElementById('uploadZone');
  const fileInput = document.getElementById('fileInput');
  uploadZone.addEventListener('click', () => fileInput.click());
  uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('dragover'); });
  uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
  uploadZone.addEventListener('drop', e => { e.preventDefault(); uploadZone.classList.remove('dragover'); handleFiles(e.dataTransfer.files); });
  fileInput.addEventListener('change', e => handleFiles(e.target.files));

  // Ctrl+V 클립보드 붙여넣기
  document.addEventListener('paste', e => {
    if (!document.getElementById('formSection')?.style.display || document.getElementById('formSection').style.display === 'none') return;
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        handleFiles([item.getAsFile()]);
        break;
      }
    }
  });

  // 별점 클릭 이벤트
  initStarInputs();

  // EasyMDE 초기화
  initEasyMDE();

  // 목록 로드
  loadAdminList();
}

// ===== EasyMDE =====
function initEasyMDE() {
  if (easyMDE) { easyMDE.toTextArea(); easyMDE = null; }
  const el = document.getElementById('f_review');
  if (!el || typeof EasyMDE === 'undefined') return;
  easyMDE = new EasyMDE({
    element: el,
    spellChecker: false,
    autosave: { enabled: false },
    toolbar: ['bold', 'italic', 'heading', '|', 'quote', 'unordered-list', 'ordered-list', '|',
              'link', 'image', 'table', '|', 'preview', 'side-by-side', 'fullscreen', '|', 'guide'],
    placeholder: '마크다운으로 리뷰 작성...',
    status: false,
    minHeight: '200px',
    previewRender: text => {
      if (typeof renderMarkdownHTML === 'function') return renderMarkdownHTML(text);
      if (typeof marked !== 'undefined') return DOMPurify.sanitize(marked.parse(text));
      return text;
    }
  });
}

// ===== 별점 클릭 UI =====
function initStarInputs() {
  document.querySelectorAll('.star-input-group').forEach(group => {
    group.querySelectorAll('.star-input-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = parseInt(btn.dataset.val);
        setStarRating(group.dataset.field, val);
      });
    });
  });
}

function setStarRating(fieldId, val) {
  const group = document.querySelector(`.star-input-group[data-field="${fieldId}"]`);
  if (!group) return;
  group.querySelectorAll('.star-input-btn').forEach((btn, i) => {
    btn.textContent = i < val ? '★' : '☆';
    btn.classList.toggle('active', i < val);
  });
  group.dataset.value = val;
}

function getStarRating(fieldId) {
  const group = document.querySelector(`.star-input-group[data-field="${fieldId}"]`);
  return group ? parseInt(group.dataset.value || '0') : 0;
}

// ===== 이미지 업로드 =====
async function handleFiles(files) {
  const progress = document.getElementById('uploadProgress');
  for (const file of files) {
    if (file.size > 10 * 1024 * 1024) { progress.textContent = `${file.name}: 10MB 초과`; continue; }
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['webp', 'gif', 'png', 'jpg', 'jpeg'].includes(ext)) { progress.textContent = `${file.name}: 미지원 형식`; continue; }

    const path = `reviews/${Date.now()}_${file.name}`;
    progress.textContent = `업로드 중: ${file.name}...`;

    const { error } = await db.storage.from('vtuber-images').upload(path, file, {
      cacheControl: '3600', upsert: false, contentType: file.type
    });

    if (error) {
      progress.textContent = `실패: ${error.message}`;
    } else {
      const { data: urlData } = db.storage.from('vtuber-images').getPublicUrl(path);
      if (easyMDE) easyMDE.codemirror.replaceSelection(`![${file.name}](${urlData.publicUrl})\n`);
      progress.textContent = `완료: ${file.name}`;
      const lib = document.getElementById('imageLibrary');
      if (lib && !lib.classList.contains('hidden')) loadImageLibrary();
    }
  }
}

async function loadImageLibrary() {
  const lib = document.getElementById('imageLibrary');
  const { data: files, error } = await db.storage.from('vtuber-images').list('reviews', {
    limit: 100, sortBy: { column: 'created_at', order: 'desc' }
  });

  if (error || !files || files.length === 0) {
    lib.innerHTML = '<div style="grid-column:1/-1; text-align:center; color:var(--text-dim); padding:1rem;">이미지 없음</div>';
    return;
  }

  lib.innerHTML = files.map(f => {
    const { data: urlData } = db.storage.from('vtuber-images').getPublicUrl(`reviews/${f.name}`);
    const url = urlData.publicUrl;
    return `
      <div class="image-lib-item" data-url="${escapeAttr(url)}">
        <img src="${escapeAttr(url)}" alt="${escapeAttr(f.name)}" loading="lazy"
             onclick="insertImageToEditor('${escapeAttr(url)}', '${escapeAttr(f.name)}')"
             oncontextmenu="event.preventDefault(); setThumbnail('${escapeAttr(url)}')">
        <button class="lib-delete" onclick="event.stopPropagation(); deleteImage('reviews/${escapeAttr(f.name)}')">✕</button>
        <div class="lib-overlay">${f.name}</div>
      </div>
    `;
  }).join('');
}

function insertImageToEditor(url, name) {
  if (easyMDE) easyMDE.codemirror.replaceSelection(`![${name}](${url})\n`);
}

function setThumbnail(url) {
  document.getElementById('f_thumb').value = url;
}

async function deleteImage(path) {
  if (!confirm('이 이미지를 삭제하시겠습니까?')) return;
  await db.storage.from('vtuber-images').remove([path]);
  loadImageLibrary();
}

// ===== 관리자 목록 =====
async function loadAdminList() {
  const { data: vtubers } = await db
    .from('vtubers')
    .select('*')
    .order('created_at', { ascending: false });

  const list = document.getElementById('adminList');
  if (!vtubers || vtubers.length === 0) {
    list.innerHTML = '<div class="empty-state">등록된 버추얼 스트리머가 없습니다.</div>';
    return;
  }

  list.innerHTML = vtubers.map(v => {
    const cat = v.category || '리뷰';
    const totalScore = calcTotalScore(v);
    const dateStr = v.created_date || '';
    return `
    <div class="admin-item">
      <div class="admin-item-info">
        <strong>${escapeHtml(v.name)}</strong>
        <span class="admin-item-meta">[${escapeHtml(cat)}] ${v.debut_date ? 'DEBUT ' + v.debut_date : '—'} · ★ ${totalScore.toFixed(1)} ${dateStr ? '· ' + dateStr : ''}</span>
      </div>
      <button class="btn btn-ghost" onclick="editVtuber('${v.id}')">수정</button>
      <button class="btn btn-ghost" onclick="deleteVtuber('${v.id}', '${escapeHtml(v.name).replace(/'/g, "\\'")}')">삭제</button>
    </div>
  `;
  }).join('');
}

// ===== 새 등록 / 수정 =====
function newVtuber() {
  document.getElementById('editId').value = '';
  clearForm();
  document.getElementById('formSection').style.display = 'block';
  document.getElementById('formTitle').textContent = '새 버추얼 스트리머 등록';
  window.scrollTo({ top: document.getElementById('formSection').offsetTop, behavior: 'smooth' });
}

async function editVtuber(id) {
  const { data: v } = await db.from('vtubers').select('*').eq('id', id).single();
  if (!v) return;

  document.getElementById('editId').value = id;
  document.getElementById('formSection').style.display = 'block';
  document.getElementById('formTitle').textContent = '수정: ' + v.name;

  document.getElementById('f_name').value = v.name || '';
  document.getElementById('f_slug').value = v.slug || '';
  document.getElementById('f_category').value = v.category || '리뷰';
  document.getElementById('f_debut').value = v.debut_date || '';
  document.getElementById('f_tags').value = (v.tags || []).join(', ');
  document.getElementById('f_thumb').value = v.thumbnail_url || '';
  document.getElementById('f_soop_id').value = v.soop_id || '';
  document.getElementById('f_total_hours').value = v.total_hours || '';
  document.getElementById('f_favorites').value = v.favorites || '';
  document.getElementById('f_fanclub').value = v.fanclub || '';
  document.getElementById('f_subscribers').value = v.subscribers || '';
  document.getElementById('f_created_date').value = v.created_date || '';

  setStarRating('f_rating_avatar', v.rating_avatar || 0);
  setStarRating('f_rating_comm', v.rating_comm || 0);
  setStarRating('f_rating_song', v.rating_song || 0);
  setStarRating('f_rating_attendance', v.rating_attendance || 0);

  if (easyMDE) easyMDE.value(v.my_review || '');

  window.scrollTo({ top: document.getElementById('formSection').offsetTop, behavior: 'smooth' });
}

function clearForm() {
  document.getElementById('f_name').value = '';
  document.getElementById('f_slug').value = '';
  document.getElementById('f_category').value = '리뷰';
  document.getElementById('f_debut').value = '';
  document.getElementById('f_tags').value = '';
  document.getElementById('f_thumb').value = '';
  document.getElementById('f_soop_id').value = '';
  document.getElementById('f_total_hours').value = '';
  document.getElementById('f_favorites').value = '';
  document.getElementById('f_fanclub').value = '';
  document.getElementById('f_subscribers').value = '';
  document.getElementById('f_created_date').value = '';
  setStarRating('f_rating_avatar', 0);
  setStarRating('f_rating_comm', 0);
  setStarRating('f_rating_song', 0);
  setStarRating('f_rating_attendance', 0);
  if (easyMDE) easyMDE.value('');
  document.getElementById('saveMsg').textContent = '';
}

function cancelEdit() {
  document.getElementById('formSection').style.display = 'none';
}

// ===== 저장 =====
async function saveVtuber() {
  const msg = document.getElementById('saveMsg');
  const id = document.getElementById('editId').value;
  const name = document.getElementById('f_name').value.trim();
  const slug = normalizeSlug(document.getElementById('f_slug').value);

  if (!name) { msg.textContent = '이름은 필수입니다.'; msg.style.color = 'var(--accent)'; return; }

  const tags = document.getElementById('f_tags').value.split(',').map(t => t.trim()).filter(Boolean);

  const rA = getStarRating('f_rating_avatar');
  const rC = getStarRating('f_rating_comm');
  const rS = getStarRating('f_rating_song');
  const rAt = getStarRating('f_rating_attendance');
  const scores = [rA, rC, rS, rAt].filter(s => s > 0);
  const myRating = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  const record = {
    name,
    slug: slug || null,
    category: document.getElementById('f_category').value,
    debut_date: document.getElementById('f_debut').value || null,
    tags,
    thumbnail_url: document.getElementById('f_thumb').value || null,
    soop_id: document.getElementById('f_soop_id').value.trim() || null,
    total_hours: document.getElementById('f_total_hours').value || null,
    favorites: document.getElementById('f_favorites').value || null,
    fanclub: document.getElementById('f_fanclub').value || null,
    subscribers: document.getElementById('f_subscribers').value || null,
    created_date: document.getElementById('f_created_date').value || null,
    rating_avatar: rA,
    rating_comm: rC,
    rating_song: rS,
    rating_attendance: rAt,
    my_rating: Math.round(myRating * 10) / 10,
    my_review: easyMDE ? easyMDE.value() : '',
  };

  let error;
  if (id) {
    ({ error } = await db.from('vtubers').update(record).eq('id', id));
  } else {
    ({ error } = await db.from('vtubers').insert(record));
  }

  if (error) {
    msg.textContent = '저장 실패: ' + error.message;
    msg.style.color = 'var(--accent)';
  } else {
    msg.textContent = '저장 완료!';
    msg.style.color = 'var(--accent-secondary)';
    loadAdminList();
    setTimeout(() => { document.getElementById('formSection').style.display = 'none'; }, 800);
  }
}

async function deleteVtuber(id, name) {
  if (!confirm(`"${name}" 을(를) 삭제하시겠습니까?`)) return;
  await db.from('vtubers').delete().eq('id', id);
  loadAdminList();
}

async function doLogout() {
  await db.auth.signOut();
  location.reload();
}

// ===== 유틸 =====
function normalizeSlug(val) {
  return (val || '').toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/--+/g, '-').replace(/^-|-$/g, '');
}

function calcTotalScore(v) {
  const scores = [v.rating_avatar || 0, v.rating_comm || 0, v.rating_song || 0, v.rating_attendance || 0].filter(s => s > 0);
  if (scores.length === 0) return v.my_rating || 0;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function escapeAttr(s) {
  return String(s || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// ===== 초기화 =====
checkAuth();
