import type { Metadata } from "next";
import { Noto_Sans_TC } from "next/font/google";
import BottomNav from "@/components/BottomNav";
import IosInstallPrompt from "@/components/IosInstallPrompt";
import "./globals.css";

const notoSansTC = Noto_Sans_TC({
  variable: "--font-noto-sans-tc",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
});

export const metadata: Metadata = {
  title: "揪團訂飲料",
  description: "朋友揪團訂飲料：湊免運、追蹤點餐狀態、分帳一次搞定。",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "揪團訂飲料",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-Hant" className={`${notoSansTC.variable} h-full antialiased`}>
      <body className="h-dvh flex flex-col overflow-hidden bg-bg text-text font-sans">
        <div className="flex flex-1 flex-col mx-auto w-full max-w-md min-h-0">
          <main className="flex-1 min-h-0 overflow-y-auto px-5 pt-4 pb-3">
            <IosInstallPrompt />
            {children}
          </main>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
