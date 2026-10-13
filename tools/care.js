/* ── 식물 관리: 이슈(가드너) · 담당자 요청(카카오게임즈) · 방문 리포트 ──
   모두 gg_records 에 data.t 로 구분해 저장한다: 'issue' | 'req' | 'visit' */
const ISSUES = [], REQS = [], VISITS = [];
const TK = {
  issue:{ label:"식물 이슈", list:ISSUES, folder:"issues", states:[["open","발견"],["care","조치 중"],["done","해결"]],
    cats:[
      ["pest","병해충","깍지벌레 · 응애 · 진딧물",["흰솜깍지벌레","깍지벌레","응애","진딧물","총채벌레","뿌리파리"]],
      ["fungus","버섯 · 곰팡이","토양 버섯 · 흰곰팡이",["버섯 발생","흰곰팡이","잎 곰팡이(그을음병)"]],
      ["root","과습 · 근부","뿌리 썩음 · 배수 불량",["과습","근부(뿌리 썩음)","배수 불량"]],
      ["dry","건조 · 고사 진행","잎 처짐 · 줄기 마름",["건조 스트레스","고사 진행"]],
      ["chlor","황화 · 엽소","잎 변색 · 잎끝 마름",["황화","엽소(잎 탐)","잎끝 마름"]],
      ["defol","낙엽 과다","잎떨굼",["낙엽 과다"]],
      ["light","광량 부족","저조도 · 웃자람",["광량 부족","도장(웃자람)"]],
      ["damage","물리적 손상","가지 꺾임 · 화분 파손",["가지 꺾임","화분 파손","받침 누수"]],
      ["etc","기타","현장 확인 필요",[]],
    ],
    // 리더 소견 첫 문장 도우미 (비어 있을 때만 채움)
    tips:{ pest:["건조하고 통풍이 약한 환경에서 자주 생겨요.","발견 즉시 방제 작업을 했어요.","2주 간격으로 방제를 이어가며 다른 식물로 옮겨가지 않게 살펴요."],
      fungus:["배수가 약하고 햇빛이 적은 자리라 습한 상태가 이어졌어요.","보이는 버섯·곰팡이를 모두 제거했어요.","관수 양과 주기를 줄여 건조한 상태를 유지해요."],
      root:["물이 빠지지 않아 뿌리가 숨을 못 쉬는 상태예요.","상한 뿌리를 정리하고 배수를 개선했어요.","관수 주기를 늘리고 회복이 안 되면 교체를 검토해요."],
      dry:["관수 간격 대비 실내가 건조해요.","충분히 관수하고 잎에 분무했어요.","관수 주기를 조정하고 다음 방문 때 회복을 확인해요."],
      chlor:["광량·관수 균형이 맞지 않아 잎색이 변했어요.","변색된 잎을 정리하고 위치·관수를 조정했어요.","새 잎 색을 보며 영양제 투입을 검토해요."],
      defol:["환경 변화(냉난방·조도)에 따른 스트레스로 보여요.","떨어진 잎을 정리했어요.","2주간 경과를 보고 개선이 없으면 내음성 수종 교체를 검토해요."],
      light:["자리 조도가 수종에 비해 낮아요.","빛이 드는 방향으로 화분을 돌렸어요.","개선이 없으면 내음성 수종으로 교체를 제안해요."],
      damage:["이동·충격으로 손상된 것으로 보여요.","손상 부위를 정리했어요.","필요하면 화분·받침 교체를 진행해요."], etc:["","",""] } },
  req:{ label:"담당자 요청", list:REQS, folder:"requests", states:[["open","접수"],["care","처리 중"],["done","완료"]],
    cats:[
      ["sick","식물 상태 이상","시듦 · 변색 · 잎떨굼",[]],
      ["bug","벌레 · 곰팡이","벌레 · 버섯 · 곰팡이",[]],
      ["swap","교체 요청","다른 식물로 바꿔 주세요",[]],
      ["add","추가 설치","식물을 더 놓고 싶어요",[]],
      ["move","위치 이동","자리를 옮겨 주세요",[]],
      ["clean","주변 정리","낙엽 · 흙 · 화분 주변",[]],
      ["water","물 넘침 · 누수","받침 · 바닥 젖음",[]],
      ["etc","기타","직접 적어 주세요",[]],
    ] },
};
const catOf = (t, k) => TK[t].cats.find(c=>c[0]===k) || TK[t].cats[TK[t].cats.length-1];
const stLabel = (t, s) => (TK[t].states.find(x=>x[0]===s)||TK[t].states[0])[1];
const fmtDT = iso => { const d=new Date(iso); return `${d.getMonth()+1}월 ${d.getDate()}일`; };
const fmtFull = iso => { const d=new Date(iso); return `${d.getFullYear()}. ${d.getMonth()+1}. ${d.getDate()} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; };
const zoneLabel = z => z.replace(/^10F /,"10층 ").replace(/^14F /,"14층 ");
const allZones = () => Object.entries(ZONES).flatMap(([f,zs])=>zs.map(z=>`${f==="10층"?"10F":"14F"} ${z}`));
// 보이는 범위: 담당자는 확인된 이슈 · 모든 요청 · 확인된 방문만
const seeIssue = x => LEADER || USER.role==="crew" || !x.pending;
const seeVisit = x => LEADER || USER.role==="crew" || !x.pending;
const CAN_ISSUE = USER.role!=="client";
const CAN_REQ = USER.role==="client" || LEADER;

function tkFromRec(r){
  const d=r.data||{};
  return {id:+r.id, rid:r.id, t:d.t, raw:d, pending:r.status!=="approved", date:d.date||r.created_at, loc:d.loc||[], sp:d.sp||"", cat:d.cat||"etc",
    name:d.name||"", photos:d.photos||[], memo:d.memo||"", state:d.state||"open", cause:d.cause||"", action:d.action||"", plan:d.plan||"",
    reply:d.reply||"", log:d.log||[], by:d.by||"", byRole:d.byRole||"", checks:d.checks||{}, gardener:d.gardener||"", approvedBy:d.approvedBy||""};
}
const tkTitle = x => x.name || (x.t==="req" ? catOf("req",x.cat)[1] : catOf("issue",x.cat)[1] + " 발생");

async function tkSave(x, patch, statusPatch){
  const raw={...x.raw, ...patch};
  await sb(`gg_records?id=eq.${x.rid}`, {method:"PATCH", headers:{Prefer:"return=minimal"}, body:JSON.stringify({data:raw, updated_at:new Date().toISOString(), ...(statusPatch||{})})});
  Object.assign(x, tkFromRec({id:x.rid, status:(statusPatch?.status)||(x.pending?"pending":"approved"), data:raw, created_at:raw.date}));
}
async function tkDelete(x){
  const r = await sb(`gg_records?id=eq.${x.rid}`, {method:"DELETE", headers:{Prefer:"return=representation", "x-gg-master":window.GG_MT||""}});
  if(!r || !r.length) throw new Error("권한 없음");
  const L = x.t==="visit" ? VISITS : TK[x.t].list; L.splice(L.indexOf(x),1);
}

/* ── 목록 화면 (이슈 · 요청 공용) ── */
const tkState = {issue:"all", req:"all"};
function tkView(t){
  const box=$(`#${t}-list`), L=TK[t].list.filter(t==="issue"?seeIssue:()=>true).sort((a,b)=>new Date(b.date)-new Date(a.date));
  const cnt = s => L.filter(x=>x.state===s).length;
  $(`#${t}-sum`).innerHTML = TK[t].states.map(([s,l])=>`<div><dt>${l}</dt><dd class="num">${cnt(s)}<small>건</small></dd></div>`).join("")
    + `<div><dt>이번 달</dt><dd class="num">${L.filter(x=>{const d=new Date(x.date);return d.getMonth()===TODAY.getMonth()&&d.getFullYear()===TODAY.getFullYear();}).length}<small>건</small></dd></div>`;
  const seg=$(`#${t}-seg`);
  seg.innerHTML = [["all","전체"],...TK[t].states].map(([s,l])=>`<button type="button" class="chipf" aria-pressed="${tkState[t]===s}" data-s="${s}">${l}</button>`).join("");
  seg.querySelectorAll("button").forEach(b=>b.onclick=()=>{ tkState[t]=b.dataset.s; tkView(t); });
  const show = L.filter(x=>tkState[t]==="all"||x.state===tkState[t]);
  box.innerHTML = show.length ? show.map((x,k)=>`
    <button type="button" class="tk-card" data-id="${x.id}" style="--i:${k}">
      <div class="tk-ph">${x.photos.length?collage(x.photos.map(img).filter(Boolean),"after","사진",""):`<div class="empty-ph">${leaf}<span>사진 없음</span></div>`}</div>
      <div class="tk-b">
        <div class="tk-top"><span class="st st--${x.state}">${stLabel(t,x.state)}</span>${x.pending&&t==="issue"?'<span class="badge badge--wait">리더 확인 중</span>':""}</div>
        <b>${tkTitle(x)}</b>
        <div class="tk-m">${x.loc.map(zoneLabel).join(" · ")||"위치 미지정"}${x.sp?` · ${x.sp}`:""}</div>
        <div class="tk-f"><span>${catOf(t,x.cat)[1]}</span><span class="num">${fmtDT(x.date)}${x.by?` · ${x.by}`:""}</span></div>
      </div>
    </button>`).join("")
    : `<div class="note">${t==="req" ? "아직 등록된 요청이 없어요. 식물에 문제가 보이면 사진을 찍어 '요청 등록'을 눌러 주세요." : "아직 기록된 이슈가 없어요. 현장에서 문제를 발견하면 '이슈 기록'을 눌러 남겨 주세요."}</div>`;
  box.querySelectorAll(".tk-card").forEach(c=>c.onclick=()=>tkOpen(t,+c.dataset.id));
  // 구역별 누적 (요청 · 이슈 공통)
  const z={}; L.forEach(x=>x.loc.forEach(l=>{ (z[l]=z[l]||{n:0,open:0}); z[l].n++; if(x.state!=="done") z[l].open++; }));
  const rows=Object.entries(z).sort((a,b)=>b[1].n-a[1].n);
  $(`#${t}-zones`).innerHTML = rows.length ? `<h3>구역별 누적</h3><div class="zgrid">${rows.map(([l,v])=>`<div class="zrow"><b>${zoneLabel(l)}</b><span class="num">${v.n}건</span>${v.open?`<em class="num">진행 ${v.open}</em>`:""}</div>`).join("")}</div>` : "";
}

