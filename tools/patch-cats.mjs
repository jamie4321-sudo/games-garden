// 일회성 패치: '방문' 표현 정리 · 정기 체크 코드 제거 · 이슈 종류 확장(기타는 직접 적기)
import fs from 'fs';
let h = fs.readFileSync('src/app.html', 'utf8');
const rep = (a, b) => { if (!h.includes(a)) throw new Error('찾지 못함: ' + a.slice(0, 80)); h = h.replace(a, b); };

// 문구
rep(`<p>한 달 동안의 교체 관리와 식물 이슈, VOC, 관리 방문을 한 장으로 정리했어요.</p>`, `<p>한 달 동안의 교체 관리와 식물 이슈, VOC를 한 장으로 정리했어요.</p>`);
rep(`"관수 주기를 조정하고 다음 방문 때 회복을 확인해요."`, `"관수 주기를 조정하고 며칠간 회복을 지켜봐요."`);
rep(`placeholder="예: 내일 오전 방문해 방제하고 결과를 알려드릴게요."`, `placeholder="예: 오늘 중 방제하고 결과를 사진으로 알려드릴게요."`);

// 쓰지 않는 정기 체크 화면 코드 제거 (방문 체크시트 · 체크 입력)
{ const s = h.indexOf('function visitReport(v){'), e = h.indexOf('function careBoot(){');
  if (s < 0 || e < 0) throw new Error('정기 체크 코드 구간 없음');
  h = h.slice(0, s) + h.slice(e); }
{ const s = h.indexOf('/* ── 식물 관리 리포트: 방문 체크시트'), e = h.indexOf('let ciMonth = null;');
  if (s >= 0 && e > s) h = h.slice(0, s) + '/* ── 월별 관리 리포트: 날짜별 이슈를 달마다 묶는다 ── */\n' + h.slice(e); }
{ const s = h.indexOf('/* 방문 체크 입력 */'); if (s >= 0) { const e = h.indexOf('\n', s); h = h.slice(0, s) + h.slice(e + 1); } }

// 이슈 종류: 현장에서 생길 수 있는 경우를 넓히고, 기타는 직접 적기
rep(`      ["damage","물리적 손상","가지 꺾임 · 화분 파손",["가지 꺾임","화분 파손","받침 누수"]],
      ["etc","기타","현장 확인 필요",[]],`,
    `      ["damage","물리적 손상","가지 꺾임 · 잎 찢김",["가지 꺾임","잎 찢김","줄기 쓰러짐"]],
      ["growth","생육 이상","웃자람 · 뿌리 넘침",["뿌리 넘침(분갈이 필요)","웃자람","새순 멈춤","꽃 · 열매 이상"]],
      ["env","환경 변화","냉난방 바람 · 온도",["냉난방 직풍","온도 급변","공사 · 먼지","자리 이동"]],
      ["pot","화분 · 시설","화분 · 받침 · 배수",["화분 파손","받침 누수","배수구 막힘","지지대 · 마감재 이탈"]],
      ["foreign","이물질 · 오염","음료 · 쓰레기 · 담배꽁초",["음료 · 커피 투기","쓰레기 · 이물질","담배꽁초"]],
      ["etc","기타 · 예외","목록에 없는 상황",[]],`);
rep(`damage:["이동·충격으로 손상된 것으로 보여요.","손상 부위를 정리했어요.","필요하면 화분·받침 교체를 진행해요."], etc:["","",""] } },`,
    `damage:["이동·충격으로 손상된 것으로 보여요.","손상 부위를 정리했어요.","회복 상태를 보고 필요하면 교체를 검토해요."],
      growth:["생육이 진행되며 화분 크기·조도와 균형이 맞지 않아요.","웃자란 가지와 넘친 뿌리를 정리했어요.","분갈이 또는 위치 조정을 일정에 맞춰 진행해요."],
      env:["냉난방 바람이나 온도 변화가 직접 닿는 자리예요.","바람이 덜 닿는 방향으로 화분을 옮겼어요.","계절 냉난방 가동에 맞춰 자리를 계속 살펴요."],
      pot:["화분·받침·배수 시설에 문제가 생겼어요.","임시 조치로 물 넘침을 막았어요.","화분·받침 교체 일정을 잡아 진행해요."],
      foreign:["화분에 음료·쓰레기 같은 이물질이 들어갔어요.","이물질을 제거하고 오염된 표토를 정리했어요.","같은 일이 반복되면 안내 문구 설치를 제안해요."],
      etc:["","",""] } },`);

// 기타 · 예외: 문제 이름을 직접 적는다
rep(`    const names=catOf("issue",F.cat)[3];
    if(!names.length){ F.step++; return flowRender(); }`,
    `    const names=catOf("issue",F.cat)[3];
    if(F.cat==="etc"){
      body = \`<h2>어떤 상황인지 짧게 적어요</h2><p class="hint">예외 상황도 괜찮아요. 모르면 비워 두고 다음을 눌러요.</p>
        <input class="bigin" id="f-name" maxlength="30" placeholder="예: 화분 위에 박스가 올려져 있음" value="\${F.name.replace(/ 발생$/,"")}">
        <button class="primary" type="button" id="f-name-next">다음</button>\`;
    } else if(!names.length){ F.step++; return flowRender(); } else`);
rep(`  el.querySelectorAll("[data-n]").forEach(b=>b.onclick=()=>{`, `  const fnn=$("#f-name-next"); if(fnn) fnn.onclick=()=>{ const v=$("#f-name").value.trim(); F.name=v; go(1); };
  el.querySelectorAll("[data-n]").forEach(b=>b.onclick=()=>{`);
// 뒤로 가기에서 이름 단계 건너뛰기 조건: 기타는 이름 단계가 있다
rep(`if(d<0 && S[F.step]==="name" && !catOf("issue",F.cat)[3].length) F.step--;`, `if(d<0 && S[F.step]==="name" && F.cat!=="etc" && !catOf("issue",F.cat)[3].length) F.step--;`);

fs.writeFileSync('src/app.html', h);
console.log('종류 · 문구 패치 완료');
