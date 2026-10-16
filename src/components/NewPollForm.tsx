"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useViewer } from "@/hooks/useViewer";
import { createClient } from "@/lib/supabase/client";
import { createPoll, fetchShops, type ShopOption } from "@/lib/queries";

export default function NewPollForm({ circleId }: { circleId?: string }) {
  const router = useRouter();
  const { viewerId, loading: viewerLoading, error: viewerError } = useViewer();

  const [shops, setShops] = useState<ShopOption[] | null>(null);
  const [title, setTitle] = useState("喝什麼？");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!viewerId) return;
    fetchShops(createClient())
      .then(setShops)
      .catch((err) => setError(err instanceof Error ? err.message : "讀取店家失敗"));
  }, [viewerId]);

  function toggleShop(shopId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(shopId)) {
        next.delete(shopId);
      } else {
        next.add(shopId);
      }
      return next;
    });
  }

  const canSubmit = !!viewerId && title.trim() && selected.size >= 2;

  async function handleSubmit() {
    if (!viewerId || !canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const pollId = await createPoll(createClient(), {
        hostId: viewerId,
        title: title.trim(),
        shopIds: Array.from(selected),
        circleId,
      });
      router.push(`/polls/${pollId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "開投票失敗");
      setSubmitting(false);
    }
  }

  const displayError = viewerError ?? error;

  if (displayError) {
    return <p className="py-10 text-center text-sm text-warn-text">{displayError}</p>;
  }

  if (viewerLoading || shops === null) {
    return <p className="py-10 text-center text-sm text-text-soft">載入中…</p>;
  }

  return (
    <div className="flex flex-col gap-4 pb-4">
      <h1 className="text-xl font-bold">開投票</h1>
      <p className="text-sm text-text-soft">還不知道喝什麼？先讓大家投票選店家，決定了再開團。</p>

      {displayError && (
        <p className="rounded-xl bg-warn-soft px-3.5 py-2.5 text-sm text-warn-text">{displayError}</p>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-bold text-text-soft">投票標題</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-bold text-text-soft">
          選項（至少選 2 家，{selected.size} 家已選）
        </label>
        {shops.length === 0 ? (
          <p className="rounded-[18px] border border-dashed border-border px-4 py-8 text-center text-sm text-text-soft">
            還沒有店家，先去「找品牌」新增一個吧
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {shops.map((shop) => {
              const checked = selected.has(shop.id);
              return (
                <button
                  key={shop.id}
                  type="button"
                  onClick={() => toggleShop(shop.id)}
                  className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-sm font-bold ${
                    checked
                      ? "border-accent bg-accent-soft text-accent-soft-text"
                      : "border-border bg-surface"
                  }`}
                >
                  {shop.name}
                  {checked && <span>✓</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <button
        disabled={submitting || !canSubmit}
        onClick={handleSubmit}
        className="rounded-full bg-accent px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
      >
        {submitting ? "開投票中…" : "開投票"}
      </button>
    </div>
  );
}
