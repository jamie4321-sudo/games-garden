// 일회성 패치: 크루가 기록할 때 날짜를 고칠 수 있게 (기본 오늘, 미래 날짜는 막음)
import fs from 'fs';
let h = fs.readFileSync('src/app.html', 'utf8');
const rep = (a, b) => { if (!h.includes(a)) throw new Error('찾지 못함: ' + a.slice(0, 80)); h = h.replace(a, b); };

// 날짜 도우미 + 날짜 칸
rep(`let C = null;`, `// 기록 날짜: 'YYYY-MM-DD' ↔ 저장값(그날 + 지금 시각)
const ymdOf = d => \`\${d.getFullYear()}-\${String(d.getMonth()+1).padStart(2,"0")}-\${String(d.getDate()).padStart(2,"0")}\`;
const todayYmd = () => ymdOf(new Date());
const isoFromYmd = s => { const n=new Date(), [y,m,d]=(s||todayYmd()).split("-").map(Number); return new Date(y,m-1,d,n.getHours(),n.getMinutes()).toISOString(); };
const dateLabel = s => { const [y,m,d]=s.split("-").map(Number); return s===todayYmd() ? \`오늘 \${m}월 \${d}일\` : \`\${y!==new Date().getFullYear()?y+"년 ":""}\${m}월 \${d}일\`; };
const dateField = (id, v) => \`<label class="date-pick"><span class="date-show">\${dateLabel(v)}</span><span class="date-chg">날짜 바꾸기</span><input type="date" id="\${id}" value="\${v}" max="\${todayYmd()}" aria-label="기록 날짜"></label>\`;
let C = null;`);

// ── 교체 기록 ──
rep(`why:null,bs:[],as:[],done:false,`, `why:null,bs:[],as:[],date:todayYmd(),done:false,`);
rep(`<li><span>날짜</span>오늘 \${TODAY.getMonth()+1}월 \${TODAY.getDate()}일</li>`, `<li><span>날짜</span>\${dateField("c-date", C.date)}</li>`);
rep(`    const rec = {id:String(Date.now()), status:"pending", data:{date:new Date().toISOString(), floor:C.floor,`,
    `    const rec = {id:String(Date.now()), status:"pending", data:{date:isoFromYmd(C.date), floor:C.floor,`);
rep(`  const nx=$("#c-next"); if(nx) nx.onclick=()=>crewGo(1);`, `  const nx=$("#c-next"); if(nx) nx.onclick=()=>crewGo(1);
  const cd=$("#c-date"); if(cd) cd.onchange=()=>{ if(!cd.value || cd.value>todayYmd()){ toast("오늘이나 지난 날짜만 고를 수 있어요"); cd.value=C.date; return; } C.date=cd.value; crewRender(); };`);

// ── 이슈 · VOC ──
rep(`F={t, step:0, floor:null, zone:null, sp:"", cat:null, name:"", photos:[], memo:""};`, `F={t, step:0, floor:null, zone:null, sp:"", cat:null, name:"", photos:[], memo:"", date:todayYmd()};`);
rep(`        <ul><li><span>구역</span>\${F.floor} \${F.zone}</li>`, `        <ul><li><span>날짜</span>\${dateField("f-date", F.date)}</li><li><span>구역</span>\${F.floor} \${F.zone}</li>`);
rep(`data:{t:F.t, date:new Date().toISOString(),`, `data:{t:F.t, date:isoFromYmd(F.date),`);
rep(`  const nx=$("#f-next"); if(nx) nx.onclick=()=>{ const m=$("#f-memo"); if(m) F.memo=m.value.trim(); go(1); };`,
    `  const nx=$("#f-next"); if(nx) nx.onclick=()=>{ const m=$("#f-memo"); if(m) F.memo=m.value.trim(); go(1); };
  const fd=$("#f-date"); if(fd) fd.onchange=()=>{ if(!fd.value || fd.value>todayYmd()){ toast("오늘이나 지난 날짜만 고를 수 있어요"); fd.value=F.date; return; } F.date=fd.value; flowRender(); };`);

// ── 관리 체크(리포트 기록) ──
rep(`  V={checks:{}, memo:""};`, `  V={checks:{}, memo:"", date:todayYmd()};`);
rep(`    <p class="hint" style="margin:0">구역마다 한 일을 눌러요. 문제가 보이면 '문제'를 눌러요.</p>`,
    `    <div class="k-date"><span>관리한 날</span>\${dateField("k-date", V.date)}</div>
    <p class="hint" style="margin:0">구역마다 한 일을 눌러요. 문제가 보이면 '문제'를 눌러요.</p>`);
rep(`data:{t:"visit", date:new Date().toISOString(),`, `data:{t:"visit", date:isoFromYmd(V.date),`);
rep(`  $("#k-all").onclick=()=>{`, `  const kd2=$("#k-date"); if(kd2) kd2.onchange=()=>{ if(!kd2.value || kd2.value>todayYmd()){ toast("오늘이나 지난 날짜만 고를 수 있어요"); kd2.value=V.date; return; } V.date=kd2.value; V.memo=$("#k-memo").value; checkRender(); };
  $("#k-all").onclick=()=>{`);

// 스타일: 날짜 칸 (누르면 휴대폰 달력)
rep(`.center{text-align:center}`, `.center{text-align:center}
.date-pick{position:relative;display:inline-flex;align-items:center;gap:10px;flex-wrap:wrap;cursor:pointer}
.date-show{font-weight:800}
.date-chg{font-size:14px;font-weight:700;color:var(--accent-ink);background:var(--accent);padding:6px 12px;border-radius:999px}
.date-pick input{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;font-size:16px}
.date-pick:focus-within .date-chg{outline:3px solid var(--accent-text);outline-offset:2px}
.k-date{display:flex;align-items:center;gap:14px;flex-wrap:wrap;background:var(--panel);border:2px solid var(--line);border-radius:18px;padding:14px 16px;font-size:20px}
.k-date>span{font-size:15px;font-weight:700;color:var(--ink-2)}`);

fs.writeFileSync('src/app.html', h);
console.log('날짜 패치 완료');
