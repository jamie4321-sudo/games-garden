-- 게임즈 가든: 계정별 로그인
-- 이 파일은 틀입니다. 실제 실행본은 build.mjs 가 만드는 src/accounts.filled.sql(토큰 포함, 저장소 제외)을 쓰세요.
--
-- 계정마다 '화면 열쇠'를 그 계정 비밀번호로 잠근 값(blob)을 저장합니다. 비밀번호 자체는 어디에도 저장하지 않습니다.
-- idh = 아이디의 해시, meta = 이름·역할(화면 열쇠로 잠금). 로그인 전에 자기 칸을 찾아야 하므로 읽기는 열어 두고,
-- 만들기·바꾸기·삭제는 x-gg-token(로그인한 화면 안에만 있음)이 맞을 때만 됩니다.

create table if not exists public.gg_keys (
  idh         text primary key,
  salt        text not null,
  iter        int  not null,
  iv          text not null,
  blob        text not null,
  meta_iv     text not null,
  meta        text not null,
  updated_at  timestamptz not null default now()
);

alter table public.gg_keys enable row level security;

drop policy if exists gg_keys_read   on public.gg_keys;
drop policy if exists gg_keys_insert on public.gg_keys;
drop policy if exists gg_keys_update on public.gg_keys;
drop policy if exists gg_keys_delete on public.gg_keys;
create policy gg_keys_read   on public.gg_keys for select to anon using (true);
create policy gg_keys_insert on public.gg_keys for insert to anon with check (coalesce(current_setting('request.headers', true)::json->>'x-gg-token', '') = '__GG_TOKEN__');
create policy gg_keys_update on public.gg_keys for update to anon using (coalesce(current_setting('request.headers', true)::json->>'x-gg-token', '') = '__GG_TOKEN__') with check (coalesce(current_setting('request.headers', true)::json->>'x-gg-token', '') = '__GG_TOKEN__');
create policy gg_keys_delete on public.gg_keys for delete to anon using (coalesce(current_setting('request.headers', true)::json->>'x-gg-token', '') = '__GG_TOKEN__');

grant select, insert, update, delete on public.gg_keys to anon;
