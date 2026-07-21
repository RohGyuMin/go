"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  EMPTY_STATE,
  PRIORITY_RANK,
  agentRoom,
  depsReady,
  roomsOf,
  type GameState,
  type Priority,
  type Task,
  type TaskStatus,
} from "@/lib/game";
import OfficeMap from "./OfficeMap";
import styles from "./GameOffice.module.css";

const COLS: { key: TaskStatus; label: string; match: (s: TaskStatus) => boolean }[] = [
  { key: "todo", label: "할 일", match: (s) => s === "todo" },
  { key: "doing", label: "진행 중", match: (s) => s === "doing" || s === "blocked" },
  { key: "review", label: "리뷰 대기", match: (s) => s === "review" || s === "approved" },
  { key: "done", label: "완료", match: (s) => s === "done" },
];

function uid(prefix: string) {
  const c = globalThis.crypto;
  return prefix + "_" + (c?.randomUUID ? c.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10));
}

export default function GameOffice() {
  const [state, setState] = useState<GameState>(EMPTY_STATE);
  const [sel, setSel] = useState<string>("nova");
  const [roomId, setRoomId] = useState<string>("");
  const [savedAt, setSavedAt] = useState<string>("");
  const stateRef = useRef(state);
  stateRef.current = state;

  // 서버(공유 상태 파일) 폴링 — Claude Code 가 파일을 바꾸면 여기로 반영된다.
  useEffect(() => {
    let alive = true;
    const pull = async () => {
      try {
        const r = await fetch("/api/state", { cache: "no-store" });
        if (!r.ok) return;
        const s = (await r.json()) as GameState;
        if (alive && s.rev !== stateRef.current.rev) setState(s);
      } catch {
        /* 서버 미기동 등은 무시 */
      }
    };
    pull();
    const id = setInterval(pull, 2000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const save = useCallback(async (next: GameState) => {
    setState(next); // 낙관적 반영
    try {
      const r = await fetch("/api/state", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(next),
      });
      if (r.ok) {
        setState((await r.json()) as GameState);
        setSavedAt(new Date().toLocaleTimeString());
      }
    } catch {
      /* 서버 미기동 시 로컬만 유지 */
    }
  }, []);

  const rooms = useMemo(() => roomsOf(state), [state]);
  // 현재 방: 유효하지 않으면 첫 방으로 보정
  const curRoom = rooms.find((r) => r.id === roomId) ?? rooms[0];
  useEffect(() => {
    if (curRoom && curRoom.id !== roomId) setRoomId(curRoom.id);
  }, [curRoom, roomId]);

  // 현재 방 소속 에이전트 / 그 방의 업무만 보여준다
  const roomAgents = useMemo(
    () => state.agents.filter((a) => agentRoom(a, rooms) === curRoom?.id),
    [state.agents, rooms, curRoom],
  );
  const roomAgentIds = useMemo(() => new Set(roomAgents.map((a) => a.id)), [roomAgents]);
  const roomTasks = useMemo(
    () => state.tasks.filter((t) => roomAgentIds.has(t.assignee)),
    [state.tasks, roomAgentIds],
  );

  const agents = roomAgents;
  const working = state.agents.filter((a) => a.status === "working").length;
  const selAgent = useMemo(() => roomAgents.find((a) => a.id === sel), [roomAgents, sel]);
  // 방을 바꿔 선택 캐릭터가 그 방에 없으면 첫 캐릭터로
  useEffect(() => {
    if (roomAgents.length > 0 && !roomAgents.some((a) => a.id === sel)) setSel(roomAgents[0].id);
  }, [roomAgents, sel]);

  // ── 액션 ──
  const addTask = (
    title: string,
    detail: string,
    assignee: string,
    priority: Priority,
    dependsOn: string[],
  ) => {
    if (!title.trim()) return;
    const task: Task = {
      id: uid("t"),
      title: title.trim(),
      detail: detail.trim(),
      assignee,
      status: "todo",
      priority,
      ...(dependsOn.length ? { dependsOn } : {}),
      createdBy: "player",
    };
    save({ ...state, tasks: [...state.tasks, task] });
  };

  const sendMessage = (text: string) => {
    if (!text.trim() || !selAgent) return;
    save({
      ...state,
      chat: [...state.chat, { id: uid("m"), agent: selAgent.id, from: "player", text: text.trim() }],
    });
  };

  // 리뷰 대기 코드 변경을 사람이 승인 → Claude Code 가 실제로 커밋/PR 한다.
  const approveTask = (id: string) => {
    save({
      ...state,
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, status: "approved" as TaskStatus } : t)),
    });
  };

  const agentName = (id: string) => agents.find((a) => a.id === id)?.name ?? id;

  return (
    <div className={styles.root}>
      <div className={styles.head}>
        <h1>🏢 AI 사무실</h1>
        <span className={styles.muted}>캐릭터에게 업무를 배정하고 대화하세요</span>
        {working > 0 && (
          <span className={styles.workingBadge}>🟠 {working}명 동시 작업 중</span>
        )}
      </div>
      <p className={styles.hint}>
        업무를 만들어 배정한 뒤, <b>Claude Code(나)</b>에게 <code>게임 업무 처리해줘</code> 라고 하면
        내가 <code>web/game/state.json</code>의 대기 업무를 읽어 <b>실제로 저장소에서 일</b>하고
        결과·대화를 도로 씁니다. 이 화면은 2초마다 그 변화를 반영합니다. (API 키·비용 0 · Max 구독 안에서)
      </p>

      {/* 방(팀) 탭 — 팀마다 자기 방·자기 업무 보드 */}
      {rooms.length > 1 && (
        <div className={styles.rooms}>
          {rooms.map((r) => {
            const n = state.agents.filter((a) => agentRoom(a, rooms) === r.id).length;
            return (
              <button
                key={r.id}
                className={`${styles.roomTab} ${r.id === curRoom?.id ? styles.roomActive : ""}`}
                onClick={() => setRoomId(r.id)}
              >
                {r.emoji ? `${r.emoji} ` : ""}{r.name} <span className={styles.roomCount}>{n}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 사무실 2D 맵 — 아바타로 걸어다니며 데스크에서 상호작용 */}
      <div className={styles.mapWrap}>
        <OfficeMap agents={agents} tasks={roomTasks} selected={sel} onSelect={setSel} />
      </div>
      <p className={styles.mapHint}>
        이동 <b>WASD</b>/화살표 · 데스크에 다가가 <b>스페이스</b>로 대화/업무 (데스크 클릭도 가능)
      </p>

      <div className={styles.grid}>
        {/* 업무 보드 */}
        <div>
          <div className={styles.board}>
            {COLS.map((col) => {
              const items = roomTasks
                .filter((t) => col.match(t.status))
                .sort(
                  (a, b) =>
                    PRIORITY_RANK[b.priority ?? "normal"] - PRIORITY_RANK[a.priority ?? "normal"],
                );
              return (
                <div key={col.key} className={styles.col}>
                  <div className={styles.colHead}>
                    <span>{col.label}</span>
                    <span>{items.length}</span>
                  </div>
                  {items.map((t) => {
                    const pr = t.priority ?? "normal";
                    const locked = t.status === "todo" && !depsReady(t, state.tasks);
                    const blockers = (t.dependsOn ?? [])
                      .map((id) => state.tasks.find((x) => x.id === id))
                      .filter((x): x is Task => !!x && x.status !== "done");
                    return (
                    <div key={t.id} className={styles.taskCard}>
                      <div className={styles.taskTitle}>
                        {pr !== "normal" && (
                          <span className={`${styles.prio} ${pr === "high" ? styles.prioHigh : styles.prioLow}`}>
                            {pr === "high" ? "🔴 높음" : "⚪ 낮음"}
                          </span>
                        )}
                        {t.title}
                      </div>
                      <div className={styles.taskMeta}>
                        담당: {agentName(t.assignee)}
                        {t.status === "blocked" ? " · ⛔ 막힘" : ""}
                        {t.status === "review" ? " · 🔎 확인 대기" : ""}
                        {t.status === "approved" ? " · ✅ 승인됨" : ""}
                      </div>
                      {locked && blockers.length > 0 && (
                        <div className={styles.locked}>
                          ⛓️ 대기: {blockers.map((b) => b.title).join(", ")} 완료 후 시작
                        </div>
                      )}
                      {t.result && (
                        <div className={styles.taskResult}>
                          {t.status === "review" ? "📝" : "✅"} {t.result}
                        </div>
                      )}
                      {t.changedFiles && t.changedFiles.length > 0 && (
                        <div className={styles.files}>
                          {t.changedFiles.map((f) => (
                            <span key={f} className={styles.file}>{f}</span>
                          ))}
                        </div>
                      )}
                      {t.status === "review" && (
                        <button className={styles.approveBtn} onClick={() => approveTask(t.id)}>
                          ✅ 승인 (커밋/PR)
                        </button>
                      )}
                      {t.status === "approved" && (
                        <div className={styles.approved}>✅ 승인됨 · Claude Code가 커밋/PR 대기</div>
                      )}
                      {t.prUrl && (
                        <a className={styles.pr} href={t.prUrl} target="_blank" rel="noreferrer">
                          🔗 PR 보기
                        </a>
                      )}
                    </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          <AddTaskForm agents={agents} tasks={roomTasks} onAdd={addTask} />
        </div>

        {/* 채팅 */}
        <div className={styles.chat}>
          <div className={styles.chatHead}>
            <span className={styles.avatar} style={{ fontSize: 22 }}>{selAgent?.emoji ?? "🤖"}</span>
            <b>{selAgent?.name ?? "—"}</b>
            <span className={styles.muted}>· {selAgent?.role ?? ""}</span>
          </div>
          <ChatLog
            messages={state.chat.filter((m) => m.agent === sel)}
            styles={styles}
          />
          <ChatForm onSend={sendMessage} styles={styles} />
        </div>
      </div>

      <p className={styles.status}>{savedAt ? `저장됨 ${savedAt} · rev ${state.rev}` : `rev ${state.rev}`}</p>
    </div>
  );
}

function AddTaskForm({
  agents,
  tasks,
  onAdd,
}: {
  agents: GameState["agents"];
  tasks: Task[];
  onAdd: (title: string, detail: string, assignee: string, priority: Priority, dependsOn: string[]) => void;
}) {
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [assignee, setAssignee] = useState(agents[0]?.id ?? "");
  const [priority, setPriority] = useState<Priority>("normal");
  const [dep, setDep] = useState("");
  useEffect(() => {
    if (!assignee && agents[0]) setAssignee(agents[0].id);
  }, [agents, assignee]);
  // 선행 업무 후보: 아직 완료되지 않은 업무들
  const depChoices = tasks.filter((t) => t.status !== "done");
  return (
    <form
      className={styles.addForm}
      onSubmit={(e) => {
        e.preventDefault();
        onAdd(title, detail, assignee || agents[0]?.id || "", priority, dep ? [dep] : []);
        setTitle("");
        setDetail("");
        setPriority("normal");
        setDep("");
      }}
    >
      <input placeholder="업무 제목 (예: 로그인 버튼 스타일 수정)" value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea placeholder="상세 지시 (선택)" value={detail} onChange={(e) => setDetail(e.target.value)} />
      <div className={styles.row}>
        <select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.emoji} {a.name} · {a.role}
            </option>
          ))}
        </select>
        <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} aria-label="우선순위">
          <option value="high">🔴 높음</option>
          <option value="normal">🟡 보통</option>
          <option value="low">⚪ 낮음</option>
        </select>
      </div>
      <div className={styles.row}>
        <select value={dep} onChange={(e) => setDep(e.target.value)} aria-label="선행 업무">
          <option value="">선행 업무 없음</option>
          {depChoices.map((t) => (
            <option key={t.id} value={t.id}>
              ⛓️ 먼저: {t.title}
            </option>
          ))}
        </select>
        <button className={styles.btnPrimary} type="submit">+ 업무 배정</button>
      </div>
    </form>
  );
}

function ChatLog({
  messages,
  styles,
}: {
  messages: GameState["chat"];
  styles: Record<string, string>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [messages.length]);
  return (
    <div className={styles.log} ref={ref}>
      {messages.length === 0 && <span className={styles.muted}>아직 대화가 없어요. 말을 걸어보세요.</span>}
      {messages.map((m) => (
        <div key={m.id} className={`${styles.msg} ${m.from === "player" ? styles.player : styles.agent}`}>
          {m.text}
        </div>
      ))}
    </div>
  );
}

function ChatForm({
  onSend,
  styles,
}: {
  onSend: (text: string) => void;
  styles: Record<string, string>;
}) {
  const [text, setText] = useState("");
  return (
    <form
      className={styles.chatForm}
      onSubmit={(e) => {
        e.preventDefault();
        onSend(text);
        setText("");
      }}
    >
      <input placeholder="메시지 보내기…" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" />
      <button className={styles.btn} type="submit">보내기</button>
    </form>
  );
}