/* ── 상세 (오른쪽 패널 재사용) ── */
function tkOpen(t, id){
  const x = TK[t].list.find(y=>y.id===id); if(!x) return;
  const el=$("#detail"), ph=x.photos.map(img).filter(Boolean);
  const canEdit = LEADER;
  const st = TK[t].states;
  el.innerHTML = `<div class="detail__in swap-in">
    <div class="d-top"><div><span class="st st--${x.state}">${stLabel(t,x.state)}</span><h3 style="margin-top:8px">${tkTitle(x)}</h3><p>${x.loc.map(zoneLabel).join(" · ")}${x.sp?` · ${x.sp}`:""}</p></div>
      <button class="d-close" id="d-close" type="button" aria-label="닫기">×</button></div>
    ${ph.length?`<div class="tk-big"><img id="tk-img" src="${ph[0]}" alt="${tkTitle(x)} 사진"></div>${ph.length>1?`<div class="strip tk-strip">${ph.map((s,j)=>`<button type="button" class="${j?"":"on"}" data-j="${j}"><img src="${s}" alt=""></button>`).join("")}</div>`:""}`:""}
    <ol class="steps tk-steps">${st.map(([s,l],j)=>`<li class="${x.state===s?"now":""}"><small>${j+1}단계</small><b>${l}</b></li>`).join("")}</ol>
    ${canEdit?`<div class="tk-stbtns">${st.map(([s,l])=>`<button type="button" data-st="${s}" aria-pressed="${x.state===s}">${l}</button>`).join("")}</div>`:""}
    <dl class="kv">
      <dt>분류</dt><dd>${catOf(t,x.cat)[1]}</dd>
      <dt>${t==="req"?"등록":"발견"}</dt><dd>${fmtFull(x.date)}${x.by?` · ${x.by}`:""}</dd>
      ${x.memo?`<dt>${t==="req"?"요청 내용":"현장 메모"}</dt><dd>${x.memo}</dd>`:""}
    </dl>
    ${t==="issue" ? `<div class="sec"><h4>가드너 소견</h4>${canEdit?`
      <form class="tk-form" id="tk-form">
        <label>원인 진단<textarea id="tk-cause" rows="2">${x.cause}</textarea></label>
        <label>조치 내용<textarea id="tk-action" rows="2">${x.action}</textarea></label>
        <label>향후 계획<textarea id="tk-plan" rows="2">${x.plan}</textarea></label>
        <button type="submit" class="approve">소견 저장</button></form>`
      : (x.cause||x.action||x.plan ? `<div class="note">${[x.cause,x.action,x.plan].filter(Boolean).join("<br><br>")}</div>` : `<div class="note">가드너가 소견을 정리하고 있어요.</div>`)}</div>`
    : `<div class="sec"><h4>링키지랩 답변</h4>${canEdit?`
      <form class="tk-form" id="tk-form"><label>답변<textarea id="tk-reply" rows="3" placeholder="예: 내일 오전 방문해 방제하고 결과를 알려드릴게요.">${x.reply}</textarea></label><button type="submit" class="approve">답변 저장</button></form>`
      : `<div class="note">${x.reply || "요청을 확인하고 있어요. 답변이 등록되면 여기에 보여요."}</div>`}</div>`}
    ${x.log.length||canEdit?`<div class="sec"><h4>진행 기록</h4><ol class="tl">${x.log.map(l=>`<li class="done"><time class="num">${fmtDT(l.date)}${l.by?` · ${l.by}`:""}</time>${l.note}</li>`).join("")||'<li><time>—</time>아직 기록이 없어요</li>'}</ol>
      ${canEdit?`<form class="tk-log" id="tk-log"><input id="tk-lognote" placeholder="예: 2차 방제 완료" maxlength="120"><button type="submit">기록 추가</button></form>`:""}</div>`:""}
    ${t==="issue" && x.pending && LEADER ? `<button type="button" class="approve" id="tk-approve">확인 완료 · 담당자 화면에 올리기</button>` : ""}
    ${IS_MASTER && window.GG_MT ? `<button type="button" class="del-btn" id="tk-del">삭제</button>` : ""}
  </div>`;
  const reopen=()=>{ tkView(t); visitView(); tkOpen(t, id); };
  el.querySelectorAll(".tk-strip button").forEach(b=>b.onclick=()=>{ el.querySelectorAll(".tk-strip button").forEach(y=>y.classList.toggle("on",y===b)); $("#tk-img").src=ph[+b.dataset.j]; });
  const im=$("#tk-img"); if(im) im.onclick=()=>openLightbox(im.src);
  $("#d-close").onclick=closeDetail;
  el.querySelectorAll("[data-st]").forEach(b=>b.onclick=async()=>{ const s=b.dataset.st; if(s===x.state) return;
    try{ await tkSave(x, {state:s, log:[...x.log, {date:new Date().toISOString(), note:`상태를 '${stLabel(t,s)}'(으)로 바꿨어요`, by:USER.name||""}]}); toast(`${stLabel(t,s)}(으)로 바꿨어요`); reopen(); }catch(e){ toast("저장하지 못했어요. 인터넷 연결을 확인해 주세요."); } });
  const f=$("#tk-form"); if(f){
    if(t==="issue"){ const tip=(TK.issue.tips[x.cat]||["","",""]); [["#tk-cause",0],["#tk-action",1],["#tk-plan",2]].forEach(([s,j])=>{ const ta=$(s); if(!ta.value && tip[j]) ta.placeholder=tip[j]; ta.onfocus=()=>{ if(!ta.value && tip[j]) ta.value=tip[j]; }; }); }
    f.onsubmit=async ev=>{ ev.preventDefault();
      const patch = t==="issue" ? {cause:$("#tk-cause").value.trim(), action:$("#tk-action").value.trim(), plan:$("#tk-plan").value.trim()} : {reply:$("#tk-reply").value.trim(), repliedBy:USER.name||""};
      try{ await tkSave(x, patch); toast("저장했어요"); reopen(); }catch(e){ toast("저장하지 못했어요. 인터넷 연결을 확인해 주세요."); } }; }
  const lg=$("#tk-log"); if(lg) lg.onsubmit=async ev=>{ ev.preventDefault(); const n=$("#tk-lognote").value.trim(); if(!n) return;
    try{ await tkSave(x, {log:[...x.log, {date:new Date().toISOString(), note:n, by:USER.name||""}]}); toast("기록을 추가했어요"); reopen(); }catch(e){ toast("저장하지 못했어요."); } };
  const ap=$("#tk-approve"); if(ap) ap.onclick=async()=>{ try{ await tkSave(x, {approvedBy:USER.name||""}, {status:"approved"}); toast("담당자 화면에 올렸어요"); reopen(); }catch(e){ toast("저장하지 못했어요."); } };
  const dl=$("#tk-del"); if(dl) dl.onclick=async()=>{ if(dl.dataset.sure!=="1"){ dl.dataset.sure="1"; dl.textContent="한 번 더 누르면 영구 삭제돼요"; return; }
    try{ await tkDelete(x); toast("삭제했어요"); closeDetail(); tkView(t); visitView(); }catch(e){ toast("삭제하지 못했어요. 총괄 관리자만 삭제할 수 있어요."); } };
  if(narrow()){ el.classList.remove("closing"); el.classList.add("open"); $("#scrim").classList.add("on"); }
}

