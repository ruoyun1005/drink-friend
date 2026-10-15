"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCountdown } from "@/lib/formatCountdown";
import type { Round } from "@/lib/types";

export default function RoundCard({ round }: { round: Round }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const orderedCount = round.members.filter((m) => m.ordered).length;
  const progressPct = round.freeShippingThreshold
    ? Math.min(100, ((round.currentTotal ?? 0) / round.freeShippingThreshold) * 100)
    : 0;
  const remaining = round.freeShippingThreshold
    ? Math.max(0, round.freeShippingThreshold - (round.currentTotal ?? 0))
    : 0;

  return (
    <Link
      href={`/rounds/${round.id}`}
      className="flex flex-col gap-2.5 rounded-[18px] border border-border bg-surface p-3.5"
    >
      <div className="flex gap-2.5">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-surface-sunk text-[10px] text-text-soft">
          logo
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-base font-bold">{round.name}</span>
            <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-bold text-accent-soft-text">
              {round.mode === "delivery" ? "外送" : "自取"}
            </span>
          </div>
          <p className="mt-0.5 text-[12.5px] text-text-soft">
            {round.shopName}・{round.platform}・團主 {round.hostNickname}
          </p>
        </div>
        <div className="flex-shrink-0 text-right">
          <div className="text-[10.5px] text-text-soft">結單倒數</div>
          <div className="text-[19px] font-extrabold tabular-nums text-accent-strong">
            {now === null ? " " : formatCountdown(round.deadline, now)}
          </div>
        </div>
      </div>

      {round.mode === "delivery" ? (
        <div className="flex flex-col gap-1">
          <div className="h-[7px] overflow-hidden rounded-full bg-surface-sunk">
            <div className="h-full rounded-full bg-accent" style={{ width: `${progressPct}%` }} />
          </div>
          <p className="text-xs text-text-soft">
            目前 ${round.currentTotal}，{remaining > 0 ? `還差 $${remaining} 免運` : "已達免運門檻"}
          </p>
        </div>
      ) : (
        <p className="text-[12.5px] text-text-soft">
          取餐 {round.pickupTime}・{round.pickupLocation}・取餐人 {round.pickupPerson}
        </p>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {round.members.map((member) => (
            <div
              key={member.id}
              className="flex h-[26px] w-[26px] items-center justify-center rounded-full border-2 border-surface text-[11px] font-bold text-white"
              style={{ backgroundColor: member.ordered ? member.avatarColor : "var(--surface-sunk)" }}
              title={member.nickname}
            >
              <span className={member.ordered ? "" : "text-text-soft"}>
                {member.nickname.slice(0, 1)}
              </span>
            </div>
          ))}
          <span className="ml-1 text-xs text-text-soft">
            {orderedCount}/{round.members.length} 點好了
          </span>
        </div>
        <span
          className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${
            round.viewerOrdered
              ? "bg-accent-soft text-accent-soft-text"
              : "bg-warn-soft text-warn-text"
          }`}
        >
          {round.viewerOrdered ? (round.viewerPaid ? "已付款" : "點好了・待付款") : "你還沒點"}
        </span>
      </div>
    </Link>
  );
}
