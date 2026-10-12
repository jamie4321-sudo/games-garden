// 일회성 패치: 사진을 Supabase Storage(gg-photos)에 올리고 기록에는 주소만 남긴다
import fs from 'fs';
const F = 'src/app.html';
let h = fs.readFileSync(F, 'utf8');
const rep = (a, b) => { if (!h.includes(a)) throw new Error('찾지 못함: ' + a.slice(0, 70)); h = h.replace(a, b); };

// 1) 이미지 주소: 내장 사진 키 / data: / https 주소 모두 허용
rep(`const img = k => P[k] || (k && k.startsWith("data:") ? k : null);`,
    `const img = k => P[k] || (k && /^(data:|https?:)/.test(k) ? k : null);`);

// 2) 업로드 도우미
rep(`const saveOpt = (kind, name, photo) =>`, `// 사진 올리기: data: 사진 → Storage 공개 주소. 실패하면 원래 data: 를 그대로 돌려줘서 기록이 사라지지 않게 한다
async function putPhoto(src, folder){
  if(!SB_ON || !src || !src.startsWith("data:")) return src;
  try{
    const blob = await (await fetch(src)).blob();
    const name = \`\${folder}/\${new Date().toISOString().slice(0,7)}/\${crypto.randomUUID ? crypto.randomUUID() : Date.now()+"-"+Math.random().toString(36).slice(2)}.jpg\`;
    const r = await fetch(\`\${SB.url}/storage/v1/object/gg-photos/\${name}\`, {method:"POST", body:blob,
      headers:{apikey:SB.key, ...(SB.key.startsWith("eyJ")?{Authorization:\`Bearer \${SB.key}\`}:{}), "x-gg-token":SB.token, "Content-Type":blob.type||"image/jpeg", "x-upsert":"false"}});
    if(!r.ok) throw new Error(\`\${r.status} \${await r.text()}\`);
    return \`\${SB.url}/storage/v1/object/public/gg-photos/\${name}\`;
  }catch(e){ console.warn("사진 업로드 실패, 기록 안에 보관", e); return src; }
}
const saveOpt = (kind, name, photo) =>`);
// 식물 사진도 Storage로
rep(`const saveOpt = (kind, name, photo) => { if(SB_ON) sb("gg_options", {method:"POST", headers:{Prefer:"resolution=merge-duplicates,return=minimal"}, body:JSON.stringify({kind, name, photo:photo||null})}).catch(e=>console.warn(e)); };`,
    `const saveOpt = (kind, name, photo) => { if(SB_ON) (async()=>{ const url = await putPhoto(photo, "plants"); if(url && url!==photo && kind==="plant") PLANTS.set(name, url);
  await sb("gg_options", {method:"POST", headers:{Prefer:"resolution=merge-duplicates,return=minimal"}, body:JSON.stringify({kind, name, photo:url||null})}); })().catch(e=>console.warn(e)); };`);

// 3) 보내기: 사진 먼저 올리고 주소로 저장
rep(`    if(SB_ON){ sd.disabled=true; sd.textContent="보내는 중…";
      try{ await sb("gg_records",`, `    if(SB_ON){ sd.disabled=true; sd.textContent="사진 올리는 중…";
      rec.data.b = await putPhoto(rec.data.b, "records"); rec.data.a = await putPhoto(rec.data.a, "records");
      sd.textContent="보내는 중…";
      try{ await sb("gg_records",`);

// 4) 나중에 올린 사진
rep(`    i.ph[f.dataset.up]=url;
    if(SB_ON && i.rid){ i.raw={...i.raw, [f.dataset.up]:url};`, `    if(SB_ON && i.rid) url = await putPhoto(url, "records");
    i.ph[f.dataset.up]=url;
    if(SB_ON && i.rid){ i.raw={...i.raw, [f.dataset.up]:url};`);

// 5) 정리: 리더 화면을 열면 기록 안에 남은 data: 사진을 Storage로 옮긴다(한 번만, 조용히)
rep(`    flushOutbox();
  }catch(e){ console.warn(e); toast("저장된 기록을 불러오지 못했어요. 잠시 뒤 다시 열어 주세요."); }`, `    flushOutbox();
    if(LEADER) migratePhotos(recs||[], opts||[]);
  }catch(e){ console.warn(e); toast("저장된 기록을 불러오지 못했어요. 잠시 뒤 다시 열어 주세요."); }
}
async function migratePhotos(recs, opts){
  let n=0;
  for(const r of recs){ const d=r.data||{}; if(!(d.b?.startsWith("data:") || d.a?.startsWith("data:"))) continue;
    const b=await putPhoto(d.b,"records"), a=await putPhoto(d.a,"records");
    if(b===d.b && a===d.a) continue;
    try{ await sb(\`gg_records?id=eq.\${r.id}\`, {method:"PATCH", headers:{Prefer:"return=minimal"}, body:JSON.stringify({data:{...d, b, a}, updated_at:new Date().toISOString()})});
      const it=ITEMS.find(i=>i.rid===r.id); if(it){ it.ph={b,a}; it.raw={...d,b,a}; } n++; }catch(e){ console.warn(e); } }
  for(const o of opts){ if(o.kind!=="plant" || !o.photo?.startsWith("data:")) continue;
    const url=await putPhoto(o.photo,"plants"); if(url===o.photo) continue;
    try{ await sb(\`gg_options?kind=eq.plant&name=eq.\${encodeURIComponent(o.name)}\`, {method:"PATCH", headers:{Prefer:"return=minimal"}, body:JSON.stringify({photo:url})}); PLANTS.set(o.name,url); n++; }catch(e){ console.warn(e); } }
  if(n) toast(\`사진 \${n}건을 사진 저장소로 정리했어요\`);`);

fs.writeFileSync(F, h);
console.log('Storage 패치 완료');
