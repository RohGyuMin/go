"use client";

import { useEffect, useRef, useState } from "react";
import type { Agent, Task } from "@/lib/game";

const WORLD = { w: 720, h: 320 };
const DESK_W = 120;
const DESK_H = 74;
const NEAR = 95;

/** 방을 꾸미는 소품들 (좌표는 WORLD 기준). 상호작용 없이 분위기만 낸다. */
const DECOR: { x: number; y: number; emoji: string; label?: string }[] = [
  { x: 40, y: 40, emoji: "🪴" },
  { x: 680, y: 40, emoji: "🪴" },
  { x: 40, y: 285, emoji: "🌿" },
  { x: 680, y: 285, emoji: "🚰", label: "정수기" },
  { x: 360, y: 30, emoji: "📋", label: "화이트보드" },
  { x: 360, y: 292, emoji: "🛋️", label: "라운지" },
  { x: 410, y: 292, emoji: "☕" },
];

interface Props {
  agents: Agent[];
  tasks: Task[];
  selected: string;
  onSelect: (id: string) => void;
}

/** 데스크 좌표: 에이전트 인덱스에 따라 방 안에 배치 */
function deskPos(i: number): [number, number] {
  const perRow = 3;
  const col = i % perRow;
  const row = Math.floor(i / perRow);
  const x = 130 + col * 230;
  const y = 96 + row * 150;
  return [x, y];
}

