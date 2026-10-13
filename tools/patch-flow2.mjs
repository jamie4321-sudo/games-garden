// 일회성 패치: 리포트 기록 흐름 = 교체 기록과 같은 방식 (달력 · 구역 추가 · 식물 모르겠어요/추가 · 현장 상황)
import fs from 'fs';
let h = fs.readFileSync('src/app.html', 'utf8');
const rep = (a, b) => { if (!h.includes(a)) throw new Error('찾지 못함: ' + a.slice(0, 80)); h = h.replace(a, b); };

// 달력 (큰 버튼 · 미래 날짜는 누를 수 없음)
rep(`let F=null;`, `let F=null;
function calendarHTML(y, m, sel){
  const first=new Date(y,m,1).getDay(), last=new Date(y,m+1,0).getDate(), today=todayYmd(), now=new Date();
  const isNow = y===now.getFullYear() && m===now.getMonth();
  let cells=""; for(let i=0;i<first;i++) cells+="<i></i>";
  for(let d=1; d<=last; d++){ const v=ymdOf(new Date(y,m,d)); cells+=\`<button type="button" data-cd="\${v}" \${v>today?"disabled":""} class="\${v===today?"today ":""}\${v===sel?"on":""}" aria-label="\${m+1}월 \${d}일">\${d}</button>\`; }
  return \`<div class="cal"><div class="cal-h"><button type="button" data-cm="-1" aria-label="이전 달">\${IC.back}</button><b>\${y}년 \${m+1}월</b><button type="button" data-cm="1" \${isNow?"disabled":""} aria-label="다음 달" class="cal-next">\${IC.back}</button></div>
    <div class="cal-w"><span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span></div><div class="cal-g">\${cells}</div></div>\`;
}`);

// 날짜 단계: '다른 날짜 고르기' → 달력 펼침
rep(`      <label class="bigbtn date-big">다른 날짜 고르기<small>달력에서 골라요</small><input type="date" id="f-day" max="\${todayYmd()}" aria-label="발견한 날짜"></label>\`;`,
    `      <button class="bigbtn date-big \${F.cal?"yes":""}" type="button" id="f-cal-open">다른 날짜 고르기<small>\${F.cal?"아래 달력에서 날짜를 눌러요":"달력에서 골라요"}</small></button>
      \${F.cal?calendarHTML(F.calY, F.calM, F.date):""}\`;`);

// 하위 화면: 구역 추가 · 식물 추가
rep(`  if(!F.done && k==="date"){`, `  if(!F.done && F.sub==="addZone"){
    body = \`<h2>새 구역을 만들어요</h2><p class="hint">버튼을 눌러서 구역 이름을 만들어요.</p>
      <div class="compose"><span class="cf">\${F.floor}</span><b id="f-draft">\${F.draft||'<i>여기에 보여요</i>'}</b>\${F.draft?\`<button type="button" class="erase" id="f-erase" aria-label="한 글자 지우기">\${IC.back}</button>\`:""}</div>
      \${Object.entries(ZONE_KEYS).map(([g,keys])=>\`<div class="keys"><small>\${g}</small><div>\${keys.map(x=>\`<button type="button" class="key" data-fk="\${x}">\${x}</button>\`).join("")}</div></div>\`).join("")}
      <details class="type"><summary>직접 쓰기</summary><input id="f-ztype" type="text" maxlength="12" placeholder="예: D2, 대회의실" value="\${F.draft}"></details>
      <button class="primary" type="button" id="f-add-zone" \${F.draft?"":"disabled"}>\${IC.plus}구역 추가하기</button>\`;
  } else if(!F.done && F.sub==="addPlant"){
    body = \`<h2>새 식물을 추가해요</h2><p class="hint">이름을 누르거나 직접 써요.</p>
      <div class="keys"><div>\${PLANT_IDEAS.filter(n=>!PLANTS.has(n)).map(n=>\`<button type="button" class="key wide \${F.draft===n?"on":""}" data-fname="\${n}">\${n}</button>\`).join("")}</div></div>
      <input class="bigin" id="f-pname" type="text" maxlength="14" placeholder="식물 이름" value="\${F.draft}" aria-label="식물 이름">
      \${F.newPhoto?\`<div class="shot small has"><img src="\${F.newPhoto}" alt="새 식물 사진"></div>\`:""}
      \${pickBtns("f-np", "새 식물 사진", false)}
      <button class="primary" type="button" id="f-add-plant" \${F.draft.trim()?"":"disabled"}>\${IC.plus}\${F.newPhoto?"식물 추가하기":"사진은 나중에 등록하고 추가"}</button>\`;
  } else if(!F.done && k==="date"){`);

