// 일회성 패치: 가드너도 자기 기록(교체 기록 · 리포트 기록)을 직접 수정 — 내용 + 사진
import fs from 'fs';
let h = fs.readFileSync('src/app.html', 'utf8');
const rep = (a, b, all) => { if (!h.includes(a)) throw new Error('찾지 못함: ' + a.slice(0, 80)); h = all ? h.replaceAll(a, b) : h.replace(a, b); };

// 가드너도 리더 확인 전(내가 보낸) 교체 기록을 볼 수 있어야 고칠 수 있다
rep(`const visible = i => !i.pending || LEADER || (!SB_ON && !window.GG_USER);`,
    `const visible = i => !i.pending || LEADER || USER.role==="crew" || (!SB_ON && !window.GG_USER);
const CREW_EDIT = LEADER || USER.role==="crew";            // 가드너 기록 수정: 리더 · 가드너
const EDIT_L = LEADER ? "관리자 수정하기" : "기록 수정하기";
// 수정 폼 안 사진 편집: 썸네일 · 지우기 · 추가(최대 5장). list 를 그대로 바꾼다
function photoEd(box, list, label){
  const draw=()=>{ box.innerHTML = (list.length?\`<div class="shots">\${list.map((u,j)=>\`<div class="shot-th"><img src="\${img(u)||""}" alt="\${label} \${j+1}">\${j===0?'<span class="cover">대표</span>':''}<button type="button" class="rm" data-erm="\${j}" aria-label="\${label} \${j+1}번째 사진 지우기">×</button></div>\`).join("")}</div>\`:\`<p class="r-empty">사진이 없어요</p>\`)
      + (list.length<5?pickBtns("e-pick",label):"");
    box.querySelectorAll("[data-erm]").forEach(b=>b.onclick=()=>{ list.splice(+b.dataset.erm,1); draw(); });
    box.querySelectorAll(".e-pick").forEach(fi=>fi.onchange=async()=>{ const files=[...fi.files].slice(0,5-list.length); if(fi.files.length>files.length) toast("5장까지만 넣었어요");
      for(const f of files) list.push(await new Promise(r=>shrink(f,r))); draw(); });
  };
  draw(); return list;
}
// 새로 넣은 사진(data:)만 Storage 에 올린다
async function upAll(list, folder, btn){ const out=[]; for(let j=0;j<list.length;j++){ const u=list[j]; if(String(u).startsWith("data:")){ if(btn) btn.textContent=\`사진 올리는 중… \${j+1}/\${list.length}\`; out.push(await putPhoto(u, folder)); } else out.push(u); } return out; }`);

/* ── 교체 기록: 가드너도 '기록 수정하기' + 사진 편집 ── */
rep("    ${i.crew && LEADER && SB_ON ? `<button type=\"button\" class=\"edit-btn\" id=\"d-edit\">관리자 수정하기</button>${editForm(i)}` : \"\"}",
    "    ${i.crew && CREW_EDIT && SB_ON ? `<button type=\"button\" class=\"edit-btn\" id=\"d-edit\">${EDIT_L}</button>${editForm(i)}` : \"\"}");
rep(`eb.textContent = ef.hidden ? "관리자 수정하기" : "수정 닫기";`, `eb.textContent = ef.hidden ? EDIT_L : "수정 닫기";`);
rep(`ef.querySelector("#e-cancel").onclick=()=>{ ef.hidden=true; eb.textContent="관리자 수정하기"; };`,
    `ef.querySelector("#e-cancel").onclick=()=>{ ef.hidden=true; eb.textContent=EDIT_L; };
    const eBs=photoEd(ef.querySelector("#e-ph-b"), [...(i.raw?.bs?.length?i.raw.bs:[i.raw?.b]).filter(Boolean)], "교체 전 사진");
    const eAs=photoEd(ef.querySelector("#e-ph-a"), [...(i.raw?.as?.length?i.raw.as:[i.raw?.a]).filter(Boolean)], "교체 후 사진");`);
rep(`      const raw={...i.raw, loc, sp, kind, to, why:v("#e-why"), note:v("#e-note"), date:new Date(date+"T09:00:00").toISOString(), editedBy:USER.name||"", editedAt:new Date().toISOString()};
      const btn=ef.querySelector('button[type="submit"]'); btn.disabled=true; btn.textContent="저장하는 중…";
      try{ await sb(`,
    `      const btn=ef.querySelector('button[type="submit"]'); btn.disabled=true;
      try{ const bs=await upAll(eBs,"records",btn), as=await upAll(eAs,"records",btn); btn.textContent="저장하는 중…";
        const raw={...i.raw, loc, sp, kind, to, why:v("#e-why"), note:v("#e-note"), date:new Date(date+"T09:00:00").toISOString(), bs, as, b:bs[0]||null, a:as[0]||null, editedBy:USER.name||"", editedAt:new Date().toISOString()};
        await sb(`);
rep(`    <label class="wide">담당자에게 보일 설명<textarea id="e-note"`,
    `    <div class="wide e-ph"><b>교체 전 사진</b><div id="e-ph-b"></div></div>
    <div class="wide e-ph"><b>교체 후 사진</b><div id="e-ph-a"></div></div>
    <label class="wide">담당자에게 보일 설명<textarea id="e-note"`);
rep(`<p class="e-meta wide">마지막 수정: \${d.editedBy||"관리자"}`, `<p class="e-meta wide">마지막 수정: \${d.editedBy||"가드너"}`);
rep(`// 리더용 기록 수정 폼:`, `// 기록 수정 폼(리더 · 가드너):`);

