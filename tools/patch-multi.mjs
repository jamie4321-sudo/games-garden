// 일회성 패치: 교체 전·후 사진 최대 5장(장 수별 자동 칸 나누기) + 총괄 관리자 전용 삭제 + 수정 폼 다듬기
import fs from 'fs';
let h = fs.readFileSync('src/app.html', 'utf8');
const rep = (a, b) => { if (!h.includes(a)) throw new Error('찾지 못함: ' + a.slice(0, 80)); h = h.replace(a, b); };
const MAX = 5;

// ── 데이터: ph.bs / ph.as (사진 목록). ph.b / ph.a 는 대표(첫 장) ──
rep(`    done:\`\${mm}.\${dt.getDate()}\`, pending:r.status!=="approved", ph:{b:d.b||null, a:d.a||null}, note:d.note||""};`,
    `    done:\`\${mm}.\${dt.getDate()}\`, pending:r.status!=="approved", note:d.note||"",
    ph:(()=>{ const bs=(d.bs&&d.bs.length?d.bs:[d.b]).filter(Boolean), as=(d.as&&d.as.length?d.as:[d.a]).filter(Boolean); return {b:bs[0]||null, a:as[0]||null, bs, as}; })()};`);

// PPT 기록의 '다른 화분' 사진은 같은 칸에 합친다
rep(`const TODAY = new Date();`, `const TODAY = new Date();
ITEMS.forEach(i=>{ if(!i.ph) return; i.ph.bs=[i.ph.b,...(i.more||[]).map(m=>m[0])].filter(Boolean); i.ph.as=[i.ph.a,...(i.more||[]).map(m=>m[1])].filter(Boolean); delete i.more; });
const shots = (i, side) => ((i.ph?.[side+"s"]) || [i.ph?.[side]]).filter(Boolean).map(img).filter(Boolean);`);

// ── 장 수별 콜라주 ──
rep(`const pairHTML = (i, big) => half(img(i.ph?.b),"before","교체 전",\`\${i.sp} 교체 전\`) + half(img(i.ph?.a),"after",\`교체 후\${i.kind==='swap'&&!big?' · '+i.to:''}\`,\`\${i.to} 교체 후\`) + arrow;`,
`// 1장 통째 · 2장 위아래 · 3장 큰1+작은2 · 4장 2×2 · 5장 큰1+작은3(마지막 칸에 +1)
function collage(list, cls, label, alt){
  const n=list.length;
  if(n<=1) return half(list[0], cls, label, alt);
  const show=list.slice(0, n>=5?4:n);
  return \`<div class="half \${cls} cg cg\${Math.min(n,5)}">\${show.map((s,j)=>\`<i><img src="\${s}" alt="\${alt} \${j+1}" loading="lazy">\${n>=5&&j===3?\`<b class="cg-more">+\${n-4}</b>\`:""}</i>\`).join("")}<span class="lab">\${label} \${n}</span></div>\`;
}
const pairHTML = (i, big) => collage(shots(i,"b"),"before","교체 전",\`\${i.sp} 교체 전\`) + collage(shots(i,"a"),"after",\`교체 후\${i.kind==='swap'&&!big?' · '+i.to:''}\`,\`\${i.to} 교체 후\`) + arrow;`);

// ── 상세: 큰 사진 + 썸네일 줄 + 크게 보기 ──
rep(`  const pair = \`<div class="pair">\${pairHTML(i,true)}</div>\`;`,
`  const bL=shots(i,"b"), aL=shots(i,"a");
  const strip=(list,side)=>list.length>1?\`<div class="strip" data-side="\${side}">\${list.map((s,j)=>\`<button type="button" class="\${j?"":"on"}" data-j="\${j}" aria-label="\${side==="b"?"교체 전":"교체 후"} \${j+1}번째 사진"><img src="\${s}" alt=""></button>\`).join("")}</div>\`:"<div></div>";
  const pair = \`<div class="pair big-pair">\${half(bL[0],"before",\`교체 전\${bL.length>1?" 1/"+bL.length:""}\`,\`\${i.sp} 교체 전\`)}\${half(aL[0],"after",\`교체 후\${aL.length>1?" 1/"+aL.length:""}\`,\`\${i.to} 교체 후\`)}\${arrow}</div>
    \${bL.length>1||aL.length>1?\`<div class="strips">\${strip(bL,"b")}\${strip(aL,"a")}</div>\`:""}\`;`);
rep(`    \${gal}\${more}`, `    \${gal}`);
rep(`  const more = i.more ?`, `  const more = false ?`);

