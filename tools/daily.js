
/* ── 데일리 관리 현황: 날짜별 일정 + 구역별 사진 + 크루 코멘트 ── */
// 저장: gg_records data.t = "daily"(구역 관리 기록) · "cmt"(코멘트 한 줄 = 한 건, 동시에 써도 덮어쓰지 않게)
// 사진은 크게 보기 1280px + 목록용 400px 를 따로 올린다. 하나라도 못 올리면 기록을 보내지 않고 이 기기(IndexedDB)에 보관했다가 다시 보낸다
const D_MAX = 10;                                   // 기록 한 건당 사진
const D_CAN = USER.role !== "client";               // 데일리 기록 · 코멘트 쓰기: 리더 · 가드너
const D_WD = ["일","월","화","수","목","금","토"];
const dEsc = s => String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const dYmd = s => ymdOf(new Date(s));
const dAdd = (ymd, n) => { const [y,m,d]=ymd.split("-").map(Number); return ymdOf(new Date(y,m-1,d+n)); };
const dDate = ymd => { const [y,m,d]=ymd.split("-").map(Number); return new Date(y,m-1,d); };
const dMonday = ymd => { const w=dDate(ymd).getDay(); return dAdd(ymd, w===0?-6:1-w); };
const dHM = iso => { const t=new Date(iso); return `${String(t.getHours()).padStart(2,"0")}:${String(t.getMinutes()).padStart(2,"0")}`; };
const dLong = ymd => { const t=dDate(ymd); return `${t.getMonth()+1}월 ${t.getDate()}일 ${D_WD[t.getDay()]}요일`; };
const dUid = p => `${p}-${Date.now().toString(36)}-${(crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2)).slice(0,8)}`;
// 위치: 10층 · 14층 구역 / 10·14층 전체 / 직접 추가한 위치(gg_options zone "기타|이름" → 모든 기기에 보임)
const D_ALL = "10·14층 전체";
const D_PLACES = store.get("gg-dplaces", []);
const dZone = (floor, zone) => floor==="전체" ? D_ALL : floor==="기타" ? zone : `${floor==="10층"?"10F":"14F"} ${zone}`;
const dPh = p => typeof p==="string" ? {u:p, th:p} : (p||{});

function dailyFromRec(r){ const d=r.data||{}; return {rid:r.id, raw:d, date:d.date||dYmd(r.created_at), at:d.at||r.created_at, loc:d.loc||"", memo:d.memo||"", photos:(d.photos||[]).map(dPh).filter(p=>p.u), by:d.by||"", byRole:d.byRole||"", del:!!d.del, editedAt:d.editedAt||""}; }
function cmtFromRec(r){ const d=r.data||{}; return {rid:r.id, raw:d, ref:d.ref, text:d.text||"", by:d.by||"", byRole:d.byRole||"", at:d.at||r.created_at, del:!!d.del, editedAt:d.editedAt||""}; }
// 이 기기에서 아직 못 보낸 기록도 '전송 대기'로 함께 보여준다
const dPend = t => dPending.filter(r=>r.data?.t===t).map(r=>({...(t==="cmt"?cmtFromRec(r):dailyFromRec(r)), pend:true}));
const dLive = () => [...DAILY, ...dPend("daily").filter(p=>!DAILY.some(x=>x.rid===p.rid))].filter(x=>!x.del);
const cOf = rid => [...CMTS, ...dPend("cmt").filter(p=>!CMTS.some(c=>c.rid===p.rid))].filter(c=>c.ref===rid && !c.del).sort((a,b)=>new Date(a.at)-new Date(b.at));

/* ── 사진: 줄이기(크게 보기 · 목록용) ── */
function dShrink(file){
  return new Promise((res, rej)=>{
    const rd=new FileReader();
    rd.onerror=()=>rej(new Error("read"));
    rd.onload=()=>{ const im=new Image();
      im.onload=()=>{ const mk=(max,q)=>{ const s=Math.min(1,max/Math.max(im.width,im.height)); const cv=document.createElement("canvas"); cv.width=Math.round(im.width*s); cv.height=Math.round(im.height*s); cv.getContext("2d").drawImage(im,0,0,cv.width,cv.height); return cv.toDataURL("image/jpeg",q); };
        try{ const u=mk(1280,.82), th=mk(400,.72); if(!u.startsWith("data:image/jpeg")) throw new Error("jpeg"); res({u, th}); }catch(e){ rej(e); } };
      im.onerror=()=>rej(new Error("decode")); im.src=rd.result; };
    rd.readAsDataURL(file);
  });
}
// Storage 업로드: 실패하면 두 번 더 시도하고, 그래도 안 되면 오류를 던진다(기록 안에 사진 원본을 넣지 않는다)
async function dPut(src, folder){
  if(!src || !src.startsWith("data:")) return src;
  if(!SB_ON) return src;
  const blob = await (await fetch(src)).blob();
  const name = `${folder}/${todayYmd().slice(0,7)}/${crypto.randomUUID ? crypto.randomUUID() : dUid("p")}.jpg`;
  let last;
  for(let k=0;k<3;k++){
    try{ const r = await fetch(`${SB.url}/storage/v1/object/gg-photos/${name}`, {method:"POST", body:blob,
        headers:{apikey:SB.key, ...(SB.key.startsWith("eyJ")?{Authorization:`Bearer ${SB.key}`}:{}), "x-gg-token":SB.token, "Content-Type":"image/jpeg", "x-upsert":"false"}});
      const url = `${SB.url}/storage/v1/object/public/gg-photos/${name}`;
      if(r.ok) return url;
      const txt = await r.text();
      if(r.status===409 || /duplicate|already exists/i.test(txt)) return url;   // 앞 시도가 실제로는 올라간 경우
      last = new Error(`${r.status} ${txt}`); if(r.status===400||r.status===401||r.status===403||r.status===413) break;
    }catch(e){ last=e; }
    await new Promise(r=>setTimeout(r, 800*(k+1)));
  }
  throw last || new Error("upload");
}

