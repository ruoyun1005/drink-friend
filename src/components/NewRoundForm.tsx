"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useViewer } from "@/hooks/useViewer";
import { createClient } from "@/lib/supabase/client";
import {
  createRound,
  createShop,
  fetchCircleNotifyCandidates,
  fetchShops,
  type NotifyCandidate,
  type Platform,
  type ShopOption,
} from "@/lib/queries";
import type { PickupMode } from "@/lib/types";

const PLATFORM_LABELS: Record<Platform, string> = {
  you_order: "你訂",
  uber_eats: "Uber Eats",
  foodpanda: "foodpanda",
  shop_own: "店家自有平台",
};

function toLocalInputValue(date: Date) {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function NewRoundForm({
  circleId,
  initialShopId,
}: {
  circleId?: string;
  initialShopId?: string;
}) {
  const router = useRouter();
  const { viewerId, loading: viewerLoading, error: viewerError } = useViewer();

  const [shops, setShops] = useState<ShopOption[] | null>(null);
  const [shopId, setShopId] = useState(initialShopId ?? "");
  const [newShopName, setNewShopName] = useState("");
  const [platform, setPlatform] = useState<Platform>("you_order");
  const [groupOrderUrl, setGroupOrderUrl] = useState("");
  const [mode, setMode] = useState<PickupMode>("delivery");

  const inOneHour = toLocalInputValue(new Date(Date.now() + 60 * 60 * 1000));
  const [deadline, setDeadline] = useState(inOneHour);

  const [freeShippingThreshold, setFreeShippingThreshold] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("");
  const [deliverTo, setDeliverTo] = useState("");

  const [pickupTime, setPickupTime] = useState(inOneHour);
  const [pickupLocation, setPickupLocation] = useState("");
  const [pickupPerson, setPickupPerson] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [notifyCandidates, setNotifyCandidates] = useState<NotifyCandidate[] | null>(null);
  const [notifySelection, setNotifySelection] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!viewerId) return;
    const supabase = createClient();
    fetchShops(supabase)
      .then(setShops)
      .catch((err) => setError(err instanceof Error ? err.message : "讀取店家失敗"));

    if (circleId) {
      fetchCircleNotifyCandidates(supabase, circleId, viewerId)
        .then((candidates) => {
          setNotifyCandidates(candidates);
          setNotifySelection(new Set(candidates.map((c) => c.id)));
        })
        .catch((err) => setError(err instanceof Error ? err.message : "讀取團友圈成員失敗"));
    }
  }, [viewerId, circleId]);

  function toggleNotify(memberId: string) {
    setNotifySelection((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  }

  const canSubmit =
    !!viewerId &&
    (shopId || newShopName.trim()) &&
    groupOrderUrl.trim() &&
    deadline &&
    (mode === "delivery" ? true : pickupLocation.trim() && pickupPerson.trim());

  async function handleSubmit() {
    if (!viewerId || !canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();
      const finalShopId = shopId || (await createShop(supabase, newShopName.trim(), viewerId));

      const roundId = await createRound(supabase, {
        hostId: viewerId,
        shopId: finalShopId,
        platform,
        groupOrderUrl: groupOrderUrl.trim(),
        mode,
        deadlineAt: new Date(deadline).toISOString(),
        circleId,
        freeShippingThreshold:
          mode === "delivery" && freeShippingThreshold ? Number(freeShippingThreshold) : undefined,
        deliveryFee: mode === "delivery" && deliveryFee ? Number(deliveryFee) : undefined,
        deliverTo: mode === "delivery" ? deliverTo.trim() || undefined : undefined,
        pickupTime: mode === "pickup" ? new Date(pickupTime).toISOString() : undefined,
        pickupLocation: mode === "pickup" ? pickupLocation.trim() : undefined,
        pickupPerson: mode === "pickup" ? pickupPerson.trim() : undefined,
        notifyMemberIds: circleId ? Array.from(notifySelection) : undefined,
      });

      router.push(`/rounds/${roundId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "開團失敗");
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
      <h1 className="text-xl font-bold">開團</h1>

      {displayError && (
        <p className="rounded-xl bg-warn-soft px-3.5 py-2.5 text-sm text-warn-text">{displayError}</p>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-bold text-text-soft">店家</label>
        <select
          value={shopId}
          onChange={(e) => setShopId(e.target.value)}
          className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm"
        >
          <option value="">— 選擇店家 —</option>
          {shops.map((shop) => (
            <option key={shop.id} value={shop.id}>
              {shop.name}
            </option>
          ))}
        </select>
        {!shopId && (
          <input
            type="text"
            placeholder="找不到？輸入新店家名稱"
            value={newShopName}
            onChange={(e) => setNewShopName(e.target.value)}
            className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none placeholder:text-text-soft"
          />
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-bold text-text-soft">點餐平台</label>
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value as Platform)}
          className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm"
        >
          {(Object.keys(PLATFORM_LABELS) as Platform[]).map((p) => (
            <option key={p} value={p}>
              {PLATFORM_LABELS[p]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-bold text-text-soft">揪團連結</label>
        <input
          type="url"
          placeholder="https://…"
          value={groupOrderUrl}
          onChange={(e) => setGroupOrderUrl(e.target.value)}
          className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none placeholder:text-text-soft"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-bold text-text-soft">取餐方式</label>
        <div className="flex gap-2">
          <button
            onClick={() => setMode("delivery")}
            className={`flex-1 rounded-full border px-3 py-2 text-sm font-bold ${
              mode === "delivery"
                ? "border-accent bg-accent-soft text-accent-soft-text"
                : "border-border bg-surface text-text-soft"
            }`}
          >
            外送
          </button>
          <button
            onClick={() => setMode("pickup")}
            className={`flex-1 rounded-full border px-3 py-2 text-sm font-bold ${
              mode === "pickup"
                ? "border-accent bg-accent-soft text-accent-soft-text"
                : "border-border bg-surface text-text-soft"
            }`}
          >
            自取
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-bold text-text-soft">結單時間</label>
        <input
          type="datetime-local"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm"
        />
      </div>

      {mode === "delivery" ? (
        <>
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-[13px] font-bold text-text-soft">免運門檻</label>
              <input
                type="number"
                inputMode="numeric"
                placeholder="500"
                value={freeShippingThreshold}
                onChange={(e) => setFreeShippingThreshold(e.target.value)}
                className="w-full min-w-0 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none placeholder:text-text-soft"
              />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-[13px] font-bold text-text-soft">運費</label>
              <input
                type="number"
                inputMode="numeric"
                placeholder="0"
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(e.target.value)}
                className="w-full min-w-0 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none placeholder:text-text-soft"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-text-soft">送達地點</label>
            <input
              type="text"
              placeholder="信義松仁路…"
              value={deliverTo}
              onChange={(e) => setDeliverTo(e.target.value)}
              className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none placeholder:text-text-soft"
            />
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-text-soft">取餐時間</label>
            <input
              type="datetime-local"
              value={pickupTime}
              onChange={(e) => setPickupTime(e.target.value)}
              className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-text-soft">取餐地點</label>
            <input
              type="text"
              placeholder="50嵐信義松仁店"
              value={pickupLocation}
              onChange={(e) => setPickupLocation(e.target.value)}
              className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none placeholder:text-text-soft"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-text-soft">取餐人</label>
            <input
              type="text"
              placeholder="誰負責去拿？"
              value={pickupPerson}
              onChange={(e) => setPickupPerson(e.target.value)}
              className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none placeholder:text-text-soft"
            />
          </div>
        </>
      )}

      {circleId && notifyCandidates !== null && notifyCandidates.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-bold text-text-soft">要通知誰？</label>
          <div className="flex flex-col gap-1.5">
            {notifyCandidates.map((member) => (
              <label
                key={member.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3 py-2.5"
              >
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={notifySelection.has(member.id)}
                    onChange={() => toggleNotify(member.id)}
                  />
                  <span className="text-sm">{member.nickname}</span>
                </span>
                <span className="text-[11px] text-text-soft">
                  {member.pushEnabled ? "已開推播" : "未開推播・需私訊連結"}
                </span>
              </label>
            ))}
          </div>
          <p className="text-xs text-text-soft">
            勾選的人會直接加入這一團；沒開推播的人記得開團後用「邀請連結」私訊給他們。
          </p>
        </div>
      )}

      <button
        disabled={!canSubmit || submitting}
        onClick={handleSubmit}
        className="rounded-full bg-accent px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
      >
        {submitting ? "開團中…" : "開團"}
      </button>
    </div>
  );
}
