-- 投票選店家（開團前還不知道要喝什麼，先讓大家投票決定）。
-- 投完票後，團主結束投票時由前端挑出票數最高的店家，直接帶著 shopId
-- 導去 /rounds/new 開團，不需要額外的 RPC。
--
-- 用 drop + create 重跑一次：第一次執行到一半失敗過，polls/poll_options
-- 已經建好（都還是空的），但 poll_votes 沒建成功，這樣不管現在卡在哪都能跑乾淨。

drop table if exists poll_votes cascade;
drop table if exists poll_options cascade;
drop table if exists polls cascade;

create table polls (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references users (id) on delete cascade,
  circle_id uuid references circles (id) on delete set null,
  title text not null default '喝什麼？',
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);

create table poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references polls (id) on delete cascade,
  shop_id uuid not null references shops (id),
  created_at timestamptz not null default now()
);

create table poll_votes (
  poll_id uuid not null references polls (id) on delete cascade,
  option_id uuid not null references poll_options (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (poll_id, user_id)
);

alter table polls enable row level security;
alter table poll_options enable row level security;
alter table poll_votes enable row level security;

create policy "任何登入者可讀取投票" on polls for select using (auth.uid() is not null);
create policy "登入者可以開投票" on polls for insert with check (host_id = auth.uid());
create policy "只有發起人可以結束投票" on polls for update using (host_id = auth.uid());

create policy "任何登入者可讀取投票選項" on poll_options for select using (auth.uid() is not null);
create policy "發起人可以新增投票選項"
on poll_options for insert
with check (
  exists (select 1 from polls where polls.id = poll_options.poll_id and polls.host_id = auth.uid())
);

create policy "任何登入者可讀取投票結果" on poll_votes for select using (auth.uid() is not null);
create policy "登入者可以投自己的票"
on poll_votes for insert
with check (user_id = auth.uid());
create policy "登入者可以改自己的票"
on poll_votes for update
using (user_id = auth.uid())
with check (user_id = auth.uid());
create policy "登入者可以收回自己的票"
on poll_votes for delete
using (user_id = auth.uid());
