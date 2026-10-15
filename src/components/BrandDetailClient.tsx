"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useViewer } from "@/hooks/useViewer";
import { createClient } from "@/lib/supabase/client";
import {
  fetchShopDetail,
  fetchShopDrinks,
  fetchViewerIsAnonymous,
  fetchViewerReview,
  upsertReview,
  type DrinkSummary,
  type Platform,
  type ShopDetail,
  type ViewerReview,
} from "@/lib/queries";

const PLATFORM_LABELS: Record<Platform, string> = {
  you_order: "你訂",
  uber_eats: "Uber Eats",
  foodpanda: "foodpanda",
  shop_own: "店家自有平台",
};

const SWEETNESS_OPTIONS = ["正常糖", "少糖", "半糖", "微糖", "無糖"];
const ICE_OPTIONS = ["正常冰", "少冰", "微冰", "去冰", "溫", "熱"];

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          className={`text-lg leading-none ${n <= value ? "text-accent-strong" : "text-border"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function DrinkRow({
  drink,
  viewerId,
  canReview,
  onReviewed,
}: {
  drink: DrinkSummary;
  viewerId: string;
  canReview: boolean;
  onReviewed: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [myReview, setMyReview] = useState<ViewerReview | null>(null);
  const [draft, setDraft] = useState<ViewerReview>({ stars: 5, sweetness: null, ice: null, comment: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openForm() {
    setOpen((v) => !v);
    if (open) return;
    try {
      const r = await fetchViewerReview(createClient(), drink.id, viewerId);
      setMyReview(r);
      if (r) setDraft(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : "讀取失敗");
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await upsertReview(createClient(), drink.id, viewerId, draft);
      setMyReview(draft);
      setOpen(false);
      onReviewed();
    } catch (err) {
      setError(err instanceof Error ? err.message : "評分失敗");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface px-3.5 py-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-bold">{drink.name}</p>
          <p className="text-xs text-text-soft">
            {drink.referencePrice ? `$${drink.referencePrice}（依門市為準）` : "價格依門市為準"}
          </p>
        </div>
        <div className="flex-shrink-0 text-right text-xs">
          {drink.reviewCount > 0 ? (
            <>
              <div className="font-bold text-accent-strong">
                ★ {drink.avgStars?.toFixed(1)}（{drink.reviewCount}）
              </div>
              {(drink.topSweetness || drink.topIce) && (
                <div className="text-text-soft">
                  {drink.topSweetness} {drink.topIce}
                </div>
              )}
            </>
          ) : (
            <span className="text-text-soft">還沒有評價</span>
          )}
        </div>
      </div>

      {canReview && (
        <button onClick={openForm} className="mt-2 text-xs font-bold text-accent-strong underline">
          {myReview ? "修改我的評價" : "我要評分"}
        </button>
      )}

      {open && (
        <div className="mt-2 flex flex-col gap-2 rounded-lg bg-surface-sunk p-2.5">
          {error && <p className="text-xs text-warn-text">{error}</p>}
          <StarRating value={draft.stars} onChange={(v) => setDraft((d) => ({ ...d, stars: v }))} />
          <div className="flex gap-1.5 overflow-x-auto">
            {SWEETNESS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setDraft((d) => ({ ...d, sweetness: s }))}
                className={`flex-shrink-0 rounded-full px-2.5 py-1 text-xs ${
                  draft.sweetness === s ? "bg-accent text-white" : "bg-surface text-text-soft"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 overflow-x-auto">
            {ICE_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setDraft((d) => ({ ...d, ice: s }))}
                className={`flex-shrink-0 rounded-full px-2.5 py-1 text-xs ${
                  draft.ice === s ? "bg-accent text-white" : "bg-surface text-text-soft"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="一句短評（選填）"
            value={draft.comment ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, comment: e.target.value }))}
            className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm outline-none placeholder:text-text-soft"
          />
          <button
            disabled={saving}
            onClick={handleSave}
            className="self-end rounded-full bg-accent px-3.5 py-1.5 text-xs font-bold text-white disabled:opacity-50"
          >
            {saving ? "送出中…" : "送出評價"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function BrandDetailClient({ shopId }: { shopId: string }) {
  const { viewerId, loading: viewerLoading, error: viewerError } = useViewer();
  const [shop, setShop] = useState<ShopDetail | null>(null);
  const [drinks, setDrinks] = useState<DrinkSummary[] | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [category, setCategory] = useState<string>("全部");
  const [loadError, setLoadError] = useState<string | null>(null);

  function reload() {
    if (!viewerId) return;
    const supabase = createClient();
    Promise.all([
      fetchShopDetail(supabase, shopId),
      fetchShopDrinks(supabase, shopId),
      fetchViewerIsAnonymous(supabase, viewerId),
    ])
      .then(([s, d, anon]) => {
        if (!s) {
          setLoadError("找不到這家店");
          return;
        }
        setShop(s);
        setDrinks(d);
        setIsAnonymous(anon);
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "讀取失敗"));
  }

  useEffect(reload, [viewerId, shopId]);

  const error = viewerError ?? loadError;

  if (error) {
    return <p className="py-10 text-center text-sm text-warn-text">{error}</p>;
  }

  if (viewerLoading || !viewerId || shop === null || drinks === null) {
    return <p className="py-10 text-center text-sm text-text-soft">載入中…</p>;
  }

  const categories = ["全部", ...Array.from(new Set(drinks.map((d) => d.category).filter(Boolean)))] as string[];
  const sorted = [...drinks]
    .filter((d) => category === "全部" || d.category === category)
    .sort((a, b) => (b.avgStars ?? -1) - (a.avgStars ?? -1));

  return (
    <div className="flex flex-col gap-4 pb-4">
      <div className="flex items-center gap-2">
        <Link href="/brands" className="text-lg">
          ←
        </Link>
        <h1 className="flex-1 truncate text-lg font-bold">{shop.name}</h1>
      </div>

      {shop.platforms.length > 0 && (
        <section className="flex flex-col gap-2">
          <p className="text-[13px] font-bold text-text-soft">點餐平台</p>
          <div className="flex flex-col gap-1.5">
            {shop.platforms.map((p) => (
              <a
                key={p.id}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3.5 py-2.5"
              >
                <span className="font-bold">{PLATFORM_LABELS[p.platform]}</span>
                <span className="flex gap-1">
                  {p.supportsDelivery && (
                    <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-bold text-accent-soft-text">
                      外送
                    </span>
                  )}
                  {p.supportsPickup && (
                    <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-bold text-accent-soft-text">
                      自取
                    </span>
                  )}
                </span>
              </a>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-bold text-text-soft">飲料品項</p>
        </div>

        {categories.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
                  category === c ? "bg-accent text-white" : "bg-surface text-text-soft"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {!isAnonymous ? null : (
          <p className="text-xs text-text-soft">綁定帳號（Google 登入）後才能評分</p>
        )}

        {sorted.length === 0 ? (
          <p className="rounded-[18px] border border-dashed border-border px-4 py-8 text-center text-sm text-text-soft">
            這家店還沒有飲料品項資料
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {sorted.map((drink) => (
              <DrinkRow
                key={drink.id}
                drink={drink}
                viewerId={viewerId}
                canReview={!isAnonymous}
                onReviewed={reload}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
