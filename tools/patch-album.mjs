// 일회성 패치: 모든 사진 등록을 휴대폰 앨범(사진 목록)에서도 고를 수 있게
import fs from 'fs';
let h = fs.readFileSync('src/app.html', 'utf8');
const rep = (a, b) => { if (!h.includes(a)) throw new Error('찾지 못함: ' + a.slice(0, 80)); h = h.replace(a, b); };

// 앨범 아이콘
rep(`plus:'<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>'};`,
    `plus:'<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>', album:'<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/></svg>'};
// 카메라로 찍기 / 앨범에서 고르기 두 버튼 (capture 가 붙은 쪽만 카메라를 바로 연다)
const pickBtns = (cls, label, multi=true) => \`<div class="pick2">
  <label class="pick-btn">\${IC.cam}<span>카메라로 찍기</span><input type="file" accept="image/*" capture="environment" \${multi?"multiple":""} class="\${cls}" aria-label="\${label} 카메라로 찍기"></label>
  <label class="pick-btn">\${IC.album}<span>앨범에서 고르기</span><input type="file" accept="image/*" \${multi?"multiple":""} class="\${cls}" aria-label="\${label} 앨범에서 고르기"></label>
</div>\`;`);

// 교체 전·후 사진 단계
rep("          ${list.length<5?`<label class=\"shot-add\">${IC.cam}<span>사진 더 찍기</span><input type=\"file\" accept=\"image/*\" capture=\"environment\" multiple id=\"c-file\" aria-label=\"${what} 사진 더 찍기\"></label>`:\"\"}</div>`",
    "          </div>${list.length<5?`<p class=\"hint\" style=\"margin:0\">사진 더 넣기</p>${pickBtns(\"c-file\", what)}`:\"\"}`");
rep("        : `<label class=\"shot\">${IC.cam}<span>눌러서 사진 찍기</span><input type=\"file\" accept=\"image/*\" capture=\"environment\" multiple id=\"c-file\" aria-label=\"${what} 사진\"></label>`}",
    "        : pickBtns(\"c-file\", what)}");
rep(`  const f=$("#c-file"); if(f) f.onchange=async()=>{ const key=k==="before"?"bs":"as"; const files=[...f.files].slice(0, 5-C[key].length);`,
    `  el.querySelectorAll(".c-file").forEach(f=>f.onchange=async()=>{ const key=k==="before"?"bs":"as"; const files=[...f.files].slice(0, 5-C[key].length);`);
// 핸들러 끝 괄호: '} crewRender(); };' → '} crewRender(); });'
rep(`    for(const file of files){ C[key].push(await new Promise(res=>shrink(file,res))); } crewRender(); };`,
    `    if(f.files.length > files.length) toast("5장까지만 넣었어요");
    for(const file of files){ C[key].push(await new Promise(res=>shrink(file,res))); } crewRender(); });`);

// 새 식물 사진
rep(`      <label class="shot small \${C.newPhoto?'has':''}">\${C.newPhoto?\`<img src="\${C.newPhoto}" alt=""><span class="retake">다시 찍기</span>\`:\`\${IC.cam}<span>식물 사진 찍기</span>\`}
        <input type="file" accept="image/*" capture="environment" id="c-newphoto" aria-label="새 식물 사진"></label>`,
    `      \${C.newPhoto?\`<div class="shot small has"><img src="\${C.newPhoto}" alt="새 식물 사진"></div>\`:""}
      \${pickBtns("c-newphoto", "새 식물 사진", false)}`);
rep(`  const np=$("#c-newphoto"); if(np) np.onchange=()=>{ const file=np.files[0]; if(!file) return; shrink(file, url=>{ C.newPhoto=url; crewRender(); }); };`,
    `  el.querySelectorAll(".c-newphoto").forEach(np=>np.onchange=()=>{ const file=np.files[0]; if(!file) return; shrink(file, url=>{ C.newPhoto=url; crewRender(); }); });`);

// 식물 칸 '사진 등록': 카메라를 강제하지 않아 휴대폰이 카메라/앨범을 고르게 한다
rep(`<input type="file" accept="image/*" capture="environment" data-photo="\${n}" aria-label="\${n} 사진 등록">`,
    `<input type="file" accept="image/*" data-photo="\${n}" aria-label="\${n} 사진 등록">`);

// 스타일
rep(`.shot-add input{position:absolute;inset:0;opacity:0;cursor:pointer}`, `.shot-add input{position:absolute;inset:0;opacity:0;cursor:pointer}
.pick2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.pick-btn{position:relative;min-height:150px;border:3px dashed var(--ink-3);background:var(--panel);border-radius:20px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;font-size:20px;font-weight:800;text-align:center;cursor:pointer;padding:12px;transition:transform .12s ease-out,border-color .15s ease}
.pick-btn:active{transform:scale(.97)}
.pick-btn:hover{border-color:var(--ink)}
.pick-btn svg{width:48px;height:48px;stroke:currentColor;fill:none;stroke-width:1.7}
.pick-btn input{position:absolute;inset:0;opacity:0;cursor:pointer}
.pick-btn:focus-within{outline:3px solid var(--accent-text);outline-offset:3px}
.shots + .hint + .pick2 .pick-btn{min-height:110px;font-size:18px}`);

fs.writeFileSync('src/app.html', h);
console.log('앨범 패치 완료');
