"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useViewer } from "@/hooks/useViewer";
import { createClient } from "@/lib/supabase/client";
import {
  fetchRoundDetail,
  fetchViewerNickname,
  isRoundMember,
  joinRound,
  updateNickname,
  type RoundDetail,
} from "@/lib/queries";

export default function JoinRoundClient({ roundId }: { roundId: string }) {
  const router = useRouter();
  const { viewerId, loading: viewerLoading, error: viewerError } = useViewer();

  const [round, setRound] = useState<RoundDetail | null>(null);
  const [alreadyMember, setAlreadyMember] = useState(false);
  const [nickname, setNickname] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!viewerId) return;
    const supabase = createClient();
    let cancelled = false;

    (async () => {
      try {
        const [r, currentNickname, isMember] = await Promise.all([
          fetchRoundDetail(supabase, roundId),
          fetchViewerNickname(supabase, viewerId),
          isRoundMember(supabase, roundId, viewerId),
        ]);
        if (cancelled) return;

        if (!r) {
          setLoadError("找不到這個團，邀請連結可能失效了");
          return;
        }

        setRound(r);
        setNickname(currentNickname ?? "");

        if (isMember) {
          router.replace(`/rounds/${roundId}`);
          return;
        }
        setAlreadyMember(false);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "讀取失敗");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [viewerId, roundId, router]);

  async function handleJoin() {
    if (!viewerId || !nickname.trim()) return;
    setJoining(true);
    try {
      const supabase = createClient();
      await updateNickname(supabase, viewerId, nickname.trim());
      await joinRound(supabase, roundId, viewerId, round?.circleId);
      router.push(`/rounds/${roundId}`);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "加入失敗");
      setJoining(false);
    }
  }

  const error = viewerError ?? loadError;

  if (error) {
    return <p className="py-10 text-center text-sm text-warn-text">{error}</p>;
  }

  if (viewerLoading || round === null || alreadyMember) {
    return <p className="py-10 text-center text-sm text-text-soft">載入中…</p>;
  }

  return (
    <div className="flex flex-col gap-5 py-6">
      <div className="flex flex-col gap-1 text-center">
        <p className="text-sm text-text-soft">{round.hostNickname} 揪你一起喝</p>
        <h1 className="text-2xl font-black">{round.name}</h1>
      </div>

      <div className="flex flex-col gap-2 rounded-[18px] border border-border bg-surface p-4 text-sm">
        <div className="flex justify-between">
          <span className="text-text-soft">店家</span>
          <span className="font-bold">{round.shopName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-soft">取餐方式</span>
          <span className="font-bold">{round.mode === "delivery" ? "外送" : "自取"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-soft">結單時間</span>
          <span className="font-bold">
            {new Date(round.deadline).toLocaleString("zh-TW", {
              month: "numeric",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-bold text-text-soft">你的暱稱</label>
        <input
          type="text"
          placeholder="輸入暱稱"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none placeholder:text-text-soft"
          autoFocus
        />
      </div>

      <button
        disabled={joining || !nickname.trim()}
        onClick={handleJoin}
        className="rounded-full bg-accent px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
      >
        {joining ? "加入中…" : "加入這一團"}
      </button>
    </div>
  );
}