// 썸네일·크게 보기 동작 (수정 폼 동작 바로 앞)
rep(`  const eb=$("#d-edit"), ef=$("#d-editform");`, `  el.querySelectorAll(".strip").forEach(st=>{ const side=st.dataset.side, list=side==="b"?bL:aL, halfEl=el.querySelectorAll(".big-pair .half")[side==="b"?0:1];
    st.querySelectorAll("button").forEach(b=>b.onclick=()=>{ const j=+b.dataset.j; st.querySelectorAll("button").forEach(x=>x.classList.toggle("on",x===b));
      halfEl.querySelector("img").src=list[j]; halfEl.querySelector(".lab").textContent=\`\${side==="b"?"교체 전":"교체 후"} \${j+1}/\${list.length}\`; }); });
  el.querySelectorAll(".big-pair .half img").forEach(im=>im.onclick=()=>openLightbox(im.src));
  const del=$("#d-delete"); if(del) del.onclick=async()=>{
    if(del.dataset.sure!=="1"){ del.dataset.sure="1"; del.textContent="한 번 더 누르면 영구 삭제돼요"; setTimeout(()=>{ if(del.isConnected){ del.dataset.sure=""; del.textContent="기록 삭제"; } },3500); return; }
    del.disabled=true; del.textContent="삭제하는 중…";
    try{ await sb(\`gg_records?id=eq.\${i.rid}\`, {method:"DELETE", headers:{Prefer:"return=representation", "x-gg-master":window.GG_MT||""}}).then(r=>{ if(!r||!r.length) throw new Error("권한 없음"); });
      ITEMS.splice(ITEMS.indexOf(i),1); state.sel=ITEMS[0]?.id; toast("기록을 삭제했어요"); summary(); board(); locView(); monView(); detail(false); if(narrow()) closeDetail();
    }catch(e){ console.warn(e); del.disabled=false; del.dataset.sure=""; del.textContent="기록 삭제"; toast("삭제하지 못했어요. 총괄 관리자만 삭제할 수 있어요."); } };
  const eb=$("#d-edit"), ef=$("#d-editform");`);

// 삭제 버튼 (수정하기 아래, 총괄 관리자만)
rep("    ${i.crew && LEADER && SB_ON ? `<button type=\"button\" class=\"edit-btn\" id=\"d-edit\">관리자 수정하기</button>${editForm(i)}` : \"\"}",
    "    ${i.crew && LEADER && SB_ON ? `<button type=\"button\" class=\"edit-btn\" id=\"d-edit\">관리자 수정하기</button>${editForm(i)}` : \"\"}\n    ${i.crew && IS_MASTER && SB_ON && window.GG_MT ? `<button type=\"button\" class=\"del-btn\" id=\"d-delete\">기록 삭제</button>` : \"\"}");

// 나중에 올린 사진: 목록에도 넣는다
rep(`    if(SB_ON && i.rid){ i.raw={...i.raw, [f.dataset.up]:url};`, `    i.ph[f.dataset.up+"s"]=[url];
    if(SB_ON && i.rid){ i.raw={...i.raw, [f.dataset.up]:url, [f.dataset.up+"s"]:[url]};`);

// ── 크게 보기 ──
rep(`<div class="toast" id="toast" role="status"></div>`, `<div class="toast" id="toast" role="status"></div>
<div class="lightbox" id="lightbox" hidden role="dialog" aria-label="사진 크게 보기"><img id="lb-img" alt=""><button type="button" id="lb-x" aria-label="닫기">×</button></div>`);
rep(`let tt; function toast(t){`, `function openLightbox(src){ const lb=$("#lightbox"); $("#lb-img").src=src; lb.hidden=false; }
$("#lightbox").onclick=()=>{ $("#lightbox").hidden=true; };
let tt; function toast(t){`);

