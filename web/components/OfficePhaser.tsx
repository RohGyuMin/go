"use client";

import { useEffect, useRef } from "react";
import type { Agent, Task } from "@/lib/game";

// 월드(방) 크기 — 카메라 없이 한 화면에 방 하나가 들어온다.
const W = 800;
const H = 480;
const NEAR = 74; // 상호작용 근접 반경(월드 단위)

interface Props {
  agents: Agent[];
  tasks: Task[];
  selected: string;
  onSelect: (id: string) => void;
}

// 캐릭터 액센트 색 (인덱스별)
const ACCENTS = ["#e8896b", "#6ea8fe", "#63c9a0", "#c98bdb", "#f2b24b", "#7ed4e6"];

/** 데스크 좌표: 방 가운데 영역에 2열로 배치 */
function deskPos(i: number): [number, number] {
  const col = i % 2;
  const row = Math.floor(i / 2);
  return [250 + col * 300, 168 + row * 152];
}

/**
 * Phaser 로 그린 "게임형" 사무실.
 * - 지금은 절차적(코드로 그린) 아트로 동작한다.
 * - `public/assets/kenney/` 에 스프라이트시트를 넣으면 그 픽셀 아트로 교체할 수 있게 설계.
 */
export default function OfficePhaser({ agents, tasks, selected, onSelect }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  // 렌더 루프가 항상 최신 props 를 읽도록 ref 로 넘긴다.
  const dataRef = useRef({ agents, tasks, selected, onSelect });
  dataRef.current = { agents, tasks, selected, onSelect };

  useEffect(() => {
    let destroyed = false;
    let game: import("phaser").Game | null = null;

    (async () => {
      const Phaser = (await import("phaser")).default;
      if (destroyed || !hostRef.current) return;

      // ── 씬 로컬 상태 (클로저) ──
      let keys: Record<string, import("phaser").Input.Keyboard.Key> = {};
      let spaceKey: import("phaser").Input.Keyboard.Key;
      const player = { x: W / 2, y: 400, dx: 0, dy: 1 };
      let playerObj: import("phaser").GameObjects.Container;
      let hint: import("phaser").GameObjects.Container;
      let ring: import("phaser").GameObjects.Arc;
      let deskLayer: import("phaser").GameObjects.Layer;
      let sig = "";
      let nearId: string | null = null;
      const deskObjs: {
        id: string;
        container: import("phaser").GameObjects.Container;
        head: import("phaser").GameObjects.Text;
      }[] = [];

      // 방 배경(바닥·벽·러그·소품)을 하나의 텍스처로 굽는다.
      function bakeRoom(scene: import("phaser").Scene) {
        const g = scene.add.graphics();
        // 바닥 우드 타일 (따뜻한 두 톤)
        for (let y = 0; y < H; y += 40) {
          for (let x = 0; x < W; x += 40) {
            const alt = ((x / 40 + y / 40) % 2) === 0;
            g.fillStyle(alt ? 0xc7a672 : 0xbe9c66, 1);
            g.fillRect(x, y, 40, 40);
          }
        }
        // 판자 이음새
        g.fillStyle(0x000000, 0.06);
        for (let x = 0; x <= W; x += 40) g.fillRect(x - 1, 0, 2, H);
        // 벽 (상단 두꺼운 나무 벽 + 프레임)
        g.fillStyle(0x5b4636, 1);
        g.fillRect(0, 0, W, 54);
        g.fillStyle(0x6d5643, 1);
        g.fillRect(0, 46, W, 8); // 굽도리(밝은 띠)
        g.fillStyle(0x000000, 0.12);
        g.fillRect(0, 54, W, 4); // 벽 그림자
        // 방 테두리
        g.lineStyle(4, 0x4a3a2c, 1);
        g.strokeRoundedRect(2, 2, W - 4, H - 4, 10);
        // 러그 (가운데 작업 구역)
        g.fillStyle(0x3f6d78, 0.9);
        g.fillRoundedRect(150, 96, W - 300, H - 210, 26);
        g.fillStyle(0x000000, 0);
        g.lineStyle(6, 0xd9c7a0, 0.8);
        g.strokeRoundedRect(164, 110, W - 328, H - 238, 20);

        // 화이트보드 (상단 벽)
        g.fillStyle(0xf4f1e8, 1);
        g.fillRoundedRect(W / 2 - 70, 12, 140, 34, 5);
        g.fillStyle(0x6ea8fe, 0.85);
        g.fillRect(W / 2 - 58, 22, 46, 4);
        g.fillRect(W / 2 - 58, 30, 70, 4);
        g.fillStyle(0xe8896b, 0.85);
        g.fillRect(W / 2 + 22, 20, 36, 18);

        // 라운지 소파 + 커피테이블 (하단 중앙)
        drawSofa(g, W / 2, H - 46);
        g.fillStyle(0x6b4a35, 1);
        g.fillRoundedRect(W / 2 - 22, H - 30, 44, 16, 5); // 테이블

        // 화분 (모서리)
        drawPlant(g, 40, 96);
        drawPlant(g, W - 40, 96);
        drawPlant(g, 40, H - 70);
        // 정수기 (우하단)
        drawCooler(g, W - 40, H - 74);

        g.generateTexture("room", W, H);
        g.destroy();
        scene.add.image(W / 2, H / 2, "room").setDepth(-100);

        // 소품 라벨
        const label = (x: number, y: number, t: string) =>
          scene.add
            .text(x, y, t, { fontSize: "11px", color: "#efe7d6", fontFamily: "sans-serif" })
            .setOrigin(0.5)
            .setDepth(-40);
        label(W / 2, 52, "화이트보드");
        label(W / 2, H - 12, "라운지");
        label(W - 40, H - 50, "정수기");
      }

      function drawSofa(g: import("phaser").GameObjects.Graphics, cx: number, cy: number) {
        g.fillStyle(0x000000, 0.18);
        g.fillEllipse(cx, cy + 20, 150, 26); // 그림자
        g.fillStyle(0x8a5d6d, 1);
        g.fillRoundedRect(cx - 66, cy - 20, 132, 40, 12); // 좌석
        g.fillStyle(0x7a4f5f, 1);
        g.fillRoundedRect(cx - 66, cy - 34, 132, 20, 10); // 등받이
        g.fillStyle(0x9a6d7d, 1);
        g.fillRoundedRect(cx - 70, cy - 24, 16, 40, 7); // 팔걸이
        g.fillRoundedRect(cx + 54, cy - 24, 16, 40, 7);
      }

      function drawPlant(g: import("phaser").GameObjects.Graphics, cx: number, cy: number) {
        g.fillStyle(0x000000, 0.18);
        g.fillEllipse(cx, cy + 20, 40, 12);
        g.fillStyle(0x2f8f5b, 1);
        g.fillCircle(cx - 8, cy - 4, 12);
        g.fillCircle(cx + 8, cy - 4, 12);
        g.fillCircle(cx, cy - 16, 13);
        g.fillStyle(0x3fae70, 1);
        g.fillCircle(cx - 3, cy - 9, 7);
        g.fillStyle(0xb5651d, 1); // 화분
        g.fillTriangle(cx - 14, cy + 4, cx + 14, cy + 4, cx + 9, cy + 22);
        g.fillTriangle(cx - 14, cy + 4, cx + 9, cy + 22, cx - 9, cy + 22);
        g.fillStyle(0xc9762a, 1);
        g.fillRect(cx - 15, cy, 30, 7);
      }

      function drawCooler(g: import("phaser").GameObjects.Graphics, cx: number, cy: number) {
        g.fillStyle(0x000000, 0.18);
        g.fillEllipse(cx, cy + 26, 34, 10);
        g.fillStyle(0xdfe7ee, 1);
        g.fillRoundedRect(cx - 13, cy - 6, 26, 34, 5); // 몸통
        g.fillStyle(0x7ec8e3, 0.9);
        g.fillRoundedRect(cx - 11, cy - 26, 22, 22, 8); // 물통
        g.fillStyle(0x5aa7c4, 1);
        g.fillRect(cx - 4, cy + 8, 8, 6); // 꼭지
      }

      // 데스크(책상+모니터) 텍스처
      function makeDeskTexture(scene: import("phaser").Scene) {
        if (scene.textures.exists("desk")) return;
        const g = scene.add.graphics();
        g.fillStyle(0x000000, 0.22);
        g.fillEllipse(60, 66, 120, 22); // 그림자
        g.fillStyle(0x8a5a3c, 1);
        g.fillRoundedRect(6, 26, 108, 40, 8); // 책상 상판
        g.fillStyle(0xa06a45, 1);
        g.fillRoundedRect(6, 26, 108, 12, 8); // 상판 하이라이트
        g.fillStyle(0x2b2f3a, 1);
        g.fillRoundedRect(44, 6, 32, 24, 4); // 모니터 프레임
        g.fillStyle(0x8fd0ff, 1);
        g.fillRoundedRect(48, 10, 24, 16, 2); // 화면
        g.fillStyle(0x1b1f28, 1);
        g.fillRect(58, 30, 4, 6); // 목
        g.fillStyle(0x33384a, 1);
        g.fillRoundedRect(28, 44, 64, 12, 3); // 키보드
        g.generateTexture("desk", 120, 80);
        g.destroy();
      }

      // 캐릭터 몸통 텍스처 (틴트해서 재사용)
      function makeBodyTexture(scene: import("phaser").Scene) {
        if (scene.textures.exists("body")) return;
        const g = scene.add.graphics();
        g.fillStyle(0xffffff, 1);
        g.fillRoundedRect(4, 8, 36, 30, 12); // 몸통
        g.fillRoundedRect(0, 0, 44, 20, 10); // 어깨/의자 등받이 느낌
        g.generateTexture("body", 44, 40);
        g.destroy();
      }

      function buildDesks(scene: import("phaser").Scene) {
        deskObjs.forEach((d) => d.container.destroy());
        deskObjs.length = 0;
        const { agents: ag, tasks: tk } = dataRef.current;
        ag.forEach((a, i) => {
          const [x, y] = deskPos(i);
          const accent = Phaser.Display.Color.HexStringToColor(ACCENTS[i % ACCENTS.length]).color;
          const load = tk.filter((t) => t.assignee === a.id && t.status !== "done").length;
          const working = a.status === "working";

          const desk = scene.add.image(0, 0, "desk").setOrigin(0.5, 0.5);
          const chair = scene.add.image(0, 22, "body").setOrigin(0.5, 0.5).setTint(0x3a3f52).setScale(1.05);
          const body = scene.add.image(0, 6, "body").setOrigin(0.5, 0.5).setTint(accent);
          const head = scene.add
            .text(0, -8, a.emoji, { fontSize: "26px" })
            .setOrigin(0.5, 0.5);
          const nameBg = scene.add
            .rectangle(0, 40, Math.max(48, a.name.length * 13 + 16), 18, 0x10141f, 0.9)
            .setStrokeStyle(1, 0x2a3350);
          const name = scene.add
            .text(0, 40, a.name, { fontSize: "12px", color: "#e9edf5", fontFamily: "sans-serif", fontStyle: "bold" })
            .setOrigin(0.5, 0.5);

          const parts: import("phaser").GameObjects.GameObject[] = [chair, desk, body, head, nameBg, name];
          // 업무 배지
          if (load > 0) {
            const badge = scene.add.circle(26, -20, 9, 0xf59e0b).setStrokeStyle(2, 0x0b1220);
            const bt = scene.add
              .text(26, -20, String(load), { fontSize: "11px", color: "#0b1220", fontFamily: "sans-serif", fontStyle: "bold" })
              .setOrigin(0.5, 0.5);
            parts.push(badge, bt);
          }
          // 일하는 중 표시
          if (working) {
            const bubble = scene.add
              .text(0, -34, "💻", { fontSize: "16px" })
              .setOrigin(0.5, 0.5);
            parts.push(bubble);
            scene.tweens.add({ targets: head, y: -13, duration: 420, yoyo: true, repeat: -1, ease: "Sine.inOut" });
            scene.tweens.add({ targets: bubble, alpha: 0.3, duration: 600, yoyo: true, repeat: -1 });
          }

          const container = scene.add.container(x, y, parts).setSize(120, 90);
          container.setDepth(y);
          deskObjs.push({ id: a.id, container, head });
        });
      }

      function makePlayer(scene: import("phaser").Scene) {
        const shadow = scene.add.ellipse(0, 20, 30, 12, 0x000000, 0.25);
        const body = scene.add.image(0, 4, "body").setTint(0xe64980).setScale(0.95);
        const head = scene.add.circle(0, -12, 11, 0xffe0bd).setStrokeStyle(2, 0xffffff);
        const face = scene.add.text(0, -12, "🙂", { fontSize: "15px" }).setOrigin(0.5, 0.5);
        playerObj = scene.add.container(player.x, player.y, [shadow, body, head, face]);
        playerObj.setDepth(player.y);

        // 상호작용 힌트 (근처 데스크 위에 뜸)
        const hb = scene.add.rectangle(0, 0, 108, 24, 0x6ea8fe, 0.95).setStrokeStyle(1, 0xffffff);
        const ht = scene.add
          .text(0, 0, "스페이스: 대화/업무", { fontSize: "12px", color: "#06122e", fontFamily: "sans-serif", fontStyle: "bold" })
          .setOrigin(0.5, 0.5);
        hint = scene.add.container(0, 0, [hb, ht]).setDepth(9999);
        hint.setVisible(false);

        ring = scene.add.circle(0, 24, 66, 0x6ea8fe, 0).setStrokeStyle(3, 0x6ea8fe, 0.9).setDepth(-50);
        ring.setVisible(false);
      }

      function sceneSignature() {
        const { agents: ag, tasks: tk, selected: sel } = dataRef.current;
        return (
          ag.map((a) => a.id + a.status).join(",") +
          "|" + sel +
          "|" + tk.map((t) => t.assignee + t.status).join(",")
        );
      }

      const config: import("phaser").Types.Core.GameConfig = {
        type: Phaser.CANVAS, // 헤드리스/호환성 위해 캔버스 렌더러
        parent: hostRef.current,
        width: W,
        height: H,
        transparent: true,
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY },
        scene: {
          create(this: import("phaser").Scene) {
            makeDeskTexture(this);
            makeBodyTexture(this);
            bakeRoom(this);
            deskLayer = this.add.layer();
            buildDesks(this);
            makePlayer(this);
            sig = sceneSignature();

            keys = this.input.keyboard!.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT") as Record<
              string,
              import("phaser").Input.Keyboard.Key
            >;
            spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

            // 데스크 클릭 → 선택
            this.input.on("pointerdown", (p: import("phaser").Input.Pointer) => {
              for (let i = 0; i < deskObjs.length; i++) {
                const [dx, dy] = deskPos(i);
                if (Math.abs(p.worldX - dx) < 62 && Math.abs(p.worldY - dy) < 50) {
                  dataRef.current.onSelect(deskObjs[i].id);
                  return;
                }
              }
            });
          },
          update(this: import("phaser").Scene, _t: number, deltaMs: number) {
            const dt = Math.min(0.05, deltaMs / 1000);
            // 데이터 변화 → 데스크 재구성
            const s = sceneSignature();
            if (s !== sig) {
              sig = s;
              buildDesks(this);
            }

            // 입력 포커스 중엔 이동 잠금 (채팅 입력 등)
            const el = document.activeElement as HTMLElement | null;
            const typing = !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA");
            let vx = 0, vy = 0;
            if (!typing) {
              if (keys.W?.isDown || keys.UP?.isDown) vy -= 1;
              if (keys.S?.isDown || keys.DOWN?.isDown) vy += 1;
              if (keys.A?.isDown || keys.LEFT?.isDown) vx -= 1;
              if (keys.D?.isDown || keys.RIGHT?.isDown) vx += 1;
            }
            if (vx || vy) {
              const l = Math.hypot(vx, vy);
              vx /= l; vy /= l;
              player.dx = vx; player.dy = vy;
              player.x = Phaser.Math.Clamp(player.x + vx * 200 * dt, 30, W - 30);
              player.y = Phaser.Math.Clamp(player.y + vy * 200 * dt, 70, H - 22);
              playerObj.setPosition(player.x, player.y);
              playerObj.setDepth(player.y);
            }

            // 근접 데스크 판정
            let near: string | null = null;
            let best = NEAR;
            for (let i = 0; i < deskObjs.length; i++) {
              const [dx, dy] = deskPos(i);
              const d = Phaser.Math.Distance.Between(dx, dy + 18, player.x, player.y);
              if (d < best) { best = d; near = deskObjs[i].id; }
            }
            nearId = near;

            // 선택/근접 링 + 힌트
            const selId = dataRef.current.selected;
            const showIdx = deskObjs.findIndex((d) => d.id === (near ?? selId));
            if (showIdx >= 0) {
              const [rx, ry] = deskPos(showIdx);
              ring.setPosition(rx, ry + 18).setVisible(true);
              ring.setStrokeStyle(3, near ? 0xc7d2fe : 0x6ea8fe, near ? 1 : 0.5);
            } else {
              ring.setVisible(false);
            }
            if (near) {
              const [hx, hy] = deskPos(deskObjs.findIndex((d) => d.id === near));
              hint.setPosition(hx, hy - 48).setVisible(true);
            } else {
              hint.setVisible(false);
            }

            if (spaceKey && Phaser.Input.Keyboard.JustDown(spaceKey) && nearId) {
              dataRef.current.onSelect(nearId);
            }
          },
        },
      };

      game = new Phaser.Game(config);
    })();

    return () => {
      destroyed = true;
      game?.destroy(true);
    };
  }, []);

  return (
    <div
      ref={hostRef}
      style={{ width: "100%", aspectRatio: `${W} / ${H}`, borderRadius: 14, overflow: "hidden" }}
      aria-label="AI 사무실 맵 (Phaser)"
    />
  );
}
