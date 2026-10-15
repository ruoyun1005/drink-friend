-- 修正首次串接真實資料時發現的兩個問題：
-- 1. users 的 select policy 只准讀自己 → 看不到團友／團主的暱稱。
-- 2. circles / circle_members 只有 circle_members 有 select policy，
--    而且是「只能看自己那一列」，看不到同團其他成員。

-- 1) 暱稱與頭像視為同團內的公開資訊，開放給任何已登入使用者讀取。
drop policy if exists "使用者只能讀寫自己的資料" on users;

create policy "任何登入者可以讀取使用者暱稱與頭像"
on users for select
using (auth.uid() is not null);

-- 2) 用 security definer function 避免 circle_members 自我參照造成的 RLS 遞迴。
create or replace function public.is_circle_member(target_circle_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from circle_members
    where circle_id = target_circle_id
      and user_id = auth.uid()
  );
$$;

drop policy if exists "成員可讀取自己的團友圈" on circle_members;

create policy "圈內成員可讀取彼此的團友圈成員資料"
on circle_members for select
using (public.is_circle_member(circle_id));

create policy "圈內成員可讀取自己的團友圈"
on circles for select
using (public.is_circle_member(id));

-- 3) 匿名／Google 登入成功後，自動在 public.users 建立對應的個人資料列（F-01、F-02）。
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, nickname, is_anonymous)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nickname', '揪團人' || substr(new.id::text, 1, 4)),
    coalesce(new.is_anonymous, true)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();
