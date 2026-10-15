-- 前一版（client 端分三步：insert circles → update rounds → insert circle_members）
-- 會卡在 RLS 死結：PostgREST 用 return=representation 寫入後，
-- 會順便用 circles 的 SELECT policy 把剛寫入的那筆資料讀回來，
-- 但新建立的 circle 這時候還沒有任何成員，SELECT policy（圈內成員才能讀）
-- 當然擋住，於是整個 INSERT 被回報成 RLS violation，即使 policy 本身沒錯。
--
-- 改成一個 security definer 的函式，內部繞過 RLS、一次把
-- 「建立團友圈、把團員加進去、把團標記成已結單」原子性做完，
-- 函式裡手動檢查「只有這團的團主能呼叫」。

create or replace function public.close_round_and_form_circle(
  p_round_id uuid,
  p_default_circle_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_circle_id uuid;
  v_host_id uuid;
begin
  select host_id, circle_id into v_host_id, v_circle_id
  from rounds
  where id = p_round_id;

  if v_host_id is null then
    raise exception '找不到這個團';
  end if;

  if v_host_id <> auth.uid() then
    raise exception '只有團主可以結單';
  end if;

  if v_circle_id is null then
    insert into circles (name) values (p_default_circle_name)
    returning id into v_circle_id;

    update rounds set circle_id = v_circle_id where id = p_round_id;
  end if;

  insert into circle_members (circle_id, user_id)
  select v_circle_id, rm.user_id
  from round_members rm
  where rm.round_id = p_round_id
  on conflict (circle_id, user_id) do nothing;

  update rounds set status = 'closed' where id = p_round_id;
end;
$$;

grant execute on function public.close_round_and_form_circle(uuid, text) to authenticated;
