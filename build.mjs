// 게임즈 가든 빌드: src/app.html + src/photos → index.html
// 사진·데이터·스크립트·폰트는 비밀번호로 암호화(AES-GCM, PBKDF2)해서 넣는다. 공개 저장소에서도 비밀번호 없이는 내용을 볼 수 없다.
// 사용법: GG_PASSWORD=비밀번호 node build.mjs  (Supabase 주소·공개키·토큰은 src/secrets.json, 저장소 제외)
import fs from 'fs';
import { webcrypto as crypto } from 'crypto';

const PASSWORD = process.env.GG_PASSWORD;
if (!PASSWORD) { console.error('GG_PASSWORD 환경변수로 비밀번호를 넣어 주세요.'); process.exit(1); }
const FONT_DIR = process.env.GG_FONT_DIR || 'C:/Users/linkagelab/AppData/Local/Microsoft/Windows/Fonts/';
const ITER = 310000;

let html = fs.readFileSync('src/app.html', 'utf8');
const photos = fs.readdirSync('src/photos').filter(f => f.endsWith('.jpg'))
  .map(f => `${f.slice(0, -4)}:"data:image/jpeg;base64,${fs.readFileSync('src/photos/' + f).toString('base64')}"`).join(',');
html = html.replace('/*__IMGS__*/', photos).replace('/*__FONTS__*/', '');
let SEC = {}; try { SEC = JSON.parse(fs.readFileSync('src/secrets.json', 'utf8')); } catch {}
const SB_URL = process.env.GG_SB_URL || SEC.sbUrl || '', SB_KEY = process.env.GG_SB_KEY || SEC.sbKey || '', SB_TOKEN = process.env.GG_SB_TOKEN || SEC.sbToken || '';
if (SB_TOKEN) fs.writeFileSync('src/schema.filled.sql', fs.readFileSync('supabase/schema.sql', 'utf8').replaceAll('__GG_TOKEN__', SB_TOKEN));
html = html.replace('/*__SB_URL__*/', SB_URL.replace(/\/+$/, '')).replace('/*__SB_KEY__*/', SB_KEY).replace('/*__SB_TOKEN__*/', SB_TOKEN);
console.log(SB_URL && SB_KEY ? 'Supabase 연결: ' + SB_URL : 'Supabase 미설정 — 기록은 각 기기에만 저장돼요');

// 앱 스크립트를 떼어내 암호화 대상에 넣는다
const s = html.indexOf('<script>'), e = html.indexOf('</script>', s);
const js = html.slice(s + 8, e);
html = html.slice(0, s) + html.slice(e + 9);

let css = '';
const font = (f, w) => `@font-face{font-family:"Kakao Big Sans";font-weight:${w};font-display:swap;src:url(data:font/ttf;base64,${fs.readFileSync(FONT_DIR + f).toString('base64')}) format("truetype")}`;
try { css = [font('KAKAOBIGSANS-REGULAR.TTF', 400), font('KAKAOBIGSANS-BOLD.TTF', 700), font('KAKAOBIGSANS-EXTRABOLD.TTF', '800 900')].join('\n'); }
catch { console.warn('Kakao Big Sans를 찾지 못해 기본 서체로 빌드해요.'); }

const enc = new TextEncoder();
const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
const base = await crypto.subtle.importKey('raw', enc.encode(PASSWORD), 'PBKDF2', false, ['deriveKey']);
const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify({ css, js }))));
const b64 = u => Buffer.from(u).toString('base64');

