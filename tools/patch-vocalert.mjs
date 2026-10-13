// 일회성 패치: VOC 알림 (사이트를 열어 둔 동안 30초마다 확인 → 화면 팝업 · 탭 제목 숫자 · 진동 · 브라우저 알림)
import fs from 'fs';
let h = fs.readFileSync('src/app.html', 'utf8');
const rep = (a, b) => { if (!h.includes(a)) throw new Error('찾지 못함: ' + a.slice(0, 80)); h = h.replace(a, b); };
const BELL = '<svg viewBox="0 0 24 24"><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>';

// 팝업 자리
rep(`<div class="toast" id="toast" role="status"></div>`, `<div class="toast" id="toast" role="status"></div>
<div class="vocpop" id="vocpop" hidden role="alert"><span class="vp-ic">${BELL}</span><div class="vp-t"><b id="vp-title"></b><small id="vp-sub"></small></div><button type="button" class="vp-go" id="vp-go">보기</button><button type="button" class="vp-x" id="vp-x" aria-label="알림 닫기">×</button></div>`);

// VOC 화면: 알림 켜기 버튼 (브라우저 알림 지원 · 아직 허용 전일 때만)
rep(`        <div class="sub-head"><p>식물이나 공간에 의견이 있으면`, `        <div class="sub-head"><button type="button" class="ghost-btn" id="voc-notify" hidden>${BELL}알림 켜기</button><p>식물이나 공간에 의견이 있으면`);

// 처음 불러온 뒤 기준점 / 화면 이동 · 상세 열기 때 '봤음' 처리
rep(`    careRefresh();\n`, `    careRefresh(); vocBaseline();\n`);
rep(`  if(v==="care") careTab(careSub);`, `  if(v==="care") careTab(careSub);
  if(v==="voc") vocMarkSeen();`);
rep(`  const reopen=()=>{ tkView(t); visitView(); tkOpen(t, id); };`, `  const reopen=()=>{ tkView(t); visitView(); tkOpen(t, id); };
  if(t==="req") vocMarkSeen(x.rid);`);

