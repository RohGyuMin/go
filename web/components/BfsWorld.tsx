"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  GRAPH,
  adjacency,
  bfsTrace,
  nodeStateAt,
  type NodeId,
  type NodeState,
} from "@/lib/bfs";
import styles from "./BfsWorld.module.css";

const R = 24;
const STATE_VAR: Record<NodeState, string> = {
  current: "var(--current)",
  queued: "var(--queued)",
  done: "var(--done)",
  undiscovered: "var(--undisc)",
};

function sameEdge(
  e: [NodeId, NodeId] | null,
  u: NodeId,
  v: NodeId,
): boolean {
  return !!e && ((e[0] === u && e[1] === v) || (e[0] === v && e[1] === u));
}

export default function BfsWorld() {
  const [start, setStart] = useState<NodeId>("A");
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1); // 0.5x ~ 2x

  // 시작 노드가 바뀌면 trace 를 새로 계산 (순수 함수 → useMemo)
  const trace = useMemo(() => bfsTrace(GRAPH, start), [start]);
  const adj = useMemo(() => adjacency(GRAPH), []);
  const snap = trace[Math.min(i, trace.length - 1)];

  const clamp = useCallback(
    (n: number) => Math.max(0, Math.min(trace.length - 1, n)),
    [trace.length],
  );
  const go = useCallback((n: number) => setI(clamp(n)), [clamp]);

  // 시작 노드 변경 시 처음으로
  useEffect(() => {
    setI(0);
    setPlaying(false);
  }, [start]);

  // 재생 루프
  useEffect(() => {
    if (!playing) return;
    if (i >= trace.length - 1) {
      setPlaying(false);
      return;
    }
    const id = setTimeout(() => setI((n) => clamp(n + 1)), 700 / speed);
    return () => clearTimeout(id);
  }, [playing, i, speed, trace.length, clamp]);

  // 키보드
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (e.key === "ArrowLeft") go(i - 1);
      else if (e.key === "ArrowRight") go(i + 1);
      else if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [i, go]);

  const nodes = Object.keys(GRAPH.positions);

  return (
    <div className={styles.root}>
      <div className={styles.head}>
        <h1>🌍 BFS 마이크로월드</h1>
        <span className={styles.muted}>
          노드를 클릭해 시작점을 바꾸고 · 슬라이더(또는 ← → , space)로 스크럽하세요
        </span>
      </div>

      <div className={styles.wrap}>
        {/* 그래프 */}
        <div className={styles.card}>
          <svg className={styles.svg} viewBox="0 0 520 420" role="img" aria-label="BFS 그래프">
            {/* 간선 */}
            {GRAPH.edges.map(([u, v]) => {
              const [x1, y1] = GRAPH.positions[u];
              const [x2, y2] = GRAPH.positions[v];
              const hot = sameEdge(snap.edge, u, v);
              const known =
                nodeStateAt(u, snap) !== "undiscovered" &&
                nodeStateAt(v, snap) !== "undiscovered";
              return (
                <line
                  key={`${u}-${v}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={hot ? "var(--edge-hot)" : "var(--edge)"}
                  strokeWidth={hot ? 6 : 3}
                  opacity={hot ? 1 : known ? 0.9 : 0.3}
                />
              );
            })}
            {/* 노드 */}
            {nodes.map((n) => {
              const [x, y] = GRAPH.positions[n];
              const st = nodeStateAt(n, snap);
              const d = snap.dist[n];
              return (
                <g
                  key={n}
                  className={styles.node}
                  onClick={() => setStart(n)}
                >
                  {st === "current" && (
                    <circle className={styles.ring} cx={x} cy={y} r={30} fill="var(--current)" />
                  )}
                  <title>{`${n} — 클릭하면 여기서 BFS 시작`}</title>
                  <circle
                    className={styles.disc}
                    cx={x}
                    cy={y}
                    r={R}
                    fill={STATE_VAR[st]}
                    stroke="rgba(255,255,255,.25)"
                    strokeWidth={3}
                  />
                  <text
                    className={styles.nodeLabel}
                    x={x}
                    y={y + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    {n}
                  </text>
                  <text className={styles.nodeDist} x={x} y={y + R + 14} textAnchor="middle">
                    {d === undefined ? "" : `d=${d}`}
                  </text>
                </g>
              );
            })}
          </svg>

          <div className={styles.legend}>
            <span><span className={styles.dot} style={{ background: "var(--undisc)" }} />미발견</span>
            <span><span className={styles.dot} style={{ background: "var(--queued)" }} />큐 대기</span>
            <span><span className={styles.dot} style={{ background: "var(--current)" }} />현재 방문</span>
            <span><span className={styles.dot} style={{ background: "var(--done)" }} />확정</span>
          </div>
          <p className={styles.hint}>
            시작점: <b>{start}</b> · {start}의 이웃: {adj[start].join(", ")}
          </p>
        </div>

        {/* 패널 */}
        <div className={styles.card}>
          <h2 className={styles.h2}>현재 스텝</h2>
          <div>
            <span className={styles.stepLabel}>{snap.label}</span>
          </div>
          <div className={styles.note}>💬 {snap.note}</div>

          <h2 className={styles.h2} style={{ marginTop: 16 }}>큐 (앞 → 뒤)</h2>
          <div className={styles.chips}>
            {snap.queue.length ? (
              snap.queue.map((n, idx) => (
                <span
                  key={n}
                  className={`${styles.chip} ${idx === 0 ? styles.head0 : ""}`}
                >
                  {n}
                </span>
              ))
            ) : (
              <span className={styles.muted}>(비어 있음)</span>
            )}
          </div>

          <h2 className={styles.h2} style={{ marginTop: 16 }}>
            거리 (시작점 {start}로부터)
          </h2>
          <div className={styles.distGrid}>
            {nodes.map((n) => {
              const d = snap.dist[n];
              return (
                <div key={n} className={`${styles.distCell} ${d === undefined ? styles.inf : ""}`}>
                  <b>{n}</b>
                  {d === undefined ? "∞" : d}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 타임라인 */}
      <div className={styles.bar}>
        <button className={styles.btn} onClick={() => go(i - 1)} title="이전 (←)">◀</button>
        <button
          className={styles.btn}
          onClick={() => {
            if (i >= trace.length - 1) setI(0);
            setPlaying((p) => !p);
          }}
          title="재생/정지 (space)"
        >
          {playing ? "⏸ 정지" : "▶ 재생"}
        </button>
        <button className={styles.btn} onClick={() => go(i + 1)} title="다음 (→)">▶</button>
        <input
          className={styles.slider}
          type="range"
          min={0}
          max={trace.length - 1}
          value={i}
          onChange={(e) => go(Number(e.target.value))}
        />
        <span className={styles.muted}>
          {i + 1} / {trace.length}
        </span>
        <label className={styles.speed}>
          속도
          <input
            type="range"
            min={0.5}
            max={2}
            step={0.5}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
          />
          {speed}×
        </label>
      </div>
    </div>
  );
}
