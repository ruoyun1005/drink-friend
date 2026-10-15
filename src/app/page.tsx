import Link from "next/link";
import RoundCard from "@/components/RoundCard";
import { mockCircles, mockRounds } from "@/lib/mockData";

export default function Home() {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] text-text-soft">嗨，嗚嗚</p>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[26px] font-black tracking-tight">今天揪誰喝？</h1>
        <Link
          href="/rounds/new"
          className="flex-shrink-0 whitespace-nowrap rounded-full bg-accent px-4 py-2.5 text-sm font-bold text-white"
        >
          ＋ 開團
        </Link>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between text-[13px] font-bold text-text-soft">
          <span>進行中的團</span>
          <span>{mockRounds.length} 團</span>
        </div>
        <div className="flex flex-col gap-3">
          {mockRounds.map((round) => (
            <RoundCard key={round.id} round={round} />
          ))}
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
          {mockCircles.map((circle) => (
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
                      {member.nickname}
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
          ))}
        </div>
      </section>
    </div>
  );
}
