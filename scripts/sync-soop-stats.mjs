import fetch from 'node-fetch';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

// 현재 월 + 이전 달 계산
function getMonthsToSync() {
  const months = [];
  const now = new Date();
  for (let i = 0; i < 2; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

// 풍투데이 slug 추출
function extractPoongSlug(platforms) {
  const url = platforms?.etc;
  if (!url) return null;
  const match = url.match(/poong\.today\/broadcast\/([^/?]+)/);
  return match ? match[1] : null;
}

// 풍투데이 월별 데이터 가져오기
async function fetchPoongData(slug, yearMonth) {
  const [year, month] = yearMonth.split('-');
  try {
    const res = await fetch(
      `https://static.poong.today/bj/detail/get?id=${slug}&year=${year}&month=${parseInt(month)}`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (!res.ok) return null;
    const data = await res.json();

    const balloon = data.b ?? 0;
    const broadcastSec = (data.c || []).reduce((sum, c) => sum + (c.t || 0), 0);
    const broadcastHours = Math.round(broadcastSec / 3600 * 10) / 10;

    return { balloon, broadcastHours };
  } catch { return null; }
}

// DB에서 slug 목록 가져오기
const res = await fetch(
  `${SUPABASE_URL}/rest/v1/vtubers?select=id,slug,name,platforms,balloon_history,broadcast_history&category=neq.소식&slug=not.is.null`,
  { headers }
);
const vtubers = await res.json();
console.log(`총 ${vtubers.length}개 처리 시작`);

const monthsToSync = getMonthsToSync();
console.log(`동기화 월: ${monthsToSync.join(', ')}`);

let success = 0, fail = 0;

for (const v of vtubers) {
  try {
    // SOOP API
    const apiRes = await fetch(
      `https://api-channel.sooplive.com/v1.1/channel/${v.slug}/dashboard`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (!apiRes.ok) { fail++; continue; }

    const data = await apiRes.json();
    const fans = data.upd?.fanCnt ?? null;
    const fanclub = data.fanclubCnt ?? null;
    const subscribers = data.subscription?.total ? parseInt(data.subscription.total) : null;
    const broadcastHours = data.station?.totalBroadTime ? Math.floor(data.station.totalBroadTime / 3600) : null;
    const lastBroadcast = data.station?.broadStart ? data.station.broadStart.split(' ')[0] : null;

    // 풍투데이 히스토리
    const poongSlug = extractPoongSlug(v.platforms);
    const balloonHistory = { ...(v.balloon_history || {}) };
    const broadcastHistory = { ...(v.broadcast_history || {}) };

    if (poongSlug) {
      for (const ym of monthsToSync) {
        const poong = await fetchPoongData(poongSlug, ym);
        if (poong) {
          balloonHistory[ym] = poong.balloon;
          broadcastHistory[ym] = poong.broadcastHours;
        }
        await new Promise(r => setTimeout(r, 200));
      }
    }

    const patch = await fetch(
      `${SUPABASE_URL}/rest/v1/vtubers?id=eq.${v.id}`,
      {
        method: 'PATCH',
        headers: { ...headers, 'Prefer': 'return=minimal' },
        body: JSON.stringify({
          fans, fanclub, subscribers,
          broadcast_hours: broadcastHours,
          last_broadcast: lastBroadcast,
          balloon_history: balloonHistory,
          broadcast_history: broadcastHistory,
        }),
      }
    );

    if (patch.ok) {
      console.log(`✅ ${v.name}: 팬 ${fans} / 별풍 ${balloonHistory[monthsToSync[0]] ?? '-'} / 방송 ${broadcastHours}h`);
      success++;
    } else { fail++; }

    await new Promise(r => setTimeout(r, 300));

  } catch (e) {
    console.log(`❌ ${v.name}: ${e.message}`);
    fail++;
  }
}

console.log(`\n완료: 성공 ${success} / 실패 ${fail}`);