/* ── 등록 흐름 (큰 버튼 · 한 화면 한 질문): 이슈 = 가드너 / 요청 = 담당자 ── */
let F=null;
function flowOpen(t){ F={t, step:0, floor:null, zone:null, sp:"", cat:null, name:"", photos:[], memo:""}; $("#flow").hidden=false; document.body.style.overflow="hidden"; flowRender(); }
function flowClose(){ $("#flow").hidden=true; document.body.style.overflow=""; }
function flowSteps(){ return F.t==="issue" ? ["floor","zone","plant","cat","name","photo","memo","check"] : ["floor","zone","cat","photo","memo","check"]; }
function flowRender(){
  const el=$("#flow"), S=flowSteps(), k=S[F.step], T=TK[F.t];
  const top = `<div class="crew-top"><button class="back" type="button" id="f-back" ${F.step===0||F.done?"hidden":""}>${IC.back}뒤로</button>
    <div class="dots" aria-hidden="true">${F.done?"":S.map((_,j)=>`<i class="${j===F.step?"on":j<F.step?"done":""}"></i>`).join("")}</div>
    <button class="x" type="button" id="f-x" aria-label="닫기">${IC.x}</button></div>`;
  let body="";
  if(F.done){
    body = `<div class="done-mark">${IC.ok}</div><h2 class="center">${F.t==="req"?"요청을 등록했어요":"이슈를 기록했어요"}</h2>
      <p class="hint center" style="margin:0">${F.t==="req"?"링키지랩이 확인하고 답변을 남겨요.":"리더가 소견을 정리해 담당자 화면에 올려요."}</p>
      <button class="primary" type="button" id="f-again">하나 더 ${F.t==="req"?"등록하기":"기록하기"}</button><button class="ghost" type="button" id="f-close">닫기</button>`;
  } else if(k==="floor"){
    body = `<h2>몇 층이에요?</h2><div class="big-grid">${Object.keys(ZONES).map(f=>`<button class="bigbtn" type="button" data-f="${f}">${f}</button>`).join("")}</div>`;
  } else if(k==="zone"){
    body = `<h2>${F.floor} 어느 구역이에요?</h2><div class="big-grid three">${ZONES[F.floor].map(z=>`<button class="bigbtn" type="button" data-z="${z}">${z}</button>`).join("")}
      <button class="bigbtn" type="button" data-z="기타"><small>목록에 없어요</small>기타</button></div>`;
  } else if(k==="plant"){
    body = `<h2>어떤 식물이에요?</h2><p class="hint">사진을 보고 골라요.</p><div class="big-grid three">${[...PLANTS].map(([n,src])=>`<button class="plant-pick plant" type="button" data-p="${n}">${src?`<img src="${src}" alt="">`:`<span class="noimg">${n[0]}</span>`}<span class="pn">${n}</span></button>`).join("")}
      <button type="button" class="addtile quiet" data-p=""><b>?</b><span>모르겠어요</span></button></div>`;
  } else if(k==="cat"){
    body = `<h2>${F.t==="req"?"어떤 요청이에요?":"어떤 문제예요?"}</h2><div class="big-grid">${T.cats.map(([id,l,h])=>`<button class="bigbtn why" type="button" data-c="${id}"><span class="wt">${l}</span><small>${h}</small></button>`).join("")}</div>`;
  } else if(k==="name"){
    const names=catOf("issue",F.cat)[3];
    if(!names.length){ F.step++; return flowRender(); }
    body = `<h2>무엇인지 알면 골라요</h2><p class="hint">모르면 '잘 모르겠어요'를 눌러요.</p><div class="big-grid">${names.map(n=>`<button class="bigbtn" type="button" data-n="${n}">${n}</button>`).join("")}
      <button class="bigbtn" type="button" data-n=""><small>리더가 확인해요</small>잘 모르겠어요</button></div>`;
  } else if(k==="photo"){
    const list=F.photos;
    body = `<h2>사진을 넣어요</h2><p class="hint">${list.length?`${list.length}장 넣었어요 · 최대 5장`:"멀리서 한 장, 가까이서 한 장 찍으면 좋아요 · 최대 5장"}</p>
      ${list.length?`<div class="shots">${list.map((u,j)=>`<div class="shot-th"><img src="${u}" alt="">${j===0?'<span class="cover">대표</span>':''}<button type="button" class="rm" data-rm="${j}" aria-label="${j+1}번째 사진 지우기">×</button></div>`).join("")}</div>`:""}
      ${list.length<5?pickBtns("f-file","사진"):""}
      <button class="primary" type="button" id="f-next">${list.length?"다음":"사진 없이 다음"}</button>`;
  } else if(k==="memo"){
    body = `<h2>${F.t==="req"?"요청 내용을 적어 주세요":"남길 말이 있으면 적어요"}</h2><p class="hint">${F.t==="req"?"짧게 적어도 괜찮아요.":"없으면 그냥 다음을 눌러요."}</p>
      <textarea class="bigin" id="f-memo" rows="4" maxlength="300" style="padding:14px;min-height:140px" placeholder="${F.t==="req"?"예: 회의실 앞 화분 잎이 노랗게 변했어요.":"예: 잎 뒷면에 하얀 솜 같은 게 붙어 있어요."}">${F.memo}</textarea>
      <button class="primary" type="button" id="f-next">다음</button>`;
  } else if(k==="check"){
    body = `<h2>이대로 ${F.t==="req"?"등록할까요":"보낼까요"}?</h2>
      <div class="recap">${F.photos.length?`<div class="pair" style="grid-template-columns:1fr">${collage(F.photos,"after","사진","")}</div>`:""}
        <ul><li><span>구역</span>${F.floor} ${F.zone}</li>${F.t==="issue"?`<li><span>식물</span>${F.sp||"모름"}</li>`:""}<li><span>${F.t==="req"?"요청":"문제"}</span>${F.name||catOf(F.t,F.cat)[1]}</li>${F.memo?`<li><span>내용</span><em style="font-style:normal;font-weight:400;font-size:17px">${F.memo}</em></li>`:""}</ul></div>
      <button class="primary" type="button" id="f-send">${IC.ok}${F.t==="req"?"등록하기":"보내기"}</button>`;
  }
  el.innerHTML = top + `<div class="crew-body"><div class="crew-step" aria-live="polite">${body}</div></div>`;
  const go=d=>{ F.step=Math.max(0,Math.min(S.length-1,F.step+d)); if(d<0 && S[F.step]==="name" && !catOf("issue",F.cat)[3].length) F.step--; flowRender(); };
  $("#f-x").onclick=flowClose; const bk=$("#f-back"); if(bk) bk.onclick=()=>go(-1);
  el.querySelectorAll("[data-f]").forEach(b=>b.onclick=()=>{ F.floor=b.dataset.f; go(1); });
  el.querySelectorAll("[data-z]").forEach(b=>b.onclick=()=>{ F.zone=b.dataset.z; go(1); });
  el.querySelectorAll("[data-p]").forEach(b=>b.onclick=()=>{ F.sp=b.dataset.p; go(1); });
  el.querySelectorAll("[data-c]").forEach(b=>b.onclick=()=>{ F.cat=b.dataset.c; F.name=""; go(1); });
  el.querySelectorAll("[data-n]").forEach(b=>b.onclick=()=>{ F.name=b.dataset.n?`${b.dataset.n} 발생`:""; go(1); });
  el.querySelectorAll("[data-rm]").forEach(b=>b.onclick=()=>{ F.photos.splice(+b.dataset.rm,1); flowRender(); });
  el.querySelectorAll(".f-file").forEach(fi=>fi.onchange=async()=>{ const files=[...fi.files].slice(0,5-F.photos.length); if(fi.files.length>files.length) toast("5장까지만 넣었어요");
    for(const file of files) F.photos.push(await new Promise(r=>shrink(file,r))); flowRender(); });
  const nx=$("#f-next"); if(nx) nx.onclick=()=>{ const m=$("#f-memo"); if(m) F.memo=m.value.trim(); go(1); };
  const sd=$("#f-send"); if(sd) sd.onclick=async()=>{
    sd.disabled=true;
    const loc=[`${F.floor==="10층"?"10F":"14F"} ${F.zone}`];
    const rec={id:String(Date.now()), status:"pending", data:{t:F.t, date:new Date().toISOString(), loc, sp:F.sp, cat:F.cat, name:F.name, memo:F.memo, state:"open", by:USER.name||"", byRole:USER.role, photos:[...F.photos], log:[]}};
    if(SB_ON){ for(let j=0;j<rec.data.photos.length;j++){ sd.textContent=`사진 올리는 중… ${j+1}/${rec.data.photos.length}`; rec.data.photos[j]=await putPhoto(rec.data.photos[j], TK[F.t].folder); }
      sd.textContent="보내는 중…";
      try{ await sb("gg_records", {method:"POST", headers:{Prefer:"return=minimal"}, body:JSON.stringify(rec)}); }
      catch(e){ console.warn(e); outboxAdd(rec); toast("인터넷이 약해서 이 기기에 먼저 저장했어요"); } }
    TK[F.t].list.push(tkFromRec(rec)); F.done=true; flowRender(); tkView(F.t); visitView();
  };
  const ag=$("#f-again"); if(ag) ag.onclick=()=>flowOpen(F.t);
  const cl=$("#f-close"); if(cl) cl.onclick=()=>{ const t=F.t; flowClose(); careGo(t); };
  const hh=el.querySelector(".crew-step h2"); if(hh){ hh.setAttribute("tabindex","-1"); hh.focus({preventScroll:true}); }
}

