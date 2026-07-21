import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 서버 없이 정적 파일로 빌드 (GitHub Pages 등 무료 호스팅 가능).
  // `next build` → out/ 폴더에 HTML/CSS/JS 생성.
  output: "export",
};

export default nextConfig;
