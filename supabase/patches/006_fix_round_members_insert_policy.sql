-- 續團開團失敗的根因：003_continue_round_rls.sql 裡「團主可以把團友加進這一團」
-- 這條 policy 在正式環境裡沒有真的生效（可能當時 SQL Editor 分頁貼錯內容、
-- 或是建立時其實撞到同名 policy 已存在而默默失敗），導致續團時一次性把
-- 勾選通知的團友塞進 round_members 仍然被 RLS 擋下來（42501）。
--
-- 這個 patch 用 drop + create 重新建一次，確保不管之前狀態如何，
-- 跑完這支之後這條 policy 一定會是正確、生效的版本。

drop policy if exists "團主可以把團友加進這一團" on round_members;

create policy "團主可以把團友加進這一團"
on round_members for insert
with check (
  exists (
    select 1 from rounds
    where rounds.id = round_members.round_id
      and rounds.host_id = auth.uid()
  )
);
