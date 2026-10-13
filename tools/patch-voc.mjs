// 일회성 패치: 담당자 요청 → 'VOC 관리' 별도 메뉴 · 메뉴 구분선 · 체크시트/버튼 다듬기
import fs from 'fs';
let h = fs.readFileSync('src/app.html', 'utf8');
const rep = (a, b, all) => { if (!h.includes(a)) throw new Error('찾지 못함: ' + a.slice(0, 80)); h = all ? h.split(a).join(b) : h.replace(a, b); };
const VOC_ICON = '<svg viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/></svg>';

// 메뉴: 월별 관리 리포트 아래에 VOC 관리, 관리자 설정은 구분선 아래
rep(`<span class="lg">월별 관리 리포트</span><span class="sm">관리 리포트</span></button>`,
    `<span class="lg">월별 관리 리포트</span><span class="sm">관리 리포트</span></button>
      <button data-view="voc">${VOC_ICON}<span class="lg">VOC 관리</span><span class="sm">VOC</span><span class="count num" id="cnt-req"></span></button>`);
rep(`<h6 class="nav-sep" id="nav-admin-h" hidden>관리자</h6>`, `<h6 class="nav-sep" id="nav-admin-h" hidden aria-hidden="true"></h6>`);

// 탭에서 담당자 요청 빼고, VOC 화면 신설
rep(`        <button type="button" role="tab" data-sub="req">담당자 요청<em id="cnt-req"></em></button>\n`, ``);
rep(`<p>현장 관리 기록 · 식물 이슈 · 담당자 요청을 한곳에서 봐요.</p>`, `<p>현장 관리 기록과 식물 이슈를 한곳에서 봐요.</p>`);
rep(`    <section class="view" id="view-admin" hidden>`, `    <section class="view" id="view-voc" hidden>
      <div class="head"><h1>VOC 관리</h1><p>카카오게임즈 담당자의 의견과 요청을 접수하고, 처리 과정과 결과를 함께 확인해요.</p></div>
    </section>

    <section class="view" id="view-admin" hidden>`);
rep(`<p>카카오게임즈 담당자가 사진과 함께 요청을 남기면 링키지랩이 확인하고 답변해요.</p><button type="button" class="add-btn" id="req-add">`,
    `<p>식물이나 공간에 의견이 있으면 사진과 함께 남겨 주세요. 링키지랩이 확인하고 처리 결과를 답변해요.</p><button type="button" class="add-btn" id="req-add">`);
rep(`</svg>요청 등록</button>`, `</svg>VOC 등록</button>`);

rep(`const VIEWS = {board:"교체 현황",loc:"위치별 이력",mon:"활착 관리",report:"월간 리포트",care:"월별 관리 리포트",admin:"관리자 설정"};`,
    `const VIEWS = {board:"교체 현황",loc:"위치별 이력",mon:"활착 관리",report:"월간 리포트",care:"월별 관리 리포트",voc:"VOC 관리",admin:"관리자 설정"};`);

// 탭 전환은 관리 리포트 · 식물 이슈만, 요청 화면은 VOC 로
rep(`  ["visit","issue","req"].forEach(s=>$("#sub-"+s).hidden = s!==sub); }`, `  ["visit","issue"].forEach(s=>$("#sub-"+s).hidden = s!==sub); }`);
rep(`function careGo(sub){ setView("care"); careTab(sub); }`, `function careGo(sub){ if(sub==="req"){ setView("voc"); return; } setView("care"); careTab(sub); }
$("#view-voc").appendChild($("#sub-req")); $("#sub-req").hidden=false;`);

// 문구
rep(`label:"담당자 요청", list:REQS`, `label:"VOC", list:REQS`);
rep(`<h3>담당자 요청 처리</h3>`, `<h3>VOC 처리 현황</h3>`);
rep(`문제가 있으면 '담당자 요청'으로 사진과 함께 알려 주세요.`, `의견이나 요청은 'VOC 관리'에서 사진과 함께 남겨 주세요.`);
rep(`아직 등록된 요청이 없어요. 식물에 문제가 보이면 사진을 찍어 '요청 등록'을 눌러 주세요.`, `아직 접수된 VOC가 없어요. 식물이나 공간에 의견이 있으면 사진을 찍어 'VOC 등록'을 눌러 주세요.`);
rep(`<h2 class="center">\${F.t==="req"?"요청을 등록했어요":"이슈를 기록했어요"}</h2>`, `<h2 class="center">\${F.t==="req"?"VOC를 접수했어요":"이슈를 기록했어요"}</h2>`);
rep(`\${F.t==="req"?"링키지랩이 확인하고 답변을 남겨요.":"리더가 소견을 정리해 담당자 화면에 올려요."}`, `\${F.t==="req"?"링키지랩이 확인하고 처리 결과를 답변해요.":"리더가 소견을 정리해 담당자 화면에 올려요."}`);
rep(`<h2>\${F.t==="req"?"어떤 요청이에요?":"어떤 문제예요?"}</h2>`, `<h2>\${F.t==="req"?"어떤 내용이에요?":"어떤 문제예요?"}</h2>`);
rep(`<h2>\${F.t==="req"?"요청 내용을 적어 주세요":"남길 말이 있으면 적어요"}</h2>`, `<h2>\${F.t==="req"?"의견이나 요청을 적어 주세요":"남길 말이 있으면 적어요"}</h2>`);
rep(`\${t==="req"?"등록":"발견"}</dt>`, `\${t==="req"?"접수":"발견"}</dt>`);
rep(`\${t==="req"?"요청 내용":"현장 메모"}</dt>`, `\${t==="req"?"VOC 내용":"현장 메모"}</dt>`);
rep(`<h4>링키지랩 답변</h4>`, `<h4>처리 결과 답변</h4>`);
rep(`"요청을 확인하고 있어요. 답변이 등록되면 여기에 보여요."`, `"VOC를 확인하고 있어요. 답변이 등록되면 여기에 보여요."`);

// 스타일 다듬기
rep(`.nav-sep{margin-top:18px!important}`, `.nav-sep{height:1px;background:var(--line-soft);margin:14px 10px 8px!important;padding:0}`);
rep(`.cs{width:100%;border-collapse:collapse;font-size:13.5px;min-width:420px}`, `.cs{width:100%;border-collapse:collapse;font-size:13.5px;table-layout:fixed}
.cs th:first-child{width:40%}`);
rep(`.cs td{padding:9px 8px;`, `.cs td{padding:9px 4px;`);
rep(`.fbtn{all:unset;box-sizing:border-box;cursor:pointer;display:grid;grid-template-columns:38px minmax(0,1fr) 18px;align-items:center;gap:11px;padding:11px 12px 11px 10px;`,
    `.fbtn{all:unset;box-sizing:border-box;cursor:pointer;display:grid;grid-template-columns:34px minmax(0,1fr) 14px;align-items:center;gap:9px;padding:10px 10px 10px 9px;`);
rep(`.fbtn .fi{width:38px;height:38px;border-radius:11px;display:grid;place-items:center}`, `.fbtn .fi{width:34px;height:34px;border-radius:10px;display:grid;place-items:center}`);
rep(`.fbtn .ft b{font-size:14px;font-weight:800;letter-spacing:-.2px}`, `.fbtn .ft b{font-size:14px;font-weight:800;letter-spacing:-.3px;white-space:nowrap}`);
rep(`.fbtn .fa{width:16px;height:16px;`, `.fbtn .fa{width:14px;height:14px;`);

fs.writeFileSync('src/app.html', h);
console.log('VOC 패치 완료');
