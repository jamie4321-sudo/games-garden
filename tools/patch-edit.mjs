// 일회성 패치: 리더가 가드너 기록을 간단히 수정하는 '수정하기'
import fs from 'fs';
let h = fs.readFileSync('src/app.html', 'utf8');
const rep = (a, b) => { if (!h.includes(a)) throw new Error('찾지 못함: ' + a.slice(0, 70)); h = h.replace(a, b); };

// 메모(담당자에게 보이는 설명)도 기록에서 읽는다
rep("    done:`${mm}.${dt.getDate()}`, pending:r.status!==\"approved\", ph:{b:d.b||null, a:d.a||null}};",
    "    done:`${mm}.${dt.getDate()}`, pending:r.status!==\"approved\", ph:{b:d.b||null, a:d.a||null}, note:d.note||\"\"};");

// 버튼 + 수정 폼
rep("    ${i.pending && LEADER && SB_ON ? `<button type=\"button\" class=\"approve\" id=\"d-approve\">확인 완료 · 담당자 화면에 올리기</button>` : \"\"}",
    "    ${i.pending && LEADER && SB_ON ? `<button type=\"button\" class=\"approve\" id=\"d-approve\">확인 완료 · 담당자 화면에 올리기</button>` : \"\"}\n    ${i.crew && LEADER && SB_ON ? `<button type=\"button\" class=\"edit-btn\" id=\"d-edit\">관리자 수정하기</button>${editForm(i)}` : \"\"}");

// 저장 동작
rep(`  const ok=$("#d-approve"); if(ok) ok.onclick=async()=>{`, `  const eb=$("#d-edit"), ef=$("#d-editform");
  if(eb && ef){
    eb.onclick=()=>{ ef.hidden=!ef.hidden; eb.textContent = ef.hidden ? "관리자 수정하기" : "수정 닫기"; if(!ef.hidden) ef.querySelector("input").focus(); };
    const syncTo=()=>{ const sw=ef.querySelector('input[name="e-kind"]:checked').value==="swap"; ef.querySelector("#e-to").disabled=!sw; if(!sw) ef.querySelector("#e-to").value=ef.querySelector("#e-sp").value; };
    ef.querySelectorAll('input[name="e-kind"]').forEach(x=>x.onchange=syncTo); ef.querySelector("#e-sp").oninput=syncTo;
    ef.querySelector("#e-cancel").onclick=()=>{ ef.hidden=true; eb.textContent="관리자 수정하기"; };
    ef.onsubmit=async ev=>{ ev.preventDefault();
      const v=id=>ef.querySelector(id).value.trim();
      const kind=ef.querySelector('input[name="e-kind"]:checked').value;
      const sp=v("#e-sp"), to=kind==="swap"?v("#e-to"):sp, loc=v("#e-loc"), date=v("#e-date");
      if(!sp||!loc||!date||(kind==="swap"&&!to)){ toast("위치, 식물, 교체일을 채워 주세요"); return; }
      const raw={...i.raw, loc, sp, kind, to, why:v("#e-why"), note:v("#e-note"), date:new Date(date+"T09:00:00").toISOString(), editedBy:USER.name||"", editedAt:new Date().toISOString()};
      const btn=ef.querySelector('button[type="submit"]'); btn.disabled=true; btn.textContent="저장하는 중…";
      try{ await sb(\`gg_records?id=eq.\${i.rid}\`, {method:"PATCH", headers:{Prefer:"return=minimal"}, body:JSON.stringify({data:raw, updated_at:new Date().toISOString()})});
        Object.assign(i, recToItem({id:i.rid, status:i.pending?"pending":"approved", data:raw, created_at:raw.date}));
        toast("수정했어요"); summary(); board(); locView(); monView(); if(state.view==="report") reportView(); detail(false);
      }catch(e){ console.warn(e); btn.disabled=false; btn.textContent="수정 저장"; toast("저장하지 못했어요. 인터넷 연결을 확인해 주세요."); } };
  }
  const ok=$("#d-approve"); if(ok) ok.onclick=async()=>{`);

