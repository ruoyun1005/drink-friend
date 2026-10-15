"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// 匿名登入（F-01）：第一次進站就自動建立一個可用的使用者身分。
export function useViewer() {
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          if (!cancelled) setViewerId(user.id);
          return;
        }

        const { data, error: signInError } = await supabase.auth.signInAnonymously();
        if (signInError) throw signInError;
        if (!cancelled) setViewerId(data.user?.id ?? null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "登入失敗");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { viewerId, loading, error };
}
