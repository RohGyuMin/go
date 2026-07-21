import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { EMPTY_STATE, type GameState } from "@/lib/game";

// 이 라우트가 게임(브라우저)과 Claude Code(뇌) 사이의 다리다.
// - GET  : 현재 공유 상태를 읽어 반환
// - POST : 브라우저가 만든 새 상태를 파일에 저장 (Claude Code 도 이 파일을 직접 편집한다)
export const dynamic = "force-dynamic"; // 항상 파일에서 최신 상태를 읽음

const STATE_PATH = path.join(process.cwd(), "game", "state.json");

async function readState(): Promise<GameState> {
  try {
    const raw = await fs.readFile(STATE_PATH, "utf-8");
    return JSON.parse(raw) as GameState;
  } catch {
    return EMPTY_STATE;
  }
}

export async function GET() {
  return NextResponse.json(await readState());
}

export async function POST(req: Request) {
  const incoming = (await req.json()) as GameState;
  const current = await readState();
  // 아주 단순한 낙관적 병합: 브라우저가 최신 rev 위에서 썼을 때만 반영.
  // (뇌=Claude Code 가 파일을 직접 바꿨다면 rev 가 올라가 있어 브라우저 덮어쓰기를 막는다.)
  if (typeof incoming.rev === "number" && incoming.rev < current.rev) {
    return NextResponse.json(
      { error: "stale", current },
      { status: 409 },
    );
  }
  const next: GameState = { ...incoming, rev: (current.rev ?? 0) + 1 };
  await fs.writeFile(STATE_PATH, JSON.stringify(next, null, 2) + "\n", "utf-8");
  return NextResponse.json(next);
}
