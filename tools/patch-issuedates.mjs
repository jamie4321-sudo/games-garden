// 일회성 패치: 리포트 기록 날짜 따로 수정 — 가드너 기록일 · 발견일 · 조치 시작일 · 해결일
import fs from 'fs';
let h = fs.readFileSync('src/app.html', 'utf8');
const rep = (a, b) => { if (!h.includes(a)) throw new Error('찾지 못함: ' + a.slice(0, 80)); h = h.replace(a, b); };

// 단계별 날짜: data.stAt 이 없으면 진행 기록("상태를 '조치 중'(으)로…")에서 찾는다. 기록일 = data.recAt (없으면 보낸 시각)
rep(`function tkFromRec(r){
  const d=r.data||{};`, `function stAtOf(d){
  const o={...(d.stAt||{})};
  (TK[d.t]?.states||[]).slice(1).forEach(([s,l])=>{ if(o[s]) return; const g=[...(d.log||[])].reverse().find(e=>e.note && (e.note.includes(\`'\${l}'\`) || (s==="done" && e.note.includes("완료 처리")))); if(g) o[s]=g.date; });
  return o;
}
function tkFromRec(r){
  const d=r.data||{};`);
rep(`    reply:d.reply||"", donePhotos:d.donePhotos||[],`, `    recAt:d.recAt||r.created_at||d.date, stAt:stAtOf(d),
    reply:d.reply||"", donePhotos:d.donePhotos||[],`);
rep(`data:raw, created_at:raw.date}));
}
async function tkDelete`, `data:raw, created_at:x.recAt||raw.date}));
}
async function tkDelete`);

// 상태 버튼을 누르면 그 단계 날짜를 남긴다
rep(`await tkSave(x, {state:s, log:`, `await tkSave(x, {state:s, stAt:{...x.stAt, [s]:new Date().toISOString()}, log:`);

// 단계 칸에 날짜 표시
rep('<li class="${x.state===s?"now":""}"><small>${j+1}단계</small><b>${l}</b></li>',
    '<li class="${x.state===s?"now":""}"><small>${j+1}단계</small><b>${l}</b><small class="num">${j===0?fmtDT(x.date):x.stAt[s]&&st.findIndex(y=>y[0]===x.state)>=j?fmtDT(x.stAt[s]):"—"}</small></li>');
// 상세: 가드너 기록일
rep('      <dt>${t==="req"?"접수":"발견"}</dt><dd>${fmtFull(x.date)}${x.by?` · ${x.by}`:""}</dd>',
    '      <dt>${t==="req"?"접수":"발견"}</dt><dd>${fmtFull(x.date)}${x.by?` · ${x.by}`:""}</dd>\n      ${t==="issue"?`<dt>가드너 기록</dt><dd>${fmtDT(x.recAt)}</dd>`:""}');

// 수정 폼
rep(`    <label>발견 날짜<input id="ie-date" type="date" value="\${ymdOf(new Date(x.date))}" max="\${todayYmd()}" required></label>`,
    `    <label>가드너 기록일<input id="ie-rec" type="date" value="\${ymdOf(new Date(x.recAt||x.date))}" max="\${todayYmd()}" required></label>
    <label>발견일<input id="ie-date" type="date" value="\${ymdOf(new Date(x.date))}" max="\${todayYmd()}" required></label>
    \${TK.issue.states.slice(1).filter((_,j)=>TK.issue.states.findIndex(y=>y[0]===x.state)>j).map(([s,l])=>\`<label>\${l==="해결"?"해결일":l.replace(/ 중$/,"")+" 시작일"}<input id="ie-st-\${s}" type="date" value="\${x.stAt[s]?ymdOf(new Date(x.stAt[s])):""}" max="\${todayYmd()}"></label>\`).join("")}`);
rep(`      const v=s=>iff.querySelector(s).value.trim(), ymd=v("#ie-date"), loc=v("#ie-loc");`,
    `      const v=s=>iff.querySelector(s).value.trim(), ymd=v("#ie-date"), loc=v("#ie-loc"), recd=v("#ie-rec");
      const keep=(iso,y)=>iso && ymdOf(new Date(iso))===y ? iso : new Date(y+"T09:00:00").toISOString();
      const stAt={...x.stAt}; for(const [s] of TK.issue.states.slice(1)){ const el=iff.querySelector("#ie-st-"+s); if(!el) continue; if(el.value) stAt[s]=keep(x.stAt[s], el.value); else delete stAt[s]; }
      if([recd, ...Object.values(stAt).map(d=>ymdOf(new Date(d)))].some(d=>d>todayYmd())){ toast("오늘이나 지난 날짜만 고를 수 있어요"); return; }`);
rep(`date: same ? x.raw.date||x.date : isoFromYmd(ymd),`, `date: same ? x.raw.date||x.date : isoFromYmd(ymd), recAt: recd ? keep(x.recAt, recd) : x.recAt, stAt,`);
fs.writeFileSync('src/app.html', h);
console.log('리포트 날짜 패치 완료');
