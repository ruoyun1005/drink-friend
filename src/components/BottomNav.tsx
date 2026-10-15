"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "首頁" },
  { href: "/brands", label: "找品牌" },
] as const;

const navItemsAfterFab = [
  { href: "/circles", label: "續團" },
  { href: "/me", label: "我" },
] as const;

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
  return (
    <Link
      href={href}
      className="flex flex-1 flex-col items-center gap-1 py-1 text-[10.5px]"
      aria-current={active ? "page" : undefined}
    >
      <span
        className={`h-[22px] w-[22px] rounded-[7px] ${active ? "bg-accent-soft" : "bg-surface-sunk"}`}
      />
      <span className={active ? "font-bold text-accent-strong" : "text-text-soft"}>{label}</span>
    </Link>
  );
}

export default function BottomNav() {
  return (
    <nav className="flex items-end justify-between border-t border-border px-1.5 pb-1 pt-2.5">
      {navItems.map((item) => (
        <NavLink key={item.href} {...item} />
      ))}
      <Link
        href="/rounds/new"
        className="-mt-[22px] flex h-[46px] w-[46px] flex-shrink-0 items-center justify-center rounded-full bg-accent text-[22px] font-light text-white shadow-[0_8px_16px_-4px_rgba(0,0,0,0.3)]"
        aria-label="開新團"
      >
        +
      </Link>
      {navItemsAfterFab.map((item) => (
        <NavLink key={item.href} {...item} />
      ))}
    </nav>
  );
}
