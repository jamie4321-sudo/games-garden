// 일회성 패치: 리포트 기록 = 날짜 지정 이슈 기록(정기 체크 제거) · 월별 관리 리포트 = 월별 이슈 리포트 · VOC 가드너 답변/완료 사진
import fs from 'fs';
let h = fs.readFileSync('src/app.html', 'utf8');
const rep = (a, b) => { if (!h.includes(a)) throw new Error('찾지 못함: ' + a.slice(0, 80)); h = h.replace(a, b); };
const between = (start, end, body) => { const s = h.indexOf(start), e = h.indexOf(end, s); if (s < 0 || e < 0) throw new Error('구간 없음: ' + start); h = h.slice(0, s) + body + h.slice(e); };

// ── 리포트 기록하기 = 이슈를 날짜와 함께 ──
rep(`<b>리포트 기록하기</b><small>관수 · 세정 · 정리 체크</small>`, `<b>리포트 기록하기</b><small>병해충 등 이슈를 날짜와 함께</small>`);
rep(`<small>오늘 관리한 구역 · 관수 · 세정 · 정리</small>`, `<small>병해충 · 곰팡이 같은 이슈를 날짜와 함께</small>`);
rep(`$("#ch-care").onclick=()=>{ checkOpen(); };`, `$("#ch-care").onclick=()=>{ flowOpen("issue"); };`);
rep(`$("#open-check").onclick=checkOpen;`, `$("#open-check").onclick=()=>flowOpen("issue");`);
rep(`$("#visit-add").onclick=checkOpen;`, `$("#visit-add").onclick=()=>flowOpen("issue");`);

// 이슈 흐름 첫 단계: 언제 발견했어요?
rep(`function flowSteps(){ return F.t==="issue" ? ["floor","zone","plant","cat","name","photo","memo","check"] : ["floor","zone","cat","photo","memo","check"]; }`,
    `function flowSteps(){ return F.t==="issue" ? ["date","floor","zone","plant","cat","name","photo","memo","check"] : ["floor","zone","cat","photo","memo","check"]; }`);
rep(`  if(F.done){`, `  if(!F.done && k==="date"){
    const day=n=>{ const d=new Date(Date.now()-n*864e5); return {y:ymdOf(d), l:\`\${d.getMonth()+1}월 \${d.getDate()}일\`}; };
    body = \`<h2>언제 발견했어요?</h2><p class="hint">리포트에 이 날짜로 기록돼요.</p>
      <div class="big-grid"><button class="bigbtn yes" type="button" data-day="\${day(0).y}">오늘<small>\${day(0).l}</small></button><button class="bigbtn" type="button" data-day="\${day(1).y}">어제<small>\${day(1).l}</small></button></div>
      <label class="bigbtn date-big">다른 날짜 고르기<small>달력에서 골라요</small><input type="date" id="f-day" max="\${todayYmd()}" aria-label="발견한 날짜"></label>\`;
  } else if(F.done){`);
rep(`  el.querySelectorAll("[data-f]").forEach(b=>b.onclick=()=>{ F.floor=b.dataset.f; go(1); });`, `  el.querySelectorAll("[data-f]").forEach(b=>b.onclick=()=>{ F.floor=b.dataset.f; go(1); });
  el.querySelectorAll("[data-day]").forEach(b=>b.onclick=()=>{ F.date=b.dataset.day; go(1); });
  const fdy=$("#f-day"); if(fdy) fdy.onchange=()=>{ if(!fdy.value || fdy.value>todayYmd()){ toast("오늘이나 지난 날짜만 고를 수 있어요"); fdy.value=""; return; } F.date=fdy.value; go(1); };`);

// ── 월별 관리 리포트 = 월별 이슈 리포트 ──
rep(`<button type="button" role="tab" data-sub="visit">관리 리포트</button>`, `<button type="button" role="tab" data-sub="visit">월별 리포트</button>`);
rep(`<button type="button" role="tab" data-sub="issue">식물 이슈<em id="cnt-issue"></em></button>`, `<button type="button" role="tab" data-sub="issue">이슈 목록<em id="cnt-issue"></em></button>`);
rep(`<p>현장 관리 기록과 식물 이슈를 한곳에서 봐요.</p>`, `<p>날짜별로 남긴 병해충 · 곰팡이 같은 식물 이슈를 달마다 정리해요.</p>`);
between(`<div class="sub-head"><p>가드너가 방문 때 체크한 내용으로`, `</div>\n        <div class="visit-grid">`,
  `<div class="sub-head"><p>가드너가 날짜와 함께 남긴 이슈가 원인 · 조치 · 향후 계획과 함께 월별 리포트로 묶여요.</p><button type="button" class="add-btn" id="visit-add"><svg viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>리포트 기록</button>`);