// 구역 '기타' → 구역 추가 / 식물: 모르겠어요 + 기타(추가)
rep(`      <button class="bigbtn" type="button" data-z="기타"><small>목록에 없어요</small>기타</button></div>\`;`,
    `      <button class="bigbtn add" type="button" data-fadd="zone">\${IC.plus}<small>기타 · 구역 추가</small></button></div>\`;`);
rep(`      <button type="button" class="addtile quiet" data-p=""><b>?</b><span>모르겠어요</span></button></div>\`;`,
    `      <button type="button" class="addtile quiet" data-p=""><b>?</b><span>모르겠어요</span></button>
      <button type="button" class="addtile" data-fadd="plant">\${IC.plus}<span>기타 · 새 식물 추가</span></button></div>\`;`);

// 현장 상황
rep(`\${F.t==="req"?"의견이나 요청을 적어 주세요":"남길 말이 있으면 적어요"}</h2><p class="hint">\${F.t==="req"?"짧게 적어도 괜찮아요.":"없으면 그냥 다음을 눌러요."}</p>`,
    `\${F.t==="req"?"의견이나 요청을 적어 주세요":"링키지랩 가드너가 봤을 때 현재 어떤 상황인지 기록해요"}</h2><p class="hint">\${F.t==="req"?"짧게 적어도 괜찮아요.":"퍼진 정도, 잎 · 흙 상태, 주변 식물까지 본 대로 적어요."}</p>`);
rep(`"예: 잎 뒷면에 하얀 솜 같은 게 붙어 있어요."`, `"예: 잎 뒷면 10군데 정도에 하얀 솜 같은 벌레가 붙어 있고, 옆 화분까지는 아직 번지지 않았어요."`);
rep(`\${t==="req"?"VOC 내용":"현장 메모"}</dt>`, `\${t==="req"?"VOC 내용":"현장 상황"}</dt>`);
rep(`\${F.memo?\`<li><span>내용</span>`, `\${F.memo?\`<li><span>\${F.t==="req"?"내용":"상황"}</span>`);