// 알림 모듈
const end = h.lastIndexOf('</script>');
h = h.slice(0, end) + `
/* ── VOC 알림: 사이트를 열어 둔 동안 30초마다 새 VOC · 답변을 확인 ── */
const VOC_SEEN_KEY = "gg-voc-seen";
let vocSeen = new Set(), vocFirst = true, vocReady = false;
try{ const s=JSON.parse(localStorage.getItem(VOC_SEEN_KEY)); if(Array.isArray(s)){ vocSeen=new Set(s); vocFirst=false; } }catch(e){}
const vocSigs = new Map();
const vocSig = x => \`\${x.state}|\${x.reply}|\${(x.donePhotos||[]).length}\`;
const vocWatch = () => USER.role!=="client";            // 리더 · 가드너: 새 VOC 알림
const vocSave = () => { try{ localStorage.setItem(VOC_SEEN_KEY, JSON.stringify([...vocSeen])); }catch(e){} };
const vocBaseTitle = document.title;
function vocBaseline(){
  REQS.forEach(x=>{ if(vocFirst) vocSeen.add(x.rid); vocSigs.set(x.rid, vocSig(x)); });
  if(vocFirst){ vocSave(); vocFirst=false; }
  vocReady = true; vocTitle();
}
function vocUnseen(){ try{ return vocWatch() ? REQS.filter(x=>!vocSeen.has(x.rid)) : []; }catch(e){ return []; } }
function vocTitle(){ const n=vocUnseen().length; document.title = n ? \`(\${n}) \${vocBaseTitle}\` : vocBaseTitle; }
function vocMarkSeen(rid){
  try{ if(rid) vocSeen.add(rid); else REQS.forEach(x=>vocSeen.add(x.rid)); vocSave(); vocTitle(); }catch(e){}
}
function vocAlert(x, kind, more){
  const z = x.loc.map(zoneLabel).join(" · ");
  $("#vp-title").textContent = kind==="new" ? (more ? \`새 VOC \${more+1}건이 접수됐어요\` : "새 VOC가 접수됐어요")
    : (x.state==="done" ? "VOC 처리가 완료됐어요" : "VOC에 답변이 등록됐어요");
  $("#vp-sub").textContent = \`\${z} · \${tkTitle(x)}\${kind==="new"&&x.by?\` · \${x.by}\`:""}\`;
  const pop=$("#vocpop"); pop.hidden=false; pop.classList.remove("in"); void pop.offsetWidth; pop.classList.add("in");
  $("#vp-go").onclick=()=>{ pop.hidden=true; setView("voc"); tkOpen("req", x.id); };
  try{ navigator.vibrate && navigator.vibrate([120,60,120]); }catch(e){}
  try{ if(document.hidden && "Notification" in window && Notification.permission==="granted"){
    const n=new Notification($("#vp-title").textContent, {body:$("#vp-sub").textContent, tag:"gg-voc"}); n.onclick=()=>{ window.focus(); $("#vp-go").click(); n.close(); }; } }catch(e){}
}
$("#vp-x").onclick=()=>{ $("#vocpop").hidden=true; };
async function vocPoll(){
  if(!SB_ON || !vocReady) return;
  let rows; try{ rows = await sb("gg_records?select=*&data->>t=eq.req&order=created_at.asc"); }catch(e){ return; }
  if(!Array.isArray(rows)) return;
  const fresh=[], updated=[];
  rows.forEach(r=>{
    const x=tkFromRec(r), i=REQS.findIndex(y=>y.rid===r.id);
    if(i<0){ REQS.push(x); if(vocWatch() && !vocSeen.has(r.id) && x.by!==(USER.name||"")) fresh.push(x); }
    else { const old=vocSigs.get(r.id); Object.assign(REQS[i], x); if(!vocWatch() && old && old!==vocSig(x)) updated.push(REQS[i]); }
    vocSigs.set(r.id, vocSig(x));
  });
  for(let k=REQS.length-1;k>=0;k--) if(!rows.some(r=>r.id===REQS[k].rid)) REQS.splice(k,1);
  if(fresh.length || updated.length) careRefresh();
  if(fresh.length) vocAlert(fresh[fresh.length-1], "new", fresh.length-1);
  else if(updated.length) vocAlert(updated[updated.length-1], "update");
  vocTitle();
}
setInterval(vocPoll, 30000);
document.addEventListener("visibilitychange", ()=>{ if(!document.hidden) vocPoll(); });
// 알림 켜기 (컴퓨터 브라우저 · 지원 기기)
(()=>{ const b=$("#voc-notify"); if(!b) return;
  const can = "Notification" in window && vocWatch();
  const sync = () => { b.hidden = !can || Notification.permission!=="default"; };
  sync(); b.onclick=async()=>{ try{ const p=await Notification.requestPermission(); toast(p==="granted"?"알림을 켰어요. 다른 창을 보고 있어도 알려드릴게요":"알림이 꺼져 있어요. 브라우저 설정에서 허용할 수 있어요"); }catch(e){} sync(); };
})();
` + h.slice(end);

// 스타일
rep(`.center{text-align:center}`, `.center{text-align:center}
.vocpop{position:fixed;left:50%;top:calc(14px + env(safe-area-inset-top,0px));z-index:95;width:min(440px,calc(100% - 24px));display:grid;grid-template-columns:40px minmax(0,1fr) auto 32px;align-items:center;gap:10px;padding:12px 10px 12px 12px;border-radius:18px;background:var(--ink);color:var(--bg);box-shadow:0 18px 40px rgba(0,0,0,.28);transform:translateX(-50%)}
.vocpop.in{animation:vpIn .35s var(--ease-out)}
@keyframes vpIn{from{opacity:0;transform:translate(-50%,-14px)}}
.vp-ic{width:40px;height:40px;border-radius:12px;background:var(--accent);color:var(--accent-ink);display:grid;place-items:center}
.vp-ic svg{width:22px;height:22px;stroke:currentColor;fill:none;stroke-width:2}
.vp-t{display:flex;flex-direction:column;min-width:0}
.vp-t b{font-size:15px;font-weight:800}
.vp-t small{font-size:12.5px;opacity:.75;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.vp-go{border:0;border-radius:999px;background:var(--accent);color:var(--accent-ink);font:inherit;font-size:13px;font-weight:800;padding:8px 14px;cursor:pointer}
.vp-x{width:32px;height:32px;border:0;border-radius:50%;background:color-mix(in srgb,var(--bg) 15%,transparent);color:var(--bg);font-size:18px;cursor:pointer}
.ghost-btn{display:inline-flex;align-items:center;gap:6px;border:1.5px solid var(--line);background:var(--panel);border-radius:999px;padding:8px 14px;font:inherit;font-size:13px;font-weight:700;cursor:pointer;order:3}
.ghost-btn svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:2}`);

fs.writeFileSync('src/app.html', h);
console.log('VOC 알림 패치 완료');