between(`function visitView(){`, `function visitReport(v){`, `let ciMonth = null;
function visitView(){
  const mk=d=>{ const x=new Date(d); return \`\${x.getFullYear()}-\${String(x.getMonth()+1).padStart(2,"0")}\`; };
  const L=ISSUES.filter(seeIssue), ms=[...new Set(L.map(x=>mk(x.date)))].sort();
  if(!ciMonth || !ms.includes(ciMonth)) ciMonth = ms[ms.length-1] || null;
  const doneN = A => A.filter(x=>x.state==="done").length;
  $("#visit-list").innerHTML = ms.length ? ms.slice().reverse().map(m=>{ const a=L.filter(x=>mk(x.date)===m);
      return \`<button type="button" class="vrow" data-m="\${m}" aria-pressed="\${m===ciMonth}"><b>\${MLong(m)}</b><span>이슈 \${a.length}건 · 해결 \${doneN(a)}건</span></button>\`; }).join("")
    : \`<div class="note">아직 기록된 이슈가 없어요. 병해충 같은 문제를 발견하면 '리포트 기록하기'로 날짜와 함께 남겨 주세요.</div>\`;
  $("#visit-list").querySelectorAll("[data-m]").forEach(b=>b.onclick=()=>{ ciMonth=b.dataset.m; visitView(); });
  if(!ciMonth){ $("#visit-report").innerHTML=""; return; }
  const mi=L.filter(x=>mk(x.date)===ciMonth).sort((a,b)=>new Date(a.date)-new Date(b.date));
  const mr=REQS.filter(x=>mk(x.date)===ciMonth);
  const zones=new Set(mi.flatMap(x=>x.loc));
  $("#visit-report").innerHTML = \`<div class="vr-cover"><span class="r-eye">카카오게임즈 · 월별 관리 리포트</span><h2>\${MLong(ciMonth)}</h2>
      <dl class="r-sum num"><div><dt>이슈</dt><dd>\${mi.length}건</dd></div><div><dt>해결</dt><dd>\${doneN(mi)}건</dd></div><div><dt>진행 중</dt><dd>\${mi.length-doneN(mi)}건</dd></div><div><dt>관련 구역</dt><dd>\${zones.size}곳</dd></div></dl></div>
    <section class="r-sec"><h3>Notice</h3>\${mi.map(x=>\`
      <article class="nt"><div class="nt-h"><h4>\${tkTitle(x)}</h4><span class="num nt-d">\${fmtDT(x.date)}</span></div>
        \${x.photos.length?\`<div class="nt-ph">\${x.photos.slice(0,2).map(p=>\`<img src="\${img(p)}" alt="">\`).join("")}</div>\`:""}
        <p class="nt-loc">\${x.loc.map(zoneLabel).join(" · ")}\${x.sp&&x.sp!=="모르겠어요"?\` · \${x.sp}\`:""} <span class="st st--\${x.state}">\${stLabel("issue",x.state)}</span></p>
        \${x.cause||x.action||x.plan?\`<div class="nt-op">\${x.cause?\`<p><b>원인</b> \${x.cause}</p>\`:""}\${x.action?\`<p><b>조치</b> \${x.action}</p>\`:""}\${x.plan?\`<p><b>계획</b> \${x.plan}</p>\`:""}</div>\`:\`<p class="r-empty">소견 정리 중이에요.</p>\`}
        \${x.log.length?\`<ul class="nt-log">\${x.log.map(l=>\`<li><span class="num">\${fmtDT(l.date)}</span>\${l.note}</li>\`).join("")}</ul>\`:""}
        \${LEADER?\`<button type="button" class="edit-btn" data-issue="\${x.id}">이슈 열기</button>\`:""}
      </article>\`).join("")}</section>
    \${mr.length?\`<section class="r-sec"><h3>VOC 처리 현황</h3><ul class="r-list">\${mr.map(r=>\`<li><b>\${tkTitle(r)}</b> · \${r.loc.map(zoneLabel).join(" · ")} — \${stLabel("req",r.state)}\${r.reply?\` · \${r.reply}\`:""}</li>\`).join("")}</ul></section>\`:""}
    <footer class="r-foot">링키지랩 스낵&amp;가든사업팀 · 의견이나 요청은 'VOC 관리'에서 사진과 함께 남겨 주세요.</footer>\`;
  $("#visit-report").querySelectorAll("[data-issue]").forEach(b=>b.onclick=()=>{ careGo("issue"); tkOpen("issue", +b.dataset.issue); });
}
`);

// ── 월간 리포트: 관리 방문 빼고 '관련 구역' ──
rep(`      <div><dt>관리 방문</dt><dd>\${mv.length}<small>회</small></dd><span>\${mv.length?\`마지막 \${fmtDT(mv[mv.length-1].date)}\`:"기록 없음"}</span></div>`,
    `      <div><dt>관련 구역</dt><dd>\${new Set([...arr.flatMap(i=>i.loc), ...mi.flatMap(x=>x.loc), ...mr.flatMap(x=>x.loc)]).size}<small>곳</small></dd><span>교체 · 이슈 · VOC</span></div>`);
{ const s = h.indexOf(`    <section class="r-sec"><h3>4. 관리 방문</h3>`), e = h.indexOf(`    <footer class="r-foot">링키지랩 스낵&amp;가든사업팀 · 게임즈 가든`, s);
  if (s < 0 || e < 0) throw new Error('관리 방문 구간 없음'); h = h.slice(0, s) + h.slice(e); }

