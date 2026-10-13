// 일회성 패치: 교체 기록의 '가드너 기록일'과 '교체 완료일'을 따로 수정
import fs from 'fs';
let h = fs.readFileSync('src/app.html', 'utf8');
const rep = (a, b) => { if (!h.includes(a)) throw new Error('찾지 못함: ' + a.slice(0, 80)); h = h.replace(a, b); };
const mdOf = 'const mdOf = s => { const t=new Date(s); return `${t.getMonth()+1}.${t.getDate()}`; };\n';

// 기록일 = data.recAt (없으면 실제로 보낸 시각 created_at)
rep('function recToItem(r){', mdOf + 'function recToItem(r){');
rep('    done:`${mm}.${dt.getDate()}`, pending:r.status!=="approved", note:d.note||"",',
    '    done:`${mm}.${dt.getDate()}`, rec:mdOf(d.recAt||r.created_at||d.date||Date.now()), recAt:d.recAt||r.created_at||d.date, pending:r.status!=="approved", note:d.note||"",');
rep('<b>${kd(i.crew?i.done:i.plan)}</b>', '<b>${kd(i.crew?(i.rec||i.done):i.plan)}</b>');

// 수정 폼: 가드너 기록일 + 교체 완료일
rep('    <label>교체일<input id="e-date" type="date" value="${ymd}" required></label>',
    '    <label>가드너 기록일<input id="e-rec" type="date" value="${ymdOf(new Date(i.recAt||d.date||Date.now()))}" max="${todayYmd()}" required></label>\n    <label>교체 완료일<input id="e-date" type="date" value="${ymd}" required></label>');
rep('const sp=v("#e-sp"), to=kind==="swap"?v("#e-to"):sp, loc=v("#e-loc"), date=v("#e-date");',
    'const sp=v("#e-sp"), to=kind==="swap"?v("#e-to"):sp, loc=v("#e-loc"), date=v("#e-date"), recd=v("#e-rec");\n      if(recd>todayYmd()){ toast("기록일은 오늘이나 지난 날짜만 고를 수 있어요"); return; }');
rep('bs, as, b:bs[0]||null, a:as[0]||null, editedBy',
    'recAt: recd && recd!==ymdOf(new Date(i.recAt||0)) ? new Date(recd+"T09:00:00").toISOString() : (i.recAt||new Date().toISOString()), bs, as, b:bs[0]||null, a:as[0]||null, editedBy');
rep('toast("위치, 식물, 교체일을 채워 주세요")', 'toast("위치, 식물, 날짜를 채워 주세요")');
fs.writeFileSync('src/app.html', h);
console.log('기록일 분리 패치 완료');
