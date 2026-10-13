// 일회성 패치: 메뉴 재구성(식물 교체 / 식물 관리 / 관리자 설정) · 월별 관리 리포트(관리 리포트·식물 이슈·담당자 요청) · 가드너 현장 기록 버튼 2개
import fs from 'fs';
let h = fs.readFileSync('src/app.html', 'utf8');
const rep = (a, b) => { if (!h.includes(a)) throw new Error('찾지 못함: ' + a.slice(0, 80)); h = h.replace(a, b); };
const ICON = {
  care: '<svg viewBox="0 0 24 24"><path d="M9 4h6v3H9z"/><path d="M7 5H5v16h14V5h-2"/><path d="M8.5 13.5l2 2 5-5"/></svg>',
  cam: '<svg viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  arrow: '<svg class="fa" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
};

// ── 메뉴 ──
rep(`      <button data-view="admin" id="nav-admin" hidden>`, `      <h6>식물 관리</h6>
      <button data-view="care">${ICON.care}<span class="lg">월별 관리 리포트</span><span class="sm">관리 리포트</span></button>
      <h6 class="nav-sep" id="nav-admin-h" hidden>관리자</h6>
      <button data-view="admin" id="nav-admin" hidden>`);

// ── 가드너 현장 기록 (버튼 2개) ──
rep(`    <div class="crew-entry" id="crew-entry">
      <p>링키지랩 가드너가 현장에서 쓰는 기록 화면이에요.</p>
      <button type="button" id="open-crew"><svg viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg><span class="lg">교체 기록하기</span><span class="sm">기록하기</span></button>
    </div>`, `    <div class="field" id="crew-entry">
      <span class="field-h">가드너 현장 기록</span>
      <button type="button" class="fbtn fbtn--swap" id="open-crew"><span class="fi">${ICON.cam}</span><span class="ft"><b>교체 기록하기</b><small>교체 전 · 후 사진</small></span>${ICON.arrow}</button>
      <button type="button" class="fbtn fbtn--care" id="open-check"><span class="fi">${ICON.care}</span><span class="ft"><b>리포트 기록하기</b><small>관수 · 세정 · 정리 체크</small></span>${ICON.arrow}</button>
      <button type="button" class="fbtn-m" id="open-record">${ICON.cam}<span>기록하기</span></button>
    </div>`);

// ── 월별 관리 리포트 화면 ──
rep(`    <section class="view" id="view-admin" hidden>`, `    <section class="view" id="view-care" hidden>
      <div class="head"><h1>월별 관리 리포트</h1><p>현장 관리 기록 · 식물 이슈 · 담당자 요청을 한곳에서 봐요.</p></div>
      <div class="care-tabs" id="care-tabs" role="tablist">
        <button type="button" role="tab" data-sub="visit">관리 리포트</button>
        <button type="button" role="tab" data-sub="issue">식물 이슈<em id="cnt-issue"></em></button>
        <button type="button" role="tab" data-sub="req">담당자 요청<em id="cnt-req"></em></button>
      </div>
      <div class="care-sub" id="sub-visit">
        <div class="sub-head"><p>가드너가 방문 때 체크한 내용으로 리포트가 만들어져요. 그날의 이슈와 이번 달 교체도 함께 묶여요.</p><button type="button" class="add-btn" id="visit-add">${ICON.care}관리 기록</button></div>
        <div class="visit-grid"><div class="visit-list" id="visit-list"></div><article class="report" id="visit-report"></article></div>
      </div>
      <div class="care-sub" id="sub-issue" hidden>
        <div class="sub-head"><p>현장에서 발견한 병해충 · 곰팡이 · 과습 같은 문제를 해결될 때까지 추적해요.</p><button type="button" class="add-btn" id="issue-add">${ICON.cam}이슈 기록</button></div>
        <dl class="summary" id="issue-sum"></dl><div class="stat-filter" id="issue-seg"></div>
        <div class="tk-grid" id="issue-list"></div><div class="zsec" id="issue-zones"></div>
      </div>
      <div class="care-sub" id="sub-req" hidden>
        <div class="sub-head"><p>카카오게임즈 담당자가 사진과 함께 요청을 남기면 링키지랩이 확인하고 답변해요.</p><button type="button" class="add-btn" id="req-add">${ICON.cam}요청 등록</button></div>
        <dl class="summary" id="req-sum"></dl><div class="stat-filter" id="req-seg"></div>
        <div class="tk-grid" id="req-list"></div><div class="zsec" id="req-zones"></div>
      </div>
    </section>

    <section class="view" id="view-admin" hidden>`);
rep(`<div class="crew" id="crew" hidden`, `<div class="crew" id="flow" hidden role="dialog" aria-modal="true" aria-label="기록하기"></div>
<div class="crew" id="crew" hidden`);

