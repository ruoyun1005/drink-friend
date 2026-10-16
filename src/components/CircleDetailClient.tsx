"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useViewer } from "@/hooks/useViewer";
import { createClient } from "@/lib/supabase/client";
import { fetchCircleDetail, leaveCircle, type CircleDetail } from "@/lib/queries";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("zh-TW", { month: "numeric", day: "numeric" });
}

export default function CircleDetailClient({ circleId }: { circleId: string }) {
  const router = useRouter();
  const { viewerId, loading: viewerLoading, error: viewerError } = useViewer();
  const [circle, setCircle] = useState<CircleDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!viewerId) return;
    fetchCircleDetail(createClient(), circleId)
      .then((c) => {
        if (!c) {
          setLoadError("找不到這個團友圈");
          return;
        }
        setCircle(c);
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "讀取失敗"));
  }, [viewerId, circleId]);

  async function handleLeave() {
    if (!viewerId) return;
    if (!window.confirm("確定要退出這個團友圈嗎？")) return;
    setLeaving(true);
    try {
      await leaveCircle(createClient(), circleId, viewerId);
      router.push("/circles");
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "退出失敗");
      setLeaving(false);
    }
  }

  const error = viewerError ?? loadError;

  if (error) {
    return <p className="py-10 text-center text-sm text-warn-text">{error}</p>;
  }

  if (viewerLoading || circle === null) {
    return <p className="py-10 text-center text-sm text-text-soft">載入中…</p>;
  }

  return (
    <div className="flex flex-col gap-4 pb-4">
      <div className="flex items-center gap-2">
        <Link href="/circles" className="text-lg">
          ←
        </Link>
        <h1 className="flex-1 truncate text-lg font-bold">{circle.name}</h1>
        <Link
          href={`/polls/new?circleId=${circleId}`}
          className="flex-shrink-0 rounded-full border border-border px-3.5 py-2 text-xs font-bold"
        >
          先投票
        </Link>
        <Link
          href={`/circles/${circleId}/new-round`}
          className="flex-shrink-0 rounded-full bg-accent px-3.5 py-2 text-xs font-bold text-white"
        >
          續團
        </Link>
      </div>

      <section className="flex flex-col gap-2 rounded-[18px] border border-border bg-surface p-3.5">
        <p className="text-[13px] font-bold text-text-soft">成員（{circle.members.length} 人）</p>
        <div className="flex flex-wrap gap-2">
          {circle.members.map((member) => (
            <div key={member.id} className="flex items-center gap-1.5 rounded-full bg-surface-sunk px-2.5 py-1">
              <div
                className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ backgroundColor: member.avatarColor }}
              >
                {member.nickname.slice(0, 1)}
              </div>
              <span className="text-xs">{member.nickname}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <p className="text-[13px] font-bold text-text-soft">歷史團（{circle.rounds.length}）</p>
        {circle.rounds.length === 0 ? (
          <p className="rounded-[18px] border border-dashed border-border px-4 py-8 text-center text-sm text-text-soft">
            還沒有揪過團
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {circle.rounds.map((round) => (
              <Link
                key={round.id}
                href={`/rounds/${round.id}`}
                className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{round.shopName}</p>
                  <p className="text-xs text-text-soft">{formatDate(round.createdAt)}</p>
                </div>
                <span
                  className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    round.status === "open"
                      ? "bg-accent-soft text-accent-soft-text"
                      : "bg-surface-sunk text-text-soft"
                  }`}
                >
                  {round.status === "open" ? "進行中" : "已結單"}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <button
        disabled={leaving}
        onClick={handleLeave}
        className="self-start text-xs font-bold text-warn-text underline disabled:opacity-50"
      >
        退出這個團友圈
      </button>
    </div>
  );
}