/* ── 보낼 함 (IndexedDB: 사진이 많아도 넘치지 않게) ── */
const DQ = { db:null,
  open(){ if(this.db) return Promise.resolve(this.db); return new Promise((res,rej)=>{ try{ const q=indexedDB.open("gg-daily",1); q.onupgradeneeded=()=>q.result.createObjectStore("out",{keyPath:"id"}); q.onsuccess=()=>res(this.db=q.result); q.onerror=()=>rej(q.error); }catch(e){ rej(e); } }); },
  async tx(mode, fn){ const db=await this.open(); return new Promise((res,rej)=>{ const t=db.transaction("out",mode), s=t.objectStore("out"); let out; const r=fn(s); if(r) r.onsuccess=()=>{ out=r.result; }; t.oncomplete=()=>res(out); t.onerror=()=>rej(t.error); t.onabort=()=>rej(t.error); }); },
  put(rec){ return this.tx("readwrite", s=>s.put(rec)); },
  del(id){ return this.tx("readwrite", s=>s.delete(id)); },
  all(){ return this.tx("readonly", s=>s.getAll()).then(a=>a||[]); },
};
let dPending = [];   // 이 기기에서 아직 못 보낸 기록
async function dPendingLoad(){ try{ dPending = await DQ.all(); }catch(e){ dPending = []; } if(state.view==="daily") dailyRender(); else dSyncBar(); }

// 기록 하나 보내기: 사진 올리기(한 장 올릴 때마다 보낼 함에 진행 저장) → 기록 저장(같은 id면 1건) → 다시 읽어 장 수 확인
async function dSend(rec, onStep){
  const d = rec.data, ps = d.photos || [];
  const total = ps.filter(p=>String(p.u).startsWith("data:")||String(p.th).startsWith("data:")).length;
  let n=0;
  for(const p of ps){
    if(!String(p.u).startsWith("data:") && !String(p.th).startsWith("data:")) continue;
    n++; onStep && onStep(`사진 올리는 중… ${n}/${total}`);
    p.u = await dPut(p.u, "daily"); p.th = await dPut(p.th, "daily/th");
    try{ await DQ.put(rec); }catch(e){}
  }
  onStep && onStep("저장하는 중…");
  await sb("gg_records", {method:"POST", headers:{Prefer:"resolution=merge-duplicates,return=minimal"}, body:JSON.stringify(rec)});
  const back = await sb(`gg_records?id=eq.${encodeURIComponent(rec.id)}&select=id,data`);
  const got = back && back[0] && back[0].data;
  if(!got || (got.photos||[]).length !== ps.length || (got.photos||[]).some(p=>String(dPh(p).u).startsWith("data:"))) throw new Error("저장 확인 실패");
  return got;
}
let dFlushing = false;
async function dFlush(){
  if(!SB_ON || dFlushing) return; dFlushing = true;
  try{
    await dPendingLoad(); let sent=0;
    for(const rec of dPending){ try{ await dSend(rec); await DQ.del(rec.id); dUpsertLocal(rec); sent++; }catch(e){ console.warn("데일리 다시 보내기 실패", e); } }
    await dPendingLoad();
    if(sent){ toast(`이 기기에 남아 있던 데일리 기록 ${sent}건을 보냈어요`); dailyRender(); }
  } finally { dFlushing = false; }
}
function dUpsertLocal(rec){
  const list = rec.data.t==="cmt" ? CMTS : DAILY, x = rec.data.t==="cmt" ? cmtFromRec(rec) : dailyFromRec(rec);
  const i = list.findIndex(y=>y.rid===rec.id); if(i<0) list.push(x); else list[i]=x;
}
function dSyncBar(){
  const b=$("#d-sync"); if(!b) return;
  const n=dPending.length;
  b.hidden = !n;
  b.innerHTML = n ? `<span><b>전송 대기 ${n}건</b> 인터넷이 약해서 이 기기에 보관 중이에요. 연결되면 자동으로 보내요.</span><button type="button" id="d-sync-go">지금 보내기</button>` : "";
  const g=$("#d-sync-go"); if(g) g.onclick=async()=>{ g.disabled=true; g.textContent="보내는 중…"; await dFlush(); if(dPending.length) toast("아직 보내지 못했어요. 인터넷 연결을 확인해 주세요."); };
}
addEventListener("online", ()=>dFlush());

