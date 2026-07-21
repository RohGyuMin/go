// AI 사무실 게임 — 공유 상태 타입.
// 브라우저(게임)와 Claude Code(뇌)가 web/game/state.json 을 통해 이 형태를 주고받는다.

// todo → doing → review(코드 변경됨, 사람 확인 대기)
//                     → approved(사람이 승인, 커밋/PR 대기) → done
// (막히면 blocked)
export type TaskStatus = "todo" | "doing" | "review" | "approved" | "done" | "blocked";

export interface Agent {
  id: string;
  name: string;
  role: string;
  emoji: string;
  /** idle | working — 지금 일하는 중인지 (UI 애니메이션용) */
  status: "idle" | "working";
}

/** 업무 우선순위 — 높을수록 먼저 처리한다. */
export type Priority = "high" | "normal" | "low";

export interface Task {
  id: string;
  title: string;
  detail: string;
  assignee: string; // Agent.id
  status: TaskStatus;
  /** 우선순위 (없으면 normal 로 취급) */
  priority?: Priority;
  /** 이 업무보다 먼저 done 이어야 하는 선행 업무 id 들 */
  dependsOn?: string[];
  /** Claude Code 가 처리 후 채워 넣는 결과 요약 */
  result?: string;
  /** 실제 저장소에서 바뀐 파일 목록 (review/done 일 때). 사람이 확인 후 커밋한다. */
  changedFiles?: string[];
  /** 커밋/PR 이 만들어졌으면 링크 */
  prUrl?: string;
  createdBy: "player" | "agent";
}

/** 우선순위 정렬용 가중치 (클수록 먼저) */
export const PRIORITY_RANK: Record<Priority, number> = { high: 2, normal: 1, low: 0 };

/** 이 업무의 선행 업무가 모두 done 이면 true (없으면 항상 true) */
export function depsReady(task: Task, all: Task[]): boolean {
  if (!task.dependsOn || task.dependsOn.length === 0) return true;
  return task.dependsOn.every((id) => all.find((t) => t.id === id)?.status === "done");
}

export interface ChatMessage {
  id: string;
  agent: string; // 어느 캐릭터와의 대화인지 (Agent.id)
  from: "player" | "agent";
  text: string;
}

export interface GameState {
  agents: Agent[];
  tasks: Task[];
  chat: ChatMessage[];
  /** 낙관적 동시성/디버그용 단조 증가 버전 */
  rev: number;
}

export const EMPTY_STATE: GameState = { agents: [], tasks: [], chat: [], rev: 0 };
