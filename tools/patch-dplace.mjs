// 일회성 패치: 데일리 기록 위치 — 10·14층 전체 · 직접 추가한 위치(기타|이름) · 구역 추가
// 이전 daily.js 본문(인자)을 새 tools/daily.js 로 바꾸고, 불러오기에서 "기타|" 위치를 D_PLACES 로 모은다
import fs from 'fs';
let h = fs.readFileSync('src/app.html', 'utf8');
if (h.includes('const D_PLACES')) { console.log('이미 적용됨'); process.exit(0); }
const rep = (a, b) => { if (!h.includes(a)) throw new Error('찾지 못함: ' + a.slice(0, 80)); h = h.replace(a, () => b); };
rep(fs.readFileSync(process.argv[2], 'utf8'), fs.readFileSync('tools/daily.js', 'utf8'));
rep(`if(o.kind==="zone"){ const [f,z]=o.name.split("|"); if(ZONES[f]`, `if(o.kind==="zone"){ const [f,z]=o.name.split("|"); if(f==="기타"){ if(z && !D_PLACES.includes(z)) D_PLACES.push(z); } else if(ZONES[f]`);
fs.writeFileSync('src/app.html', h);
console.log('데일리 위치 확장 적용 완료');