/* ── 식물 관리 리포트: 방문 체크시트 → 그루온식 리포트 ── */
const CHK = [["w","관수","물주기"],["c","세정","잎 닦기"],["t","정리","가지 · 낙엽"]];
let visitSel = null;
function visitView(){
  const L=VISITS.filter(seeVisit).sort((a,b)=>new Date(b.date)-new Date(a.date));
  if(!visitSel || !L.some(v=>v.id===visitSel)) visitSel = L[0]?.id || null;
  let lastM="";
  $("#visit-list").innerHTML = L.length ? L.map(v=>{ const z=Object.keys(v.checks).length, p=Object.values(v.checks).filter(c=>c.p).length;
    const d=new Date(v.date), m=`${d.getFullYear()}년 ${d.getMonth()+1}월`, mh=m!==lastM?`<h4 class="vm">${m}</h4>`:""; lastM=m;
    return `${mh}<button type="button" class="vrow" data-id="${v.id}" aria-pressed="${v.id===visitSel}"><b class="num">${fmtFull(v.date)}</b><span>${v.gardener||"가드너"} · ${z}구역${p?` · 이슈 ${p}`:""}</span>${v.pending?'<em class="badge badge--wait">리더 확인 중</em>':""}</button>`; }).join("")
    : `<div class="note">아직 방문 기록이 없어요. 현장 관리를 마치면 '관리 기록'을 눌러 체크해 주세요.</div>`;
  $("#visit-list").querySelectorAll(".vrow").forEach(b=>b.onclick=()=>{ visitSel=+b.dataset.id; visitView(); });
  const v=L.find(x=>x.id===visitSel);
  $("#visit-report").innerHTML = v ? visitReport(v) : "";
  const ap=$("#v-approve"); if(ap) ap.onclick=async()=>{ try{ await tkSave(v, {approvedBy:USER.name||""}, {status:"approved"}); toast("담당자 화면에 올렸어요"); visitView(); }catch(e){ toast("저장하지 못했어요."); } };
  const dl=$("#v-del"); if(dl) dl.onclick=async()=>{ if(dl.dataset.sure!=="1"){ dl.dataset.sure="1"; dl.textContent="한 번 더 누르면 영구 삭제돼요"; return; }
    try{ await tkDelete(v); toast("삭제했어요"); visitSel=null; visitView(); }catch(e){ toast("삭제하지 못했어요."); } };
  $("#visit-report").querySelectorAll("[data-issue]").forEach(b=>b.onclick=()=>{ careGo("issue"); tkOpen("issue", +b.dataset.issue); });
}
function visitReport(v){
  const day=new Date(v.date), sameDay=d=>{ const x=new Date(d); return x.toDateString()===day.toDateString(); };
  const flagged=Object.entries(v.checks).filter(([,c])=>c.p).map(([z])=>z);
  const notice=ISSUES.filter(seeIssue).filter(x=>sameDay(x.date) || (x.state!=="done" && x.loc.some(l=>flagged.includes(l)) && new Date(x.date)<=day));
  const swaps=ITEMS.filter(i=>!i.pending && i.m===`${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,"0")}`);
  const reqs=REQS.filter(r=>r.log.some(l=>sameDay(l.date)) || sameDay(r.date));
  const zones=Object.keys(v.checks).sort();
  return `<div class="vr-cover"><span class="r-eye">카카오게임즈 · 식물 관리 리포트</span><h2 class="num">${fmtFull(v.date)}</h2>
      <dl class="r-sum"><div><dt>담당 가드너</dt><dd>${v.gardener||"—"}</dd></div><div><dt>관리 구역</dt><dd class="num">${zones.length}곳</dd></div><div><dt>이슈</dt><dd class="num">${notice.length}건</dd></div></dl></div>
    <section class="r-sec"><h3>Check Sheet</h3>
      <div class="cs-wrap"><table class="cs"><thead><tr><th>관리 위치</th>${CHK.map(c=>`<th>${c[1]}</th>`).join("")}<th>문제</th></tr></thead>
      <tbody>${zones.map(z=>{ const c=v.checks[z]; return `<tr><td>${zoneLabel(z)}</td>${CHK.map(([k])=>`<td>${c[k]?'<span class="ok" aria-label="완료">✓</span>':'<span class="muted">—</span>'}</td>`).join("")}<td>${c.p?'<span class="warn" aria-label="문제 있음">!</span>':""}</td></tr>`; }).join("")}</tbody></table></div>
      ${flagged.length?`<p class="r-empty">문제가 표시된 구역은 아래 Notice에서 확인할 수 있어요.</p>`:""}</section>
    ${notice.length?`<section class="r-sec"><h3>Notice</h3>${notice.map(x=>`
      <article class="nt"><h4>${tkTitle(x)}</h4>
        ${x.photos.length?`<div class="nt-ph">${x.photos.slice(0,2).map(p=>`<img src="${img(p)}" alt="">`).join("")}</div>`:""}
        <p class="nt-loc">${x.loc.map(zoneLabel).join(" · ")}${x.sp?` · ${x.sp}`:""} <span class="st st--${x.state}">${stLabel("issue",x.state)}</span></p>
        ${x.cause||x.action||x.plan?`<div class="nt-op">${[x.cause,x.action,x.plan].filter(Boolean).map(s=>`<p>${s}</p>`).join("")}</div>`:`<p class="r-empty">소견 정리 중이에요.</p>`}
        ${LEADER?`<button type="button" class="edit-btn" data-issue="${x.id}">이슈 열기</button>`:""}
      </article>`).join("")}</section>`:""}
    ${reqs.length?`<section class="r-sec"><h3>담당자 요청 처리</h3><ul class="r-list">${reqs.map(r=>`<li><b>${tkTitle(r)}</b> · ${r.loc.map(zoneLabel).join(" · ")} — ${stLabel("req",r.state)}${r.reply?` · ${r.reply}`:""}</li>`).join("")}</ul></section>`:""}
    ${swaps.length?`<section class="r-sec"><h3>이번 달 교체</h3><div class="vr-swaps">${swaps.map(i=>`<div><div class="pair">${pairHTML(i,true)}</div><p><b>${title(i)}</b> · ${i.loc.join(" · ")} · ${kd(i.done)}</p></div>`).join("")}</div></section>`:""}
    ${v.memo?`<section class="r-sec"><h3>가드너 메모</h3><div class="note">${v.memo}</div></section>`:""}
    <footer class="r-foot">링키지랩 스낵&amp;가든사업팀 · 문제가 있으면 '담당자 요청'으로 사진과 함께 알려 주세요.</footer>
    ${v.pending && LEADER ? `<button type="button" class="approve" id="v-approve">확인 완료 · 담당자 화면에 올리기</button>` : ""}
    ${IS_MASTER && window.GG_MT ? `<button type="button" class="del-btn" id="v-del">이 방문 기록 삭제</button>` : ""}`;
}

