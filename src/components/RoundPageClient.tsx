"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FaLink } from "react-icons/fa6";
import { FaEdit } from "react-icons/fa";
import { useViewer } from "@/hooks/useViewer";
import { createClient } from "@/lib/supabase/client";
import {
  addComment,
  closeRoundAndFormCircle,
  fetchComments,
  fetchPaymentAccount,
  fetchRoundDetail,
  markOrdered,
  markPaid,
  removeMember,
  savePaymentAccount,
  updateDeadline,
  type CommentItem,
  type RoundDetail,
} from "@/lib/queries";
import { formatCountdown } from "@/lib/formatCountdown";
import { sendPush } from "@/lib/sendPush";

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString("zh-TW", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toLocalInputValue(date: Date) {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function RoundPageClient({ roundId }: { roundId: string }) {
  const { viewerId, loading: viewerLoading, error: viewerError } = useViewer();
  const [round, setRound] = useState<RoundDetail | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [paymentAccount, setPaymentAccount] = useState<string | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [amountInput, setAmountInput] = useState("");
  const [paymentAccountInput, setPaymentAccountInput] = useState("");
  const [commentInput, setCommentInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const closingRef = useRef(false);
  const [editingDeadline, setEditingDeadline] = useState(false);
  const [deadlineInput, setDeadlineInput] = useState("");

  const reload = useCallback(async () => {
    if (!viewerId) return;
    const supabase = createClient();
    try {
      const [r, c, p] = await Promise.all([
        fetchRoundDetail(supabase, roundId),
        fetchComments(supabase, roundId),
        fetchPaymentAccount(supabase, roundId),
      ]);
      setRound(r);
      setComments(c);
      setPaymentAccount(p);
      setPaymentAccountInput(p ?? "");
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "讀取失敗");
    }
  }, [viewerId, roundId]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // 結單時間一到，由團主的瀏覽器觸發：結單並自動組成團友圈（F-40）。
  useEffect(() => {
    if (!viewerId || !round || now === null) return;
    if (round.hostId !== viewerId) return;
    if (round.status !== "open") return;
    if (new Date(round.deadline).getTime() > now) return;
    if (closingRef.current) return;
    closingRef.current = true;

    closeRoundAndFormCircle(createClient(), round.id, `${round.hostNickname} 的團`)
      .then(reload)
      .catch((err) => {
        closingRef.current = false;
        setLoadError(err instanceof Error ? err.message : "結單失敗");
      });
  }, [viewerId, round, now, reload]);

  if (viewerError || loadError) {
    return <p className="py-10 text-center text-sm text-warn-text">{viewerError ?? loadError}</p>;
  }

  if (viewerLoading || round === null) {
    return <p className="py-10 text-center text-sm text-text-soft">載入中…</p>;
  }

  const isHost = viewerId === round.hostId;
  const viewerMember = round.members.find((m) => m.id === viewerId);
  const isClosed = round.status === "closed" || (now !== null && new Date(round.deadline).getTime() <= now);
  const orderedCount = round.members.filter((m) => m.ordered).length;
  const remaining = round.freeShippingThreshold
    ? Math.max(0, round.freeShippingThreshold - round.currentTotal)
    : 0;

  async function handleMarkOrdered() {
    const amount = Number(amountInput);
    if (!viewerId || !Number.isFinite(amount) || amount <= 0) return;
    setBusy(true);
    try {
      await markOrdered(createClient(), roundId, viewerId, amount);
      setAmountInput("");
      await reload();
    } finally {
      setBusy(false);
    }
  }

  async function handleTogglePaid(paid: boolean) {
    if (!viewerId) return;
    setBusy(true);
    try {
      await markPaid(createClient(), roundId, viewerId, paid);
      await reload();
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveMember(memberId: string) {
    setBusy(true);
    try {
      await removeMember(createClient(), roundId, memberId);
      await reload();
    } finally {
      setBusy(false);
    }
  }

  async function handleSavePaymentAccount() {
    if (!paymentAccountInput.trim()) return;
    setBusy(true);
    try {
      await savePaymentAccount(createClient(), roundId, paymentAccountInput.trim());
      await reload();
    } finally {
      setBusy(false);
    }
  }

  function openDeadlineEditor() {
    if (!round) return;
    setDeadlineInput(toLocalInputValue(new Date(round.deadline)));
    setEditingDeadline(true);
  }

  async function handleSaveDeadline() {
    if (!deadlineInput) return;
    setBusy(true);
    try {
      await updateDeadline(createClient(), roundId, new Date(deadlineInput).toISOString());
      setEditingDeadline(false);
      await reload();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "更新結單時間失敗");
    } finally {
      setBusy(false);
    }
  }

  async function handlePostComment(content: string, pushUserIds?: string[]) {
    if (!viewerId || !content.trim()) return;
    setBusy(true);
    try {
      await addComment(createClient(), roundId, viewerId, content.trim());
      setCommentInput("");
      await reload();
      if (round && pushUserIds && pushUserIds.length > 0) {
        sendPush(pushUserIds, round.name, content.trim(), `/rounds/${roundId}`);
      }
    } finally {
      setBusy(false);
    }
  }

  const notOrderedMembers = round.members.filter((m) => !m.ordered);
  const unpaidMembers = round.members.filter((m) => m.ordered && !m.paid);
  const notOrderedNames = notOrderedMembers.map((m) => m.nickname);
  const unpaidNames = unpaidMembers.map((m) => m.nickname);

  async function handleCopyInviteLink() {
    const url = `${window.location.origin}/rounds/${roundId}/join`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("複製這個邀請連結：", url);
    }
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-4 pb-4">
      <div className="flex items-center gap-2">
        <Link href="/" className="text-lg">
          ←
        </Link>
        <h1 className="flex-1 truncate text-lg font-bold">{round.name}</h1>
        <button
          onClick={handleCopyInviteLink}
          className="flex flex-shrink-0 items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs font-bold text-text-soft"
        >
          <FaLink size={11} />
          {linkCopied ? "已複製" : "邀請連結"}
        </button>
        <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-bold text-accent-soft-text">
          {round.mode === "delivery" ? "外送" : "自取"}
        </span>
      </div>

      <section className="flex flex-col gap-2.5 rounded-[18px] border border-border bg-surface p-3.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="font-bold">{round.shopName}</p>
            <p className="text-xs text-text-soft">團主 {round.hostNickname}</p>
          </div>
          <div className="text-right">
            <div className="text-[10.5px] text-text-soft">{isClosed ? "已結單" : "結單倒數"}</div>
            <div className="flex items-center gap-1.5">
              <div className="text-lg font-extrabold tabular-nums text-accent-strong">
                {isClosed || now === null ? (isClosed ? "已結單" : " ") : formatCountdown(round.deadline, now)}
              </div>
              {isHost && !isClosed && (
                <button
                  onClick={openDeadlineEditor}
                  aria-label="改結單時間"
                  className="text-text-soft"
                >
                  <FaEdit size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {isHost && editingDeadline && (
          <div className="flex items-center gap-2 rounded-xl border border-dashed border-border px-3 py-2.5">
            <input
              type="datetime-local"
              value={deadlineInput}
              onChange={(e) => setDeadlineInput(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
            <button
              disabled={busy || !deadlineInput}
              onClick={handleSaveDeadline}
              className="flex-shrink-0 rounded-full bg-accent px-3.5 py-1.5 text-xs font-bold text-white disabled:opacity-50"
            >
              儲存
            </button>
            <button
              onClick={() => setEditingDeadline(false)}
              className="flex-shrink-0 text-xs text-text-soft"
            >
              取消
            </button>
          </div>
        )}

        {round.groupOrderUrl && !isClosed && (
          <a
            href={round.groupOrderUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-accent px-4 py-2.5 text-center text-sm font-bold text-white"
          >
            點我加加 →
          </a>
        )}

        {round.mode === "delivery" ? (
          <div className="flex flex-col gap-1">
            {round.freeShippingThreshold !== undefined && (
              <>
                <div className="h-[7px] overflow-hidden rounded-full bg-surface-sunk">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{
                      width: `${Math.min(100, (round.currentTotal / round.freeShippingThreshold) * 100)}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-text-soft">
                  目前 ${round.currentTotal}
                  {remaining > 0 ? `，還差 $${remaining} 免運` : "，已達免運門檻"}
                </p>
              </>
            )}
            {round.deliverTo && <p className="text-xs text-text-soft">送達地點：{round.deliverTo}</p>}
          </div>
        ) : (
          <p className="text-xs text-text-soft">
            取餐 {round.pickupTime ? formatTimestamp(round.pickupTime) : "未定"}・
            {round.pickupLocation}・取餐人 {round.pickupPerson}
          </p>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between text-[13px] font-bold text-text-soft">
          <span>點餐狀態</span>
          <span>
            {orderedCount}/{round.members.length} 點好了
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          {round.members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                <div
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: member.avatarColor }}
                >
                  {member.nickname.slice(0, 1)}
                </div>
                <span className="truncate text-sm">{member.nickname}</span>
                {member.id === round.hostId && (
                  <span className="flex-shrink-0 text-[10px] text-text-soft">團主</span>
                )}
              </div>
              <div className="flex flex-shrink-0 items-center gap-2 text-xs">
                {member.ordered ? (
                  <span className="rounded-full bg-accent-soft px-2 py-0.5 font-bold text-accent-soft-text">
                    ${member.amount}・{member.paid ? "已付款" : "待付款"}
                  </span>
                ) : (
                  <span className="rounded-full bg-warn-soft px-2 py-0.5 font-bold text-warn-text">
                    還沒點
                  </span>
                )}
                {isHost && member.id !== viewerId && (
                  <button
                    disabled={busy}
                    onClick={() => handleRemoveMember(member.id)}
                    className="text-text-soft underline"
                  >
                    移出
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {viewerMember && !viewerMember.ordered && !isClosed && (
          <div className="flex items-center gap-2 rounded-xl border border-dashed border-border px-3 py-2.5">
            <input
              type="number"
              inputMode="numeric"
              placeholder="點好了，輸入金額"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-text-soft"
            />
            <button
              disabled={busy || !amountInput}
              onClick={handleMarkOrdered}
              className="flex-shrink-0 rounded-full bg-accent px-3.5 py-1.5 text-xs font-bold text-white disabled:opacity-50"
            >
              點好了
            </button>
          </div>
        )}

        {isHost && notOrderedNames.length > 0 && (
          <button
            disabled={busy}
            onClick={() =>
              handlePostComment(
                `提醒：${notOrderedNames.join("、")} 還沒點餐，記得去點喔！`,
                notOrderedMembers.map((m) => m.id),
              )
            }
            className="self-start text-xs font-bold text-accent-strong underline"
          >
            一鍵提醒還沒點的人
          </button>
        )}

        {round.mode === "pickup" && (
          <button
            disabled={busy}
            onClick={() =>
              handlePostComment(
                "🔔 我到店囉，可以來拿飲料了！",
                round.members.filter((m) => m.id !== viewerId).map((m) => m.id),
              )
            }
            className="self-start text-xs font-bold text-accent-strong underline"
          >
            我到店了，發通知
          </button>
        )}
      </section>

      <section className="flex flex-col gap-2 rounded-[18px] border border-border bg-surface p-3.5">
        <p className="text-[13px] font-bold text-text-soft">分帳</p>
        {viewerMember?.ordered ? (
          <>
            <p className="text-sm">
              你應付 <span className="font-bold">${viewerMember.amount}</span>
            </p>
            {paymentAccount ? (
              <p className="text-sm text-text-soft">收款帳號：{paymentAccount}</p>
            ) : isHost ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="輸入你的收款帳號"
                  value={paymentAccountInput}
                  onChange={(e) => setPaymentAccountInput(e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-border bg-bg px-2.5 py-1.5 text-sm outline-none"
                />
                <button
                  disabled={busy}
                  onClick={handleSavePaymentAccount}
                  className="flex-shrink-0 rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-white"
                >
                  儲存
                </button>
              </div>
            ) : (
              <p className="text-sm text-text-soft">團主還沒填收款帳號</p>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={viewerMember.paid}
                disabled={busy}
                onChange={(e) => handleTogglePaid(e.target.checked)}
              />
              我已經付款了
            </label>
          </>
        ) : (
          <p className="text-sm text-text-soft">點好了之後才看得到收款資訊</p>
        )}

        {isHost && unpaidNames.length > 0 && (
          <button
            disabled={busy}
            onClick={() =>
              handlePostComment(
                `提醒：${unpaidNames.join("、")} 還沒付款喔！`,
                unpaidMembers.map((m) => m.id),
              )
            }
            className="self-start text-xs font-bold text-accent-strong underline"
          >
            一鍵提醒未付款的人
          </button>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <p className="text-[13px] font-bold text-text-soft">留言串</p>
        <div className="flex flex-col gap-2">
          {comments.length === 0 ? (
            <p className="py-4 text-center text-sm text-text-soft">還沒有留言</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="rounded-xl bg-surface px-3 py-2 text-sm">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-bold">{comment.nickname}</span>
                  <span className="text-[10px] text-text-soft">{formatTimestamp(comment.createdAt)}</span>
                </div>
                <p className="mt-0.5 whitespace-pre-wrap">{comment.content}</p>
              </div>
            ))
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="幫我多點一杯、我晚點到…"
            value={commentInput}
            onChange={(e) => setCommentInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handlePostComment(commentInput);
            }}
            className="min-w-0 flex-1 rounded-full border border-border bg-surface px-3.5 py-2 text-sm outline-none"
          />
          <button
            disabled={busy || !commentInput.trim()}
            onClick={() => handlePostComment(commentInput)}
            className="flex-shrink-0 rounded-full bg-accent px-3.5 py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            傳送
          </button>
        </div>
      </section>
    </div>
  );
}
