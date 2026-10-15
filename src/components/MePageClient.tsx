"use client";

import { useEffect, useState } from "react";
import { useViewer } from "@/hooks/useViewer";
import { createClient } from "@/lib/supabase/client";
import {
  fetchUserProfile,
  saveDefaultPaymentAccount,
  updateNickname,
  updatePushEnabled,
  type UserProfile,
} from "@/lib/queries";

export default function MePageClient() {
  const { viewerId, loading: viewerLoading, error: viewerError } = useViewer();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [nicknameInput, setNicknameInput] = useState("");
  const [paymentAccountInput, setPaymentAccountInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!viewerId) return;
    const supabase = createClient();
    fetchUserProfile(supabase, viewerId)
      .then((p) => {
        setProfile(p);
        setNicknameInput(p.nickname);
        setPaymentAccountInput(p.defaultPaymentAccount ?? "");
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "讀取失敗"));
  }, [viewerId]);

  function flashSaved(message: string) {
    setSavedMessage(message);
    setTimeout(() => setSavedMessage(null), 1800);
  }

  async function handleSaveNickname() {
    if (!viewerId || !nicknameInput.trim()) return;
    setBusy(true);
    try {
      await updateNickname(createClient(), viewerId, nicknameInput.trim());
      setProfile((p) => (p ? { ...p, nickname: nicknameInput.trim() } : p));
      flashSaved("暱稱已更新");
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "更新失敗");
    } finally {
      setBusy(false);
    }
  }

  async function handleTogglePush(enabled: boolean) {
    if (!viewerId) return;
    setBusy(true);
    try {
      await updatePushEnabled(createClient(), viewerId, enabled);
      setProfile((p) => (p ? { ...p, pushEnabled: enabled } : p));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "更新失敗");
    } finally {
      setBusy(false);
    }
  }

  async function handleSavePaymentAccount() {
    if (!viewerId || !paymentAccountInput.trim()) return;
    setBusy(true);
    try {
      await saveDefaultPaymentAccount(createClient(), viewerId, paymentAccountInput.trim());
      setProfile((p) => (p ? { ...p, defaultPaymentAccount: paymentAccountInput.trim() } : p));
      flashSaved("收款帳號已更新");
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "更新失敗");
    } finally {
      setBusy(false);
    }
  }

  const error = viewerError ?? loadError;

  if (error) {
    return <p className="py-10 text-center text-sm text-warn-text">{error}</p>;
  }

  if (viewerLoading || profile === null) {
    return <p className="py-10 text-center text-sm text-text-soft">載入中…</p>;
  }

  return (
    <div className="flex flex-col gap-5 pb-4">
      <h1 className="text-xl font-bold">我</h1>

      {savedMessage && (
        <p className="rounded-xl bg-accent-soft px-3.5 py-2 text-sm text-accent-soft-text">
          {savedMessage}
        </p>
      )}

      <section className="flex flex-col gap-1.5">
        <label className="text-[13px] font-bold text-text-soft">暱稱</label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={nicknameInput}
            onChange={(e) => setNicknameInput(e.target.value)}
            className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none"
          />
          <button
            disabled={busy || !nicknameInput.trim() || nicknameInput === profile.nickname}
            onClick={handleSaveNickname}
            className="flex-shrink-0 rounded-full bg-accent px-3.5 py-2.5 text-xs font-bold text-white disabled:opacity-50"
          >
            儲存
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-1.5">
        <label className="text-[13px] font-bold text-text-soft">預設收款帳號</label>
        <p className="text-xs text-text-soft">開新團時會自動帶入，之後可以再改</p>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="銀行與帳號"
            value={paymentAccountInput}
            onChange={(e) => setPaymentAccountInput(e.target.value)}
            className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none placeholder:text-text-soft"
          />
          <button
            disabled={busy || !paymentAccountInput.trim()}
            onClick={handleSavePaymentAccount}
            className="flex-shrink-0 rounded-full bg-accent px-3.5 py-2.5 text-xs font-bold text-white disabled:opacity-50"
          >
            儲存
          </button>
        </div>
      </section>

      <section className="flex items-center justify-between rounded-[18px] border border-border bg-surface p-3.5">
        <div>
          <p className="text-sm font-bold">推播通知</p>
          <p className="mt-0.5 text-xs text-text-soft">iPhone 需先加入主畫面才能收到</p>
        </div>
        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            checked={profile.pushEnabled}
            disabled={busy}
            onChange={(e) => handleTogglePush(e.target.checked)}
            className="peer sr-only"
          />
          <div className="h-6 w-11 rounded-full bg-surface-sunk peer-checked:bg-accent" />
          <div className="absolute left-1 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
        </label>
      </section>
    </div>
  );
}