// ── VOC: 가드너 답변 + 완료 사진 ──
rep(`reply:d.reply||"", log:d.log||[],`, `reply:d.reply||"", donePhotos:d.donePhotos||[], log:d.log||[],`);
rep(`  const canEdit = LEADER;`, `  const canEdit = LEADER || (t==="req" && USER.role==="crew"); // VOC 는 가드너도 답변·완료 사진
  const dph = (x.donePhotos||[]).map(img).filter(Boolean);`);
rep("    ${ph.length?`<div class=\"tk-big\">", "    ${t===\"req\" && dph.length ? `<div class=\"pair big-pair\">${collage(ph,\"before\",\"요청 시\",\"\")}${collage(dph,\"after\",\"처리 후\",\"\")}${arrow}</div>` : \"\"}\n    ${(t!==\"req\" || !dph.length) && ph.length?`<div class=\"tk-big\">");
rep(`      : \`<div class="note">\${x.reply || "VOC를 확인하고 있어요. 답변이 등록되면 여기에 보여요."}</div>\`}</div>\`}`,
    `      : \`<div class="note">\${x.reply || "VOC를 확인하고 있어요. 답변이 등록되면 여기에 보여요."}</div>\`}</div>
    <div class="sec"><h4>완료 사진</h4>\${dph.length?\`<div class="shots">\${dph.map((u,j)=>\`<div class="shot-th"><img src="\${u}" alt="완료 사진 \${j+1}">\${canEdit?\`<button type="button" class="rm" data-drm="\${j}" aria-label="\${j+1}번째 완료 사진 지우기">×</button>\`:""}</div>\`).join("")}</div>\`:\`<p class="r-empty">\${canEdit?"처리를 마치면 완료 사진을 올려 주세요. 올리면 '완료'로 바뀌어요.":"처리가 끝나면 완료 사진이 여기에 올라와요."}</p>\`}
      \${canEdit && dph.length<5 ? pickBtns("tk-done","완료 사진") : ""}</div>\`}`);
rep(`  const lg=$("#tk-log"); if(lg) lg.onsubmit=`, `  el.querySelectorAll(".tk-done").forEach(fi=>fi.onchange=async()=>{ const files=[...fi.files].slice(0,5-x.donePhotos.length); if(!files.length) return;
    toast("완료 사진을 올리는 중이에요…"); const urls=[];
    for(const file of files){ const u=await new Promise(r=>shrink(file,r)); urls.push(await putPhoto(u,"requests")); }
    const patch={donePhotos:[...x.donePhotos, ...urls]};
    if(x.state!=="done"){ patch.state="done"; patch.log=[...x.log, {date:new Date().toISOString(), note:"완료 사진을 올리고 완료 처리했어요", by:USER.name||""}]; }
    try{ await tkSave(x, patch); toast("완료 사진을 올렸어요"); reopen(); }catch(e){ toast("저장하지 못했어요. 인터넷 연결을 확인해 주세요."); } });
  el.querySelectorAll("[data-drm]").forEach(b=>b.onclick=async()=>{ const a=[...x.donePhotos]; a.splice(+b.dataset.drm,1); try{ await tkSave(x,{donePhotos:a}); reopen(); }catch(e){ toast("저장하지 못했어요."); } });
  const lg=$("#tk-log"); if(lg) lg.onsubmit=`);
// 카드 · 월간 리포트에서도 처리 후 사진
rep("      <div class=\"tk-ph\">${x.photos.length?collage(", "      <div class=\"tk-ph\">${t===\"req\"&&x.donePhotos?.length?`<div class=\"pair\" style=\"height:100%\">${collage(x.photos.map(img).filter(Boolean),\"before\",\"요청\",\"\")}${collage(x.donePhotos.map(img).filter(Boolean),\"after\",\"완료\",\"\")}${arrow}</div>`:x.photos.length?collage(");
rep("  const thumb = x => x.photos?.[0] ?", "  const thumb = x => x.donePhotos?.[0] ? `<img src=\"${img(x.donePhotos[0])}\" alt=\"\">` : x.photos?.[0] ?");

// 스타일
rep(`.center{text-align:center}`, `.center{text-align:center}
.date-big{position:relative;min-height:84px;width:100%}
.date-big input{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%}
.nt-h{display:flex;align-items:baseline;justify-content:space-between;gap:10px}
.nt-d{font-size:13px;color:var(--ink-3);white-space:nowrap}
.nt-op b{font-size:12px;color:var(--accent-text);margin-right:6px}
.nt-log{list-style:none;margin:0;padding:10px 0 0;border-top:1px solid var(--line);display:flex;flex-direction:column;gap:4px;font-size:12.5px;color:var(--ink-2)}
.nt-log span{color:var(--ink-3);margin-right:8px}
.tk-ph .pair{grid-template-columns:1fr 1fr}
.tk-ph .pair .half{height:100%;aspect-ratio:auto}
.tk-ph .pair .half .lab{display:inline-block}`);

fs.writeFileSync('src/app.html', h);
console.log('이슈 우선 · VOC 패치 완료');
