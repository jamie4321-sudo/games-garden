// 일회성 패치: 계정별 로그인(역할) + 관리자 설정 화면
import fs from 'fs';
const F = 'src/app.html';
let h = fs.readFileSync(F, 'utf8');
const rep = (a, b) => { if (!h.includes(a)) throw new Error('찾지 못함: ' + a.slice(0, 70)); h = h.replace(a, b); };

// ── 마크업 ──
rep(`    </nav>
    <div class="crew-entry">`, `      <button data-view="admin" id="nav-admin" hidden><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c1-4 4-6 7-6s6 2 7 6"/></svg><span class="lg">관리자 설정</span><span class="sm">관리자</span></button>
    </nav>
    <div class="crew-entry" id="crew-entry">`);
rep(`    <div class="side__foot"><span class="dot"></span>링키지랩 스낵&amp;가든사업팀</div>`,
    `    <div class="side__foot"><span class="dot"></span><span id="who">링키지랩 스낵&amp;가든사업팀</span><button type="button" class="logout" id="logout" hidden>로그아웃</button></div>`);
rep(`      <article class="report" id="report"></article>
    </section>`, `      <article class="report" id="report"></article>
    </section>

    <section class="view" id="view-admin" hidden>
      <div class="head"><h1>관리자 설정</h1><p>로그인 계정을 만들고 비밀번호를 바꿔요. 역할에 따라 보이는 화면이 달라요.</p></div>
      <div class="roles">
        <div><b>리더</b><span>확인 전 기록 · 확인 완료 · 관리자 설정</span></div>
        <div><b>담당자</b><span>확인된 교체 기록만 봐요</span></div>
        <div><b>가드너</b><span>로그인하면 기록 화면이 바로 열려요</span></div>
      </div>
      <div class="acct" id="acct"></div>
      <form class="acct-form" id="acct-form" autocomplete="off">
        <h3>계정 추가</h3>
        <div class="af-grid">
          <label>이름<input id="af-name" type="text" maxlength="20" placeholder="예: 김가든" required></label>
          <label>아이디<input id="af-id" type="text" maxlength="24" placeholder="영문·숫자, 예: garden01" required pattern="[A-Za-z0-9._\\-]+"></label>
          <label>비밀번호<input id="af-pw" type="password" minlength="4" required autocomplete="new-password"></label>
          <label>비밀번호 확인<input id="af-pw2" type="password" minlength="4" required autocomplete="new-password"></label>
        </div>
        <div class="af-role" role="radiogroup" aria-label="역할">
          <label><input type="radio" name="af-role" value="leader"> 리더</label>
          <label><input type="radio" name="af-role" value="client" checked> 담당자</label>
          <label><input type="radio" name="af-role" value="crew"> 가드너</label>
        </div>
        <p class="af-msg" id="af-msg" role="status"></p>
        <button type="submit" class="approve" id="af-save">계정 추가</button>
      </form>
    </section>`);

// ── 역할 ──
rep(`const LEADER = location.hash === "#leader"; // 리더 링크: 확인 전 기록이 보이고 '확인 완료'를 누를 수 있다`,
`// 로그인한 계정(게이트가 window.GG_USER 로 넘겨줌). 로그인 없이 열린 예시 화면은 #leader 해시로 역할을 흉내낸다
const USER = window.GG_USER || {id:"", name:"", role: location.hash==="#leader" || !SB_ON ? "leader" : "client"};
const LEADER = USER.role === "leader";   // 확인 전 기록 · 확인 완료 · 관리자 설정
const CREW_OK = USER.role !== "client";  // 담당자에게는 기록하기 버튼을 숨긴다
const ROLE_LABEL = {leader:"리더", client:"담당자", crew:"가드너"};`);
rep(`const visible = i => !i.pending || LEADER || !SB_ON;`, `const visible = i => !i.pending || LEADER || (!SB_ON && !window.GG_USER);`);
rep(`const VIEWS = {board:"교체 현황",loc:"위치별 이력",mon:"활착 관리",report:"월간 리포트"};`,
    `const VIEWS = {board:"교체 현황",loc:"위치별 이력",mon:"활착 관리",report:"월간 리포트",admin:"관리자 설정"};`);
