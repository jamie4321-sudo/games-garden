// 일회성 패치: 로그인 아이디를 이메일로
import fs from 'fs';
let h = fs.readFileSync('src/app.html', 'utf8');
const R = [
  [String.raw`<label>아이디<input id="af-id" type="text" maxlength="24" placeholder="영문·숫자, 예: garden01" required pattern="[A-Za-z0-9._\-]+"></label>`,
   `<label>이메일 (로그인 아이디)<input id="af-id" type="email" maxlength="80" placeholder="name@company.com" required autocomplete="off"></label>`],
  [`<p>아이디와 비밀번호를 정해 계정을 만들고 권한을 줘요. 총괄 관리자(jamie)만 이 화면을 볼 수 있어요.</p>`,
   `<p>이메일과 비밀번호를 정해 계정을 만들고 권한을 줘요. 총괄 관리자(jamie)만 이 화면을 볼 수 있어요.</p>`],
  [`<span>이름 · 아이디</span>`, `<span>이름 · 이메일</span>`],
  [`if(ACCTS.some(a=>a.idh===idh)){ msg.textContent="이미 있는 아이디예요. 다른 아이디를 써 주세요."; return; }`,
   `if(ACCTS.some(a=>a.idh===idh)){ msg.textContent="이미 등록된 이메일이에요."; return; }`],
  [`if(me && !ACCTS.some(a=>a.idh===me.idh)) ACCTS.unshift({id:me.id, name:me.name, role:"leader", idh:me.idh, builtin:true});`,
   `if(me && !ACCTS.some(a=>a.idh===me.idh)) ACCTS.unshift({id:USER.idh===me.idh?USER.id:"", name:USER.idh===me.idh?USER.name:"총괄 관리자", role:"leader", idh:me.idh, builtin:true});`],
];
for (const [a, b] of R) { if (!h.includes(a)) throw new Error('찾지 못함: ' + a.slice(0, 60)); h = h.replace(a, b); }
fs.writeFileSync('src/app.html', h);
console.log('이메일 패치 완료');
