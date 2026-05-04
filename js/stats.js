const COLORS = [
  '#ff4d8f', '#4dc8ff', '#ffd24d', '#4dff91', '#c44dff',
  '#ff8c4d', '#4dffed', '#ff4d4d', '#b4ff4d', '#4d6eff',
];

let allVtubers = [];
let selectedVtubers = [];
let chart = null;

async function init() {
  const { data } = await db.from('vtubers')
    .select('id,name,slug,my_rating,fans,fanclub,subscribers,balloon_history,broadcast_history')
    .in('category', ['리뷰', '10분 리뷰'])
    .order('fans', { ascending: false });

  allVtubers = data || [];

  renderSummary(data || []);
  populateSelect();
  renderChart();
}

function renderSummary(data) {
  const reviewOnly = data.filter(v => ['리뷰', '10분 리뷰'].includes(v.category));
  const avgRating = reviewOnly.filter(v => v.my_rating > 0);
  const stats = [
    { label: '등록 버시', value: reviewOnly.length + '명' },
    { label: '평균 평점', value: avgRating.length ? (avgRating.reduce((s, v) => s + v.my_rating, 0) / avgRating.length).toFixed(1) : '-' },
    { label: '평균 애청자', value: Math.round(reviewOnly.filter(v=>v.fans).reduce((s,v)=>s+v.fans,0) / reviewOnly.filter(v=>v.fans).length).toLocaleString() },
    { label: '평균 팬클럽', value: Math.round(reviewOnly.filter(v=>v.fanclub).reduce((s,v)=>s+v.fanclub,0) / reviewOnly.filter(v=>v.fanclub).length).toLocaleString() },
  ];

  document.getElementById('summaryCards').innerHTML = stats.map(s => `
    <div style="background:var(--card); border:1px solid var(--border); border-radius:4px; padding:1rem; text-align:center;">
      <div style="font-family:var(--font-mono); font-size:0.6rem; color:var(--text-dim); letter-spacing:0.15em; margin-bottom:0.5rem;">${s.label}</div>
      <div style="font-size:1.4rem; font-weight:700; color:var(--accent-2);">${s.value}</div>
    </div>
  `).join('');
}

function getMonths() {
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

function monthLabel(ym) {
  return parseInt(ym.split('-')[1]) + '월';
}

function avgHistory(vtubers, key, months) {
  return months.map(ym => {
    const vals = vtubers.map(v => (v[key] || {})[ym]).filter(v => v != null && v > 0);
    return vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : null;
  });
}

function populateSelect() {
  const sel = document.getElementById('vtuberSelect');
  allVtubers.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v.id;
    opt.textContent = v.name;
    sel.appendChild(opt);
  });

  document.getElementById('hideAvg').addEventListener('change', renderChart);

  sel.addEventListener('change', () => {
    const id = sel.value;
    if (!id) return;
    if (selectedVtubers.find(v => v.id === id)) { sel.value = ''; return; }
    if (selectedVtubers.length >= 5) { alert('최대 5개까지 선택 가능합니다'); sel.value = ''; return; }
    const v = allVtubers.find(v => v.id === id);
    selectedVtubers.push({ ...v, color: COLORS[selectedVtubers.length] });
    sel.value = '';
    renderTags();
    renderChart();
  });
}

function renderTags() {
  document.getElementById('selectedTags').innerHTML = selectedVtubers.map((v, i) => `
    <span style="display:inline-flex; align-items:center; gap:0.3rem; padding:0.2rem 0.5rem; background:${v.color}22; border:1px solid ${v.color}66; border-radius:2px; font-size:0.75rem; cursor:pointer;" onclick="removeVtuber('${v.id}')">
      <span style="color:${v.color};">${v.name}</span>
      <span style="color:var(--text-dim);">✕</span>
    </span>
  `).join('');
}

function removeVtuber(id) {
  selectedVtubers = selectedVtubers.filter(v => v.id !== id);
  renderTags();
  renderChart();
}
window.removeVtuber = removeVtuber;

function renderChart() {
  const months = getMonths();
  const labels = months.map(monthLabel);

  const avgBalloon = avgHistory(allVtubers, 'balloon_history', months);
  const avgBroadcast = avgHistory(allVtubers, 'broadcast_history', months);

  const hideAvg = document.getElementById('hideAvg')?.checked;

  const datasets = [
    {
      type: 'bar',
      label: '전체 평균 방송시간',
      hidden: hideAvg,
      data: avgBroadcast,
      backgroundColor: 'rgba(77,200,255,0.3)',
      borderColor: 'rgba(77,200,255,0.8)',
      borderWidth: 1,
      yAxisID: 'yBroadcast',
    },
    {
      type: 'line',
      label: '전체 평균 별풍선',
      hidden: hideAvg,
      data: avgBalloon,
      borderColor: 'rgba(255,77,143,0.8)',
      backgroundColor: 'rgba(255,77,143,0.1)',
      borderWidth: 2,
      borderDash: [5, 5],
      pointRadius: 3,
      tension: 0.3,
      yAxisID: 'yBalloon',
    },
  ];

  selectedVtubers.forEach(v => {
    const balloonData = months.map(ym => (v.balloon_history || {})[ym] || null);
    const broadcastData = months.map(ym => (v.broadcast_history || {})[ym] || null);

    datasets.push({
      type: 'bar',
      label: `${v.name} 방송시간`,
      data: broadcastData,
      backgroundColor: v.color + '44',
      borderColor: v.color,
      borderWidth: 1,
      yAxisID: 'yBroadcast',
    });
    datasets.push({
      type: 'line',
      label: `${v.name} 별풍선`,
      data: balloonData,
      borderColor: v.color,
      backgroundColor: v.color + '22',
      borderWidth: 2,
      pointRadius: 3,
      tension: 0.3,
      yAxisID: 'yBalloon',
    });
  });

  if (chart) chart.destroy();
  chart = new Chart(document.getElementById('mainChart'), {
    data: { labels, datasets },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { ticks: { color: '#888' }, grid: { color: '#ffffff0f' } },
        yBroadcast: {
          type: 'linear',
          position: 'left',
          ticks: { color: 'rgba(77,200,255,0.8)', callback: v => v + 'h' },
          grid: { color: '#ffffff0f' },
          title: { display: true, text: '방송시간(h)', color: '#888', font: { size: 10 } },
        },
        yBalloon: {
          type: 'linear',
          position: 'right',
          ticks: { color: 'rgba(255,77,143,0.8)', callback: v => v.toLocaleString() },
          grid: { drawOnChartArea: false },
          title: { display: true, text: '별풍선', color: '#888', font: { size: 10 } },
        },
      }
    }
  });
}

init();