/* ── 그날 일정: 기존 기록에서 자동으로 모은다 ── */
function dAgenda(ymd){
  const out=[];
  ITEMS.filter(i=>!i.pending).forEach(i=>{
    const d=dOf(i,i.done); if(!d) return; const done=ymdOf(d), where=i.loc.map(zoneLabel).join(" · ");
    if(done===ymd) out.push({k:"swap", t:`교체 완료 · ${i.kind==="swap"?`${i.sp} → ${i.to}`:i.to}`, s:where, st:"완료", go:()=>{ setView("board"); select(i.id); }});
    CK.forEach(([n,l])=>{ if(dAdd(done,n)===ymd) out.push({k:"check", t:`활착 ${l} 점검 · ${i.to}`, s:where, st:ymd<todayYmd()?"지남":ymd===todayYmd()?"오늘":"예정", go:()=>setView("mon")}); });
  });
  ISSUES.filter(seeIssue).forEach(x=>{ if(dYmd(x.date)===ymd) out.push({k:"issue", t:`이슈 발견 · ${tkTitle(x)}`, s:x.loc.map(zoneLabel).join(" · "), st:stLabel("issue",x.state), go:()=>{ careGo("issue"); tkOpen("issue",x.id); }}); });
  REQS.forEach(x=>{ if(dYmd(x.date)===ymd) out.push({k:"req", t:`VOC 접수 · ${tkTitle(x)}`, s:x.loc.map(zoneLabel).join(" · "), st:stLabel("req",x.state), go:()=>{ setView("voc"); tkOpen("req",x.id); }}); });
  if(ymd===todayYmd()) REQS.filter(x=>x.state!=="done" && dYmd(x.date)!==ymd).forEach(x=>out.push({k:"req", t:`VOC 처리 중 · ${tkTitle(x)}`, s:x.loc.map(zoneLabel).join(" · "), st:stLabel("req",x.state), go:()=>{ setView("voc"); tkOpen("req",x.id); }}));
  return out;
}
const dDayRecs = ymd => dLive().filter(x=>x.date===ymd).sort((a,b)=>new Date(a.at)-new Date(b.at));
function dCounts(ymd){ const r=dDayRecs(ymd); return {ph:r.reduce((s,x)=>s+x.photos.length,0), cm:r.reduce((s,x)=>s+cOf(x.rid).length,0), rec:r.length, ag:dAgenda(ymd).length}; }

