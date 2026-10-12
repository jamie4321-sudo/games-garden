// 일회성 패치: src/app.html 에 Supabase 저장을 붙인다
import fs from 'fs';
const F = 'src/app.html';
let h = fs.readFileSync(F, 'utf8');
const rep = (a, b) => { if (!h.includes(a)) throw new Error('찾지 못함: ' + a.slice(0, 70)); h = h.replace(a, b); };

// 1) 설정 + 통신 + 레코드 변환
rep(`const P = {/*__IMGS__*/};`, `const P = {/*__IMGS__*/};
// Supabase: 빌드 때 GG_SB_URL / GG_SB_KEY 로 채워진다(암호화된 스크립트 안에만 들어감). 비어 있으면 이 기기에만 저장.
const SB = {url:"/*__SB_URL__*/", key:"/*__SB_KEY__*/"};
const SB_ON = SB.url.startsWith("https://") && SB.key.length > 20;
const LEADER = location.hash === "#leader"; // 리더 링크: 확인 전 기록이 보이고 '확인 완료'를 누를 수 있다
async function sb(path, opt={}){
  const r = await fetch(\`\${SB.url}/rest/v1/\${path}\`, {...opt, headers:{apikey:SB.key, Authorization:\`Bearer \${SB.key}\`, "Content-Type":"application/json", ...(opt.headers||{})}});
  if(!r.ok) throw new Error(\`\${r.status} \${await r.text()}\`);
  return r.status===204 || r.headers.get("content-length")==="0" ? null : r.json().catch(()=>null);
}
const saveOpt = (kind, name, photo) => { if(SB_ON) sb("gg_options", {method:"POST", headers:{Prefer:"resolution=merge-duplicates,return=minimal"}, body:JSON.stringify({kind, name, photo:photo||null})}).catch(e=>console.warn(e)); };
function recToItem(r){
  const d = r.data||{}, dt = new Date(d.date||r.created_at), mm = dt.getMonth()+1;
  return {id:+r.id, rid:r.id, raw:d, crew:true, m:\`\${dt.getFullYear()}-\${String(mm).padStart(2,"0")}\`, sp:d.sp, loc:[d.loc], kind:d.kind, to:d.to, why:d.why||"",
    done:\`\${mm}.\${dt.getDate()}\`, pending:r.status!=="approved", ph:{b:d.b||null, a:d.a||null}};
}
const visible = i => !i.pending || LEADER || !SB_ON;
// 연결이 안 될 때 보낸 기록은 이 기기에 보관했다가 다음에 다시 보낸다
const OUTBOX = "gg-outbox";
function outboxAdd(rec){ try{ const a=JSON.parse(localStorage.getItem(OUTBOX)||"[]"); a.push(rec); localStorage.setItem(OUTBOX, JSON.stringify(a)); }catch(e){} }
async function flushOutbox(){
  if(!SB_ON) return; let a; try{ a=JSON.parse(localStorage.getItem(OUTBOX)||"[]"); }catch(e){ return; }
  if(!a.length) return; const left=[];
  for(const rec of a){ try{ await sb("gg_records", {method:"POST", headers:{Prefer:"resolution=merge-duplicates,return=minimal"}, body:JSON.stringify(rec)}); }catch(e){ left.push(rec); } }
  try{ localStorage.setItem(OUTBOX, JSON.stringify(left)); }catch(e){}
  if(left.length < a.length) toast(\`이 폰에 남아 있던 기록 \${a.length-left.length}건을 보냈어요\`);
}`);

// 2) 화면에 보일 기록 거르기(담당자 링크에서는 확인 전 기록 숨김)
rep(`  MONTHS = [...new Set(ITEMS.map(i=>i.m))].sort();`, `  MONTHS = [...new Set(ITEMS.filter(visible).map(i=>i.m))].sort();`);
rep(`  const list = ITEMS.filter(i=>state.month==="all"||i.m===state.month);`, `  const list = ITEMS.filter(i=>visible(i) && (state.month==="all"||i.m===state.month));`);

