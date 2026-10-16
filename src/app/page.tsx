"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import RoundCard from "@/components/RoundCard";
import { useViewer } from "@/hooks/useViewer";
import { createClient } from "@/lib/supabase/client";
import { fetchViewerCircles, fetchViewerNickname, fetchViewerRounds } from "@/lib/queries";
import type { Circle, Round } from "@/lib/types";

export default function Home() {
  const { viewerId, loading: viewerLoading, error: viewerError } = useViewer();
  const [nickname, setNickname] = useState<string | null>(null);
  const [rounds, setRounds] = useState<Round[] | null>(null);
  const [circles, setCircles] = useState<Circle[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!viewerId) return;
    const supabase = createClient();
    let cancelled = false;

    (async () => {
      try {
        const [n, r, c] = await Promise.all([
          fetchViewerNickname(supabase, viewerId),
          fetchViewerRounds(supabase, viewerId),
          fetchViewerCircles(supabase, viewerId),
        ]);
        if (!cancelled) {
          setNickname(n);
          setRounds(r);
          setCircles(c);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "讀取資料失敗");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [viewerId]);

  const error = viewerError ?? loadError;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-accent">
          <img src="/icon-white.svg" alt="" className="h-5 w-5" />
        </div>
        <span className="text-sm font-black tracking-tight">揪團訂飲料</span>
      </div>
      <p className="text-[13px] text-text-soft">嗨，{nickname ?? "…"}</p>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[26px] font-black tracking-tight">今天揪誰喝？</h1>
        <Link
          href="/rounds/new"
          className="flex-shrink-0 whitespace-nowrap rounded-full bg-accent px-4 py-2.5 text-sm font-bold text-white"
        >
          ＋ 開團
        </Link>
      </div>
      <Link href="/polls/new" className="self-start text-xs font-bold text-accent-strong underline">
        還不知道喝什麼？先開投票
      </Link>

      {error && (
        <p className="rounded-xl bg-warn-soft px-3.5 py-2.5 text-sm text-warn-text">{error}</p>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between text-[13px] font-bold text-text-soft">
          <span>進行中的團</span>
          {rounds && <span>{rounds.length} 團</span>}
        </div>
        <div className="flex flex-col gap-3">
          {viewerLoading || rounds === null ? (
            <p className="py-6 text-center text-sm text-text-soft">載入中…</p>
          ) : rounds.length === 0 ? (
            <p className="rounded-[18px] border border-dashed border-border px-4 py-8 text-center text-sm text-text-soft">
              目前沒有進行中的團，按右上角「＋ 開團」揪第一團吧
            </p>
          ) : (
            rounds.map((round) => <RoundCard key={round.id} round={round} />)
          )}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between text-[13px] font-bold text-text-soft">
          <span>我的團友圈</span>
          <Link href="/circles" className="font-normal text-accent-strong">
            全部 →
          </Link>
        </div>
        <div className="flex flex-col gap-2.5">
          {viewerLoading || circles === null ? null : circles.length === 0 ? (
            <p className="rounded-[18px] border border-dashed border-border px-4 py-8 text-center text-sm text-text-soft">
              還沒有團友圈，第一團結單後會自動組成
            </p>
          ) : (
            circles.map((circle) => (
              <div
                key={circle.id}
                className="flex items-center justify-between gap-3 rounded-[18px] border border-border bg-surface p-3.5"
              >
                <div className="min-w-0">
                  <p className="font-bold">{circle.name}</p>
                  <p className="mt-0.5 text-xs text-text-soft">
                    {circle.memberCount} 人・揪過 {circle.roundCount} 次・{circle.lastActiveLabel}
                  </p>
                  <div className="mt-1.5 flex items-center gap-1">
                    {circle.members.map((member) => (
                      <div
                        key={member.id}
                        className="flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-surface text-[10px] font-bold text-white"
                        style={{ backgroundColor: member.avatarColor }}
                        title={member.nickname}
                      >
                        {member.nickname.slice(0, 1)}
                      </div>
                    ))}
                  </div>
                </div>
                <Link
                  href={`/circles/${circle.id}/new-round`}
                  className="flex-shrink-0 whitespace-nowrap rounded-full bg-warn-soft px-3.5 py-2 text-[13px] font-bold text-warn-text"
                >
                  續團
                </Link>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
