-- F-40：一團結單後，成員自動組成團友圈。
-- 目前完全沒有 circles 的 insert policy，而且 003 patch 加的
-- circle_members insert policy只允許自己加自己，團主沒辦法把
-- 「結單時還沒手動加入團友圈的其他成員」一起拉進新建立的團友圈。

create policy "登入者可以建立團友圈"
on circles for insert
with check (auth.uid() is not null);

create policy "團主可以把這團的人加進新團友圈"
on circle_members for insert
with check (
  exists (
    select 1 from rounds
    where rounds.circle_id = circle_members.circle_id
      and rounds.host_id = auth.uid()
  )
);