/* ── 화면 ── */
const DS = { day: todayYmd(), cal: false, calY: new Date().getFullYear(), calM: new Date().getMonth(), open: {} };
function dailyView(){ dailyRender(); dPendingLoad(); }
function dailyRender(){
  const box=$("#daily"); if(!box) return;
  const day=DS.day, mon=dMonday(day), today=todayYmd();
  const week=[...Array(7)].map((_,k)=>dAdd(mon,k));
  const cell = (v, small) => { const c=dCounts(v), t=dDate(v);
    const sub = c.ph ? `사진 ${c.ph}` : c.ag ? (v>today?`예정 ${c.ag}`:`일정 ${c.ag}`) : "";
    return `<button type="button" class="dw-d${v===day?" on":""}${v===today?" today":""}${t.getDay()===0||t.getDay()===6?" we":""}" data-day="${v}" aria-pressed="${v===day}" aria-label="${dLong(v)}${c.ph?` 사진 ${c.ph}장`:""}">
      ${small?"":`<span class="dw-w">${D_WD[t.getDay()]}</span>`}<b class="num">${t.getDate()}</b>${small?(c.ph||c.ag?`<i class="dw-dot${c.ph?" ph":""}"></i>`:""):`<span class="dw-s">${sub||"&nbsp;"}</span>${c.cm?`<span class="dw-c">코멘트 ${c.cm}</span>`:""}`}</button>`; };
  let cal="";
  if(DS.cal){
    const y=DS.calY, m=DS.calM, first=(new Date(y,m,1).getDay()+6)%7, last=new Date(y,m+1,0).getDate();
    let cells=""; for(let i=0;i<first;i++) cells+="<i></i>"; for(let d=1; d<=last; d++) cells+=cell(ymdOf(new Date(y,m,d)), true);
    cal = `<div class="dcal"><div class="dcal-h"><button type="button" data-dcm="-1" aria-label="이전 달">${IC.back}</button><b>${y}년 ${m+1}월</b><button type="button" data-dcm="1" class="cal-next" aria-label="다음 달">${IC.back}</button></div>
      <div class="dcal-w">${["월","화","수","목","금","토","일"].map(w=>`<span>${w}</span>`).join("")}</div><div class="dcal-g">${cells}</div>
      <p class="dcal-lg"><i class="dw-dot ph"></i>사진 있음 <i class="dw-dot"></i>일정만</p></div>`;
  }
  const recs=dDayRecs(day), ag=dAgenda(day), c=dCounts(day);
  const people=[...new Set(recs.map(x=>x.by).filter(Boolean))];
  const tl = [...recs.map(x=>({at:x.at, html:`<li class="ag ag--rec"><span class="ag-t num">${dHM(x.at)}</span><button type="button" class="ag-b" data-jump="${dEsc(x.rid)}"><b>${dEsc(zoneLabel(x.loc))} 관리</b><small>${x.by?dEsc(x.by)+" · ":""}${x.photos.length?`사진 ${x.photos.length}장`:"사진 없음"}</small></button>${x.pend?'<span class="st st--wait">전송 대기</span>':'<span class="st st--done">완료</span>'}</li>`})),
    ...ag.map((a,j)=>({at:"", html:`<li class="ag ag--${a.k}"><span class="ag-t">자동</span><button type="button" class="ag-b" data-ag="${j}"><b>${dEsc(a.t)}</b><small>${dEsc(a.s)}</small></button><span class="st ${a.st==="완료"||a.st==="해결"||a.st==="처리 완료"?"st--done":a.st==="지남"?"st--late":"st--open"}">${dEsc(a.st)}</span></li>`}))];
  box.innerHTML = `
    <div class="d-bar"><div class="d-title"><b>${dLong(day)}${day===today?' <em>오늘</em>':""}</b><span>${recs.length?`관리 ${recs.length}곳 · 사진 ${c.ph}장${c.cm?` · 코멘트 ${c.cm}개`:""}${people.length?` · ${people.map(dEsc).join(", ")}`:""}`:"아직 관리 기록이 없어요"}</span></div>
      <div class="d-ctl"><button type="button" class="d-nav" data-wk="-7" aria-label="이전 주">${IC.back}</button><button type="button" class="d-today" id="d-today" ${day===today?"disabled":""}>오늘</button><button type="button" class="d-nav nx" data-wk="7" aria-label="다음 주">${IC.back}</button>
      <button type="button" class="d-cal${DS.cal?" on":""}" id="d-cal" aria-pressed="${DS.cal}"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>월 달력</button></div></div>
    <div class="dw">${week.map(v=>cell(v,false)).join("")}</div>
    ${cal}
    <div class="d-sync" id="d-sync" hidden></div>
    <div class="d-grid">
      <section class="d-ag"><h3>그날 일정</h3>${tl.length?`<ul>${tl.map(x=>x.html).join("")}</ul>`:`<p class="r-empty">이날은 일정이 없어요.</p>`}
        <p class="d-ag-n">'자동'은 교체 · 활착 점검 · 이슈 · VOC 기록에서 모아요.</p></section>
      <section class="d-ph">${recs.length ? recs.map(dGroup).join("") : `<div class="d-empty">${leaf}<b>${day>today?"아직 오지 않은 날이에요":"이날 올라온 사진이 없어요"}</b>${D_CAN&&day<=today?`<button type="button" class="add-btn" id="d-add-empty">${IC.cam}데일리 기록하기</button>`:""}</div>`}</section>
    </div>`;
  dSyncBar();
  box.querySelectorAll("[data-day]").forEach(b=>b.onclick=()=>{ DS.day=b.dataset.day; if(DS.cal){ const t=dDate(DS.day); DS.calY=t.getFullYear(); DS.calM=t.getMonth(); } dailyRender(); });
  box.querySelectorAll("[data-wk]").forEach(b=>b.onclick=()=>{ DS.day=dAdd(DS.day,+b.dataset.wk); dailyRender(); });
  box.querySelectorAll("[data-dcm]").forEach(b=>b.onclick=()=>{ DS.calM+=+b.dataset.dcm; if(DS.calM<0){DS.calM=11;DS.calY--;} if(DS.calM>11){DS.calM=0;DS.calY++;} dailyRender(); });
  $("#d-today").onclick=()=>{ DS.day=todayYmd(); const n=new Date(); DS.calY=n.getFullYear(); DS.calM=n.getMonth(); dailyRender(); };
  $("#d-cal").onclick=()=>{ DS.cal=!DS.cal; const t=dDate(DS.day); DS.calY=t.getFullYear(); DS.calM=t.getMonth(); dailyRender(); };
  box.querySelectorAll("[data-ag]").forEach(b=>b.onclick=()=>ag[+b.dataset.ag].go());
  box.querySelectorAll("[data-jump]").forEach(b=>b.onclick=()=>{ const g=box.querySelector(`[data-g="${CSS.escape(b.dataset.jump)}"]`); if(g){ g.scrollIntoView({behavior:"smooth", block:"start"}); g.classList.remove("flash"); void g.offsetWidth; g.classList.add("flash"); } });
  const ae=$("#d-add-empty"); if(ae) ae.onclick=()=>dFlowOpen(DS.day);
  box.querySelectorAll("[data-ph]").forEach(b=>b.onclick=()=>{ const [rid,j]=b.dataset.ph.split("|"); dLightbox(rid, +j); });
  box.querySelectorAll("[data-cm-toggle]").forEach(b=>b.onclick=()=>{ DS.open[b.dataset.cmToggle]=!DS.open[b.dataset.cmToggle]; dailyRender(); });
  box.querySelectorAll(".cm-form").forEach(f=>f.onsubmit=e=>{ e.preventDefault(); dCmtAdd(f.dataset.ref, f.querySelector("input"), f.querySelector("button")); });
  box.querySelectorAll("[data-cm-edit]").forEach(b=>b.onclick=()=>dCmtEdit(b.dataset.cmEdit));
  box.querySelectorAll("[data-cm-del]").forEach(b=>b.onclick=()=>dCmtDel(b.dataset.cmDel));
  box.querySelectorAll("[data-memo-edit]").forEach(b=>b.onclick=()=>dMemoEdit(b.dataset.memoEdit));
  box.querySelectorAll("[data-rec-del]").forEach(b=>b.onclick=()=>dRecDel(b.dataset.recDel));
}
const dMine = x => LEADER || (!!x.by && x.by===(USER.name||""));
function dGroup(x){
  const ps=x.photos, n=ps.length, show=ps.slice(0,5), cms=cOf(x.rid), open=DS.open[x.rid] || cms.length<=2;
  const list = open ? cms : cms.slice(-2);
  return `<article class="dg" data-g="${dEsc(x.rid)}">
    <header class="dg-h"><div><b>${dEsc(zoneLabel(x.loc))}${x.pend?' <em class="d-wait">전송 대기</em>':""}</b><small><span class="num">${dHM(x.at)}</span>${x.by?` · ${dEsc(x.by)}`:""} · ${n?`사진 ${n}장`:"사진 없음"}</small></div>
      ${dMine(x)&&D_CAN&&!x.pend?`<div class="dg-act"><button type="button" data-memo-edit="${dEsc(x.rid)}">메모 수정</button><button type="button" data-rec-del="${dEsc(x.rid)}">지우기</button></div>`:""}</header>
    ${n?`<div class="dg-ph dg-ph${Math.min(n,5)}">${show.map((p,j)=>`<button type="button" class="dg-i" data-ph="${dEsc(x.rid)}|${j}" aria-label="${dEsc(zoneLabel(x.loc))} 사진 ${j+1} 크게 보기"><img src="${dEsc(p.th||p.u)}" alt="" loading="lazy" decoding="async">${n>5&&j===4?`<b class="cg-more">+${n-5}</b>`:""}</button>`).join("")}</div>`:""}
    ${x.memo?`<p class="dg-memo">${dEsc(x.memo)}</p>`:""}
    <div class="cm">
      ${cms.length>2?`<button type="button" class="cm-more" data-cm-toggle="${dEsc(x.rid)}">${open?"코멘트 접기":`코멘트 ${cms.length}개 모두 보기`}</button>`:""}
      ${list.map(c=>`<div class="cm-r"><p><b>${dEsc(c.by||"가드너")}</b><span>${dEsc(c.text)}</span></p><small class="num">${dHM(c.at)}${c.editedAt?" · 수정됨":""}${c.pend?" · 전송 대기":""}${dMine(c)&&D_CAN&&!c.pend?` · <button type="button" data-cm-edit="${dEsc(c.rid)}">수정</button> · <button type="button" data-cm-del="${dEsc(c.rid)}">지우기</button>`:""}</small></div>`).join("")}
      ${D_CAN&&!x.pend?`<form class="cm-form" data-ref="${dEsc(x.rid)}" autocomplete="off"><input type="text" maxlength="200" placeholder="코멘트 남기기" aria-label="${dEsc(zoneLabel(x.loc))} 코멘트"><button type="submit">등록</button></form>`:""}
    </div>
  </article>`;
}