// ── 가드너: 전·후 각각 5장까지 ──
rep(`why:null,b:null,a:null,done:false,`, `why:null,bs:[],as:[],done:false,`);
rep(`    const miss = !C.b || !C.a;`, `    const miss = !C.bs.length || !C.as.length;`);
rep(`    const v=C[k==="before"?"b":"a"];
    body = \`<h2>\${k==="before"?"바꾸기 전":"바꾼 후"} 사진을 찍어요</h2>
      <label class="shot \${v?'has':''}">\${v?\`<img src="\${v}" alt=""><span class="retake">다시 찍기</span>\`:\`\${IC.cam}<span>눌러서 사진 찍기</span>\`}
        <input type="file" accept="image/*" capture="environment" id="c-file" aria-label="\${k==="before"?"바꾸기 전":"바꾼 후"} 사진"></label>
      <button class="primary" type="button" id="c-next" \${v?'':'disabled'}>다음</button>
      \${v?'':'<button class="ghost" type="button" id="c-skip">사진은 나중에 등록할게요</button>'}\`;`,
`    const list=C[k==="before"?"bs":"as"], what=k==="before"?"바꾸기 전":"바꾼 후";
    body = \`<h2>\${what} 사진을 찍어요</h2><p class="hint">\${list.length?\`\${list.length}장 찍었어요 · 최대 ${MAX}장\`:"여러 방향에서 찍으면 좋아요 · 최대 ${MAX}장"}</p>
      \${list.length ? \`<div class="shots">\${list.map((u,j)=>\`<div class="shot-th"><img src="\${u}" alt="\${what} \${j+1}">\${j===0?'<span class="cover">대표</span>':''}<button type="button" class="rm" data-rm="\${j}" aria-label="\${j+1}번째 사진 지우기">×</button></div>\`).join("")}
          \${list.length<${MAX}?\`<label class="shot-add">\${IC.cam}<span>사진 더 찍기</span><input type="file" accept="image/*" capture="environment" multiple id="c-file" aria-label="\${what} 사진 더 찍기"></label>\`:""}</div>\`
        : \`<label class="shot">\${IC.cam}<span>눌러서 사진 찍기</span><input type="file" accept="image/*" capture="environment" multiple id="c-file" aria-label="\${what} 사진"></label>\`}
      <button class="primary" type="button" id="c-next" \${list.length?'':'disabled'}>다음</button>
      \${list.length?'':'<button class="ghost" type="button" id="c-skip">사진은 나중에 등록할게요</button>'}\`;`);
rep(`      <div class="recap"><div class="pair">\${half(C.b,"before","전","")}\${half(C.a,"after","후","")}\${arrow}</div>`,
    `      <div class="recap"><div class="pair">\${collage(C.bs,"before","교체 전","")}\${collage(C.as,"after","교체 후","")}\${arrow}</div>`);
rep(`  const f=$("#c-file"); if(f) f.onchange=()=>{ const file=f.files[0]; if(!file) return; shrink(file, url=>{ C[k==="before"?"b":"a"]=url; crewRender(); }); };`,
    `  const f=$("#c-file"); if(f) f.onchange=async()=>{ const key=k==="before"?"bs":"as"; const files=[...f.files].slice(0, ${MAX}-C[key].length);
    for(const file of files){ C[key].push(await new Promise(res=>shrink(file,res))); } crewRender(); };
  on("[data-rm]", b=>b.onclick=()=>{ C[k==="before"?"bs":"as"].splice(+b.dataset.rm,1); crewRender(); });`);
rep(`whyKey:C.why, why:(WHY.find(w=>w[0]===C.why)||[])[1]||"", b:C.b, a:C.a}};`,
    `whyKey:C.why, why:(WHY.find(w=>w[0]===C.why)||[])[1]||"", bs:[...C.bs], as:[...C.as], b:C.bs[0]||null, a:C.as[0]||null}};`);
rep(`      rec.data.b = await putPhoto(rec.data.b, "records"); rec.data.a = await putPhoto(rec.data.a, "records");`,
    `      for(const side of ["bs","as"]) for(let j=0;j<rec.data[side].length;j++){ sd.textContent=\`사진 올리는 중… \${side==="bs"?"교체 전":"교체 후"} \${j+1}/\${rec.data[side].length}\`; rec.data[side][j]=await putPhoto(rec.data[side][j],"records"); }
      rec.data.b=rec.data.bs[0]||null; rec.data.a=rec.data.as[0]||null;`);

// 정리(이전): 목록 사진도
rep(`  for(const r of recs){ const d=r.data||{}; if(!(d.b?.startsWith("data:") || d.a?.startsWith("data:"))) continue;
    const b=await putPhoto(d.b,"records"), a=await putPhoto(d.a,"records");
    if(b===d.b && a===d.a) continue;
    try{ await sb(\`gg_records?id=eq.\${r.id}\`, {method:"PATCH", headers:{Prefer:"return=minimal"}, body:JSON.stringify({data:{...d, b, a}, updated_at:new Date().toISOString()})});
      const it=ITEMS.find(i=>i.rid===r.id); if(it){ it.ph={b,a}; it.raw={...d,b,a}; } n++; }catch(e){ console.warn(e); } }`,
`  const isData=s=>typeof s==="string" && s.startsWith("data:");
  for(const r of recs){ const d=r.data||{}; const all=[d.b,d.a,...(d.bs||[]),...(d.as||[])]; if(!all.some(isData)) continue;
    const map=new Map(); for(const s of all) if(isData(s) && !map.has(s)) map.set(s, await putPhoto(s,"records"));
    const sw=s=>map.get(s)||s, nd={...d, b:sw(d.b), a:sw(d.a), ...(d.bs?{bs:d.bs.map(sw)}:{}), ...(d.as?{as:d.as.map(sw)}:{})};
    if(![...map].some(([k,v])=>k!==v)) continue;
    try{ await sb(\`gg_records?id=eq.\${r.id}\`, {method:"PATCH", headers:{Prefer:"return=minimal"}, body:JSON.stringify({data:nd, updated_at:new Date().toISOString()})});
      const it=ITEMS.find(i=>i.rid===r.id); if(it){ Object.assign(it, recToItem({...r, data:nd})); } n++; }catch(e){ console.warn(e); } }`);

