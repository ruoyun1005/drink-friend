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

資料庫 schema（含 RLS 權限規則）在 [`supabase/schema.sql`](./supabase/schema.sql)，可以直接貼到 Supabase SQL editor 執行。

## 目前狀態

專案骨架與首頁 UI（進行中的團、團友圈、底部導覽）已完成，使用暫時假資料（`src/lib/mockData.ts`）。尚未串接 Supabase 讀寫，其餘頁面（開團表單、團頁面、品牌頁、個人頁）為佔位頁。

底部導覽採用「首頁／找品牌／開新團／續團／我」，不使用漢堡選單（對應 PRD F-72）。