/* ── 사진 크게 보기: 좌우 넘기기 ── */
let DLB = null;
function dLightbox(rid, j){
  const x=dLive().find(y=>y.rid===rid); if(!x||!x.photos.length) return;
  DLB={x, j};
  let el=$("#dlb"); if(!el){ el=document.createElement("div"); el.id="dlb"; el.className="dlb"; el.setAttribute("role","dialog"); el.setAttribute("aria-label","사진 크게 보기"); document.body.appendChild(el); }
  const draw=()=>{ const {x,j}=DLB, n=x.photos.length, p=x.photos[j];
    el.innerHTML = `<img src="${dEsc(p.u)}" alt="${dEsc(zoneLabel(x.loc))} 사진 ${j+1}">
      <div class="dlb-cap"><b>${dEsc(zoneLabel(x.loc))}</b> · ${dLong(x.date)} ${dHM(x.at)}${x.by?` · ${dEsc(x.by)}`:""}<span class="num">${j+1} / ${n}</span></div>
      ${n>1?`<button type="button" class="dlb-p" aria-label="이전 사진">${IC.back}</button><button type="button" class="dlb-n" aria-label="다음 사진">${IC.back}</button>`:""}
      <button type="button" class="dlb-x" aria-label="닫기">×</button>`;
    const mv=d=>{ DLB.j=(DLB.j+d+n)%n; draw(); }; DLB.mv=mv; DLB.close=close;
    const pb=el.querySelector(".dlb-p"), nb=el.querySelector(".dlb-n");
    if(pb) pb.onclick=e=>{ e.stopPropagation(); mv(-1); }; if(nb) nb.onclick=e=>{ e.stopPropagation(); mv(1); };
    el.querySelector(".dlb-x").onclick=close; el.querySelector("img").onclick=e=>e.stopPropagation();
    // 썸네일로 먼저 보이고 큰 사진이 오면 바뀐다(느린 망)
    const im=el.querySelector("img"); if(p.th && p.th!==p.u){ im.src=p.th; const big=new Image(); big.onload=()=>{ if(DLB && DLB.x.photos[DLB.j]===p) im.src=p.u; }; big.src=p.u; }
  };
  const close=()=>{ el.hidden=true; DLB=null; document.body.style.overflow=""; };
  el.onclick=close; let sx=null;
  el.ontouchstart=e=>{ sx=e.touches[0].clientX; }; el.ontouchend=e=>{ if(sx==null||!DLB) return; const dx=e.changedTouches[0].clientX-sx; sx=null; if(Math.abs(dx)>50 && DLB.x.photos.length>1){ DLB.j=(DLB.j+(dx<0?1:-1)+DLB.x.photos.length)%DLB.x.photos.length; draw(); } };
  el.hidden=false; document.body.style.overflow="hidden"; draw();
}
addEventListener("keydown", e=>{ if(!DLB) return;
  if(e.key==="Escape") DLB.close(); else if(e.key==="ArrowRight") DLB.mv(1); else if(e.key==="ArrowLeft") DLB.mv(-1); });

/* ── 코멘트 ── */
async function dCmtAdd(ref, input, btn){
  const text=input.value.trim(); if(!text) { input.focus(); return; }
  const rec={id:dUid("c"), status:"pending", data:{t:"cmt", ref, text, by:USER.name||"", byRole:USER.role, at:new Date().toISOString()}};
  btn.disabled=true; input.disabled=true;
  if(SB_ON){
    try{ await sb("gg_records", {method:"POST", headers:{Prefer:"resolution=merge-duplicates,return=minimal"}, body:JSON.stringify(rec)}); }
    catch(e){ console.warn(e); try{ await DQ.put(rec); }catch(_){ btn.disabled=false; input.disabled=false; toast("코멘트를 저장하지 못했어요. 인터넷 연결을 확인해 주세요."); return; } toast("인터넷이 약해서 이 기기에 먼저 저장했어요"); }
  }
  dUpsertLocal(rec); DS.open[ref]=true; dailyRender();
  const f=$(`#daily .cm-form[data-ref="${CSS.escape(ref)}"] input`); if(f) f.focus();
}
async function dPatch(x, patch){
  const data={...x.raw, ...patch, editedAt:new Date().toISOString(), editedBy:USER.name||""};
  if(SB_ON) await sb(`gg_records?id=eq.${encodeURIComponent(x.rid)}`, {method:"PATCH", headers:{Prefer:"return=minimal"}, body:JSON.stringify({data, updated_at:new Date().toISOString()})});
  dUpsertLocal({id:x.rid, data, created_at:x.at});
}
async function dCmtEdit(rid){ const c=CMTS.find(y=>y.rid===rid); if(!c) return; const v=prompt("코멘트 수정", c.text); if(v==null) return; const t=v.trim(); if(!t||t===c.text) return;
  try{ await dPatch(c, {text:t}); dailyRender(); toast("코멘트를 고쳤어요"); }catch(e){ console.warn(e); toast("고치지 못했어요. 인터넷 연결을 확인해 주세요."); } }
