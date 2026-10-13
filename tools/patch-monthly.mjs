// 일회성 패치: 월간 리포트 = 교체 관리 + 월별 이슈 + VOC + 관리 방문, PDF 저장
import fs from 'fs';
let h = fs.readFileSync('src/app.html', 'utf8');
const rep = (a, b) => { if (!h.includes(a)) throw new Error('찾지 못함: ' + a.slice(0, 80)); h = h.replace(a, b); };

rep(`<div class="head"><h1>월간 리포트</h1><p>한 달 동안의 교체 내역을 한 장으로 정리했어요.</p></div>`,
    `<div class="head head--row"><div><h1>월간 리포트</h1><p>한 달 동안의 교체 관리와 식물 이슈, VOC, 관리 방문을 한 장으로 정리했어요.</p></div>
        <button type="button" class="add-btn pdf-btn" id="pdf-btn"><svg viewBox="0 0 24 24"><path d="M6 3h9l4 4v14H6z"/><path d="M12 10v7M9 14l3 3 3-3"/></svg>PDF로 저장</button></div>`);

const s = h.indexOf('function reportView(){'), e = h.indexOf('\n}\n', s) + 3;
if (s < 0) throw new Error('reportView 없음');
h = h.slice(0, s) + `function reportView(){
  // 관리 기록(이슈·VOC·방문)은 아래쪽 모듈에서 정의되므로 먼저 불릴 때를 대비한다
  let iss=[], rqs=[], vis=[]; try{ iss=ISSUES.filter(seeIssue); rqs=REQS; vis=VISITS.filter(seeVisit); }catch(e){}
  const mk = d => { const x=new Date(d); return \`\${x.getFullYear()}-\${String(x.getMonth()+1).padStart(2,"0")}\`; };
  const ms = [...new Set([...ITEMS.filter(i=>!i.pending).map(i=>i.m), ...iss.map(x=>mk(x.date)), ...rqs.map(x=>mk(x.date)), ...vis.map(x=>mk(x.date))])].sort();
  if(!rMonth || !ms.includes(rMonth)) rMonth = ms[ms.length-1];
  segment($("#rseg"), ms, rMonth, v=>{rMonth=v; reportView();}, false);
  const arr = ITEMS.filter(i=>i.m===rMonth && !i.pending), swap=arr.filter(i=>i.kind==="swap").length;
  const mi = iss.filter(x=>mk(x.date)===rMonth), mr = rqs.filter(x=>mk(x.date)===rMonth), mv = vis.filter(x=>mk(x.date)===rMonth).sort((a,b)=>new Date(a.date)-new Date(b.date));
  const done = L => L.filter(x=>x.state==="done").length;
  const pill = (t,x) => \`<span class="st st--\${x.state}">\${stLabel(t,x.state)}</span>\`;
  const thumb = x => x.photos?.[0] ? \`<img src="\${img(x.photos[0])}" alt="">\` : \`<span class="rm-noimg">\${leaf}</span>\`;
  $("#report").innerHTML = \`
    <header class="r-head">
      <div><span class="r-eye">카카오게임즈 · 식물 관리 월간 리포트</span><h2>\${MLong(rMonth)}</h2></div>
      <span class="r-by">링키지랩 스낵&amp;가든사업팀</span>
    </header>
    <dl class="r-kpi num">
      <div><dt>식물 교체</dt><dd>\${arr.length}<small>건</small></dd><span>수종 변경 \${swap}건</span></div>
      <div><dt>식물 이슈</dt><dd>\${mi.length}<small>건</small></dd><span>해결 \${done(mi)}건 · 진행 \${mi.length-done(mi)}건</span></div>
      <div><dt>VOC</dt><dd>\${mr.length}<small>건</small></dd><span>완료 \${done(mr)}건</span></div>
      <div><dt>관리 방문</dt><dd>\${mv.length}<small>회</small></dd><span>\${mv.length?\`마지막 \${fmtDT(mv[mv.length-1].date)}\`:"기록 없음"}</span></div>
    </dl>

    <section class="r-sec"><h3>1. 교체 관리</h3>
      \${arr.length ? arr.map(i=>\`<div class="r-item">
        <div class="pair">\${pairHTML(i,true)}</div>
        <div class="r-txt">
          <div class="card__t"><b>\${title(i)}</b></div>
          <div class="r-date num">\${kd(i.done)}<small>교체 완료</small></div>
          <dl class="kv">
            <dt>위치</dt><dd>\${i.loc.join(" · ")}</dd>
            <dt>구분</dt><dd>\${i.kind==='swap'?'수종 변경':'같은 수종'}</dd>
            \${i.why?\`<dt>사유</dt><dd>\${i.why}</dd>\`:""}
          </dl>
          \${i.note?\`<div class="note">\${i.note}</div>\`:""}
        </div></div>\`).join("") : \`<p class="r-empty">이번 달에는 교체한 식물이 없어요.</p>\`}
    </section>

    <section class="r-sec"><h3>2. 식물 이슈</h3>
      \${mi.length ? \`<div class="rm-list">\${mi.map(x=>\`<div class="rm-row">
        <div class="rm-th">\${thumb(x)}</div>
        <div class="rm-b"><div class="rm-t"><b>\${tkTitle(x)}</b>\${pill("issue",x)}</div>
          <p class="rm-m">\${x.loc.map(zoneLabel).join(" · ")}\${x.sp?\` · \${x.sp}\`:""} · 발견 \${fmtDT(x.date)}</p>
          \${x.action||x.cause?\`<p class="rm-op">\${[x.cause,x.action,x.plan].filter(Boolean).join(" ")}</p>\`:""}</div></div>\`).join("")}</div>\`
        : \`<p class="r-empty">이번 달에 기록된 식물 이슈가 없어요.</p>\`}
    </section>

    <section class="r-sec"><h3>3. VOC</h3>
      \${mr.length ? \`<div class="rm-list">\${mr.map(x=>\`<div class="rm-row">
        <div class="rm-th">\${thumb(x)}</div>
        <div class="rm-b"><div class="rm-t"><b>\${tkTitle(x)}</b>\${pill("req",x)}</div>
          <p class="rm-m">\${x.loc.map(zoneLabel).join(" · ")} · 접수 \${fmtDT(x.date)}\${x.by?\` · \${x.by}\`:""}</p>
          \${x.memo?\`<p class="rm-op">\${x.memo}</p>\`:""}
          \${x.reply?\`<p class="rm-reply"><b>답변</b> \${x.reply}</p>\`:""}</div></div>\`).join("")}</div>\`
        : \`<p class="r-empty">이번 달에 접수된 VOC가 없어요.</p>\`}
    </section>

    <section class="r-sec"><h3>4. 관리 방문</h3>
      \${mv.length ? \`<div class="cs-wrap"><table class="cs rm-visits"><thead><tr><th>방문 일시</th><th>담당 가드너</th><th>관리 구역</th><th>문제 표시</th></tr></thead>
        <tbody>\${mv.map(v=>\`<tr><td class="num">\${fmtFull(v.date)}</td><td>\${v.gardener||"—"}</td><td class="num">\${Object.keys(v.checks).length}곳</td><td class="num">\${Object.values(v.checks).filter(c=>c.p).length||"—"}</td></tr>\`).join("")}</tbody></table></div>\`
        : \`<p class="r-empty">이번 달 관리 방문 기록이 아직 없어요.</p>\`}
    </section>
    <footer class="r-foot">링키지랩 스낵&amp;가든사업팀 · 게임즈 가든 · \${new Date().toLocaleDateString("ko-KR")} 기준</footer>\`;
}
$("#pdf-btn").onclick = () => { const t=document.title; document.title=\`게임즈가든_월간리포트_\${rMonth}\`; window.print(); setTimeout(()=>document.title=t, 500); };
` + h.slice(e);

