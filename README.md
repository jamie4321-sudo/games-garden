# GAMES GARDEN

카카오게임즈 식물 교체 기록 — 링키지랩 스낵&가든사업팀 가드너가 관리합니다.

- 담당자 화면: 교체 현황(교체 전·후 사진) · 위치별 이력 · 활착 관리 · 월간 리포트
- 가드너 기록: 층 → 자리 → 식물 → 같은 식물? → 이유 → 전·후 사진 → 보내기 (큰 버튼, 한 화면 한 질문)

## 빌드

내용(사진·데이터·스크립트)은 비밀번호로 암호화되어 `index.html`에 들어갑니다.

```bash
GG_PASSWORD=비밀번호 node build.mjs
```

- 원본 `src/app.html`, 사진 `src/photos/`는 담당 PC에만 보관합니다(저장소 제외).
## 링크

- 담당자: `/games-garden/` — 리더가 확인한 기록만 보여요
- 가드너: `/games-garden/#crew` — 바로 기록 화면이 열려요
- 리더: `/games-garden/#leader` — 확인 전 기록 + "확인 완료" 버튼

## 저장 (Supabase)

- 가드너 기록은 Supabase `gg_records`(pending → approved), 추가한 자리·식물은 `gg_options`에 저장돼요.
- 접근은 요청 헤더 `x-gg-token`이 맞을 때만 허용(RLS). 토큰·주소·공개키는 `src/secrets.json`(저장소 제외)에 있고 빌드 때 암호화된 앱 안에만 들어가요.
- 테이블 생성: `supabase/schema.sql`(틀) → 빌드가 토큰을 채운 `src/schema.filled.sql`을 SQL Editor에서 실행.
- 인터넷이 약하면 기록을 기기에 보관했다가 다음에 열 때 자동으로 보내요.