async function dCmtDel(rid){ const c=CMTS.find(y=>y.rid===rid); if(!c || !confirm("이 코멘트를 지울까요?")) return;
  try{ await dPatch(c, {del:true}); dailyRender(); toast("코멘트를 지웠어요"); }catch(e){ console.warn(e); toast("지우지 못했어요. 인터넷 연결을 확인해 주세요."); } }
async function dMemoEdit(rid){ const x=DAILY.find(y=>y.rid===rid); if(!x) return; const v=prompt("메모 수정", x.memo); if(v==null) return;
  try{ await dPatch(x, {memo:v.trim().slice(0,200)}); dailyRender(); toast("메모를 고쳤어요"); }catch(e){ console.warn(e); toast("고치지 못했어요. 인터넷 연결을 확인해 주세요."); } }
async function dRecDel(rid){ const x=DAILY.find(y=>y.rid===rid); if(!x || !confirm(`${zoneLabel(x.loc)} 기록${x.photos.length?`(사진 ${x.photos.length}장)`:""}을 지울까요?`)) return;
  try{ await dPatch(x, {del:true}); dailyRender(); toast("기록을 지웠어요"); }catch(e){ console.warn(e); toast("지우지 못했어요. 인터넷 연결을 확인해 주세요."); } }

/* ── 가드너: 데일리 기록하기 (날짜 → 층 → 구역 → 사진 → 메모 → 보내기) ── */
let DF = null;
const DF_S = ["date","floor","zone","photo","memo","check"];
function dFlowOpen(day){ DF={id:dUid("d"), step:day?1:0, date:day&&day<=todayYmd()?day:todayYmd(), floor:null, zone:null, photos:[], memo:"", busy:false, done:false, cal:false}; $("#flow").hidden=false; document.body.style.overflow="hidden"; dFlowRender(); }
function dFlowRender(){
  const el=$("#flow"), k=DF_S[DF.step];
  const top=`<div class="crew-top"><button class="back" type="button" id="f-back" ${DF.step===0||DF.done||DF.busy?"hidden":""}>${IC.back}뒤로</button>
    <div class="dots" aria-hidden="true">${DF.done?"":DF_S.map((_,j)=>`<i class="${j===DF.step?"on":j<DF.step?"done":""}"></i>`).join("")}</div>
    <button class="x" type="button" id="f-x" aria-label="닫기" ${DF.busy?"hidden":""}>${IC.x}</button></div>`;
  let body="";
  if(DF.done){
    body=`<div class="done-mark">${IC.ok}</div><h2 class="center">${DF.sent==="later"?"이 폰에 저장했어요":"기록했어요"}</h2>
      <p class="hint center" style="margin:0">${DF.sent==="later"?"인터넷 연결이 약해요. 연결되면 자동으로 보내요. 사진은 지우지 마세요.":`${DF.photos.length?`사진 ${DF.photos.length}장을 저장했어요`:"사진 없이 저장했어요"}. 데일리 관리 현황에 바로 보여요.`}</p>
      <button class="primary" type="button" id="df-again">다른 구역 기록하기</button><button class="ghost" type="button" id="df-close">닫기</button>`;
  } else if(k==="date"){
    const day=n=>{ const d=new Date(Date.now()-n*864e5); return {y:ymdOf(d), l:`${d.getMonth()+1}월 ${d.getDate()}일`}; };
    body=`<h2>언제 관리했어요?</h2><div class="big-grid"><button class="bigbtn yes" type="button" data-dday="${day(0).y}">오늘<small>${day(0).l}</small></button><button class="bigbtn" type="button" data-dday="${day(1).y}">어제<small>${day(1).l}</small></button></div>
      <button class="bigbtn date-big ${DF.cal?"yes":""}" type="button" id="df-cal">다른 날짜 고르기<small>${DF.cal?"아래 달력에서 날짜를 눌러요":"달력에서 골라요"}</small></button>
      ${DF.cal?calendarHTML(DF.calY, DF.calM, DF.date):""}`;
  } else if(DF.sub){
    const zone=DF.sub==="zone";
    body=`<h2>${zone?`${DF.floor}에 구역을 추가해요`:"위치를 추가해요"}</h2><p class="hint">${zone?"다음부터 구역 목록에 함께 보여요.":"층·장소 이름을 써요. 다음부터 위치 목록에 함께 보여요."}</p>
      <input class="bigin" id="df-new" type="text" maxlength="20" placeholder="${zone?"예: D2, 대회의실":"예: 15층 라운지, 1층 로비, 옥상 정원"}" value="${dEsc(DF.draft||"")}" aria-label="${zone?"구역 이름":"위치 이름"}">
      <button class="primary" type="button" id="df-add" ${(DF.draft||"").trim()?"":"disabled"}>${IC.plus}추가하고 고르기</button>`;
  } else if(k==="floor"){
    body=`<h2>어디를 관리했어요?</h2><p class="hint">${dateLabel(DF.date)}</p><div class="big-grid">${Object.keys(ZONES).map(f=>`<button class="bigbtn" type="button" data-df="${f}">${f}</button>`).join("")}
      <button class="bigbtn" type="button" data-df="전체"><small>모든 층 · 모든 구역</small>${D_ALL}</button>
      ${D_PLACES.map(p=>`<button class="bigbtn" type="button" data-dp="${dEsc(p)}">${dEsc(p)}</button>`).join("")}
      <button class="bigbtn add" type="button" data-dadd="place">${IC.plus}<small>기타 · 위치 추가</small></button></div>`;
  } else if(k==="zone"){
    body=`<h2>${DF.floor} 어느 구역이에요?</h2><div class="big-grid three">${ZONES[DF.floor].map(z=>`<button class="bigbtn" type="button" data-dz="${dEsc(z)}">${dEsc(z)}</button>`).join("")}
      <button class="bigbtn" type="button" data-dz="전체"><small>여러 구역</small>${DF.floor} 전체</button>
      <button class="bigbtn add" type="button" data-dadd="zone">${IC.plus}<small>기타 · 구역 추가</small></button></div>`;
  } else if(k==="photo"){
    const L=DF.photos;
    body=`<h2>사진을 넣어요</h2><p class="hint">${L.length?`${L.length}장 넣었어요 · 최대 ${D_MAX}장`:`관리한 모습을 찍어요 · 최대 ${D_MAX}장`}</p>
      ${L.length?`<div class="shots">${L.map((p,j)=>`<div class="shot-th"><img src="${p.th}" alt="">${j===0?'<span class="cover">대표</span>':''}<button type="button" class="rm" data-drm="${j}" aria-label="${j+1}번째 사진 지우기">×</button></div>`).join("")}</div>`:""}
      ${DF.reading?`<p class="hint center" style="margin:0">사진 준비 중…</p>`:L.length<D_MAX?pickBtns("df-file","사진"):""}
      <button class="primary" type="button" id="df-next" ${L.length&&!DF.reading?"":"disabled"}>다음</button>
      ${L.length||DF.reading?"":`<button class="ghost" type="button" id="df-nophoto">사진 없어요</button>`}`;
  } else if(k==="memo"){
    body=`<h2>한 줄 메모를 남겨요</h2><p class="hint">없으면 비워 두고 다음을 눌러요.</p>
      <textarea class="bigin" id="df-memo" rows="3" maxlength="200" style="padding:14px;min-height:120px" placeholder="예: 잎 먼지 정리, 몬스테라 지지대 보강">${dEsc(DF.memo)}</textarea>
      <button class="primary" type="button" id="df-next">다음</button>`;
  } else if(k==="check"){
    body=`<h2>이대로 보낼까요?</h2>
      <div class="recap">${DF.photos.length?`<div class="pair" style="grid-template-columns:1fr">${collage(DF.photos.map(p=>p.th),"after","사진","")}</div>`:""}
        <ul><li><span>날짜</span>${dateLabel(DF.date)}</li><li><span>위치</span>${dEsc(zoneLabel(dZone(DF.floor, DF.zone)))}</li>${DF.photos.length?"":`<li><span>사진</span>없음</li>`}${DF.memo?`<li><span>메모</span><em style="font-style:normal;font-weight:400;font-size:17px">${dEsc(DF.memo)}</em></li>`:""}</ul></div>
      <button class="primary" type="button" id="df-send" ${DF.busy?"disabled":""}>${DF.busy?dEsc(DF.busyText||"보내는 중…"):`${IC.ok}보내기`}</button>
      ${DF.busy?`<p class="hint center" style="margin:0">다 올라갈 때까지 화면을 닫지 마세요.</p>`:""}`;
  }
  el.innerHTML = top + `<div class="crew-body"><div class="crew-step" aria-live="polite">${body}</div></div>`;
  const go=d=>{ DF.cal=false; DF.step=Math.max(0,Math.min(DF_S.length-1,DF.step+d)); dFlowRender(); };
  const noZone=()=>DF.floor==="전체"||DF.floor==="기타";   // 구역 단계 없이 바로 사진으로
  $("#f-x").onclick=()=>{ if(DF.photos.length && !DF.done && !confirm("넣은 사진이 지워져요. 닫을까요?")) return; flowClose(); };
  const bk=$("#f-back"); if(bk) bk.onclick=()=>{ if(DF.sub){ DF.sub=null; DF.draft=""; dFlowRender(); return; } if(DF_S[DF.step]==="memo"){ const m=$("#df-memo"); if(m) DF.memo=m.value.trim(); } go(DF_S[DF.step]==="photo"&&noZone()?-2:-1); };
  el.querySelectorAll("[data-dp]").forEach(b=>b.onclick=()=>{ DF.floor="기타"; DF.zone=b.dataset.dp; go(2); });
  el.querySelectorAll("[data-dadd]").forEach(b=>b.onclick=()=>{ DF.sub=b.dataset.dadd; DF.draft=""; dFlowRender(); });
  const dn=$("#df-new"); if(dn){ dn.oninput=()=>{ DF.draft=dn.value; $("#df-add").disabled=!dn.value.trim(); }; dn.onkeydown=e=>{ if(e.key==="Enter" && !e.isComposing){ e.preventDefault(); $("#df-add").click(); } }; dn.focus(); }
  const da=$("#df-add"); if(da) da.onclick=()=>{ const v=(DF.draft||"").trim().replace(/\|/g,"/"); if(!v) return;
    if(DF.sub==="zone"){ if(!ZONES[DF.floor].includes(v)){ ZONES[DF.floor].push(v); (ZONE_ADD[DF.floor]=ZONE_ADD[DF.floor]||[]).push(v); store.set("gg-zones",ZONE_ADD); saveOpt("zone", `${DF.floor}|${v}`); } toast(`${DF.floor} ${v} 구역을 추가했어요`); DF.zone=v; DF.sub=null; go(1); }
    else { if(!D_PLACES.includes(v)){ D_PLACES.push(v); store.set("gg-dplaces",D_PLACES); saveOpt("zone", `기타|${v}`); } toast(`${v} 위치를 추가했어요`); DF.floor="기타"; DF.zone=v; DF.sub=null; go(2); } };
  el.querySelectorAll("[data-dday]").forEach(b=>b.onclick=()=>{ DF.date=b.dataset.dday; go(1); });
  const dc=$("#df-cal"); if(dc) dc.onclick=()=>{ DF.cal=!DF.cal; const n=new Date(); DF.calY=n.getFullYear(); DF.calM=n.getMonth(); dFlowRender(); };
  el.querySelectorAll("[data-cm]").forEach(b=>b.onclick=()=>{ DF.calM+=+b.dataset.cm; if(DF.calM<0){DF.calM=11;DF.calY--;} if(DF.calM>11){DF.calM=0;DF.calY++;} dFlowRender(); });
  el.querySelectorAll("[data-cd]").forEach(b=>b.onclick=()=>{ DF.date=b.dataset.cd; go(1); });
  el.querySelectorAll("[data-df]").forEach(b=>b.onclick=()=>{ DF.floor=b.dataset.df; if(DF.floor==="전체"){ DF.zone="전체"; go(2); } else go(1); });
  el.querySelectorAll("[data-dz]").forEach(b=>b.onclick=()=>{ DF.zone=b.dataset.dz; go(1); });
  el.querySelectorAll("[data-drm]").forEach(b=>b.onclick=()=>{ DF.photos.splice(+b.dataset.drm,1); dFlowRender(); });
  el.querySelectorAll(".df-file").forEach(fi=>fi.onchange=async()=>{
    const files=[...fi.files].slice(0, D_MAX-DF.photos.length); if(fi.files.length>files.length) toast(`${D_MAX}장까지만 넣었어요`);
    DF.reading=true; dFlowRender(); let bad=0;
    for(const f of files){ try{ DF.photos.push(await dShrink(f)); }catch(e){ console.warn(e); bad++; } }
    DF.reading=false; if(bad) toast(`사진 ${bad}장은 열 수 없어서 빼었어요. 다른 사진으로 다시 넣어 주세요.`); dFlowRender(); });
  const np=$("#df-nophoto"); if(np) np.onclick=()=>go(1);
  const nx=$("#df-next"); if(nx) nx.onclick=()=>{ const m=$("#df-memo"); if(m) DF.memo=m.value.trim(); go(1); };
  const sd=$("#df-send"); if(sd) sd.onclick=async()=>{
    if(DF.busy) return; DF.busy=true; DF.busyText="보내는 중…"; dFlowRender();
    const rec={id:DF.id, status:"pending", data:{t:"daily", date:DF.date, at:isoFromYmd(DF.date), floor:DF.floor, zone:DF.zone, loc:dZone(DF.floor, DF.zone), memo:DF.memo,
      photos:DF.photos.map(p=>({...p})), by:USER.name||"", byRole:USER.role, recAt:new Date().toISOString()}};
    if(!SB_ON){ dUpsertLocal(rec); DF.sent="local"; }
    else {
      try{ await DQ.put(rec); }catch(e){ console.warn("보낼 함 저장 실패", e); }
      try{ const got=await dSend(rec, t=>{ DF.busyText=t; const b=$("#df-send"); if(b) b.textContent=t; }); await DQ.del(rec.id).catch(()=>{}); dUpsertLocal({...rec, data:got}); DF.sent="ok"; }
      catch(e){ console.warn(e); DF.sent="later"; }
      await dPendingLoad();
    }
    DF.busy=false; DF.done=true; DS.day=DF.date; dFlowRender(); dailyRender();
  };
  const ag=$("#df-again"); if(ag) ag.onclick=()=>{ const d=DF.date; dFlowOpen(d); };
  const cl=$("#df-close"); if(cl) cl.onclick=()=>{ flowClose(); setView("daily"); };
  const hh=el.querySelector(".crew-step h2"); if(hh){ hh.setAttribute("tabindex","-1"); hh.focus({preventScroll:true}); }
}
addEventListener("beforeunload", e=>{ if(DF && DF.busy){ e.preventDefault(); e.returnValue=""; } });

