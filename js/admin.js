// ===== 관리자 페이지 =====

let editingId = null;
let currentUser = null;

// ===== 인증 =====
async function checkAuth() {
  const { data: { user } } = await db.auth.getUser();
  if (user) {
    currentUser = user;
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('adminSection').style.display = 'block';
    loadAdminList();
  }
}

async function login() {
  const email = document.getElementById('loginEmail').value;
  const pw = document.getElementById('loginPw').value;
  const msg = document.getElementById('loginMsg');
  const { error } = await db.auth.signInWithPassword({ email, password: pw });
  if (error) { msg.textContent = '로그인 실패: ' + error.message; return; }
  checkAuth();
}

async function logout() {
  await db.auth.signOut();
  location.reload();
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
    return `
    <div class="admin-item">
      <div class="admin-item-info">
        <strong>${escapeHtml(v.name)}</strong>
        <span class="admin-item-meta">[${escapeHtml(cat)}] ${v.debut_date ? 'DEBUT ' + v.debut_date : '—'} · ★ ${totalScore.toFixed(1)}</span>
      </div>
      <button class="btn btn-ghost" onclick="editVtuber('${v.id}')">수정</button>
      <button class="btn btn-ghost" onclick="deleteVtuber('${v.id}', '${escapeHtml(v.name).replace(/'/g, "\\'")}')">삭제</button>
    </div>
  `;
  }).join('');
}

// ===== 새 등록 / 수정 =====
function newVtuber() {
  editingId = null;
  clearForm();
  document.getElementById('formSection').style.display = 'block';
  document.getElementById('formTitle').textContent = '새 버추얼 스트리머 등록';
  window.scrollTo({ top: document.getElementById('formSection').offsetTop, behavior: 'smooth' });
}

async function editVtuber(id) {
  const { data: v } = await db.from('vtubers').select('*').eq('id', id).single();
  if (!v) return;

  editingId = id;
  document.getElementById('formSection').style.display = 'block';
  document.getElementById('formTitle').textContent = '수정: ' + v.name;

  // 기본 필드
  document.getElementById('f_name').value = v.name || '';
  document.getElementById('f_slug').value = v.slug || '';
  document.getElementById('f_category').value = v.category || '리뷰';
  document.getElementById('f_debut').value = v.debut_date || '';
  document.getElementById('f_tags').value = (v.tags || []).join(', ');
  document.getElementById('f_thumbnail').value = v.thumbnail_url || '';
  document.getElementById('f_soop_id').value = v.soop_id || '';

  // 상세 필드
  document.getElementById('f_total_hours').value = v.total_hours || '';
  document.getElementById('f_favorites').value = v.favorites || '';
  document.getElementById('f_fanclub').value = v.fanclub || '';
  document.getElementById('f_subscribers').value = v.subscribers || '';

  // 작성날짜
  document.getElementById('f_created_date').value = v.created_date || '';

  // 세분화 별점 클릭 UI 반영
  setStarRating('f_rating_avatar', v.rating_avatar || 0);
  setStarRating('f_rating_comm', v.rating_comm || 0);
  setStarRating('f_rating_song', v.rating_song || 0);
  setStarRating('f_rating_attendance', v.rating_attendance || 0);

  // 리뷰 (마크다운 에디터)
  if (document.getElementById('f_review')) {
    document.getElementById('f_review').value = v.my_review || '';
  }

  window.scrollTo({ top: document.getElementById('formSection').offsetTop, behavior: 'smooth' });
}

function clearForm() {
  document.getElementById('f_name').value = '';
  document.getElementById('f_slug').value = '';
  document.getElementById('f_category').value = '리뷰';
  document.getElementById('f_debut').value = '';
  document.getElementById('f_tags').value = '';
  document.getElementById('f_thumbnail').value = '';
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
  if (document.getElementById('f_review')) document.getElementById('f_review').value = '';
  document.getElementById('saveMsg').textContent = '';
}

// ===== 별점 클릭 UI =====
function initStarInputs() {
  document.querySelectorAll('.star-input-group').forEach(group => {
    const fieldId = group.dataset.field;
    const starBtns = group.querySelectorAll('.star-input-btn');
    starBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const val = parseInt(btn.dataset.val);
        setStarRating(fieldId, val);
      });
    });
  });
}

function setStarRating(fieldId, val) {
  const group = document.querySelector(`.star-input-group[data-field="${fieldId}"]`);
  if (!group) return;
  const starBtns = group.querySelectorAll('.star-input-btn');
  starBtns.forEach((btn, i) => {
    btn.textContent = i < val ? '★' : '☆';
    btn.classList.toggle('active', i < val);
  });
  group.dataset.value = val;
}

function getStarRating(fieldId) {
  const group = document.querySelector(`.star-input-group[data-field="${fieldId}"]`);
  return group ? parseInt(group.dataset.value || '0') : 0;
}

// ===== 저장 =====
async function saveVtuber() {
  const msg = document.getElementById('saveMsg');
  const name = document.getElementById('f_name').value.trim();
  const slug = normalizeSlug(document.getElementById('f_slug').value);

  if (!name) { msg.textContent = '이름은 필수입니다.'; msg.style.color = 'var(--accent)'; return; }

  const tagsRaw = document.getElementById('f_tags').value;
  const tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean);

  // 세분화 별점
  const ratingAvatar = getStarRating('f_rating_avatar');
  const ratingComm = getStarRating('f_rating_comm');
  const ratingSong = getStarRating('f_rating_song');
  const ratingAttendance = getStarRating('f_rating_attendance');

  // 총점(평균) → my_rating에도 저장 (하위호환)
  const scores = [ratingAvatar, ratingComm, ratingSong, ratingAttendance].filter(s => s > 0);
  const myRating = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  const record = {
    name,
    slug: slug || null,
    category: document.getElementById('f_category').value,
    debut_date: document.getElementById('f_debut').value || null,
    tags,
    thumbnail_url: document.getElementById('f_thumbnail').value || null,
    soop_id: document.getElementById('f_soop_id').value.trim() || null,
    total_hours: document.getElementById('f_total_hours').value || null,
    favorites: document.getElementById('f_favorites').value || null,
    fanclub: document.getElementById('f_fanclub').value || null,
    subscribers: document.getElementById('f_subscribers').value || null,
    created_date: document.getElementById('f_created_date').value || null,
    rating_avatar: ratingAvatar,
    rating_comm: ratingComm,
    rating_song: ratingSong,
    rating_attendance: ratingAttendance,
    my_rating: Math.round(myRating * 10) / 10,
    my_review: document.getElementById('f_review') ? document.getElementById('f_review').value : null,
  };

  let error;
  if (editingId) {
    ({ error } = await db.from('vtubers').update(record).eq('id', editingId));
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
    setTimeout(() => {
      document.getElementById('formSection').style.display = 'none';
    }, 800);
  }
}

async function deleteVtuber(id, name) {
  if (!confirm(`"${name}" 을(를) 삭제하시겠습니까?`)) return;
  await db.from('vtubers').delete().eq('id', id);
  loadAdminList();
}

function normalizeSlug(val) {
  return (val || '').toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/--+/g, '-').replace(/^-|-$/g, '');
}

function calcTotalScore(v) {
  const scores = [
    v.rating_avatar || 0,
    v.rating_comm || 0,
    v.rating_song || 0,
    v.rating_attendance || 0
  ].filter(s => s > 0);
  if (scores.length === 0) return v.my_rating || 0;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ===== 초기화 =====
checkAuth();
// star input 초기화는 DOM 로드 후
document.addEventListener('DOMContentLoaded', () => {
  initStarInputs();
});
