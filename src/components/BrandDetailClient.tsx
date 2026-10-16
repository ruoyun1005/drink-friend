"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FaHeart } from "react-icons/fa6";
import { FaArrowUpRightFromSquare } from "react-icons/fa6";
import { useViewer } from "@/hooks/useViewer";
import { createClient } from "@/lib/supabase/client";
import {
  fetchShopDetail,
  fetchShopDrinks,
  fetchViewerIsAnonymous,
  fetchViewerLastDrinkAtShop,
  fetchViewerLastOrderedAtShop,
  fetchViewerReview,
  upsertReview,
  type DrinkSummary,
  type LastDrinkInfo,
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

function favoriteKey(shopId: string) {
  return `you-drink:favorite:${shopId}`;
}

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
  const [lastOrderedLabel, setLastOrderedLabel] = useState<string | null>(null);
  const [lastDrink, setLastDrink] = useState<LastDrinkInfo | null>(null);
  const [favorite, setFavorite] = useState(false);
  const [category, setCategory] = useState<string>("全部");
  const [loadError, setLoadError] = useState<string | null>(null);

  function reload() {
    if (!viewerId) return;
    const supabase = createClient();
    Promise.all([
      fetchShopDetail(supabase, shopId),
      fetchShopDrinks(supabase, shopId),
      fetchViewerIsAnonymous(supabase, viewerId),
      fetchViewerLastOrderedAtShop(supabase, shopId, viewerId),
      fetchViewerLastDrinkAtShop(supabase, shopId, viewerId),
    ])
      .then(([s, d, anon, lastOrdered, lastDrinkInfo]) => {
        if (!s) {
          setLoadError("找不到這家店");
          return;
        }
        setShop(s);
        setDrinks(d);
        setIsAnonymous(anon);
        setLastOrderedLabel(lastOrdered);
        setLastDrink(lastDrinkInfo);
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "讀取失敗"));
  }

  useEffect(reload, [viewerId, shopId]);

  useEffect(() => {
    try {
      setFavorite(localStorage.getItem(favoriteKey(shopId)) === "1");
    } catch {
      // 私密瀏覽模式等情境下 localStorage 可能不可用，略過即可。
    }
  }, [shopId]);

  function toggleFavorite() {
    const next = !favorite;
    setFavorite(next);
    try {
      if (next) {
        localStorage.setItem(favoriteKey(shopId), "1");
      } else {
        localStorage.removeItem(favoriteKey(shopId));
      }
    } catch {
      // 忽略寫入失敗；收藏狀態僅存在這個裝置上。
    }
  }

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
      <Link href="/brands" className="text-lg">
        ←
      </Link>

      <div className="flex items-center gap-3">
        <div
          className={`flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl p-2 ${
            shop.logoUrl ? "" : "bg-surface-sunk"
          }`}
        >
          {shop.logoUrl ? (
            <img src={shop.logoUrl} alt={shop.name} className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="text-[11px] text-text-soft">店家 logo</span>
          )}
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-black">{shop.name}</h1>
          {lastOrderedLabel && (
            <span className="mt-1 inline-block rounded-full bg-surface-sunk px-2.5 py-0.5 text-xs text-text-soft">
              {lastOrderedLabel}訂購過
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <Link
          href={`/rounds/new?shopId=${shopId}`}
          className="flex flex-1 items-center justify-center rounded-full bg-accent px-4 py-3 text-sm font-bold text-white"
        >
          用這家開團
        </Link>
        <button
          onClick={toggleFavorite}
          className={`flex flex-shrink-0 items-center gap-1.5 rounded-full border px-4 py-3 text-sm font-bold ${
            favorite ? "border-accent text-accent-strong" : "border-border text-text-soft"
          }`}
        >
          <FaHeart className={favorite ? "text-accent-strong" : "text-border"} />
          {favorite ? "已收藏" : "收藏"}
        </button>
      </div>

      {shop.platforms.length > 0 && (
        <section className="flex flex-col gap-2">
          <p className="text-[13px] font-bold text-text-soft">點餐平台</p>
          <div className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
            {shop.platforms.map((p) => (
              <a
                key={p.id}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3.5 py-3"
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-surface-sunk text-sm font-bold text-text-soft">
                  {PLATFORM_LABELS[p.platform].slice(0, 1)}
                </div>
                <span className="flex-1 truncate font-bold">{PLATFORM_LABELS[p.platform]}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    p.supportsPickup
                      ? "bg-accent-soft text-accent-soft-text"
                      : "bg-surface-sunk text-text-soft"
                  }`}
                >
                  自取
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    p.supportsDelivery
                      ? "bg-accent-soft text-accent-soft-text"
                      : "bg-surface-sunk text-text-soft"
                  }`}
                >
                  外送
                </span>
                <FaArrowUpRightFromSquare className="flex-shrink-0 text-text-soft" size={12} />
              </a>
            ))}
          </div>
        </section>
      )}

      {lastDrink && (
        <div className="rounded-xl bg-accent-soft px-3.5 py-3">
          <p className="text-xs font-bold text-accent-soft-text">我上次點的</p>
          <p className="mt-0.5 text-sm font-bold text-accent-soft-text">
            {lastDrink.drinkName} {lastDrink.sweetness} {lastDrink.ice}
          </p>
        </div>
      )}

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-bold text-text-soft">飲料評價</p>
          <span className="text-xs text-text-soft">依評分排序 ↓</span>
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

        {isAnonymous && <p className="text-xs text-text-soft">綁定帳號（Google 登入）後才能評分</p>}

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
