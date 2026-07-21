# AI 사무실 — Claude Code 처리 프로토콜

이 게임의 "뇌"는 **Claude Code(구독)**입니다. 브라우저 게임은 `web/game/state.json`에
업무·대화를 쌓고, Claude Code가 그 파일을 읽어 **실제로 저장소에서 일**한 뒤 결과를 도로 씁니다.
API 키·토큰 비용 없이 Max 구독 안에서 동작합니다.

## 상태 파일 형태
`web/game/state.json` — 타입 정의는 `web/lib/game.ts` 참조.
- `agents[]` : 캐릭터(id·이름·역할·emoji·status)
- `tasks[]`  : 업무(id·title·detail·assignee·status·result)
  - `status`: `todo` → `doing` → `done` (막히면 `blocked`)
- `chat[]`   : 대화(agent·from(`player`|`agent`)·text)
- `rev`      : 단조 증가 버전 (편집 후 반드시 +1)

## Claude Code가 할 일 (사람이 "게임 업무 처리해줘"라고 하면)

1. **읽기**: `web/game/state.json`을 읽는다.
2. **대기 업무 처리**: `status === "todo"`인 tasks를 담당 캐릭터 관점에서 처리한다.
   - 처리 중엔 해당 task를 `doing`, 담당 agent를 `status:"working"`으로 바꿔 둘 수 있다.
   - **실제 작업 수행**: task.detail에 따라 저장소에서 진짜 일을 한다(파일 수정·조사·리뷰 등).
   - 끝나면 task를 `done`, `result`에 한두 줄 요약을 넣고, 담당 agent를 `idle`로.
   - 막히면 `blocked` + `result`에 사유.
3. **대화 응답**: `chat[]`에서 마지막 메시지가 `from:"player"`인 대화가 있으면,
   그 캐릭터 톤으로 `from:"agent"` 응답을 추가한다.
4. **rev +1** 후 파일을 저장한다. (게임 화면이 2초 폴링으로 자동 반영)

> ⚠️ 실제 코드 변경이 필요한 업무는 커밋/PR은 사람 확인 후 진행한다(게임 상태만 자동, 저장소 반영은 신중히).

## 자동화(선택)
사람이 매번 지시하지 않게 하려면, Claude Code에서 `/loop`로 이 파일을 주기적으로 확인·처리하게
할 수 있다. 다만 실제 저장소를 바꾸는 작업은 사람 확인을 기본으로 둔다.
