# AI 사무실 — Claude Code 처리 프로토콜

이 게임의 "뇌"는 **Claude Code(구독)**입니다. 브라우저 게임은 `web/game/state.json`에
업무·대화를 쌓고, Claude Code가 그 파일을 읽어 **실제로 저장소에서 일**한 뒤 결과를 도로 씁니다.
API 키·토큰 비용 없이 Max 구독 안에서 동작합니다.

## 상태 파일 형태
`web/game/state.json` — 타입 정의는 `web/lib/game.ts` 참조.
- `rooms[]` : 방(팀) 목록(id·name·emoji). 없거나 비면 단일 기본 방으로 취급.
- `agents[]` : 캐릭터(id·이름·역할·emoji·`room`(소속 팀)·status)
- `tasks[]`  : 업무(id·title·detail·assignee·status·`priority`·`dependsOn`·result)
  - `status`: `todo` → `doing` → `review`/`approved` → `done` (막히면 `blocked`)
  - `priority`: `high`/`normal`/`low`, `dependsOn`: 선행 업무 id들(모두 done이어야 착수)
- `chat[]`   : 대화(agent·from(`player`|`agent`)·text)
- `rev`      : 단조 증가 버전 (편집 후 반드시 +1)

> 방(팀)은 화면을 나눌 뿐, 업무는 담당 캐릭터(`assignee`)의 소속 방 보드에 자동으로 표시된다.
> Claude Code는 방 구분 없이 모든 대기 업무를 처리하면 된다(우선순위·의존성만 지킨다).

## Claude Code가 할 일 (사람이 "게임 업무 처리해줘"라고 하면)

1. **읽기**: `web/game/state.json`을 읽는다.
2. **대기 업무 처리**: `status === "todo"`인 tasks를 담당 캐릭터 관점에서 처리한다.
   - 처리 중엔 해당 task를 `doing`, 담당 agent를 `status:"working"`으로 바꿔 둘 수 있다.
   - **실제 작업 수행**: task.detail에 따라 저장소에서 진짜 일을 한다(파일 수정·조사·리뷰 등).
   - **조사/설명 업무**(코드 변경 없음) → `done` + `result`(한두 줄 요약), agent `idle`.
   - **코드 변경 업무**(파일을 실제로 고침) → 아래 "리뷰 게이트"를 따른다.
   - 막히면 `blocked` + `result`에 사유.

   ### 리뷰 게이트 (코드를 실제로 바꾸는 업무)
   저장소를 바꾸는 업무는 **자동 커밋하지 않는다.** 사람 확인을 거친다.
   1. 파일을 실제로 수정한 뒤, task를 `status:"review"`로 두고
      `result`에 무엇을 왜 바꿨는지, `changedFiles`에 바뀐 파일 경로 목록을 넣는다.
   2. 게임 화면의 **"리뷰 대기"** 칼럼에 변경 파일과 함께 표시된다.
   3. 사람이 게임 카드의 **"승인 (커밋/PR)"** 버튼을 누르면 task가 `approved`가 된다
      (또는 사람이 "커밋해"라고 말해도 된다).
   4. `approved` task는 Claude Code가 **실제로 커밋**하고(필요 시 PR 생성),
      task를 `done`, `prUrl`에 링크를 채운다. 커밋 메시지에 담당 캐릭터·업무 제목을 반영한다.
   5. 사람이 수정을 원하면 → 다시 작업 후 `review`로 갱신.
3. **대화 응답**: `chat[]`에서 마지막 메시지가 `from:"player"`인 대화가 있으면,
   그 캐릭터 톤으로 `from:"agent"` 응답을 추가한다.
4. **rev +1** 후 파일을 저장한다. (게임 화면이 2초 폴링으로 자동 반영)

> ⚠️ 실제 코드 변경이 필요한 업무는 커밋/PR은 사람 확인 후 진행한다(게임 상태만 자동, 저장소 반영은 신중히).

## 처리 커맨드 & 자동화
이 절차는 슬래시 커맨드 **`/process-game`**(`.claude/commands/process-game.md`)로 묶여 있다.
로컬 Claude Code에서:
- 한 번 처리: `/process-game`
- 주기 자동 처리: `/loop 30s /process-game` — 30초마다 대기 업무를 집어간다. (게임은 2초 폴링으로 반영)

단, **루프 안에서도 실제 저장소 코드 변경은 `review`로 남겨 사람 확인을 받고, 커밋·푸시·PR은 하지
않는다.** 게임 상태(state.json) 쓰기만 자동이다.
