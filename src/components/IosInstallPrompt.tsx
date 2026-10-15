"use client";

import { useEffect, useState } from "react";

const DISMISSED_KEY = "you-drink:ios-install-dismissed";

export default function IosInstallPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISSED_KEY) === "1";
    } catch {
      // 私密瀏覽模式等情境下 localStorage 可能不可用，當作沒關過。
    }

    if (isIos && !isStandalone && !dismissed) {
      setShow(true);
    }
  }, []);

  function dismiss() {
    setShow(false);
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // 忽略
    }
  }

  if (!show) return null;

  return (
    <div className="mb-3 flex items-start gap-2 rounded-xl border border-border bg-surface px-3.5 py-3 text-sm">
      <span className="text-lg leading-none">⬆️</span>
      <div className="flex-1">
        <p className="font-bold">加入主畫面才能收到推播通知</p>
        <p className="mt-0.5 text-xs text-text-soft">
          點下方分享按鈕 <span className="font-mono">⎋</span> → 「加入主畫面」
        </p>
      </div>
      <button onClick={dismiss} className="flex-shrink-0 text-xs text-text-soft">
        關閉
      </button>
    </div>
  );
}
