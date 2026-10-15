// 일회성 패치: 데일리 관리 현황(메뉴 맨 위 · 첫 화면) + 데일리 기록하기 + 크루 코멘트
// 화면·기록 스크립트는 tools/daily.js, 스타일은 tools/daily.css
import fs from 'fs';
let h = fs.readFileSync('src/app.html', 'utf8');
if (h.includes('id="view-daily"')) { console.log('이미 적용됨'); process.exit(0); }
const rep = (a, b) => { if (!h.includes(a)) throw new Error('찾지 못함: ' + a.slice(0, 80)); h = h.replace(a, b); };
const ICON = {
  day: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><circle cx="12" cy="15.5" r="2.2"/></svg>',
  cam: '<svg viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  arrow: '<svg class="fa" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
};

// ── 메뉴 맨 위 ──
rep(`      <h6>식물 교체</h6>`, `      <h6>데일리 관리</h6>
      <button data-view="daily">${ICON.day}<span class="lg">데일리 관리 현황</span><span class="sm">데일리</span></button>
      <h6>식물 교체</h6>`);
// ── 가드너 현장 기록: 데일리 기록하기를 맨 위에 ──
rep(`      <button type="button" class="fbtn fbtn--swap" id="open-crew">`, `      <button type="button" class="fbtn fbtn--care" id="open-daily"><span class="fi">${ICON.day}</span><span class="ft"><b>데일리 기록하기</b><small>오늘 관리한 구역 사진</small></span>${ICON.arrow}</button>
      <button type="button" class="fbtn fbtn--swap" id="open-crew">`);
// ── 화면 ──
rep(`    <section class="view" id="view-board">`, `    <section class="view" id="view-daily" hidden>
      <div class="head"><h1>데일리 관리 현황</h1><p>링키지랩 가드너가 매일 관리한 구역의 사진과 그날 일정을 날짜별로 볼 수 있어요.</p></div>
      <div class="daily" id="daily"></div>
    </section>

    <section class="view" id="view-board" hidden>`);
// ── 데이터 ──
rep(`let MONTHS = [];`, `let MONTHS = [];
const DAILY = [], CMTS = [];   // 데일리 관리 기록 · 크루 코멘트 (tools/daily.js)`);
// 첫 화면 = 데일리 (예전에 저장된 화면은 한 번만 데일리로 바꾼다)
rep(`let state = {month:"all", sel:1, view:"board"};`, `let state = {month:"all", sel:1, view:"daily"};`);
rep(`try{ Object.assign(state, JSON.parse(localStorage.getItem("gg-ui")||"{}")); }catch(e){}`,
    `try{ const u=JSON.parse(localStorage.getItem("gg-ui")||"{}"); Object.assign(state, u); if(!u.dv) state.view="daily"; }catch(e){}`);
rep(`localStorage.setItem("gg-ui", JSON.stringify({month:state.month,view:state.view}));`, `localStorage.setItem("gg-ui", JSON.stringify({month:state.month,view:state.view,dv:1}));`);
// ── 화면 전환 ──
rep(`const VIEWS = {board:"교체 현황",`, `const VIEWS = {daily:"데일리 관리 현황",board:"교체 현황",`);
rep(`  if(!VIEWS[v] || (v==="admin" && !IS_MASTER)) v="board";`, `  if(!VIEWS[v] || (v==="admin" && !IS_MASTER)) v="daily";`);
rep(`  if(v==="voc") vocMarkSeen();
}`, `  if(v==="voc") vocMarkSeen();
  document.querySelector(".app").classList.toggle("on-daily", v==="daily");   // 데일리는 오른쪽 상세 칸 없이 넓게
  if(v==="daily" && window.__dailyReady) dailyView();
}`);
// ── 불러오기: 데일리 · 코멘트는 교체 기록으로 섞이지 않게 따로 ──
rep(`    ISSUES.length = REQS.length = VISITS.length = 0;
    (recs||[]).forEach(r=>{ const t=r.data?.t; if(t==="issue")`, `    ISSUES.length = REQS.length = VISITS.length = DAILY.length = CMTS.length = 0;
    (recs||[]).forEach(r=>{ const t=r.data?.t; if(t==="daily") DAILY.push(dailyFromRec(r)); else if(t==="cmt") CMTS.push(cmtFromRec(r)); else if(t==="issue")`);
rep(`    careRefresh(); vocBaseline();`, `    careRefresh(); vocBaseline(); if(window.__dailyReady) dailyRender();`);
// ── 기록 고르기 · 더보기 ──
rep(`  <div class="crew-body"><div class="crew-step"><h2>무엇을 기록할까요?</h2>`, `  <div class="crew-body"><div class="crew-step"><h2>무엇을 기록할까요?</h2>
    <button type="button" class="fbtn fbtn--care fbtn--big" id="ch-daily"><span class="fi">${ICON.day.replace(/"/g, '\\"')}</span><span class="ft"><b>데일리 기록하기</b><small>오늘 관리한 구역 · 사진 · 한 줄 메모</small></span>${ICON.arrow.replace(/"/g, '\\"')}</button>`);
rep(`$("#ch-care").onclick=()=>{ flowOpen("issue"); };`, `$("#ch-care").onclick=()=>{ flowOpen("issue"); }; $("#ch-daily").onclick=()=>dFlowOpen();`);
rep(`  const items=[["loc","위치별 이력","자리마다 교체한 흐름"],`, `  const items=[["report","월간 리포트","한 달 교체 · 이슈 · VOC 정리"],["loc","위치별 이력","자리마다 교체한 흐름"],`);
// ── 스타일 · 스크립트 ──
rep(`@media (prefers-reduced-motion:reduce)`, fs.readFileSync('tools/daily.css', 'utf8').trim() + `\n@media (prefers-reduced-motion:reduce)`);
const at = h.lastIndexOf('</script>');
h = h.slice(0, at) + fs.readFileSync('tools/daily.js', 'utf8') + h.slice(at);

fs.writeFileSync('src/app.html', h);
console.log('데일리 관리 현황 적용 완료');