// 폼 HTML 만드는 함수 (detail 앞에)
rep(`function detail(anim){`, `// 리더용 기록 수정 폼: 위치 · 식물 · 구분 · 사유 · 교체일 · 담당자에게 보일 설명
function editForm(i){
  const d=i.raw||{}, dt=new Date(d.date||Date.now());
  const ymd=\`\${dt.getFullYear()}-\${String(dt.getMonth()+1).padStart(2,"0")}-\${String(dt.getDate()).padStart(2,"0")}\`;
  const zones=Object.entries(ZONES).flatMap(([f,zs])=>zs.map(z=>\`\${f==="10층"?"10F":"14F"} \${z}\`));
  const whys=[...new Set([...WHY.map(w=>w[1]).filter(w=>w!=="기타"), d.why].filter(Boolean)), "기타"];
  const esc=s=>String(s||"").replace(/"/g,"&quot;");
  return \`<form class="edit-form" id="d-editform" hidden autocomplete="off">
    <datalist id="e-zones">\${zones.map(z=>\`<option value="\${z}">\`).join("")}</datalist>
    <datalist id="e-plants">\${[...PLANTS.keys()].map(p=>\`<option value="\${esc(p)}">\`).join("")}</datalist>
    <label>위치<input id="e-loc" list="e-zones" value="\${esc(i.loc[0])}" required></label>
    <label>교체일<input id="e-date" type="date" value="\${ymd}" required></label>
    <label>교체 전 식물<input id="e-sp" list="e-plants" value="\${esc(i.sp)}" required></label>
    <div class="e-kind" role="radiogroup" aria-label="구분">
      <label><input type="radio" name="e-kind" value="same" \${i.kind!=="swap"?"checked":""}> 같은 수종</label>
      <label><input type="radio" name="e-kind" value="swap" \${i.kind==="swap"?"checked":""}> 수종 변경</label>
    </div>
    <label>교체 후 식물<input id="e-to" list="e-plants" value="\${esc(i.to)}" \${i.kind!=="swap"?"disabled":""}></label>
    <label>교체 사유<select id="e-why">\${whys.map(w=>\`<option \${w===(d.why||"")?"selected":""}>\${w}</option>\`).join("")}</select></label>
    <label class="wide">담당자에게 보일 설명<textarea id="e-note" rows="3" maxlength="300" placeholder="예: 저조도 구역이라 내음성 수종으로 교체했어요.">\${d.note||""}</textarea></label>
    \${d.editedAt?\`<p class="e-meta wide">마지막 수정: \${d.editedBy||"관리자"} · \${new Date(d.editedAt).toLocaleString("ko-KR",{month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"})}</p>\`:""}
    <div class="e-act wide"><button type="submit" class="approve">수정 저장</button><button type="button" id="e-cancel" class="edit-btn">취소</button></div>
  </form>\`;
}
function detail(anim){`);

// 스타일
rep(`.approve[disabled]{opacity:.5}`, `.approve[disabled]{opacity:.5}
.edit-btn{min-height:46px;border:1.5px solid var(--line);border-radius:var(--r);background:var(--panel);color:var(--ink);font:inherit;font-size:14px;font-weight:700;cursor:pointer}
.edit-btn:hover{border-color:var(--ink-3)}
.edit-form{display:grid;grid-template-columns:1fr 1fr;gap:12px;background:var(--panel-2);border-radius:var(--r);padding:14px}
.edit-form label{display:flex;flex-direction:column;gap:5px;font-size:12.5px;font-weight:700;color:var(--ink-2);min-width:0}
.edit-form input,.edit-form select,.edit-form textarea{min-height:42px;border-radius:10px;border:1.5px solid var(--line);background:var(--panel);color:var(--ink);font:inherit;font-size:14px;font-weight:400;padding:0 10px;min-width:0;width:100%}
.edit-form textarea{padding:10px;resize:vertical;line-height:1.5}
.edit-form input:disabled{opacity:.5}
.edit-form input:focus,.edit-form select:focus,.edit-form textarea:focus{outline:none;border-color:var(--accent-text)}
.edit-form .wide{grid-column:1/-1}
.e-kind{grid-column:1/-1;display:flex;gap:8px}
.e-kind label{flex-direction:row;align-items:center;gap:6px;border:1.5px solid var(--line);background:var(--panel);border-radius:999px;padding:7px 14px;font-size:13.5px;cursor:pointer}
.e-kind label:has(input:checked){border-color:var(--accent-text);background:color-mix(in srgb,var(--accent) 22%,var(--panel))}
.e-meta{margin:0;font-size:12px;color:var(--ink-3)}
.e-act{display:flex;gap:8px}
.e-act .approve{flex:1}
.e-act .edit-btn{padding:0 18px}`);

fs.writeFileSync('src/app.html', h);
console.log('수정하기 패치 완료');