// 총괄 관리자 비밀번호를 바꿀 때 삭제 열쇠도 같이 잠근다
rep(`  const blob=await seal(pk, {k:window.GG_KRAW, id:id.trim().toLowerCase(), name, role});`,
    `  const isMaster = window.GG_MASTER && (await idHash(id))===window.GG_MASTER.idh;
  const blob=await seal(pk, {k:window.GG_KRAW, id:id.trim().toLowerCase(), name, role, ...(isMaster&&window.GG_MT?{mt:window.GG_MT}:{})});`);

// ── 스타일 ──
rep(`.e-meta{margin:0;font-size:12px;color:var(--ink-3)}`, `.e-meta{margin:0;font-size:12px;color:var(--ink-3)}
.e-kind input[type=radio]{width:16px;height:16px;min-height:0;flex:none;padding:0;margin:0;accent-color:var(--accent-text)}
.del-btn{min-height:44px;border:1.5px solid color-mix(in srgb,#dc2f28 40%,transparent);border-radius:var(--r);background:transparent;color:#dc2f28;font:inherit;font-size:14px;font-weight:700;cursor:pointer}
.del-btn:hover{background:color-mix(in srgb,#dc2f28 8%,transparent)}
.del-btn[data-sure="1"]{background:#dc2f28;color:#fff}
.cg{display:grid;gap:2px;background:var(--panel)}
.cg i{position:relative;overflow:hidden;background:var(--photo-bg);min-height:0}
.cg i img{width:100%;height:100%;object-fit:cover;display:block}
.cg2{grid-template:1fr 1fr/1fr}
.cg3{grid-template:2fr 1fr/1fr 1fr}.cg3 i:first-child{grid-column:1/3}
.cg4{grid-template:1fr 1fr/1fr 1fr}
.cg5{grid-template:2fr 1fr/1fr 1fr 1fr}.cg5 i:first-child{grid-column:1/4}
.cg-more{position:absolute;inset:0;display:grid;place-items:center;background:rgba(10,10,11,.5);color:#fff;font-size:15px;font-weight:800}
.cg .lab{z-index:1}
.big-pair .half img{cursor:zoom-in}
.strips{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:-12px}
.strip{display:flex;gap:4px;min-width:0}
.strip button{flex:1 1 0;max-width:20%;aspect-ratio:1;padding:0;border:0;border-radius:6px;overflow:hidden;cursor:pointer;opacity:.6;outline:2px solid transparent;outline-offset:-2px;background:var(--photo-bg)}
.strip button.on{opacity:1;outline-color:var(--ink)}
.strip img{width:100%;height:100%;object-fit:cover;display:block}
.lightbox{position:fixed;inset:0;z-index:90;background:rgba(0,0,0,.88);display:grid;place-items:center;padding:16px;cursor:zoom-out}
.lightbox img{max-width:100%;max-height:100%;object-fit:contain;border-radius:8px}
.lightbox button{position:absolute;top:calc(14px + env(safe-area-inset-top,0px));right:14px;width:44px;height:44px;border-radius:50%;border:0;background:rgba(255,255,255,.15);color:#fff;font-size:24px;cursor:pointer}
.shots{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.shot-th{position:relative;aspect-ratio:3/4;border-radius:16px;overflow:hidden;background:var(--photo-bg)}
.shot-th img{width:100%;height:100%;object-fit:cover;display:block}
.shot-th .rm{position:absolute;top:6px;right:6px;width:40px;height:40px;border-radius:50%;border:0;background:rgba(10,10,11,.65);color:#fff;font-size:22px;cursor:pointer}
.shot-th .cover{position:absolute;left:8px;bottom:8px;background:var(--accent);color:var(--accent-ink);font-size:13px;font-weight:800;padding:3px 9px;border-radius:999px}
.shot-add{position:relative;aspect-ratio:3/4;border:3px dashed var(--ink-3);border-radius:16px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;font-size:17px;font-weight:800;text-align:center;cursor:pointer}
.shot-add svg{width:40px;height:40px;stroke:currentColor;fill:none;stroke-width:1.8}
.shot-add input{position:absolute;inset:0;opacity:0;cursor:pointer}`);

fs.writeFileSync('src/app.html', h);
console.log('여러 장 사진 · 삭제 패치 완료');
