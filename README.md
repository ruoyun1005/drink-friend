# drink-friend｜飲料好朋友！

飲料揪揪！讓朋友之間可以快速揪團訂飲料：決定喝哪家、誰要一起、湊免運、追蹤誰點好了、誰還沒還錢。

詳見 [`docs/PRD.md`](./docs/PRD.md)。

## 技術架構

- 前端：Next.js (App Router) + Tailwind CSS v4
- 資料庫與登入：Supabase（Postgres、匿名登入、Row Level Security）
- 部署：Vercel

## 開發

```bash
npm install
cp .env.example .env.local   # 填入 Supabase 專案的 URL 與 anon key
npm run dev
```

資料庫 schema（含 RLS 權限規則）在 [`supabase/schema.sql`](./supabase/schema.sql)，可以直接貼到 Supabase SQL editor 執行；後續修正與新功能的權限異動放在 [`supabase/patches/`](./supabase/patches/)，依編號順序執行。

Web Push 需要在 Vercel 專案設定裡加上 `NEXT_PUBLIC_VAPID_PUBLIC_KEY`、`VAPID_PRIVATE_KEY`、`VAPID_SUBJECT`（用 `npx web-push generate-vapid-keys` 產生），改完環境變數記得手動觸發一次重新部署。

## 目前狀態

開團、加入、團頁面（點餐狀態、留言串、分帳、結單時間調整）、團友圈、品牌/店家頁與飲料評價、Web Push 推播（含續團通知、團主提醒）。
