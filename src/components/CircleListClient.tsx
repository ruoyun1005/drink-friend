"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useViewer } from "@/hooks/useViewer";
import { createClient } from "@/lib/supabase/client";
import { fetchViewerCircles } from "@/lib/queries";
import type { Circle } from "@/lib/types";

export default function CircleListClient() {
  const { viewerId, loading: viewerLoading, error: viewerError } = useViewer();
  const [circles, setCircles] = useState<Circle[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!viewerId) return;
    fetchViewerCircles(createClient(), viewerId)
      .then(setCircles)
      .catch((err) => setLoadError(err instanceof Error ? err.message : "讀取失敗"));
  }, [viewerId]);

  const error = viewerError ?? loadError;

  if (error) {
    return <p className="py-10 text-center text-sm text-warn-text">{error}</p>;
  }

  if (viewerLoading || circles === null) {
    return <p className="py-10 text-center text-sm text-text-soft">載入中…</p>;
  }

  return (
    <div className="flex flex-col gap-4 pb-4">
      <h1 className="text-xl font-bold">團友圈</h1>

      {circles.length === 0 ? (
        <p className="rounded-[18px] border border-dashed border-border px-4 py-8 text-center text-sm text-text-soft">
          還沒有團友圈，第一團結單後會自動組成
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {circles.map((circle) => (
            <Link
              key={circle.id}
              href={`/circles/${circle.id}`}
              className="flex flex-col gap-1.5 rounded-[18px] border border-border bg-surface p-3.5"
            >
              <p className="font-bold">{circle.name}</p>
              <p className="text-xs text-text-soft">
                {circle.memberCount} 人・揪過 {circle.roundCount} 次・{circle.lastActiveLabel}
              </p>
              <div className="flex items-center gap-1">
                {circle.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-surface text-[10px] font-bold text-white"
                    style={{ backgroundColor: member.avatarColor }}
                  >
                    {member.nickname.slice(0, 1)}
                  </div>
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
