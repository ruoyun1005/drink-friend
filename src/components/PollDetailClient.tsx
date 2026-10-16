"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useViewer } from "@/hooks/useViewer";
import { createClient } from "@/lib/supabase/client";
import { closePoll, fetchPollDetail, votePoll, type PollDetail } from "@/lib/queries";

export default function PollDetailClient({ pollId }: { pollId: string }) {
  const router = useRouter();
  const { viewerId, loading: viewerLoading, error: viewerError } = useViewer();
  const [poll, setPoll] = useState<PollDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  function reload() {
    if (!viewerId) return Promise.resolve();
    return fetchPollDetail(createClient(), pollId, viewerId)
      .then((p) => {
        if (!p) {
          setLoadError("找不到這個投票，邀請連結可能失效了");
          return;
        }
        setPoll(p);
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "讀取失敗"));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewerId, pollId]);

  async function handleVote(optionId: string) {
    if (!viewerId || !poll || poll.status === "closed") return;
    setBusy(true);
    try {
      await votePoll(createClient(), pollId, optionId, viewerId);
      await reload();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "投票失敗");
    } finally {
      setBusy(false);
    }
  }

  async function handleCloseAndOrder() {
    if (!viewerId || !poll) return;
    setBusy(true);
    try {
      const winner = [...poll.options].sort((a, b) => b.voteCount - a.voteCount)[0];
      await closePoll(createClient(), pollId);
      const circleParam = poll.circleId ? `&circleId=${poll.circleId}` : "";
      router.push(`/rounds/new?shopId=${winner.shopId}${circleParam}`);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "結束投票失敗");
      setBusy(false);
    }
  }

  async function handleCopyInviteLink() {
    const url = `${window.location.origin}/polls/${pollId}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("複製這個投票連結：", url);
    }
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  const error = viewerError ?? loadError;

  if (error) {
    return <p className="py-10 text-center text-sm text-warn-text">{error}</p>;
  }

  if (viewerLoading || poll === null) {
    return <p className="py-10 text-center text-sm text-text-soft">載入中…</p>;
  }

  const isHost = viewerId === poll.hostId;
  const isClosed = poll.status === "closed";
  const maxVotes = Math.max(1, ...poll.options.map((o) => o.voteCount));

  return (
    <div className="flex flex-col gap-4 pb-4">
      <div className="flex items-center gap-2">
        <h1 className="flex-1 truncate text-xl font-bold">{poll.title}</h1>
        <span
          className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
            isClosed ? "bg-surface-sunk text-text-soft" : "bg-accent-soft text-accent-soft-text"
          }`}
        >
          {isClosed ? "投票已結束" : "投票中"}
        </span>
      </div>
      <p className="text-xs text-text-soft">
        {poll.hostNickname} 發起・共 {poll.totalVotes} 票
      </p>

      <div className="flex flex-col gap-2.5">
        {poll.options.map((option) => {
          const pct = Math.round((option.voteCount / maxVotes) * 100);
          const viewerVoted = poll.viewerVotedOptionId === option.id;
          return (
            <button
              key={option.id}
              type="button"
              disabled={busy || isClosed}
              onClick={() => handleVote(option.id)}
              className={`relative overflow-hidden rounded-[18px] border p-3.5 text-left disabled:opacity-100 ${
                viewerVoted ? "border-accent" : "border-border"
              }`}
            >
              <div
                className="absolute inset-y-0 left-0 bg-accent-soft"
                style={{ width: `${option.voteCount > 0 ? pct : 0}%` }}
              />
              <div className="relative flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {option.logoUrl && (
                    <img
                      src={option.logoUrl}
                      alt=""
                      className="h-8 w-8 flex-shrink-0 rounded-lg object-cover"
                    />
                  )}
                  <span className="truncate font-bold">
                    {option.shopName}
                    {viewerVoted && " ✓"}
                  </span>
                </div>
                <span className="flex-shrink-0 text-sm font-bold text-text-soft">
                  {option.voteCount} 票
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {!isClosed && (
        <button
          onClick={handleCopyInviteLink}
          className="self-start text-xs font-bold text-accent-strong underline"
        >
          {linkCopied ? "已複製！" : "複製投票連結邀朋友投票"}
        </button>
      )}

      {isHost && !isClosed && (
        <button
          disabled={busy || poll.totalVotes === 0}
          onClick={handleCloseAndOrder}
          className="rounded-full bg-accent px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
        >
          結束投票，用票數最高的店家開團
        </button>
      )}

      {isClosed && (
        <Link
          href="/"
          className="rounded-full border border-border px-4 py-3 text-center text-sm font-bold"
        >
          回首頁
        </Link>
      )}
    </div>
  );
}
