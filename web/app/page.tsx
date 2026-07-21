import Link from "next/link";
import BfsWorld from "@/components/BfsWorld";

export default function Home() {
  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: "24px 16px" }}>
      <p style={{ marginBottom: 16 }}>
        <Link href="/game" style={{ color: "#6ea8fe", fontWeight: 700 }}>
          🏢 AI 사무실 (게임) 열기 →
        </Link>
      </p>
      <BfsWorld />
    </main>
  );
}