/* ── 리포트 기록(이슈): 가드너도 상태 · 소견 · 진행 기록 + 기록 내용 수정 ── */
rep(`  const canEdit = LEADER || (t==="req" && USER.role==="crew"); // VOC 는 가드너도 답변·완료 사진`,
    `  const canEdit = LEADER || USER.role==="crew"; // 가드너도 리포트 소견 · VOC 답변 · 완료 사진
  const canFix = t==="issue" && CREW_EDIT && SB_ON;   // 리포트 기록 내용 자체 수정`);
rep(`      \${x.memo?\`<dt>\${t==="req"?"VOC 내용":"현장 상황"}</dt><dd>\${x.memo}</dd>\`:""}
    </dl>`,
    `      \${x.memo?\`<dt>\${t==="req"?"VOC 내용":"현장 상황"}</dt><dd>\${x.memo}</dd>\`:""}
      \${x.raw.editedAt?\`<dt>수정</dt><dd>\${fmtFull(x.raw.editedAt)}\${x.raw.editedBy?\` · \${x.raw.editedBy}\`:""}</dd>\`:""}
    </dl>
    \${canFix?\`<button type="button" class="edit-btn" id="ie-open">\${EDIT_L}</button>\${issueForm(x)}\`:""}`);
rep(`  const reopen=()=>{ tkView(t); visitView(); tkOpen(t, id); };`,
    `  const reopen=()=>{ tkView(t); visitView(); tkOpen(t, id); };
  const io=$("#ie-open"), iff=$("#ie-form");
  if(io && iff){
    let iPh=null;
    io.onclick=()=>{ iff.hidden=!iff.hidden; io.textContent = iff.hidden ? EDIT_L : "수정 닫기"; if(!iff.hidden && !iPh) iPh=photoEd(iff.querySelector("#ie-ph"), [...x.photos], "사진"); };
    iff.querySelector("#ie-cancel").onclick=()=>{ iff.hidden=true; io.textContent=EDIT_L; };
    iff.onsubmit=async ev=>{ ev.preventDefault();
      const v=s=>iff.querySelector(s).value.trim(), ymd=v("#ie-date"), loc=v("#ie-loc");
      if(!ymd||!loc){ toast("날짜와 구역을 채워 주세요"); return; }
      if(ymd>todayYmd()){ toast("오늘이나 지난 날짜만 고를 수 있어요"); return; }
      const btn=iff.querySelector('button[type="submit"]'); btn.disabled=true;
      try{ const photos=await upAll(iPh||x.photos, TK.issue.folder, btn); btn.textContent="저장하는 중…";
        const same = ymdOf(new Date(x.date))===ymd;
        await tkSave(x, {date: same ? x.raw.date||x.date : isoFromYmd(ymd), loc:[loc], sp:v("#ie-sp"), cat:v("#ie-cat"), name:v("#ie-name"), memo:v("#ie-memo"), photos,
          editedBy:USER.name||"", editedAt:new Date().toISOString(), log:[...x.log, {date:new Date().toISOString(), note:"기록 내용을 수정했어요", by:USER.name||""}]});
        toast("수정했어요"); reopen();
      }catch(e){ console.warn(e); btn.disabled=false; btn.textContent="수정 저장"; toast("저장하지 못했어요. 인터넷 연결을 확인해 주세요."); } };
  }`);
rep(`/* ── 상세 (오른쪽 패널 재사용) ── */`, `// 리포트 기록 수정 폼: 날짜 · 구역 · 식물 · 분류 · 이름 · 현장 상황 · 사진
function issueForm(x){
  const esc=s=>String(s||"").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;");
  return \`<form class="edit-form" id="ie-form" hidden autocomplete="off">
    <datalist id="ie-zones">\${allZones().map(z=>\`<option value="\${z}">\`).join("")}</datalist>
    <datalist id="ie-plants">\${[...PLANTS.keys()].map(p=>\`<option value="\${esc(p)}">\`).join("")}</datalist>
    <label>발견 날짜<input id="ie-date" type="date" value="\${ymdOf(new Date(x.date))}" max="\${todayYmd()}" required></label>
    <label>구역<input id="ie-loc" list="ie-zones" value="\${esc(x.loc[0])}" placeholder="예: 14F B4" required></label>
    <label>식물<input id="ie-sp" list="ie-plants" value="\${esc(x.sp)}" placeholder="모르면 비워 두세요"></label>
    <label>분류<select id="ie-cat">\${TK.issue.cats.map(c=>\`<option value="\${c[0]}" \${c[0]===x.cat?"selected":""}>\${c[1]}</option>\`).join("")}</select></label>
    <label class="wide">이슈 이름<input id="ie-name" maxlength="30" value="\${esc(x.name)}" placeholder="비우면 분류 이름으로 보여요"></label>
    <label class="wide">현장 상황<textarea id="ie-memo" rows="3" maxlength="300">\${esc(x.memo)}</textarea></label>
    <div class="wide e-ph"><b>사진</b><div id="ie-ph"></div></div>
    <div class="e-act wide"><button type="submit" class="approve">수정 저장</button><button type="button" id="ie-cancel" class="edit-btn">취소</button></div>
  </form>\`;
}
/* ── 상세 (오른쪽 패널 재사용) ── */`);

// 스타일: 수정 폼 안 사진 영역
rep(`.e-meta{margin:0;font-size:12px;color:var(--ink-3)}`, `.e-meta{margin:0;font-size:12px;color:var(--ink-3)}
.e-ph{display:flex;flex-direction:column;gap:8px}
.e-ph>b{font-size:12.5px;color:var(--ink-2)}
.e-ph .shots{gap:8px}
.e-ph .shot-th .rm{width:34px;height:34px;font-size:19px}
.e-ph .pick-btn{min-height:52px;font-size:14px}
#ie-form{margin-top:-4px}`);

fs.writeFileSync('src/app.html', h);
console.log('가드너 기록 수정 패치 완료');