// 3) 상세: 가드너 기록은 '기록일'로, 리더는 확인 완료 버튼
rep(`  const steps = i.pending ? "" : \`<ol class="steps num">
      <li><small>계획 공유</small><b>\${kd(i.plan)}</b></li>`, `  const steps = i.pending ? "" : \`<ol class="steps num">
      <li><small>\${i.crew?"가드너 기록":"계획 공유"}</small><b>\${kd(i.crew?i.done:i.plan)}</b></li>`);
rep("      ${i.pending?`<dt>상태</dt><dd>가드너가 기록했고 리더가 확인하고 있어요</dd>`:\"\"}\n    </dl>",
    "      ${i.pending?`<dt>상태</dt><dd>가드너가 기록했고 리더가 확인하고 있어요</dd>`:\"\"}\n    </dl>\n    ${i.pending && LEADER && SB_ON ? `<button type=\"button\" class=\"approve\" id=\"d-approve\">확인 완료 · 담당자 화면에 올리기</button>` : \"\"}");
rep(`  el.querySelectorAll("[data-up]").forEach(f=>f.onchange=()=>{ const file=f.files[0]; if(!file) return; shrink(file, url=>{ i.ph[f.dataset.up]=url; detail(false); board(); toast("사진을 등록했어요"); }); });`,
`  el.querySelectorAll("[data-up]").forEach(f=>f.onchange=()=>{ const file=f.files[0]; if(!file) return; shrink(file, async url=>{
    i.ph[f.dataset.up]=url;
    if(SB_ON && i.rid){ i.raw={...i.raw, [f.dataset.up]:url}; try{ await sb(\`gg_records?id=eq.\${i.rid}\`, {method:"PATCH", headers:{Prefer:"return=minimal"}, body:JSON.stringify({data:i.raw, updated_at:new Date().toISOString()})}); toast("사진을 등록했어요"); }catch(e){ toast("사진을 저장하지 못했어요. 인터넷 연결을 확인해 주세요."); } }
    else toast("사진을 등록했어요");
    detail(false); board(); }); });
  const ok=$("#d-approve"); if(ok) ok.onclick=async()=>{ ok.disabled=true; ok.textContent="올리는 중…";
    try{ await sb(\`gg_records?id=eq.\${i.rid}\`, {method:"PATCH", headers:{Prefer:"return=minimal"}, body:JSON.stringify({status:"approved", updated_at:new Date().toISOString()})});
      i.pending=false; toast("담당자 화면에 올렸어요"); summary(); board(); locView(); monView(); detail(false);
    }catch(e){ ok.disabled=false; ok.textContent="확인 완료 · 담당자 화면에 올리기"; toast("저장하지 못했어요. 인터넷 연결을 확인해 주세요."); } };`);

// 4) 가드너: 자리·식물·사진도 공유 저장
rep(`store.set("gg-plants",PLANT_ADD); toast(\`\${f.dataset.photo} 사진을 등록했어요\`);`, `store.set("gg-plants",PLANT_ADD); saveOpt("plant", f.dataset.photo, url); toast(\`\${f.dataset.photo} 사진을 등록했어요\`);`);
rep(`store.set("gg-zones",ZONE_ADD); }`, `store.set("gg-zones",ZONE_ADD); saveOpt("zone", \`\${C.floor}|\${z}\`); }`);
rep(`else PLANT_ADD.push([n,PLANTS.get(n)]); store.set("gg-plants",PLANT_ADD);`, `else PLANT_ADD.push([n,PLANTS.get(n)]); store.set("gg-plants",PLANT_ADD); saveOpt("plant", n, PLANTS.get(n));`);

