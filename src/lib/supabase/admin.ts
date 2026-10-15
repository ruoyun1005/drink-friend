import { createClient } from "@supabase/supabase-js";

// 只能在 server 端使用（API route / server action）：用 service role key 繞過 RLS，
// 讀取任意使用者的推播訂閱資料並發送通知。絕對不能把這個 client 暴露到瀏覽器。
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );
}
