-- 揪團訂飲料 schema
-- 對應 PRD 第 8 節資料模型、第 9 節權限規則

create extension if not exists "pgcrypto";

-- 8. 資料模型 -----------------------------------------------------------

create table users (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null,
  avatar_url text,
  is_anonymous boolean not null default true,
  push_enabled boolean not null default false,
  created_at timestamptz not null default now()
);

create table user_settings (
  user_id uuid primary key references users (id) on delete cascade,
  default_payment_account text
);

create table shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  created_by uuid references users (id),
  created_at timestamptz not null default now()
);

create type platform_type as enum ('you_order', 'uber_eats', 'foodpanda', 'shop_own');

create table shop_platforms (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops (id) on delete cascade,
  platform platform_type not null,
  url text not null,
  supports_pickup boolean not null default false,
  supports_delivery boolean not null default false,
  last_free_shipping_threshold numeric,
  last_delivery_fee numeric,
  unique (shop_id, platform)
);

create table circles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table circle_members (
  circle_id uuid not null references circles (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (circle_id, user_id)
);

create type pickup_mode as enum ('pickup', 'delivery');
create type round_status as enum ('open', 'closed');

create table rounds (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid references circles (id),
  host_id uuid not null references users (id),
  shop_id uuid not null references shops (id),
  platform platform_type not null,
  group_order_url text not null,
  mode pickup_mode not null,
  deadline_at timestamptz not null,
  -- 外送
  free_shipping_threshold numeric,
  delivery_fee numeric,
  deliver_to text,
  -- 自取
  pickup_time timestamptz,
  pickup_location text,
  pickup_person text,
  status round_status not null default 'open',
  created_at timestamptz not null default now()
);

create table round_members (
  round_id uuid not null references rounds (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  ordered boolean not null default false,
  amount numeric,
  paid boolean not null default false,
  primary key (round_id, user_id)
);

-- 收款資訊獨立存放，權限見下方 RLS。
create table round_payment_info (
  round_id uuid primary key references rounds (id) on delete cascade,
  payment_account text not null
);

create table drinks (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops (id) on delete cascade,
  name text not null,
  category text,
  reference_price numeric,
  is_discontinued boolean not null default false
);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  drink_id uuid not null references drinks (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  stars smallint not null check (stars between 1 and 5),
  sweetness text,
  ice text,
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (drink_id, user_id)
);

create type report_target as enum ('drink', 'shop');
create type report_type as enum ('missing', 'discontinued', 'price');
create type report_status as enum ('pending', 'resolved');

create table drink_reports (
  id uuid primary key default gen_random_uuid(),
  target_type report_target not null,
  drink_id uuid references drinks (id),
  shop_id uuid references shops (id),
  report_type report_type not null,
  content text,
  reported_by uuid not null references users (id),
  status report_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table comments (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds (id) on delete cascade,
  user_id uuid not null references users (id),
  content text not null,
  created_at timestamptz not null default now()
);

create type poll_status as enum ('open', 'closed');

create table polls (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid references circles (id),
  created_by uuid not null references users (id),
  vote_deadline_at timestamptz not null,
  order_deadline_at timestamptz not null,
  status poll_status not null default 'open'
);

create table poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references polls (id) on delete cascade,
  shop_id uuid not null references shops (id),
  added_by uuid not null references users (id),
  unique (poll_id, shop_id)
);

create table votes (
  poll_id uuid not null references polls (id) on delete cascade,
  option_id uuid not null references poll_options (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  primary key (poll_id, user_id)
);

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  subscription jsonb not null,
  created_at timestamptz not null default now()
);

-- 9. 權限規則 -------------------------------------------------------------

alter table users enable row level security;
alter table user_settings enable row level security;
alter table shops enable row level security;
alter table shop_platforms enable row level security;
alter table circles enable row level security;
alter table circle_members enable row level security;
alter table rounds enable row level security;
alter table round_members enable row level security;
alter table round_payment_info enable row level security;
alter table drinks enable row level security;
alter table reviews enable row level security;
alter table drink_reports enable row level security;
alter table comments enable row level security;
alter table push_subscriptions enable row level security;

-- 只有在該團按下「點好了」的成員，才看得到收款資訊（F-32）。
create policy "點好了才看得到收款帳號"
on round_payment_info for select
using (
  exists (
    select 1 from round_members
    where round_members.round_id = round_payment_info.round_id
      and round_members.user_id = auth.uid()
      and round_members.ordered = true
  )
);

-- 只有團主可以寫入 / 修改收款資訊。
create policy "團主可以寫入收款資訊"
on round_payment_info for insert
with check (
  exists (
    select 1 from rounds
    where rounds.id = round_payment_info.round_id
      and rounds.host_id = auth.uid()
  )
);

create policy "團主可以修改收款資訊"
on round_payment_info for update
using (
  exists (
    select 1 from rounds
    where rounds.id = round_payment_info.round_id
      and rounds.host_id = auth.uid()
  )
);

-- 團員可以看到團本身（開團卡片），任何已登入使用者皆可讀取。
create policy "任何登入者可讀取團" on rounds for select using (auth.uid() is not null);

-- 只有團主可以修改開團資訊。
create policy "只有團主可以修改團" on rounds for update using (host_id = auth.uid());
create policy "登入者可以開團" on rounds for insert with check (host_id = auth.uid());

-- round_members：任何登入者可讀取同團成員狀態；
-- 團員只能修改自己的「點好了」、金額與付款狀態；團主可以移除成員。
create policy "任何登入者可讀取團員狀態" on round_members for select using (auth.uid() is not null);

create policy "成員只能修改自己的點餐狀態"
on round_members for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "團主可以移除成員"
on round_members for delete
using (
  exists (
    select 1 from rounds
    where rounds.id = round_members.round_id
      and rounds.host_id = auth.uid()
  )
);

create policy "登入者可以加入團"
on round_members for insert
with check (user_id = auth.uid());

-- 評價：所有人都可以讀取；只有非匿名使用者可以新增，且只能修改／刪除自己的評價。
create policy "所有人可讀取評價" on reviews for select using (true);

create policy "非匿名使用者可以新增評價"
on reviews for insert
with check (
  user_id = auth.uid()
  and exists (select 1 from users where users.id = auth.uid() and users.is_anonymous = false)
);

create policy "使用者只能修改自己的評價"
on reviews for update using (user_id = auth.uid());

create policy "使用者只能刪除自己的評價"
on reviews for delete using (user_id = auth.uid());

-- 飲料品項：所有人可讀取；新增／修改／停售交由管理者（透過 service role）處理，
-- 一般使用者只能透過 drink_reports 回報（F-88）。
create policy "所有人可讀取飲料品項" on drinks for select using (true);

create policy "登入者可以回報品項問題"
on drink_reports for insert
with check (reported_by = auth.uid());

-- 留言串：同團登入者皆可讀取與新增留言。
create policy "同團登入者可讀取留言" on comments for select using (auth.uid() is not null);
create policy "登入者可以留言"
on comments for insert
with check (user_id = auth.uid());

-- 團友圈：成員可讀取自己所在的圈；可自行退出（F-42）。
create policy "成員可讀取自己的團友圈"
on circle_members for select
using (user_id = auth.uid());

create policy "成員可以退出團友圈"
on circle_members for delete
using (user_id = auth.uid());

-- 個人設定與使用者資料：只能讀寫自己的。
create policy "使用者只能讀寫自己的資料"
on users for select using (id = auth.uid());

create policy "使用者只能更新自己的資料"
on users for update using (id = auth.uid());

create policy "使用者只能存取自己的設定"
on user_settings for select using (user_id = auth.uid());

create policy "使用者只能寫入自己的設定"
on user_settings for insert with check (user_id = auth.uid());

create policy "使用者只能更新自己的設定"
on user_settings for update using (user_id = auth.uid());

create policy "使用者只能存取自己的推播訂閱"
on push_subscriptions for all using (user_id = auth.uid());

-- 店家清單、各平台連結：所有登入者可讀取、可新增（F-65）。
create policy "所有登入者可讀取店家" on shops for select using (auth.uid() is not null);
create policy "登入者可以新增店家" on shops for insert with check (created_by = auth.uid());
create policy "所有登入者可讀取店家平台連結" on shop_platforms for select using (auth.uid() is not null);