// ── 화면 전환 ──
rep(`const VIEWS = {board:"교체 현황",loc:"위치별 이력",mon:"활착 관리",report:"월간 리포트",admin:"관리자 설정"};`,
    `const VIEWS = {board:"교체 현황",loc:"위치별 이력",mon:"활착 관리",report:"월간 리포트",care:"월별 관리 리포트",admin:"관리자 설정"};`);
rep(`  if(v==="admin") adminView();`, `  if(v==="admin") adminView();
  if(v==="care") careTab(careSub);`);
rep(`$("#nav-admin").hidden = !IS_MASTER;`, `$("#nav-admin").hidden = !IS_MASTER; $("#nav-admin-h").hidden = !IS_MASTER;`);
rep(`if(location.hash==="#crew" || USER.role==="crew") crewOpen();`, `if(location.hash==="#crew" || USER.role==="crew") recordChooser();`);

// ── 불러오기: 기록 종류별로 나눈다 ──
rep(`    (recs||[]).forEach(r=>ITEMS.push(recToItem(r)));`, `    ISSUES.length = REQS.length = VISITS.length = 0;
    (recs||[]).forEach(r=>{ const t=r.data?.t; if(t==="issue") ISSUES.push(tkFromRec(r)); else if(t==="req") REQS.push(tkFromRec(r)); else if(t==="visit") VISITS.push(tkFromRec(r)); else ITEMS.push(recToItem(r)); });
    careRefresh();`);

// ── 관리 모듈 ──
const care = fs.readFileSync('tools/care.js', 'utf8') + `
/* 탭 · 기록 고르기 */
let careSub = "visit";
function careTab(sub){ careSub=sub; document.querySelectorAll("#care-tabs [data-sub]").forEach(b=>b.setAttribute("aria-selected", b.dataset.sub===sub));
  ["visit","issue","req"].forEach(s=>$("#sub-"+s).hidden = s!==sub); }
function careGo(sub){ setView("care"); careTab(sub); }
function careRefresh(){ tkView("issue"); tkView("req"); visitView();
  const oi=ISSUES.filter(seeIssue).filter(x=>x.state!=="done").length, orq=REQS.filter(x=>x.state!=="done").length;
  $("#cnt-issue").textContent = oi?String(oi):""; $("#cnt-req").textContent = orq?String(orq):""; }
document.querySelectorAll("#care-tabs [data-sub]").forEach(b=>b.onclick=()=>careTab(b.dataset.sub));
function recordChooser(){
  const el=$("#flow"); el.hidden=false; document.body.style.overflow="hidden";
  el.innerHTML = \`<div class="crew-top"><span style="flex:1"></span><button class="x" type="button" id="f-x" aria-label="닫기">\${IC.x}</button></div>
  <div class="crew-body"><div class="crew-step"><h2>무엇을 기록할까요?</h2>
    <button type="button" class="fbtn fbtn--swap fbtn--big" id="ch-swap"><span class="fi">${ICON.cam.replace(/"/g,'\\"')}</span><span class="ft"><b>교체 기록하기</b><small>식물을 바꿨을 때 · 교체 전 · 후 사진</small></span>${ICON.arrow.replace(/"/g,'\\"')}</button>
    <button type="button" class="fbtn fbtn--care fbtn--big" id="ch-care"><span class="fi">${ICON.care.replace(/"/g,'\\"')}</span><span class="ft"><b>리포트 기록하기</b><small>오늘 관리한 구역 · 관수 · 세정 · 정리</small></span>${ICON.arrow.replace(/"/g,'\\"')}</button>
  </div></div>\`;
  $("#f-x").onclick=flowClose; $("#ch-swap").onclick=()=>{ flowClose(); crewOpen(); }; $("#ch-care").onclick=()=>{ checkOpen(); };
}
$("#open-check").onclick=checkOpen; $("#open-record").onclick=recordChooser;
`;
const end = h.lastIndexOf('</script>');
h = h.slice(0, end) + care + h.slice(end);

// ── 스타일: 예전 기록 버튼 규칙 제거 후 새로 ──
h = h.split('\n').filter(l => !/^\.crew-entry/.test(l) && !/^@media \(max-width:860px\)\{\.crew-entry/.test(l) && !/^\s+\.crew-entry/.test(l)).join('\n');
rep(`.brand,.nav h6,.side__foot,.nav .count,.crew-entry p{display:none}`, `.brand,.nav h6,.side__foot,.nav .count,.field-h,.fbtn{display:none}`);
rep(`.center{text-align:center}`, `.center{text-align:center}
${fs.readFileSync('tools/care.css', 'utf8')}`);

fs.writeFileSync('src/app.html', h);
console.log('관리 패치 완료');