export default function OfficeMap({ agents, tasks, selected, onSelect }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const player = useRef({ x: WORLD.w / 2, y: WORLD.h - 46, dx: 0, dy: 1 });
  const keys = useRef<Record<string, boolean>>({});
  const [nearId, setNearId] = useState<string | null>(null);
  const nearRef = useRef<string | null>(null);
  nearRef.current = nearId;

  // 최신 props 를 렌더 루프에서 참조하기 위한 ref
  const agentsRef = useRef(agents);
  agentsRef.current = agents;
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;
  const selRef = useRef(selected);
  selRef.current = selected;
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    let last = performance.now();
    let view = { w: WORLD.w, h: WORLD.h };

    const fit = () => {
      const r = canvas.getBoundingClientRect();
      const d = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, r.width * d);
      canvas.height = Math.max(1, r.height * d);
      ctx.setTransform(d, 0, 0, d, 0, 0);
      view = { w: r.width, h: r.height };
    };
    fit();
    window.addEventListener("resize", fit);

    const inputFocused = () => {
      const el = document.activeElement as HTMLElement | null;
      return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA");
    };
    const onKey = (e: KeyboardEvent, down: boolean) => {
      if (inputFocused()) return;
      const k = e.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
      if (down && k === " ") {
        if (nearRef.current) onSelectRef.current(nearRef.current);
        return;
      }
      keys.current[k] = down;
    };
    const kd = (e: KeyboardEvent) => onKey(e, true);
    const ku = (e: KeyboardEvent) => onKey(e, false);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);

    // 데스크 클릭 → 선택
    const onClick = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      const mx = ((e.clientX - r.left) / r.width) * WORLD.w;
      const my = ((e.clientY - r.top) / r.height) * WORLD.h;
      agentsRef.current.forEach((a, i) => {
        const [dx, dy] = deskPos(i);
        if (Math.abs(mx - dx) < DESK_W / 2 + 10 && Math.abs(my - dy) < DESK_H / 2 + 26) {
          onSelectRef.current(a.id);
        }
      });
    };
    canvas.addEventListener("click", onClick);

    const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
    const sx = () => view.w / WORLD.w;
    const sy = () => view.h / WORLD.h;

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const p = player.current;
      let vx = 0, vy = 0;
      const K = keys.current;
      if (K["w"] || K["arrowup"]) vy -= 1;
      if (K["s"] || K["arrowdown"]) vy += 1;
      if (K["a"] || K["arrowleft"]) vx -= 1;
      if (K["d"] || K["arrowright"]) vx += 1;
      if (vx || vy) {
        const l = Math.hypot(vx, vy);
        vx /= l; vy /= l; p.dx = vx; p.dy = vy;
        p.x = clamp(p.x + vx * 190 * dt, 16, WORLD.w - 16);
        p.y = clamp(p.y + vy * 190 * dt, 16, WORLD.h - 16);
      }
      // 근접 데스크 판정
      let near: string | null = null;
      let best = NEAR;
      agentsRef.current.forEach((a, i) => {
        const [dx, dy] = deskPos(i);
        const dist = Math.hypot(dx - p.x, dy + 18 - p.y);
        if (dist < best) { best = dist; near = a.id; }
      });
      if (near !== nearRef.current) setNearId(near);

      render(ctx, view, sx(), sy(), p, near);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    function render(
      ctx: CanvasRenderingContext2D,
      view: { w: number; h: number },
      SX: number,
      SY: number,
      p: { x: number; y: number; dx: number; dy: number },
      near: string | null,
    ) {
      const css = getComputedStyle(canvas);
      const c = (n: string, f: string) => css.getPropertyValue(n).trim() || f;
      ctx.clearRect(0, 0, view.w, view.h);
      // 바닥
      ctx.fillStyle = c("--floor", "#0f1626");
      ctx.fillRect(0, 0, view.w, view.h);
      ctx.strokeStyle = c("--grid", "#1a2540");
      ctx.globalAlpha = 0.6;
      ctx.lineWidth = 1;
      for (let x = 0; x <= WORLD.w; x += 40) {
        ctx.beginPath(); ctx.moveTo(x * SX, 0); ctx.lineTo(x * SX, view.h); ctx.stroke();
      }
      for (let y = 0; y <= WORLD.h; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y * SY); ctx.lineTo(view.w, y * SY); ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // 가운데 러그(카펫) — 작업 구역을 시각적으로 묶어준다
      ctx.fillStyle = "#141d33";
      ctx.globalAlpha = 0.7;
      roundRect(ctx, 96 * SX, 66 * SY, (WORLD.w - 192) * SX, (WORLD.h - 132) * SY, 18 * SX);
      ctx.fill();
      ctx.globalAlpha = 1;

      // 소품(플랜트·화이트보드·정수기·라운지 등)
      DECOR.forEach((d) => {
        const X = d.x * SX, Y = d.y * SY;
        ctx.font = `${24 * SX}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(d.emoji, X, Y);
        if (d.label) {
          ctx.font = `${9.5 * SX}px -apple-system, sans-serif`;
          ctx.fillStyle = c("--muted", "#9aa6bd");
          ctx.fillText(d.label, X, Y + 17 * SY);
        }
      });

      // 방 벽(테두리)
      ctx.strokeStyle = c("--border", "#2a3350");
      ctx.lineWidth = 3;
      roundRect(ctx, 2, 2, view.w - 4, view.h - 4, 12);
      ctx.stroke();

      // 데스크 + 에이전트
      const agents = agentsRef.current;
      agents.forEach((a, i) => {
        const [dx, dy] = deskPos(i);
        const load = tasksRef.current.filter((t) => t.assignee === a.id && t.status !== "done").length;
        const working = a.status === "working";
        const isSel = selRef.current === a.id;
        const isNear = near === a.id;
        const X = dx * SX, Y = dy * SY;
        // 책상 그림자(입체감)
        ctx.fillStyle = "rgba(0,0,0,0.28)";
        roundRect(ctx, X - (DESK_W / 2) * SX, Y - (DESK_H / 2 - 4) * SY, DESK_W * SX, DESK_H * SY, 10 * SX);
        ctx.fill();
        // 책상
        ctx.fillStyle = "#1b2438";
        roundRect(ctx, X - (DESK_W / 2) * SX, Y - (DESK_H / 2) * SY, DESK_W * SX, DESK_H * SY, 10 * SX);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = isSel ? c("--accent", "#6ea8fe") : isNear ? "#c7d2fe" : c("--border", "#2a3350");
        ctx.stroke();
        // 아바타(이모지)
        const bob = working ? Math.sin(performance.now() / 160 + i) * 3 : 0;
        ctx.font = `${28 * SX}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(a.emoji, X, Y - 6 * SY + bob);
        // 이름
        ctx.font = `600 ${12 * SX}px -apple-system, sans-serif`;
        ctx.fillStyle = c("--fg", "#e9edf5");
        ctx.fillText(a.name, X, Y + 20 * SY);
        // 상태 점
        ctx.beginPath();
        ctx.arc(X + (DESK_W / 2 - 12) * SX, Y - (DESK_H / 2 - 12) * SY, 5 * SX, 0, 7);
        ctx.fillStyle = working ? c("--doing", "#f59e0b") : "#5b6b86";
        ctx.fill();
        // 업무 배지
        if (load > 0) {
          ctx.font = `${10 * SX}px -apple-system, sans-serif`;
          ctx.fillStyle = c("--muted", "#9aa6bd");
          ctx.fillText(`업무 ${load}`, X, Y + 33 * SY);
        }
        // 근접 안내
        if (isNear) {
          ctx.font = `${11 * SX}px -apple-system, sans-serif`;
          ctx.fillStyle = c("--accent", "#6ea8fe");
          ctx.fillText("스페이스: 대화/업무", X, Y - (DESK_H / 2 + 10) * SY);
        }
      });

      // 플레이어
      const px = p.x * SX, py = p.y * SY;
      ctx.beginPath();
      ctx.arc(px, py, 11 * SX, 0, 7);
      ctx.fillStyle = c("--player", "#e64980");
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#fff";
      ctx.stroke();
      const ang = Math.atan2(p.dy, p.dx);
      ctx.beginPath();
      ctx.moveTo(px + Math.cos(ang) * 7 * SX, py + Math.sin(ang) * 7 * SX);
      ctx.lineTo(px + Math.cos(ang) * 18 * SX, py + Math.sin(ang) * 18 * SX);
      ctx.strokeStyle = c("--player", "#e64980");
      ctx.lineWidth = 4 * SX;
      ctx.stroke();
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", fit);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      canvas.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", aspectRatio: `${WORLD.w} / ${WORLD.h}`, display: "block", borderRadius: 14, cursor: "pointer" }}
      aria-label="AI 사무실 맵"
    />
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