// 동작
rep(`  const go=d=>{ F.step=`, `  const go=d=>{ F.sub=null; F.cal=false; F.step=`);
rep(`  $("#f-x").onclick=flowClose; const bk=$("#f-back"); if(bk) bk.onclick=()=>go(-1);`,
    `  $("#f-x").onclick=flowClose; const bk=$("#f-back"); if(bk) bk.onclick=()=>{ if(F.sub){ F.sub=null; flowRender(); } else go(-1); };
  const co=$("#f-cal-open"); if(co) co.onclick=()=>{ F.cal=!F.cal; const n=new Date(); F.calY=n.getFullYear(); F.calM=n.getMonth(); flowRender(); };
  el.querySelectorAll("[data-cm]").forEach(b=>b.onclick=()=>{ F.calM+=+b.dataset.cm; if(F.calM<0){F.calM=11;F.calY--;} if(F.calM>11){F.calM=0;F.calY++;} flowRender(); });
  el.querySelectorAll("[data-cd]").forEach(b=>b.onclick=()=>{ F.date=b.dataset.cd; go(1); });
  el.querySelectorAll("[data-fadd]").forEach(b=>b.onclick=()=>{ F.sub = b.dataset.fadd==="zone" ? "addZone" : "addPlant"; F.draft=""; F.newPhoto=null; flowRender(); });
  el.querySelectorAll("[data-fk]").forEach(b=>b.onclick=()=>{ const v=b.dataset.fk; F.draft = (/^[A-H]$/.test(v)||/^\\d$/.test(v)) ? (F.draft+v).slice(0,12) : (F.draft? F.draft+" "+v : v); flowRender(); });
  const fe=$("#f-erase"); if(fe) fe.onclick=()=>{ F.draft=F.draft.slice(0,-1).trimEnd(); flowRender(); };
  const zt=$("#f-ztype"); if(zt) zt.oninput=()=>{ F.draft=zt.value; $("#f-draft").textContent=zt.value; $("#f-add-zone").disabled=!zt.value.trim(); };
  const fz=$("#f-add-zone"); if(fz) fz.onclick=()=>{ const z=F.draft.trim(); if(!z) return; if(!ZONES[F.floor].includes(z)){ ZONES[F.floor].push(z); (ZONE_ADD[F.floor]=ZONE_ADD[F.floor]||[]).push(z); store.set("gg-zones",ZONE_ADD); saveOpt("zone", \`\${F.floor}|\${z}\`); } toast(\`\${F.floor} \${z} 구역을 추가했어요\`); F.zone=z; go(1); };
  el.querySelectorAll("[data-fname]").forEach(b=>b.onclick=()=>{ F.draft=b.dataset.fname; flowRender(); });
  const pn=$("#f-pname"); if(pn) pn.oninput=()=>{ F.draft=pn.value; $("#f-add-plant").disabled=!pn.value.trim(); };
  el.querySelectorAll(".f-np").forEach(fi=>fi.onchange=()=>{ const file=fi.files[0]; if(!file) return; shrink(file, url=>{ F.newPhoto=url; flowRender(); }); });
  const fp=$("#f-add-plant"); if(fp) fp.onclick=()=>{ const n=F.draft.trim(); if(!n) return; PLANTS.set(n, F.newPhoto||PLANTS.get(n)||null); const ex=PLANT_ADD.find(p=>p[0]===n); if(ex) ex[1]=PLANTS.get(n); else PLANT_ADD.push([n,PLANTS.get(n)]); store.set("gg-plants",PLANT_ADD); saveOpt("plant", n, PLANTS.get(n));
    toast(F.newPhoto?\`\${n} 추가했어요\`:\`\${n} 추가했어요. 사진은 나중에 등록해요\`); F.sp=n; go(1); };`);
// 예전 숨은 날짜 입력은 더 이상 없다
rep(`  const fdy=$("#f-day"); if(fdy) fdy.onchange=()=>{ if(!fdy.value || fdy.value>todayYmd()){ toast("오늘이나 지난 날짜만 고를 수 있어요"); fdy.value=""; return; } F.date=fdy.value; go(1); };`, ``);

// '날짜 바꾸기'를 눌러도 달력이 바로 열리게 (컴퓨터 브라우저 포함)
rep(`function recordChooser(){`, `document.addEventListener("click", e=>{ const lab=e.target.closest(".date-pick"); if(!lab) return; const i=lab.querySelector("input"); if(i && i.showPicker){ try{ i.showPicker(); e.preventDefault(); }catch(_){} } });
function recordChooser(){`);

// 스타일
rep(`.center{text-align:center}`, `.center{text-align:center}
.cal{background:var(--panel);border:2px solid var(--line);border-radius:20px;padding:14px;display:flex;flex-direction:column;gap:8px;animation:stepIn .25s var(--ease-out)}
.cal-h{display:flex;align-items:center;justify-content:space-between}
.cal-h b{font-size:20px;font-weight:800}
.cal-h button{width:48px;height:48px;border-radius:14px;border:2px solid var(--line);background:var(--panel-2);cursor:pointer;display:grid;place-items:center}
.cal-h button svg{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:2.4}
.cal-h .cal-next svg{transform:rotate(180deg)}
.cal-h button[disabled]{opacity:.3;cursor:default}
.cal-w,.cal-g{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px;text-align:center}
.cal-w span{font-size:13px;font-weight:700;color:var(--ink-3)}
.cal-w span:first-child{color:#dc2f28}
.cal-g button{aspect-ratio:1;min-height:42px;border:0;border-radius:12px;background:var(--panel-2);font:inherit;font-size:17px;font-weight:700;cursor:pointer}
.cal-g button:hover{background:var(--line)}
.cal-g button.today{outline:2px solid var(--accent-text);outline-offset:-2px}
.cal-g button.on{background:var(--accent);color:var(--accent-ink)}
.cal-g button[disabled]{opacity:.25;cursor:default}`);

fs.writeFileSync('src/app.html', h);
console.log('리포트 기록 흐름 패치 완료');
