// 일회성 패치: 교체 사유를 조경 실무 용어로 바꾼다
import fs from 'fs';
const F = 'src/app.html';
let h = fs.readFileSync(F, 'utf8');
const rep = (a, b) => { if (!h.includes(a)) throw new Error('찾지 못함: ' + a.slice(0, 70)); h = h.replace(a, b); };

const s = h.indexOf('const WHY = ['), e = h.indexOf('];', s) + 2;
if (s < 0) throw new Error('WHY 없음');
h = h.slice(0, s) + `// [키, 사유(저장·표시), 판단 기준, 아이콘]
const WHY = [
  ["dead","고사","회복 불가 · 줄기 마름","M12 3c3 4 5 7 5 10a5 5 0 0 1-10 0c0-3 2-6 5-10zM9 14l6-2"],
  ["vigor","수세 약화","생장 둔화 · 신초 없음","M4 20h16M7 20V10M12 20V6M17 20v-7"],
  ["defol","낙엽 과다","잎떨굼 · 수관 성김","M7 4c4 0 7 3 7 7-4 0-7-3-7-7zM14 14c3 0 5 2 5 5-3 0-5-2-5-5zM6 20l2-2"],
  ["chlor","황화 · 엽소","잎 변색 · 잎끝 마름","M5 19c0-8 5-14 14-14 0 9-6 14-14 14zM5 19 13 11"],
  ["root","과습 · 근부","뿌리 썩음 · 토양 과습","M12 3v8M12 11c-3 2-5 5-5 9M12 11c3 2 5 5 5 9M12 11v9"],
  ["pest","병충해","깍지벌레 · 응애 · 반점병","M8 9h8v7a4 4 0 0 1-8 0zM12 9V6M9 4l2 2M15 4l-2 2M4 12h4M16 12h4M4 17h4M16 17h4"],
  ["light","광량 부족","저조도 · 도장(웃자람)","M12 3a7 7 0 1 0 9 9 6 6 0 0 1-9-9z"],
  ["form","관상가치 저하","수형 불량 · 미관 훼손","M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"],
  ["etc","기타","현장 확인 필요",""],
];` + h.slice(e);

// 버튼: 사유 + 판단 기준(작게)
rep("${WHY.map(([id,t,,d])=>`<button class=\"bigbtn why ${C.why===id?'yes':''}\" type=\"button\" data-w=\"${id}\">${d?`<svg viewBox=\"0 0 24 24\"><path d=\"${d}\"/></svg>`:'<b class=\"q\">?</b>'}<span class=\"wt\">${t}</span></button>`).join(\"\")}",
    "${WHY.map(([id,t,hint,d])=>`<button class=\"bigbtn why ${C.why===id?'yes':''}\" type=\"button\" data-w=\"${id}\">${d?`<svg viewBox=\"0 0 24 24\"><path d=\"${d}\"/></svg>`:'<b class=\"q\">…</b>'}<span class=\"wt\">${t}</span><small>${hint}</small></button>`).join(\"\")}");
rep(`<h2>왜 바꿨어요?</h2><p class="hint">하나를 골라요.</p>`, `<h2>교체 사유를 골라요</h2><p class="hint">가장 가까운 것 하나를 골라요.</p>`);
// 저장값 = 사유 그대로 (기타는 '기타')
rep(`why:(WHY.find(w=>w[0]===C.why)||[])[2]||""`, `why:(WHY.find(w=>w[0]===C.why)||[])[1]||""`);
rep(`<li><span>이유</span>\${(WHY.find(w=>w[0]===C.why)||[0,'—'])[1]}</li>`, `<li><span>사유</span>\${(WHY.find(w=>w[0]===C.why)||[0,'—'])[1]}</li>`);

// 기존 PPT 기록도 같은 용어로
rep(`why:"잎이 성기고 관상가치 저하"`, `why:"낙엽 과다 · 관상가치 저하"`);
rep(`why:"생육 저하"`, `why:"수세 약화"`);
rep(`why:"잎떨굼 · 약한 조도"`, `why:"낙엽 과다 · 광량 부족"`);

// 판단 기준 글씨
rep(`.bigbtn.why{min-height:120px;font-size:20px}`, `.bigbtn.why{min-height:132px;font-size:21px;gap:4px}
.bigbtn.why small{font-size:13.5px;font-weight:400;color:var(--ink-3);line-height:1.3}`);

fs.writeFileSync(F, h);
console.log('사유 패치 완료');