/* 방문 체크 입력 (가드너 · 리더) */
let V=null;
function checkOpen(){
  V={checks:{}, memo:""}; allZones().forEach(z=>V.checks[z]={w:0,c:0,t:0,p:0});
  $("#flow").hidden=false; document.body.style.overflow="hidden"; checkRender();
}
function checkRender(){
  const el=$("#flow"), zs=allZones();
  const done=zs.filter(z=>V.checks[z].w||V.checks[z].c||V.checks[z].t).length;
  el.innerHTML = `<div class="crew-top"><span style="font-size:17px;font-weight:800;flex:1">오늘 관리 체크</span><button class="x" type="button" id="f-x" aria-label="닫기">${IC.x}</button></div>
  <div class="crew-body"><div class="crew-step">
    <p class="hint" style="margin:0">구역마다 한 일을 눌러요. 문제가 보이면 '문제'를 눌러요.</p>
    <button type="button" class="ghost" id="k-all">모든 구역 관수 · 세정 · 정리 완료로 채우기</button>
    ${Object.keys(ZONES).map(f=>`<h3 class="k-floor">${f}</h3>${zs.filter(z=>z.startsWith(f==="10층"?"10F":"14F")).map(z=>{ const c=V.checks[z];
      return `<div class="k-row"><b>${zoneLabel(z).replace(/^\d+층 /,"")}</b><div class="k-btns">${CHK.map(([k,l,h])=>`<button type="button" data-z="${z}" data-k="${k}" aria-pressed="${!!c[k]}"><span>${l}</span><small>${h}</small></button>`).join("")}
        <button type="button" class="k-p" data-z="${z}" data-k="p" aria-pressed="${!!c.p}"><span>문제</span><small>이슈</small></button></div></div>`; }).join("")}`).join("")}
    <label class="k-memo">메모 (선택)<textarea class="bigin" id="k-memo" rows="3" style="padding:12px;min-height:100px" placeholder="예: 14층 B4 화분 받침에 물이 고여 있었어요.">${V.memo}</textarea></label>
    <button class="primary" type="button" id="k-save" ${done?"":"disabled"}>${IC.ok}${done}개 구역 저장</button>
  </div></div>`;
  $("#f-x").onclick=flowClose;
  $("#k-all").onclick=()=>{ zs.forEach(z=>Object.assign(V.checks[z],{w:1,c:1,t:1})); checkRender(); };
  el.querySelectorAll("[data-k]").forEach(b=>b.onclick=()=>{ const c=V.checks[b.dataset.z]; c[b.dataset.k]=c[b.dataset.k]?0:1; V.memo=$("#k-memo").value; checkRender(); });
  $("#k-save").onclick=async()=>{
    const btn=$("#k-save"); btn.disabled=true; btn.textContent="저장하는 중…";
    const checks={}; Object.entries(V.checks).forEach(([z,c])=>{ if(c.w||c.c||c.t||c.p) checks[z]=c; });
    const rec={id:String(Date.now()), status:"pending", data:{t:"visit", date:new Date().toISOString(), gardener:USER.name||"", by:USER.name||"", checks, memo:$("#k-memo").value.trim()}};
    if(SB_ON){ try{ await sb("gg_records", {method:"POST", headers:{Prefer:"return=minimal"}, body:JSON.stringify(rec)}); }catch(e){ console.warn(e); outboxAdd(rec); toast("인터넷이 약해서 이 기기에 먼저 저장했어요"); } }
    VISITS.push(tkFromRec(rec)); visitSel=+rec.id;
    const flagged=Object.entries(checks).filter(([,c])=>c.p).map(([z])=>z);
    flowClose(); careGo("visit"); toast("오늘 관리를 기록했어요");
    if(flagged.length && CAN_ISSUE){ const [fz]=flagged; flowOpen("issue"); F.floor=fz.startsWith("10F")?"10층":"14층"; F.zone=fz.replace(/^1[04]F /,""); F.step=2; flowRender(); toast("문제가 있던 구역의 이슈를 기록해 주세요"); }
  };
}

function careBoot(){
  $("#issue-add").hidden=!CAN_ISSUE; $("#req-add").hidden=!CAN_REQ; $("#visit-add").hidden=!CAN_ISSUE;
  $("#issue-add").onclick=()=>flowOpen("issue"); $("#req-add").onclick=()=>flowOpen("req"); $("#visit-add").onclick=checkOpen;
  tkView("issue"); tkView("req"); visitView();
}
careBoot();