// 5) 보내기 → Supabase
rep(`  const sd=$("#c-send"); if(sd) sd.onclick=()=>{
    const mm=String(TODAY.getMonth()+1).padStart(2,"0"), id=Date.now();
    ITEMS.push({id,m:\`\${TODAY.getFullYear()}-\${mm}\`,sp:C.sp,loc:[\`\${C.floor==="10층"?"10F":"14F"} \${C.zone}\`],kind:C.same?"same":"swap",to:C.to,why:(WHY.find(w=>w[0]===C.why)||[])[2]||"",pending:true,ph:{b:C.b,a:C.a}});
    C.done=true; crewRender(); state.month="all"; board(); summary(); };`,
`  const sd=$("#c-send"); if(sd) sd.onclick=async()=>{
    const rec = {id:String(Date.now()), status:"pending", data:{date:new Date().toISOString(), floor:C.floor, zone:C.zone, loc:\`\${C.floor==="10층"?"10F":"14F"} \${C.zone}\`,
      sp:C.sp, kind:C.same?"same":"swap", to:C.to, whyKey:C.why, why:(WHY.find(w=>w[0]===C.why)||[])[2]||"", b:C.b, a:C.a}};
    if(SB_ON){ sd.disabled=true; sd.textContent="보내는 중…";
      try{ await sb("gg_records", {method:"POST", headers:{Prefer:"return=minimal"}, body:JSON.stringify(rec)}); C.sent="ok"; }
      catch(e){ console.warn(e); outboxAdd(rec); C.sent="later"; } }
    else C.sent="local";
    ITEMS.push(recToItem(rec)); C.done=true; crewRender(); state.month="all"; board(); summary(); };`);
rep(`<h2 class="center">기록했어요</h2><p class="hint center" style="margin:0">리더가 확인하면 담당자 화면에 올라가요.</p>`,
    `<h2 class="center">\${C.sent==="later"?"이 폰에 저장했어요":"기록했어요"}</h2><p class="hint center" style="margin:0">\${C.sent==="later"?"인터넷 연결이 약해요. 다음에 열면 자동으로 보내요.":"리더가 확인하면 담당자 화면에 올라가요."}</p>`);

// 6) 시작 시 불러오기
rep(`summary(); board(); detail(false); locView(); monView(); setView(state.view);`, `summary(); board(); detail(false); locView(); monView(); setView(state.view);
async function loadRemote(){
  if(!SB_ON) return;
  try{
    const [recs, opts] = await Promise.all([sb("gg_records?select=*&order=created_at.asc"), sb("gg_options?select=*")]);
    for(let k=ITEMS.length-1;k>=0;k--) if(ITEMS[k].crew) ITEMS.splice(k,1);
    (recs||[]).forEach(r=>ITEMS.push(recToItem(r)));
    (opts||[]).forEach(o=>{ if(o.kind==="zone"){ const [f,z]=o.name.split("|"); if(ZONES[f] && !ZONES[f].includes(z)) ZONES[f].push(z); }
      else if(o.kind==="plant" && !PLANTS.get(o.name)) PLANTS.set(o.name, o.photo||null); });
    summary(); board(); locView(); monView(); if(state.view==="report") reportView();
    const waiting = ITEMS.filter(i=>i.pending).length;
    if(LEADER) $("#crumb").textContent = \`카카오게임즈 / 리더 화면 · 확인 기다리는 기록 \${waiting}건\`;
    flushOutbox();
  }catch(e){ console.warn(e); toast("저장된 기록을 불러오지 못했어요. 잠시 뒤 다시 열어 주세요."); }
}
loadRemote();`);

// 7) 확인 완료 버튼 스타일
rep(`.center{text-align:center}`, `.center{text-align:center}
.approve{min-height:52px;border:0;border-radius:var(--r);background:var(--accent);color:var(--accent-ink);font:inherit;font-size:15px;font-weight:800;cursor:pointer}
.approve[disabled]{opacity:.5}`);

fs.writeFileSync(F, h);
console.log('패치 완료');
