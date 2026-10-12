-- 게임즈 가든: 가드너 교체 기록 저장
-- 이 파일은 틀입니다. 실제 실행본은 build.mjs 가 만드는 src/schema.filled.sql(토큰 포함, 저장소 제외)을 쓰세요.
-- Supabase 대시보드 > SQL Editor 에 통째로 붙여넣고 Run. 여러 번 실행해도 안전합니다.
-- 공개 키가 다른 저장소(edu-sign)에 공개돼 있으므로, 요청 헤더 x-gg-token 이 맞을 때만 접근을 허용합니다.

-- 교체 기록 (가드너가 보낸 것). status: pending(리더 확인 전) / approved(담당자 화면에 표시)
create table if not exists public.gg_records (
  id          text primary key,
  status      text not null default 'pending' check (status in ('pending','approved')),
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 가드너가 추가한 자리·식물 (kind: zone / plant). zone 의 name 은 '14층|D2' 형식
create table if not exists public.gg_options (
  kind        text not null check (kind in ('zone','plant')),
  name        text not null,
  photo       text,
  created_at  timestamptz not null default now(),
  primary key (kind, name)
);

alter table public.gg_records enable row level security;
alter table public.gg_options enable row level security;

-- 게임즈 가든 페이지(공개 키)에서 읽기·추가·수정만 허용. 삭제는 대시보드에서만.
drop policy if exists gg_records_read   on public.gg_records;
drop policy if exists gg_records_insert on public.gg_records;
drop policy if exists gg_records_update on public.gg_records;
create policy gg_records_read   on public.gg_records for select to anon using (coalesce(current_setting('request.headers', true)::json->>'x-gg-token', '') = '__GG_TOKEN__');
create policy gg_records_insert on public.gg_records for insert to anon with check (status = 'pending' and (coalesce(current_setting('request.headers', true)::json->>'x-gg-token', '') = '__GG_TOKEN__'));
create policy gg_records_update on public.gg_records for update to anon using (coalesce(current_setting('request.headers', true)::json->>'x-gg-token', '') = '__GG_TOKEN__') with check (coalesce(current_setting('request.headers', true)::json->>'x-gg-token', '') = '__GG_TOKEN__');

drop policy if exists gg_options_read   on public.gg_options;
drop policy if exists gg_options_insert on public.gg_options;
drop policy if exists gg_options_update on public.gg_options;
create policy gg_options_read   on public.gg_options for select to anon using (coalesce(current_setting('request.headers', true)::json->>'x-gg-token', '') = '__GG_TOKEN__');
create policy gg_options_insert on public.gg_options for insert to anon with check (coalesce(current_setting('request.headers', true)::json->>'x-gg-token', '') = '__GG_TOKEN__');
create policy gg_options_update on public.gg_options for update to anon using (coalesce(current_setting('request.headers', true)::json->>'x-gg-token', '') = '__GG_TOKEN__') with check (coalesce(current_setting('request.headers', true)::json->>'x-gg-token', '') = '__GG_TOKEN__');

grant select, insert, update on public.gg_records, public.gg_options to anon;
