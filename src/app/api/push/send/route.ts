import { NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

let vapidConfigured = false;

function ensureVapidConfigured() {
  if (vapidConfigured) return;
  const { VAPID_SUBJECT, NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env;
  if (!VAPID_SUBJECT || !NEXT_PUBLIC_VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    throw new Error("缺少 VAPID 環境變數，無法發送推播");
  }
  webpush.setVapidDetails(VAPID_SUBJECT, NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  vapidConfigured = true;
}

type SendPushBody = {
  userIds: string[];
  title: string;
  body: string;
  url?: string;
};

export async function POST(request: Request) {
  try {
    ensureVapidConfigured();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "推播設定錯誤" },
      { status: 500 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const payload = (await request.json()) as SendPushBody;
  const userIds = (payload.userIds ?? []).filter((id) => id !== user.id);

  if (userIds.length === 0 || !payload.title) {
    return NextResponse.json({ error: "缺少必要欄位" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: subs, error } = await admin
    .from("push_subscriptions")
    .select("id, user_id, subscription")
    .in("user_id", userIds);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const notification = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/",
  });

  const results = await Promise.allSettled(
    (subs ?? []).map(async (row) => {
      try {
        await webpush.sendNotification(row.subscription, notification);
      } catch (err: unknown) {
        // 410/404 表示這個訂閱已經失效（使用者解除授權、清過資料等），順手清掉。
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await admin.from("push_subscriptions").delete().eq("id", row.id);
        }
        throw err;
      }
    }),
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  return NextResponse.json({ sent, total: subs?.length ?? 0 });
}
