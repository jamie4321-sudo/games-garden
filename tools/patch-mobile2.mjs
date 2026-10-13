// 일회성 패치: 모바일 점검 — 기록하기 선택 버튼 숨김 버그 · 탭바(더보기) · 빈 사진 카드 · 중복 설명 · 상세 버튼
import fs from 'fs';
let h = fs.readFileSync('src/app.html', 'utf8');
const rep = (a, b) => { if (!h.includes(a)) throw new Error('찾지 못함: ' + a.slice(0, 80)); h = h.replace(a, b); };
const MORE = '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>';

// 1) 버그: 모바일에서 .fbtn 전체를 숨겨 '무엇을 기록할까요?' 버튼이 사라졌음 → 사이드바 안에서만 숨김
rep(`  .brand,.nav h6,.side__foot,.nav .count,.field-h,.fbtn{display:none}`, `  .brand,.nav h6,.side__foot,.nav .count,.field-h,.side .fbtn{display:none}`);

// 2) 탭바: 교체 현황 · 월간 리포트 · 가드너 · VOC · 더보기 (+ 기록하기)
rep(`</svg>월간 리포트</button>`, `</svg><span class="lg">월간 리포트</span><span class="sm">월간 리포트</span></button>`);
rep(`<span class="lg">가드너 리포트 관리</span><span class="sm">가드너 리포트</span>`, `<span class="lg">가드너 리포트 관리</span><span class="sm">가드너</span>`);
rep(`      <h6 class="nav-sep" id="nav-admin-h" hidden aria-hidden="true"></h6>`, `      <button type="button" class="nav-more" id="nav-more">${MORE}<span>더보기</span></button>
      <h6 class="nav-sep" id="nav-admin-h" hidden aria-hidden="true"></h6>`);
rep(`  .nav{overflow-x:auto;scrollbar-width:none}
  .nav button{min-width:62px}`, `  .nav{overflow:visible}
  .nav button{min-width:0}
  .nav button[data-view="loc"],.nav button[data-view="mon"],#nav-admin{display:none!important}
  .nav .nav-more{display:flex}`);
rep(`function recordChooser(){`, `// 모바일 '더보기': 탭바에 없는 메뉴 · 테마 · 로그아웃
function moreSheet(){
  const el=$("#flow"); el.hidden=false; document.body.style.overflow="hidden";
  const items=[["loc","위치별 이력","자리마다 교체한 흐름"],["mon","활착 관리","교체 후 자리 잡는 단계"]];
  if(IS_MASTER) items.push(["admin","관리자 설정","계정 만들기 · 비밀번호"]);
  el.innerHTML = \`<div class="crew-top"><span style="flex:1;font-size:17px;font-weight:800">더보기</span><button class="x" type="button" id="f-x" aria-label="닫기">\${IC.x}</button></div>
  <div class="crew-body"><div class="crew-step more-list">
    \${items.map(([v,t,s])=>\`<button type="button" class="more-row" data-mv="\${v}"><b>\${t}</b><small>\${s}</small></button>\`).join("")}
    <button type="button" class="more-row" id="mv-theme"><b>화면 밝기 바꾸기</b><small>밝은 화면 · 어두운 화면</small></button>
    \${window.GG_USER?\`<button type="button" class="more-row" id="mv-out"><b>로그아웃</b><small>\${USER.name} · \${ROLE_LABEL[USER.role]||""}</small></button>\`:""}
  </div></div>\`;
  $("#f-x").onclick=flowClose;
  el.querySelectorAll("[data-mv]").forEach(b=>b.onclick=()=>{ flowClose(); setView(b.dataset.mv); window.scrollTo(0,0); });
  $("#mv-theme").onclick=()=>{ $("#theme").click(); };
  const mo=$("#mv-out"); if(mo) mo.onclick=()=>$("#logout").click();
}
function recordChooser(){`);
rep(`$("#open-check").onclick=`, `$("#nav-more").onclick=moreSheet;
$("#open-check").onclick=`);

// 3) 사진 없는 이슈 · VOC 카드는 얇게 / 4) 모바일 중복 설명 숨기고 숫자 칸 한 줄 / 5) 상세의 사진 버튼 크기
rep(`.center{text-align:center}`, `.center{text-align:center}
.nav-more{display:none}
.more-list{gap:10px}
.more-row{all:unset;box-sizing:border-box;cursor:pointer;display:flex;flex-direction:column;gap:3px;padding:18px 20px;border-radius:18px;border:2px solid var(--line);background:var(--panel)}
.more-row b{font-size:20px;font-weight:800}
.more-row small{font-size:14px;color:var(--ink-3)}
.more-row:active{transform:scale(.98)}
.tk-ph:has(> .empty-ph){aspect-ratio:auto;height:56px}
.tk-ph > .empty-ph{flex-direction:row}
.detail .pick-btn{min-height:96px;font-size:16px}
.detail .pick-btn svg{width:30px;height:30px}
@media (max-width:860px){
  .sub-head p{display:none}
  .sub-head{justify-content:flex-start}
  .care-sub .summary{grid-template-columns:repeat(4,minmax(0,1fr))}
  .care-sub .summary>div{padding:10px 10px;border-top:0!important}
  .care-sub .summary>div+div{border-left:1px solid var(--line-soft)!important}
  .care-sub .summary dd{font-size:18px}
  .care-sub .summary dd small{font-size:11px}
  .care-sub .summary dt{font-size:11px}
  .nav .nav-more,.nav button{font-size:11px}
}`);

fs.writeFileSync('src/app.html', h);
console.log('모바일 패치 완료');
