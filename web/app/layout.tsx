import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BFS 마이크로월드",
  description:
    "너비 우선 탐색(BFS)을 타임라인으로 스크럽하며 큐·방문·거리 변화를 관찰하는 인터랙티브 마이크로월드 (Next.js)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