const titleEnd = html.indexOf('</title>') + 8;
const head = html.slice(0, titleEnd), rest = html.slice(titleEnd);
const gate = `
<div class="gate" id="gate">
  <form class="gate-card" id="gate-form" autocomplete="off">
    <b class="gate-brand">GAMES GARDEN</b>
    <span class="gate-sub">카카오게임즈 식물 교체 기록 · 링키지랩</span>
    <label for="gate-pw">비밀번호</label>
    <input id="gate-pw" type="password" inputmode="text" autocomplete="current-password" required>
    <label class="gate-keep"><input type="checkbox" id="gate-keep"> 이 기기에서 기억하기</label>
    <button type="submit" id="gate-btn">들어가기</button>
    <p class="gate-err" id="gate-err" role="alert"></p>
  </form>
</div>
<style>
body.locked .app,body.locked .scrim{display:none}
.gate{position:fixed;inset:0;z-index:100;display:grid;place-items:center;padding:16px;background:var(--bg)}
.gate-card{width:min(360px,100%);display:flex;flex-direction:column;gap:10px;background:var(--panel);border:1px solid var(--line-soft);border-radius:var(--r-lg);padding:28px 24px;box-shadow:var(--shadow)}
.gate-brand{font-size:18px;font-weight:800;letter-spacing:.3px}
.gate-sub{font-size:12.5px;color:var(--ink-3);margin-bottom:10px}
.gate-card label{font-size:13px;font-weight:700;color:var(--ink-2)}
.gate-card input[type=password]{min-height:52px;border-radius:12px;border:2px solid var(--line);background:var(--panel-2);color:var(--ink);font:inherit;font-size:18px;padding:0 14px}
.gate-card input[type=password]:focus{outline:none;border-color:var(--accent-text)}
.gate-keep{display:flex;align-items:center;gap:8px;font-weight:400!important}
.gate-keep input{width:18px;height:18px}
.gate-card button{min-height:52px;border:0;border-radius:12px;background:var(--accent);color:var(--accent-ink);font:inherit;font-size:16px;font-weight:800;cursor:pointer}
.gate-card button[disabled]{opacity:.5}
.gate-err{margin:0;min-height:20px;font-size:13px;color:#dc2f28}
</style>
<script>
(()=>{
const D={salt:"${b64(salt)}",iv:"${b64(iv)}",it:${ITER},ct:"${b64(ct)}"};
const u8=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const K="gg-key";
async function derive(pw){ const b=await crypto.subtle.importKey("raw",new TextEncoder().encode(pw),"PBKDF2",false,["deriveKey"]);
  return crypto.subtle.deriveKey({name:"PBKDF2",salt:u8(D.salt),iterations:D.it,hash:"SHA-256"},b,{name:"AES-GCM",length:256},true,["decrypt"]); }
async function open(key){
  const pt=await crypto.subtle.decrypt({name:"AES-GCM",iv:u8(D.iv)},key,u8(D.ct));
  const {css,js}=JSON.parse(new TextDecoder().decode(pt));
  const st=document.createElement("style"); st.textContent=css; document.head.appendChild(st);
  document.body.classList.remove("locked"); document.getElementById("gate").remove();
  const sc=document.createElement("script"); sc.textContent=js; document.body.appendChild(sc);
}
document.body.classList.add("locked");
(async()=>{ try{ const raw=localStorage.getItem(K); if(raw){ const key=await crypto.subtle.importKey("jwk",JSON.parse(raw),{name:"AES-GCM"},false,["decrypt"]); await open(key); return; } }catch(e){ try{localStorage.removeItem(K)}catch(_){} }
  document.getElementById("gate-pw").focus(); })();
document.getElementById("gate-form").addEventListener("submit",async ev=>{
  ev.preventDefault(); const btn=document.getElementById("gate-btn"), err=document.getElementById("gate-err");
  btn.disabled=true; btn.textContent="여는 중…"; err.textContent="";
  try{ const key=await derive(document.getElementById("gate-pw").value);
    if(document.getElementById("gate-keep").checked){ try{ localStorage.setItem(K,JSON.stringify(await crypto.subtle.exportKey("jwk",key))); }catch(e){} }
    await open(key);
  }catch(e){ err.textContent="비밀번호가 맞지 않아요. 다시 입력해 주세요."; btn.disabled=false; btn.textContent="들어가기"; }
});
})();
</script>`;

const out = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
${head}
</head>
<body>
${rest.trim()}
${gate}
</body>
</html>
`;
fs.writeFileSync('index.html', out);
console.log(`index.html ${(out.length / 1e6).toFixed(2)}MB · 사진 ${photos.split('data:image').length - 1}장`);
