"use client";

import { useEffect, useRef } from "react";
import type { Agent, Task } from "@/lib/game";

// 월드(방) 크기 — 카메라 없이 한 화면에 방 하나가 들어온다.
const W = 800;
const H = 480;
const NEAR = 74; // 상호작용 근접 반경(월드 단위)

// Kenney Roguelike Indoors 타일시트 (CC0). 16x16, 1px margin, 27열.
const SHEET = "/assets/kenney/roguelikeIndoor_transparent.png";
const T = 3.1; // 픽셀아트 확대 배율
// 프레임 인덱스 (row*27 + col)
const FR = {
  desk: 112,
  monitor: 129,
  chair: 56,
  plantA: 16,
  plantB: 17,
  shelfO: 23,
  shelfG: 131,
  frameGrn: 343,
  frameCity: 371,
  window: 397,
  sofa: [243, 244, 245],
};

interface Props {
  agents: Agent[];
  tasks: Task[];
  selected: string;
  onSelect: (id: string) => void;
}

const ACCENTS = ["#e8896b", "#6ea8fe", "#63c9a0", "#c98bdb", "#f2b24b", "#7ed4e6"];

/** 데스크 좌표: 방 가운데 영역에 2열로 배치 */
function deskPos(i: number): [number, number] {
  const col = i % 2;
  const row = Math.floor(i / 2);
  return [250 + col * 300, 176 + row * 150];
}

/**
 * Phaser 로 그린 "게임형" 사무실.
 * 바닥/벽/러그는 절차적, 가구·소품·캐릭터 자리는 Kenney(CC0) 픽셀 아트.
 * 시트가 없으면 절차적 책상으로 폴백한다.
 */
