"use client";

export async function sendPush(userIds: string[], title: string, body: string, url?: string) {
  if (userIds.length === 0) return;
  try {
    await fetch("/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userIds, title, body, url }),
    });
  } catch {
    // 推播是錦上添花，失敗不影響主要流程（留言/提醒本身已經成功）。
  }
}
