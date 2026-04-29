import fetch from 'node-fetch';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

// 1. DB에서 slug 목록 가져오기 (소식만 제외, 예정 포함)
const res = await fetch(
  `${SUPABASE_URL}/rest/v1/vtubers?select=id,slug,name&category=neq.소식&slug=not.is.null`,
  { headers }
);
const vtubers = await res.json();
console.log(`총 ${vtubers.length}개 처리 시작`);

let success = 0, fail = 0;

for (const v of vtubers) {
  try {
    const apiRes = await fetch(
      `https://api-channel.sooplive.com/v1.1/channel/${v.slug}/dashboard`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );

    if (!apiRes.ok) {
      console.log(`❌ ${v.name} (${v.slug}): API ${apiRes.status}`);
      fail++;
      continue;
    }

    const data = await apiRes.json();

    const fans = data.upd?.fanCnt ?? null;
    const fanclub = data.fanclubCnt ?? null;
    const subscribers = data.subscription?.total ? parseInt(data.subscription.total) : null;
    const broadcastHours = data.station?.totalBroadTime ? Math.floor(data.station.totalBroadTime / 3600) : null;
    const lastBroadcast = data.station?.broadStart ? data.station.broadStart.split(' ')[0] : null;

    // 2. Supabase 업데이트
    const patch = await fetch(
      `${SUPABASE_URL}/rest/v1/vtubers?id=eq.${v.id}`,
      {
        method: 'PATCH',
        headers: { ...headers, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ fans, fanclub, subscribers, broadcast_hours: broadcastHours, last_broadcast: lastBroadcast }),
      }
    );

    if (patch.ok) {
      console.log(`✅ ${v.name}: 팬 ${fans} / 팬클럽 ${fanclub} / 구독 ${subscribers} / 방송 ${broadcastHours}h / 마지막방송 ${lastBroadcast}`);
      success++;
    } else {
      console.log(`❌ ${v.name}: DB 업데이트 실패`);
      fail++;
    }

    await new Promise(r => setTimeout(r, 300));

  } catch (e) {
    console.log(`❌ ${v.name}: ${e.message}`);
    fail++;
  }
}

console.log(`\n완료: 성공 ${success} / 실패 ${fail}`);