export default function OfficePhaser({ agents, tasks, selected, onSelect }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const dataRef = useRef({ agents, tasks, selected, onSelect });
  dataRef.current = { agents, tasks, selected, onSelect };

  useEffect(() => {
    let destroyed = false;
    let game: import("phaser").Game | null = null;

    (async () => {
      const Phaser = (await import("phaser")).default;
      if (destroyed || !hostRef.current) return;

      let hasArt = false;
      let keys: Record<string, import("phaser").Input.Keyboard.Key> = {};
      let spaceKey: import("phaser").Input.Keyboard.Key;
      const player = { x: W / 2, y: 402, dx: 0, dy: 1 };
      let playerObj: import("phaser").GameObjects.Container;
      let hint: import("phaser").GameObjects.Container;
      let ring: import("phaser").GameObjects.Arc;
      let sig = "";
      let nearId: string | null = null;
      const deskObjs: { id: string; container: import("phaser").GameObjects.Container }[] = [];

      const spr = (
        scene: import("phaser").Scene,
        x: number,
        y: number,
        frame: number,
        scale = T,
      ) => scene.add.image(x, y, "indoor", frame).setScale(scale).setDepth(y);

      // ── 바닥·벽·러그 (절차적, 한 텍스처로 굽기) ──
      function bakeRoom(scene: import("phaser").Scene) {
        const g = scene.add.graphics();
        for (let y = 0; y < H; y += 40)
          for (let x = 0; x < W; x += 40) {
            const alt = (x / 40 + y / 40) % 2 === 0;
            g.fillStyle(alt ? 0xc7a672 : 0xbe9c66, 1);
            g.fillRect(x, y, 40, 40);
          }
        g.fillStyle(0x000000, 0.06);
        for (let x = 0; x <= W; x += 40) g.fillRect(x - 1, 0, 2, H);
        // 상단 나무 벽
        g.fillStyle(0x5b4636, 1);
        g.fillRect(0, 0, W, 56);
        g.fillStyle(0x6d5643, 1);
        g.fillRect(0, 48, W, 8);
        g.fillStyle(0x000000, 0.14);
        g.fillRect(0, 56, W, 5);
        g.lineStyle(4, 0x4a3a2c, 1);
        g.strokeRoundedRect(2, 2, W - 4, H - 4, 10);
        // 러그
        g.fillStyle(0x3f6d78, 0.9);
        g.fillRoundedRect(150, 104, W - 300, H - 220, 26);
        g.lineStyle(6, 0xd9c7a0, 0.8);
        g.strokeRoundedRect(164, 118, W - 328, H - 248, 20);
        g.generateTexture("room", W, H);
        g.destroy();
        scene.add.image(W / 2, H / 2, "room").setDepth(-100);
      }

      // 절차적 책상 (폴백용)
      function makeDeskTexture(scene: import("phaser").Scene) {
        if (scene.textures.exists("deskP")) return;
        const g = scene.add.graphics();
        g.fillStyle(0x000000, 0.22);
        g.fillEllipse(60, 66, 120, 22);
        g.fillStyle(0x8a5a3c, 1);
        g.fillRoundedRect(6, 26, 108, 40, 8);
        g.fillStyle(0xa06a45, 1);
        g.fillRoundedRect(6, 26, 108, 12, 8);
        g.fillStyle(0x2b2f3a, 1);
        g.fillRoundedRect(44, 6, 32, 24, 4);
        g.fillStyle(0x8fd0ff, 1);
        g.fillRoundedRect(48, 10, 24, 16, 2);
        g.generateTexture("deskP", 120, 80);
        g.destroy();
      }

      // ── 방 소품 (Kenney 픽셀) ──
      function addDecor(scene: import("phaser").Scene) {
        const label = (x: number, y: number, t: string) =>
          scene.add
            .text(x, y, t, { fontSize: "11px", color: "#efe7d6", fontFamily: "sans-serif" })
            .setOrigin(0.5)
            .setDepth(-40);
        if (hasArt) {
          // 상단 벽 책장 + 액자
          spr(scene, 96, 80, FR.shelfO);
          spr(scene, 148, 80, FR.shelfG);
          spr(scene, 652, 80, FR.shelfG);
          spr(scene, 704, 80, FR.shelfO);
          spr(scene, 300, 34, FR.frameGrn, 2.4).setDepth(-30);
          spr(scene, 400, 34, FR.window, 2.4).setDepth(-30);
          spr(scene, 500, 34, FR.frameCity, 2.4).setDepth(-30);
          // 모서리 화분
          spr(scene, 46, 120, FR.plantA);
          spr(scene, W - 46, 120, FR.plantB);
          spr(scene, 46, H - 70, FR.plantB);
          spr(scene, W - 46, H - 70, FR.plantA);
          // 라운지 소파 (3인)
          FR.sofa.forEach((f, i) => spr(scene, W / 2 - 46 + i * 46, H - 46, f));
          label(W / 2, H - 14, "라운지");
        } else {
          label(W / 2, 30, "(에셋 없음 · 절차적 렌더)");
        }
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
          const parts: import("phaser").GameObjects.GameObject[] = [];

          if (hasArt) {
            parts.push(scene.add.image(0, -32, "indoor", FR.chair).setScale(T)); // 의자(뒤)
          }
          // 캐릭터 몸통(어깨) + 얼굴(이모지)
          parts.push(scene.add.ellipse(0, -14, 34, 24, accent).setStrokeStyle(2, 0x0b1220, 0.35));
          const head = scene.add.text(0, -30, a.emoji, { fontSize: "26px" }).setOrigin(0.5);
          parts.push(head);
          // 책상 (앞) — 캐릭터 하반신을 가려 "앉은" 느낌
          if (hasArt) {
            parts.push(scene.add.image(0, 6, "indoor", FR.desk).setScale(T * 1.15));
            parts.push(scene.add.image(0, -4, "indoor", FR.monitor).setScale(T * 0.72));
          } else {
            parts.push(scene.add.image(0, 6, "deskP").setOrigin(0.5));
          }
          // 이름표
          const nw = Math.max(48, a.name.length * 13 + 16);
          parts.push(scene.add.rectangle(0, 38, nw, 18, 0x10141f, 0.92).setStrokeStyle(1, 0x2a3350));
          parts.push(
            scene.add
              .text(0, 38, a.name, { fontSize: "12px", color: "#e9edf5", fontFamily: "sans-serif", fontStyle: "bold" })
              .setOrigin(0.5),
          );
          // 업무 배지
          if (load > 0) {
            parts.push(scene.add.circle(30, -30, 9, 0xf59e0b).setStrokeStyle(2, 0x0b1220));
            parts.push(
              scene.add
                .text(30, -30, String(load), { fontSize: "11px", color: "#0b1220", fontFamily: "sans-serif", fontStyle: "bold" })
                .setOrigin(0.5),
            );
          }
          // 일하는 중
          if (working) {
            const bubble = scene.add.text(-2, -52, "💻", { fontSize: "16px" }).setOrigin(0.5);
            parts.push(bubble);
            scene.tweens.add({ targets: head, y: -39, duration: 420, yoyo: true, repeat: -1, ease: "Sine.inOut" });
            scene.tweens.add({ targets: bubble, alpha: 0.3, duration: 600, yoyo: true, repeat: -1 });
          }

          const container = scene.add.container(x, y, parts);
          container.setDepth(y);
          deskObjs.push({ id: a.id, container });
        });
      }

      function makePlayer(scene: import("phaser").Scene) {
        const shadow = scene.add.ellipse(0, 20, 30, 12, 0x000000, 0.25);
        const body = scene.add.ellipse(0, 2, 28, 22, 0xe64980).setStrokeStyle(2, 0xffffff, 0.7);
        const head = scene.add.circle(0, -12, 11, 0xffe0bd).setStrokeStyle(2, 0xffffff);
        const face = scene.add.text(0, -12, "🙂", { fontSize: "15px" }).setOrigin(0.5);
        playerObj = scene.add.container(player.x, player.y, [shadow, body, head, face]);
        playerObj.setDepth(player.y);

        const hb = scene.add.rectangle(0, 0, 108, 24, 0x6ea8fe, 0.95).setStrokeStyle(1, 0xffffff);
        const ht = scene.add
          .text(0, 0, "스페이스: 대화/업무", { fontSize: "12px", color: "#06122e", fontFamily: "sans-serif", fontStyle: "bold" })
          .setOrigin(0.5);
        hint = scene.add.container(0, 0, [hb, ht]).setDepth(9999).setVisible(false);

        ring = scene.add.circle(0, 20, 62, 0x6ea8fe, 0).setStrokeStyle(3, 0x6ea8fe, 0.9).setDepth(-50).setVisible(false);
      }

      function sceneSignature() {
        const { agents: ag, tasks: tk, selected: sel } = dataRef.current;
        return ag.map((a) => a.id + a.status).join(",") + "|" + sel + "|" + tk.map((t) => t.assignee + t.status).join(",");
      }

      const config: import("phaser").Types.Core.GameConfig = {
        type: Phaser.CANVAS,
        parent: hostRef.current,
        width: W,
        height: H,
        transparent: true,
        pixelArt: true,
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY },
        scene: {
          preload(this: import("phaser").Scene) {
            this.load.spritesheet("indoor", SHEET, { frameWidth: 16, frameHeight: 16, spacing: 1, margin: 0 });
            this.load.once("loaderror", () => { hasArt = false; });
          },
          create(this: import("phaser").Scene) {
            hasArt = this.textures.exists("indoor");
            makeDeskTexture(this);
            bakeRoom(this);
            addDecor(this);
            buildDesks(this);
            makePlayer(this);
            sig = sceneSignature();

            keys = this.input.keyboard!.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT") as Record<
              string,
              import("phaser").Input.Keyboard.Key
            >;
            spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

            this.input.on("pointerdown", (p: import("phaser").Input.Pointer) => {
              for (let i = 0; i < deskObjs.length; i++) {
                const [dx, dy] = deskPos(i);
                if (Math.abs(p.worldX - dx) < 60 && Math.abs(p.worldY - dy) < 50) {
                  dataRef.current.onSelect(deskObjs[i].id);
                  return;
                }
              }
            });
          },
          update(this: import("phaser").Scene, _t: number, deltaMs: number) {
            const dt = Math.min(0.05, deltaMs / 1000);
            const s = sceneSignature();
            if (s !== sig) { sig = s; buildDesks(this); }

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
              player.y = Phaser.Math.Clamp(player.y + vy * 200 * dt, 72, H - 22);
              playerObj.setPosition(player.x, player.y).setDepth(player.y);
            }

            let near: string | null = null;
            let best = NEAR;
            for (let i = 0; i < deskObjs.length; i++) {
              const [dx, dy] = deskPos(i);
              const d = Phaser.Math.Distance.Between(dx, dy + 10, player.x, player.y);
              if (d < best) { best = d; near = deskObjs[i].id; }
            }
            nearId = near;

            const selId = dataRef.current.selected;
            const showIdx = deskObjs.findIndex((d) => d.id === (near ?? selId));
            if (showIdx >= 0) {
              const [rx, ry] = deskPos(showIdx);
              ring.setPosition(rx, ry + 6).setVisible(true);
              ring.setStrokeStyle(3, near ? 0xc7d2fe : 0x6ea8fe, near ? 1 : 0.5);
            } else ring.setVisible(false);
            if (near) {
              const [hx, hy] = deskPos(deskObjs.findIndex((d) => d.id === near));
              hint.setPosition(hx, hy - 56).setVisible(true);
            } else hint.setVisible(false);

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
