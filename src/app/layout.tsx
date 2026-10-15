import type { Metadata } from "next";
import { Noto_Sans_TC } from "next/font/google";
import BottomNav from "@/components/BottomNav";
import "./globals.css";

const notoSansTC = Noto_Sans_TC({
  variable: "--font-noto-sans-tc",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
});

export const metadata: Metadata = {
  title: "揪團訂飲料",
  description: "朋友揪團訂飲料：湊免運、追蹤點餐狀態、分帳一次搞定。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-Hant" className={`${notoSansTC.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-bg text-text font-sans">
        <div className="flex flex-1 flex-col mx-auto w-full max-w-md">
          <main className="flex-1 overflow-y-auto px-5 pt-4 pb-3">{children}</main>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
