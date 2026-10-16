"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useViewer } from "@/hooks/useViewer";
import { createClient } from "@/lib/supabase/client";
import { createShop, fetchShopList, type ShopListItem } from "@/lib/queries";

export default function BrandListClient() {
  const { viewerId, loading: viewerLoading, error: viewerError } = useViewer();
  const [shops, setShops] = useState<ShopListItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [newShopName, setNewShopName] = useState("");
  const [adding, setAdding] = useState(false);

  function reload() {
    if (!viewerId) return;
    fetchShopList(createClient(), viewerId)
      .then(setShops)
      .catch((err) => setLoadError(err instanceof Error ? err.message : "讀取失敗"));
  }

  useEffect(reload, [viewerId]);

  async function handleAddShop() {
    if (!viewerId || !newShopName.trim()) return;
    setAdding(true);
    try {
      await createShop(createClient(), newShopName.trim(), viewerId);
      setNewShopName("");
      reload();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "新增失敗");
    } finally {
      setAdding(false);
    }
  }

  const error = viewerError ?? loadError;

  if (error) {
    return <p className="py-10 text-center text-sm text-warn-text">{error}</p>;
  }

  if (viewerLoading || shops === null) {
    return <p className="py-10 text-center text-sm text-text-soft">載入中…</p>;
  }

  const filtered = shops.filter((s) => s.name.includes(query.trim()));

  return (
    <div className="flex flex-col gap-4 pb-4">
      <h1 className="text-xl font-bold">找品牌</h1>

      <input
        type="text"
        placeholder="搜尋店家"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none placeholder:text-text-soft"
      />

      {filtered.length === 0 ? (
        <p className="rounded-[18px] border border-dashed border-border px-4 py-8 text-center text-sm text-text-soft">
          {shops.length === 0 ? "還沒有店家，新增一個吧" : "找不到符合的店家"}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((shop) => (
            <Link
              key={shop.id}
              href={`/brands/${shop.id}`}
              className="flex flex-col gap-2 overflow-hidden rounded-xl border border-border bg-surface"
            >
              {shop.logoUrl ? (
                <img
                  src={shop.logoUrl}
                  alt={shop.name}
                  className="aspect-square w-full object-cover"
                />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center bg-surface-sunk">
                  <span className="text-[11px] text-text-soft">店家 logo</span>
                </div>
              )}
              <div className="flex flex-col gap-2 px-3 pb-3">
                <span className="truncate font-bold">{shop.name}</span>
                {shop.lastOrderedLabel && (
                  <span className="self-start rounded-full bg-surface-sunk px-2 py-0.5 text-[11px] text-text-soft">
                    {shop.lastOrderedLabel}訂購過
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="找不到？新增店家"
          value={newShopName}
          onChange={(e) => setNewShopName(e.target.value)}
          className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none placeholder:text-text-soft"
        />
        <button
          disabled={adding || !newShopName.trim()}
          onClick={handleAddShop}
          className="flex-shrink-0 rounded-full bg-accent px-3.5 py-2.5 text-xs font-bold text-white disabled:opacity-50"
        >
          新增
        </button>
      </div>
    </div>
  );
}
