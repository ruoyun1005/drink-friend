-- 帳號綁定（匿名升級成正式帳號）：
-- 002 patch 的 handle_new_auth_user 只在 auth.users「新增」時把 is_anonymous
-- 寫進 public.users 一次。使用者在 /me 綁定 email/密碼時，走的是
-- supabase.auth.updateUser()，這是對同一筆 auth.users 做 UPDATE（is_anonymous
-- 從 true 變 false），不會觸發 insert trigger，所以 public.users.is_anonymous
-- 永遠不會跟著更新。這裡補一個 update trigger 讓兩邊保持同步。

create or replace function public.handle_auth_user_is_anonymous_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_anonymous is distinct from old.is_anonymous then
    update public.users set is_anonymous = coalesce(new.is_anonymous, false)
    where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_is_anonymous_change on auth.users;

create trigger on_auth_user_is_anonymous_change
after update on auth.users
for each row execute function public.handle_auth_user_is_anonymous_change();