rep(`  if(!VIEWS[v]) v="board";`, `  if(!VIEWS[v] || (v==="admin" && !LEADER)) v="board";`);
rep(`  if(v==="report") reportView();`, `  if(v==="report") reportView();
  if(v==="admin") adminView();`);
rep(`if(location.hash==="#crew") crewOpen();`, `// 역할별 화면
$("#nav-admin").hidden = !LEADER;
$("#crew-entry").hidden = !CREW_OK;
if(window.GG_USER){ $("#who").textContent = \`\${USER.name} · \${ROLE_LABEL[USER.role]||""}\`; $("#logout").hidden = false; }
$("#logout").onclick = () => { try{ localStorage.removeItem("gg-key"); localStorage.removeItem("gg-session"); }catch(e){} location.reload(); };
if(location.hash==="#crew" || USER.role==="crew") crewOpen();

/* ── 관리자 설정: 계정마다 '화면 열쇠'를 그 계정 비밀번호로 잠가 gg_keys 에 저장 ── */
const b64e = u => { let s=""; new Uint8Array(u).forEach(c=>s+=String.fromCharCode(c)); return btoa(s); };
const b64d = s => Uint8Array.from(atob(s), c=>c.charCodeAt(0));
const sha256hex = async s => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))].map(x=>x.toString(16).padStart(2,"0")).join("");
const idHash = id => sha256hex("gg:" + id.trim().toLowerCase());
const appKey = () => crypto.subtle.importKey("raw", b64d(window.GG_KRAW), "AES-GCM", false, ["encrypt","decrypt"]);
async function seal(key, obj){ const iv=crypto.getRandomValues(new Uint8Array(12)); return {iv:b64e(iv), ct:b64e(await crypto.subtle.encrypt({name:"AES-GCM",iv}, key, new TextEncoder().encode(JSON.stringify(obj))))}; }
async function unseal(key, iv, ct){ return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:"AES-GCM",iv:b64d(iv)}, key, b64d(ct)))); }
async function makeSlot(id, name, role, pw){
  const ITER=310000, salt=crypto.getRandomValues(new Uint8Array(16));
  const base=await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]);
  const pk=await crypto.subtle.deriveKey({name:"PBKDF2", salt, iterations:ITER, hash:"SHA-256"}, base, {name:"AES-GCM", length:256}, false, ["encrypt"]);
  const blob=await seal(pk, {k:window.GG_KRAW, id:id.trim().toLowerCase(), name, role});
  const meta=await seal(await appKey(), {id:id.trim().toLowerCase(), name, role});
  return {idh:await idHash(id), salt:b64e(salt), iter:ITER, iv:blob.iv, blob:blob.ct, meta_iv:meta.iv, meta:meta.ct, updated_at:new Date().toISOString()};
}
let ACCTS = [];
async function adminView(){
  const box=$("#acct");
  if(!SB_ON || !window.GG_KRAW){ box.innerHTML='<div class="note">계정 관리는 배포된 페이지에서 리더로 로그인했을 때 쓸 수 있어요.</div>'; $("#acct-form").hidden=true; return; }
  box.innerHTML='<div class="note">계정을 불러오는 중이에요…</div>';
  try{
    const rows = await sb("gg_keys?select=idh,meta,meta_iv,updated_at&order=updated_at.asc") || [];
    const key = await appKey();
    ACCTS = [];
    for(const r of rows){ try{ ACCTS.push({...(await unseal(key, r.meta_iv, r.meta)), idh:r.idh, updated_at:r.updated_at}); }catch(e){} }
    const me = window.GG_MASTER;
    if(me && !ACCTS.some(a=>a.idh===me.idh)) ACCTS.unshift({id:me.id, name:me.name, role:"leader", idh:me.idh, builtin:true});
    renderAccts();
  }catch(e){ console.warn(e); box.innerHTML='<div class="note">계정을 불러오지 못했어요. 인터넷 연결을 확인해 주세요.</div>'; }
}
function renderAccts(){
  const box=$("#acct");
  box.innerHTML = \`<div class="acct-row acct-head"><span>이름 · 아이디</span><span>역할</span><span>마지막 변경</span><span></span></div>\` + ACCTS.map(a=>\`
    <div class="acct-row" data-idh="\${a.idh}">
      <div><b>\${a.name}</b><small>\${a.id}\${a.idh===USER.idh?' · 나':''}\${a.builtin?' · 기본 계정':''}</small></div>
      <span class="role role--\${a.role}">\${ROLE_LABEL[a.role]}</span>
      <span class="num muted">\${a.updated_at?new Date(a.updated_at).toLocaleDateString("ko-KR"):"—"}</span>
      <div class="acct-act"><button type="button" data-act="pw">비밀번호 변경</button>\${a.idh===USER.idh||a.builtin?"":'<button type="button" data-act="del" class="danger">삭제</button>'}</div>
      <form class="acct-pw" hidden><input type="password" minlength="4" placeholder="새 비밀번호" required autocomplete="new-password"><input type="password" minlength="4" placeholder="한 번 더" required autocomplete="new-password"><button type="submit">저장</button><button type="button" data-act="cancel">취소</button></form>
    </div>\`).join("");
  box.querySelectorAll(".acct-row[data-idh]").forEach(row=>{
    const a=ACCTS.find(x=>x.idh===row.dataset.idh), f=row.querySelector(".acct-pw");
    row.querySelector('[data-act="pw"]').onclick=()=>{ f.hidden=!f.hidden; if(!f.hidden) f.querySelector("input").focus(); };
    row.querySelector('[data-act="cancel"]').onclick=()=>{ f.hidden=true; };
    f.onsubmit=async ev=>{ ev.preventDefault(); const [p1,p2]=[...f.querySelectorAll("input")].map(x=>x.value);
      if(p1!==p2){ toast("두 비밀번호가 달라요"); return; }
      try{ await sb("gg_keys", {method:"POST", headers:{Prefer:"resolution=merge-duplicates,return=minimal"}, body:JSON.stringify(await makeSlot(a.id, a.name, a.role, p1))});
        toast(\`\${a.name} 비밀번호를 바꿨어요\${p1.length<6?" (6자리 이상을 권해요)":""}\`); adminView(); }catch(e){ console.warn(e); toast("저장하지 못했어요. 인터넷 연결을 확인해 주세요."); } };
    const del=row.querySelector('[data-act="del"]');
    if(del) del.onclick=async()=>{
      if(del.dataset.sure!=="1"){ del.dataset.sure="1"; del.textContent="한 번 더 누르면 삭제"; setTimeout(()=>{ del.dataset.sure=""; del.textContent="삭제"; },3000); return; }
      try{ await sb(\`gg_keys?idh=eq.\${a.idh}\`, {method:"DELETE", headers:{Prefer:"return=minimal"}}); toast(\`\${a.name} 계정을 삭제했어요\`); adminView(); }catch(e){ toast("삭제하지 못했어요."); } };
  });
}
$("#acct-form").onsubmit = async ev => {
  ev.preventDefault();
  const name=$("#af-name").value.trim(), id=$("#af-id").value.trim(), p1=$("#af-pw").value, p2=$("#af-pw2").value;
  const role=document.querySelector('input[name="af-role"]:checked').value, msg=$("#af-msg");
  if(p1!==p2){ msg.textContent="두 비밀번호가 달라요."; return; }
  const idh=await idHash(id);
  if(ACCTS.some(a=>a.idh===idh)){ msg.textContent="이미 있는 아이디예요. 다른 아이디를 써 주세요."; return; }
  const btn=$("#af-save"); btn.disabled=true; msg.textContent="";
  try{ await sb("gg_keys", {method:"POST", headers:{Prefer:"return=minimal"}, body:JSON.stringify(await makeSlot(id, name, role, p1))});
    toast(\`\${name} 계정을 만들었어요\`); ev.target.reset(); adminView();
  }catch(e){ console.warn(e); msg.textContent="저장하지 못했어요. 인터넷 연결을 확인해 주세요."; }
  btn.disabled=false;
};`);