// 관리 기록을 불러온 뒤 리포트도 다시 그린다
rep(`function careRefresh(){ tkView("issue"); tkView("req"); visitView();`, `function careRefresh(){ tkView("issue"); tkView("req"); visitView(); if(state.view==="report") reportView();`);

// 스타일 + 인쇄(PDF)
rep(`.center{text-align:center}`, `.center{text-align:center}
.head--row{display:flex;align-items:flex-end;gap:14px;flex-wrap:wrap}
.head--row>div{flex:1 1 320px}
.pdf-btn svg{width:17px;height:17px;stroke:currentColor;fill:none;stroke-width:2}
.r-by{font-size:12.5px;color:var(--ink-3)}
.r-kpi{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0;margin:0;border:1px solid var(--line-soft);border-radius:var(--r-lg);overflow:hidden}
.r-kpi>div{padding:14px 16px;display:flex;flex-direction:column;gap:3px;min-width:0}
.r-kpi>div+div{border-left:1px solid var(--line-soft)}
.r-kpi dt{font-size:12px;color:var(--ink-3)}
.r-kpi dd{margin:0;font-size:26px;font-weight:800;letter-spacing:-.4px}
.r-kpi dd small{font-size:13px;margin-left:2px;color:var(--ink-2)}
.r-kpi span{font-size:12px;color:var(--ink-2)}
.rm-list{display:flex;flex-direction:column;gap:10px}
.rm-row{display:grid;grid-template-columns:72px minmax(0,1fr);gap:14px;padding:12px;border-radius:var(--r);background:var(--panel-2)}
.rm-th{width:72px;height:72px;border-radius:10px;overflow:hidden;background:var(--photo-bg);display:grid;place-items:center;color:var(--ink-3)}
.rm-th img{width:100%;height:100%;object-fit:cover}
.rm-th svg{width:22px;height:22px;stroke:currentColor;fill:none;stroke-width:1.5}
.rm-t{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.rm-t b{font-size:15px}
.rm-m{margin:4px 0 0;font-size:12.5px;color:var(--ink-2)}
.rm-op{margin:6px 0 0;font-size:13.5px;line-height:1.55}
.rm-reply{margin:6px 0 0;font-size:13.5px;line-height:1.55;padding:8px 10px;border-radius:8px;background:var(--panel)}
.rm-reply b{font-size:12px;color:var(--accent-text);margin-right:4px}
.rm-visits th:first-child{width:auto}
@media (max-width:860px){ .r-kpi{grid-template-columns:repeat(2,minmax(0,1fr))} .r-kpi>div:nth-child(3){border-left:0} .r-kpi>div:nth-child(n+3){border-top:1px solid var(--line-soft)} }
@media print{
  :root,:root[data-theme="dark"],:root:not([data-theme="light"]){color-scheme:light;--bg:#fff!important;--panel:#fff!important;--panel-2:#f2f3ee!important;--ink:#16160f!important;--ink-2:#55554d!important;--ink-3:#8f8f85!important;--line:#e2e3dd!important;--line-soft:#ecede7!important;--accent:#bff000!important;--accent-text:#5c7a08!important;--accent-ink:#14160a!important;--photo-bg:#e6e9df!important;--ok:#16a34a!important;--warn:#b7791f!important;--info:#2563eb!important}
  @page{size:A4;margin:14mm 12mm}
  body{background:#fff!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .side,.topbar,.detail,.scrim,.toast,.lightbox,.crew,#rseg,.pdf-btn,.view:not(#view-report){display:none!important}
  .app{display:block!important}
  .main{padding:0!important}
  #view-report .head p{display:none}
  .report{border:0!important;padding:0!important;max-width:none!important;box-shadow:none!important;animation:none!important}
  .r-item,.rm-row,.r-kpi,.cs tr{break-inside:avoid}
  .r-sec{break-inside:auto}
  *{animation:none!important;transition:none!important}
}`);

fs.writeFileSync('src/app.html', h);
console.log('월간 리포트 패치 완료');
