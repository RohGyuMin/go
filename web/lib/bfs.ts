// BFS(너비 우선 탐색) — 그래프 정의와 스냅샷(trace) 생성기.
// 순수 함수라서 테스트/재사용이 쉽고, 컴포넌트는 이 결과를 타임라인으로 재생만 한다.

export type NodeId = string;

export interface Graph {
  /** 노드 이름 → SVG 좌표 [x, y] (viewBox 0 0 520 420 기준) */
  positions: Record<NodeId, [number, number]>;
  /** 무방향 간선 목록 */
  edges: [NodeId, NodeId][];
}

export type NodeState = "current" | "queued" | "done" | "undiscovered";

export interface Snapshot {
  step: number;
  label: string;
  note: string;
  current: NodeId | null;
  queue: NodeId[];
  visited: NodeId[];
  dist: Record<NodeId, number>;
  /** 지금 살펴보는 간선 [u, v] (없으면 null) */
  edge: [NodeId, NodeId] | null;
}

export const GRAPH: Graph = {
  positions: {
    A: [90, 80],
    B: [250, 55],
    C: [95, 230],
    D: [275, 175],
    E: [130, 360],
    F: [330, 320],
    G: [470, 300],
  },
  edges: [
    ["A", "B"],
    ["A", "C"],
    ["B", "D"],
    ["C", "D"],
    ["C", "E"],
    ["D", "F"],
    ["E", "F"],
    ["F", "G"],
  ],
};

/** 무방향 인접 리스트 (이름순 정렬로 결정적) */
export function adjacency(graph: Graph): Record<NodeId, NodeId[]> {
  const adj: Record<NodeId, NodeId[]> = {};
  for (const n of Object.keys(graph.positions)) adj[n] = [];
  for (const [u, v] of graph.edges) {
    adj[u].push(v);
    adj[v].push(u);
  }
  for (const n of Object.keys(adj)) adj[n].sort();
  return adj;
}

/** BFS 를 실행하며 각 의미 있는 단계의 상태 스냅샷을 배열로 반환한다. */
export function bfsTrace(graph: Graph, start: NodeId): Snapshot[] {
  const adj = adjacency(graph);
  const snaps: Snapshot[] = [];
  const visited = new Set<NodeId>([start]);
  const dist: Record<NodeId, number> = { [start]: 0 };
  const queue: NodeId[] = [start];

  const snap = (
    label: string,
    note: string,
    extra: Partial<Snapshot> = {},
  ) => {
    snaps.push({
      step: snaps.length,
      label,
      note,
      current: extra.current ?? null,
      queue: [...queue],
      visited: [...visited].sort(),
      dist: { ...dist },
      edge: extra.edge ?? null,
    });
  };

  snap("초기화", `시작 노드 ${start}를 큐에 넣고 거리 0. 여기서부터 가까운 곳부터 물결처럼 퍼진다.`);

  while (queue.length) {
    const u = queue.shift()!;
    snap(`방문: ${u}`, `큐 앞에서 ${u}를 꺼내 확정한다(거리 ${dist[u]}).`, { current: u });

    for (const v of adj[u]) {
      snap(`간선 검사: ${u}–${v}`, `${u}의 이웃 ${v}를 살펴본다.`, {
        current: u,
        edge: [u, v],
      });
      if (!visited.has(v)) {
        visited.add(v);
        dist[v] = dist[u] + 1;
        queue.push(v);
        snap(`발견: ${v}`, `${v}는 처음 본다 → 거리 ${dist[v]}, 큐에 추가.`, {
          current: u,
          edge: [u, v],
        });
      } else {
        snap(`건너뜀: ${v}`, `${v}는 이미 방문함 → 무시(먼저 도달한 경로가 최단).`, {
          current: u,
          edge: [u, v],
        });
      }
    }
  }

  snap("완료", "큐가 비었다. 모든 도달 가능한 노드의 최단 거리(간선 수)가 확정됐다.");
  return snaps;
}

export function nodeStateAt(n: NodeId, s: Snapshot): NodeState {
  if (n === s.current) return "current";
  if (s.queue.includes(n)) return "queued";
  if (s.visited.includes(n)) return "done";
  return "undiscovered";
}
