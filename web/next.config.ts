import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 게임(AI 사무실)은 API 라우트로 game/state.json 을 읽고/써야 하므로 서버가 필요합니다.
  // 로컬에서 `npm run dev`(또는 `next start`)로 실행합니다.
  //
  // 참고: BFS 마이크로월드만 정적으로 배포하고 싶으면 별도 정적 export 를 구성하면 됩니다
  //       (게임 API 라우트는 정적 export 와 함께 쓸 수 없습니다).
};

export default nextConfig;
