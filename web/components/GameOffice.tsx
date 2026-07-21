"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  EMPTY_STATE,
  type GameState,
  type Task,
  type TaskStatus,
} from "@/lib/game";
import styles from "./GameOffice.module.css";

const COLS: { key: TaskStatus; label: string; match: (s: TaskStatus) => boolean }[] = [
  { key: "todo", label: "할 일", match: (s) => s === "todo" },
  { key: "doing", label: "진행 중", match: (s) => s === "doing" || s === "blocked" },
  { key: "review", label: "리뷰 대기", match: (s) => s === "review" },
  { key: "done", label: "완료", match: (s) => s === "done" },
];

function uid(prefix: string) {
  const c = globalThis.crypto;
  return prefix + "_" + (c?.randomUUID ? c.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10));
}

export default function GameOffice() {
  const [state, setState] = useState<GameState>(EMPTY_STATE);
  const [sel, setSel] = useState<string>("nova");
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

  const agents = state.agents;
  const selAgent = useMemo(() => agents.find((a) => a.id === sel), [agents, sel]);

  // ── 액션 ──
  const addTask = (title: string, detail: string, assignee: string) => {
    if (!title.trim()) return;
    const task: Task = {
      id: uid("t"),
      title: title.trim(),
      detail: detail.trim(),
      assignee,
      status: "todo",
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

  const agentName = (id: string) => agents.find((a) => a.id === id)?.name ?? id;

  return (
    <div className={styles.root}>
      <div className={styles.head}>
        <h1>🏢 AI 사무실</h1>
        <span className={styles.muted}>캐릭터에게 업무를 배정하고 대화하세요</span>
      </div>
      <p className={styles.hint}>
        업무를 만들어 배정한 뒤, <b>Claude Code(나)</b>에게 <code>게임 업무 처리해줘</code> 라고 하면
        내가 <code>web/game/state.json</code>의 대기 업무를 읽어 <b>실제로 저장소에서 일</b>하고
        결과·대화를 도로 씁니다. 이 화면은 2초마다 그 변화를 반영합니다. (API 키·비용 0 · Max 구독 안에서)
      </p>

      {/* 사무실: 에이전트 데스크 */}
      <div className={styles.office}>
        {agents.map((a) => {
          const load = state.tasks.filter((t) => t.assignee === a.id && t.status !== "done").length;
          return (
            <div
              key={a.id}
              className={`${styles.desk} ${sel === a.id ? styles.sel : ""}`}
              onClick={() => setSel(a.id)}
            >
              <span className={`${styles.avatar} ${a.status === "working" ? styles.working : ""}`}>
                {a.emoji}
              </span>
              <div className={styles.deskName}>{a.name}</div>
              <div className={styles.deskRole}>{a.role}</div>
              <span className={`${styles.badge} ${a.status === "working" ? styles.working : styles.idle}`}>
                {a.status === "working" ? "일하는 중…" : `대기 · 업무 ${load}`}
              </span>
            </div>
          );
        })}
      </div>

      <div className={styles.grid}>
        {/* 업무 보드 */}
        <div>
          <div className={styles.board}>
            {COLS.map((col) => {
              const items = state.tasks.filter((t) => col.match(t.status));
              return (
                <div key={col.key} className={styles.col}>
                  <div className={styles.colHead}>
                    <span>{col.label}</span>
                    <span>{items.length}</span>
                  </div>
                  {items.map((t) => (
                    <div key={t.id} className={styles.taskCard}>
                      <div className={styles.taskTitle}>{t.title}</div>
                      <div className={styles.taskMeta}>
                        담당: {agentName(t.assignee)}
                        {t.status === "blocked" ? " · ⛔ 막힘" : ""}
                        {t.status === "review" ? " · 🔎 확인 대기" : ""}
                      </div>
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
                      {t.prUrl && (
                        <a className={styles.pr} href={t.prUrl} target="_blank" rel="noreferrer">
                          🔗 PR 보기
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          <AddTaskForm agents={agents} onAdd={addTask} />
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
  onAdd,
}: {
  agents: GameState["agents"];
  onAdd: (title: string, detail: string, assignee: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [assignee, setAssignee] = useState(agents[0]?.id ?? "");
  useEffect(() => {
    if (!assignee && agents[0]) setAssignee(agents[0].id);
  }, [agents, assignee]);
  return (
    <form
      className={styles.addForm}
      onSubmit={(e) => {
        e.preventDefault();
        onAdd(title, detail, assignee || agents[0]?.id || "");
        setTitle("");
        setDetail("");
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