/* ── 새로 올라온 기록 · 코멘트: 데일리 화면을 보고 있으면 1분마다 확인 ── */
async function dPoll(){
  if(!SB_ON || state.view!=="daily" || document.hidden) return;
  let rows; try{ rows = await sb("gg_records?select=id,data,created_at&data->>t=in.(daily,cmt)&order=created_at.asc"); }catch(e){ return; }
  if(!Array.isArray(rows)) return;
  const sig=()=>DAILY.map(x=>x.rid+x.editedAt+x.del).join()+CMTS.map(c=>c.rid+c.editedAt+c.del).join();
  const before=sig(); DAILY.length=CMTS.length=0;
  rows.forEach(r=>{ if(r.data?.t==="daily") DAILY.push(dailyFromRec(r)); else CMTS.push(cmtFromRec(r)); });
  if(sig()===before) return;
  // 코멘트를 쓰는 중이면(글자가 있으면) 다시 그리지 않는다. 빈 칸에 커서만 있으면 다시 그리고 커서를 돌려준다
  const fi=document.activeElement?.closest?.(".cm-form"); if(fi && fi.querySelector("input").value.trim()) return;
  const ref=fi?.dataset.ref; dailyRender();
  if(ref){ const n=$(`#daily .cm-form[data-ref="${CSS.escape(ref)}"] input`); if(n) n.focus({preventScroll:true}); }
}
setInterval(dPoll, 60000);
document.addEventListener("visibilitychange", ()=>{ if(!document.hidden) dPoll(); });

$("#open-daily").onclick=()=>dFlowOpen();
window.__dailyReady = true;
if(state.view==="daily") dailyView();
dPendingLoad().then(()=>{ if(dPending.length) dFlush(); });