// 리더 표시 문구
rep("    if(LEADER) $(\"#crumb\").textContent = `카카오게임즈 / 리더 화면 · 확인 기다리는 기록 ${waiting}건`;",
    "    if(LEADER && state.view===\"board\") $(\"#crumb\").textContent = `카카오게임즈 / 교체 현황 · 확인 기다리는 기록 ${waiting}건`;");

// ── 스타일 ──
rep(`.center{text-align:center}`, `.center{text-align:center}
.logout{margin-left:auto;border:0;background:none;color:var(--ink-3);font:inherit;font-size:11px;cursor:pointer;text-decoration:underline;text-underline-offset:2px}
.logout:hover{color:var(--ink)}
.roles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));background:var(--panel);border:1px solid var(--line-soft);border-radius:var(--r-lg)}
.roles>div{padding:14px 16px;display:flex;flex-direction:column;gap:3px;min-width:0}
.roles>div+div{border-left:1px solid var(--line-soft)}
.roles b{font-size:14px}
.roles span{font-size:12.5px;color:var(--ink-2)}
.acct{background:var(--panel);border:1px solid var(--line-soft);border-radius:var(--r-lg);overflow:hidden}
.acct .note{margin:14px}
.acct-row{display:grid;grid-template-columns:minmax(0,1.4fr) 90px 110px auto;gap:12px;align-items:center;padding:12px 18px}
.acct-row+.acct-row{border-top:1px solid var(--line-soft)}
.acct-head{font-size:11.5px;color:var(--ink-3);background:var(--panel-2);padding-block:9px}
.acct-row b{display:block;font-size:14.5px}
.acct-row small{font-size:12px;color:var(--ink-3)}
.muted{font-size:12.5px;color:var(--ink-3)}
.role{justify-self:start;font-size:11.5px;font-weight:700;padding:3px 9px;border-radius:999px;background:var(--panel-2);color:var(--ink-2)}
.role--leader{background:var(--accent);color:var(--accent-ink)}
.acct-act{display:flex;gap:6px;justify-content:flex-end}
.acct-act button,.acct-pw button{border:1px solid var(--line);background:var(--panel);border-radius:999px;padding:6px 12px;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer}
.acct-act .danger{color:#dc2f28;border-color:color-mix(in srgb,#dc2f28 35%,transparent)}
.acct-pw{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:8px}
.acct-pw input,.acct-form input[type=text],.acct-form input[type=password]{min-height:42px;border-radius:10px;border:1.5px solid var(--line);background:var(--panel-2);color:var(--ink);font:inherit;font-size:14px;padding:0 12px;min-width:0}
.acct-pw input{flex:1 1 160px}
.acct-form{background:var(--panel);border:1px solid var(--line-soft);border-radius:var(--r-lg);padding:18px;display:flex;flex-direction:column;gap:14px;max-width:720px}
.acct-form h3{margin:0;font-size:15px}
.af-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.af-grid label{display:flex;flex-direction:column;gap:5px;font-size:12.5px;font-weight:700;color:var(--ink-2)}
.af-role{display:flex;gap:8px;flex-wrap:wrap}
.af-role label{display:flex;align-items:center;gap:6px;border:1.5px solid var(--line);border-radius:999px;padding:7px 14px;font-size:13.5px;font-weight:700;cursor:pointer}
.af-role label:has(input:checked){border-color:var(--accent-text);background:color-mix(in srgb,var(--accent) 22%,var(--panel))}
.af-msg{margin:0;min-height:18px;font-size:13px;color:#dc2f28}
.acct-form .approve{align-self:flex-start;padding:0 22px}
@media (max-width:860px){
  .roles{grid-template-columns:minmax(0,1fr)}
  .roles>div+div{border-left:0;border-top:1px solid var(--line-soft)}
  .acct-row{grid-template-columns:minmax(0,1fr) auto}
  .acct-head{display:none}
  .acct-row .muted{display:none}
  .acct-act{grid-column:1/-1;justify-content:flex-start}
  .af-grid{grid-template-columns:minmax(0,1fr)}
  .nav button .lg{display:none}
}
.nav button .sm{display:none}
@media (max-width:860px){ .nav button .sm{display:inline} }`);

fs.writeFileSync(F, h);
console.log('계정 패치 완료');
