// AI 사무실 게임 — 공유 상태 타입.
// 브라우저(게임)와 Claude Code(뇌)가 web/game/state.json 을 통해 이 형태를 주고받는다.

export type TaskStatus = "todo" | "doing" | "done" | "blocked";

export interface Agent {
  id: string;
  name: string;
  role: string;
  emoji: string;
  /** idle | working — 지금 일하는 중인지 (UI 애니메이션용) */
  status: "idle" | "working";
}

export interface Task {
  id: string;
  title: string;
  detail: string;
  assignee: string; // Agent.id
  status: TaskStatus;
  /** Claude Code 가 처리 후 채워 넣는 결과 요약 */
  result?: string;
  createdBy: "player" | "agent";
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
