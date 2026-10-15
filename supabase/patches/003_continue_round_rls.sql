-- 續團補完（F-41、F-43）需要兩條新的 RLS policy：
-- 1. 透過連結加入的人需要能把自己加進團友圈（F-41），目前 circle_members 完全沒有 insert policy。
-- 2. 續團時團主要能把「勾選要通知」的團友直接加進 round_members（F-43），
--    但目前 round_members 的 insert policy 只允許「user_id = auth.uid()」，
--    團主沒辦法幫別人加這一筆。

create policy "登入者可以加入自己的團友圈"
on circle_members for insert
with check (user_id = auth.uid());

create policy "團主可以把團友加進這一團"
on round_members for insert
with check (
  exists (
    select 1 from rounds
    where rounds.id = round_members.round_id
      and rounds.host_id = auth.uid()
  )
);
