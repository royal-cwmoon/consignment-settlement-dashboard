import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "위탁업체정산 대시보드",
  description: "위탁업체별 매출이익률·정산금액 현황 및 원인 분석",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
