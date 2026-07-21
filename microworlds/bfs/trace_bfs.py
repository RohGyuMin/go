#!/usr/bin/env python3
"""BFS(너비 우선 탐색)에 추적(trace)을 심어 마이크로월드용 trace.json 을 생성한다.

축 2(마이크로월드)의 워크플로우 예시:
  1) 관찰할 대상(여기선 BFS)의 핵심 지점에서 상태 스냅샷을 남긴다.
  2) 실행하면 스냅샷 배열(trace.json)이 만들어진다.
  3) index.html(시각적 디버거)이 그 trace 를 타임라인으로 재생한다.

실행:  python3 trace_bfs.py   →  trace.json 생성
"""
import json
from collections import deque

# 무방향 그래프 (index.html 의 노드 좌표와 이름이 일치해야 함)
GRAPH = {
    "A": ["B", "C"],
    "B": ["A", "D"],
    "C": ["A", "D", "E"],
    "D": ["B", "C", "F"],
    "E": ["C", "F"],
    "F": ["D", "E", "G"],
    "G": ["F"],
}
START = "A"

snapshots = []


def snap(label, note, *, current=None, queue=None, visited=None,
         dist=None, edge=None):
    """현재 상태를 스냅샷으로 남긴다. (추적 계측 지점)"""
    snapshots.append({
        "step": len(snapshots),
        "label": label,
        "state": {
            "current": current,
            "queue": list(queue) if queue is not None else [],
            "visited": sorted(visited) if visited is not None else [],
            "dist": dict(dist) if dist is not None else {},
            "edge": edge,  # 지금 살펴보는 간선 [u, v] 또는 None
        },
        "note": note,
    })


def bfs(graph, start):
    visited = {start}
    dist = {start: 0}
    queue = deque([start])
    snap("초기화", f"시작 노드 {start} 를 큐에 넣고 거리 0.",
         queue=queue, visited=visited, dist=dist)

    while queue:
        u = queue.popleft()
        snap(f"방문: {u}", f"큐 앞에서 {u} 를 꺼내 확정한다(거리 {dist[u]}).",
             current=u, queue=queue, visited=visited, dist=dist)

        for v in graph[u]:
            snap(f"간선 검사: {u}–{v}",
                 f"{u} 의 이웃 {v} 를 살펴본다.",
                 current=u, queue=queue, visited=visited, dist=dist, edge=[u, v])
            if v not in visited:
                visited.add(v)
                dist[v] = dist[u] + 1
                queue.append(v)
                snap(f"발견: {v}",
                     f"{v} 는 처음 본다 → 거리 {dist[v]}, 큐에 추가.",
                     current=u, queue=queue, visited=visited, dist=dist, edge=[u, v])
            else:
                snap(f"건너뜀: {v}",
                     f"{v} 는 이미 방문함 → 무시.",
                     current=u, queue=queue, visited=visited, dist=dist, edge=[u, v])

    snap("완료", "큐가 비었다. 모든 노드의 최단 거리(간선 수)를 확정.",
         queue=queue, visited=visited, dist=dist)
    return dist


if __name__ == "__main__":
    bfs(GRAPH, START)
    with open("trace.json", "w", encoding="utf-8") as f:
        json.dump(snapshots, f, ensure_ascii=False, indent=2)
    print(f"✓ trace.json 생성 완료 — 스냅샷 {len(snapshots)}개")
