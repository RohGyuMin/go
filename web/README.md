# BFS 마이크로월드 (Next.js)

정적 HTML 버전(`../microworlds/bfs/`)을 **Next.js + React 컴포넌트**로 제대로 만든 버전입니다.
BFS(너비 우선 탐색)를 타임라인으로 스크럽하며 큐·방문·거리 변화를 관찰합니다.

## HTML 버전 대비 강화된 점
- **시작 노드 클릭 → 즉시 재탐색** (`useMemo`로 순수 BFS 함수를 재계산)
- 컴포넌트화 + 타입 안전 (`lib/bfs.ts`의 순수 로직 / `components/BfsWorld.tsx`의 UI 분리)
- 재생 **속도 조절**, 부드러운 색 전이(CSS transition), 현재 노드 펄스
- 키보드(← → , space), 라이트/다크 테마 자동

## 개발
```bash
cd web
npm install
npm run dev      # http://localhost:3000
```

## 정적 빌드 (서버 불필요 · 무료 호스팅)
`next.config.ts`에 `output: "export"`를 설정해 정적 파일로 빌드됩니다.
```bash
npm run build    # → out/ 폴더에 HTML/CSS/JS 생성
npx serve out    # 로컬 미리보기 (또는 GitHub Pages 등에 out/ 업로드)
```

## 구조
```
lib/bfs.ts               BFS 그래프 정의 + 스냅샷(trace) 생성기 (순수 함수, 타입 정의)
components/BfsWorld.tsx   인터랙티브 월드 컴포넌트 (SVG 그래프 + 타임라인 + 패널)
components/BfsWorld.module.css
app/page.tsx             페이지 (BfsWorld 렌더)
app/layout.tsx           메타데이터 (시스템 폰트 사용 — 외부 폰트 fetch 없음)
```

> 왜 정적 export? 이 프로젝트는 "서버 없이 무료·오프라인" 원칙을 지킵니다.
> 서버 기능(백엔드·인증·API)이 필요해지면 그때 Next의 서버 기능으로 확장하면 됩니다.
