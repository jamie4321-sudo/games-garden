// 일회성 패치: 데일리 하트(t="heart", 한 사람·기록 하나에 1건) · 평일만 보기
// 사용: node tools/patch-heart.mjs <이전 daily.js> <이전 daily.css>  → app.html 의 두 블록을 새 tools/ 파일로 바꾼다
import fs from 'fs';
let h = fs.readFileSync('src/app.html', 'utf8');
if (h.includes('HEARTS = []')) { console.log('이미 적용됨'); process.exit(0); }
const rep = (a, b) => { if (!h.includes(a)) throw new Error('찾지 못함: ' + a.slice(0, 80)); h = h.replace(a, () => b); };
rep(fs.readFileSync(process.argv[2], 'utf8'), fs.readFileSync('tools/daily.js', 'utf8'));
rep(fs.readFileSync(process.argv[3], 'utf8').trim(), fs.readFileSync('tools/daily.css', 'utf8').trim());
rep(`const DAILY = [], CMTS = [];`, `const DAILY = [], CMTS = [], HEARTS = [];`);
rep(`DAILY.length = CMTS.length = 0;`, `DAILY.length = CMTS.length = HEARTS.length = 0;`);
rep(`if(t==="daily") DAILY.push(dailyFromRec(r)); else if(t==="cmt")`, `if(t==="daily") DAILY.push(dailyFromRec(r)); else if(t==="heart") HEARTS.push(heartFromRec(r)); else if(t==="cmt")`);
fs.writeFileSync('src/app.html', h);
console.log('하트 · 평일 보기 적용 완료');
