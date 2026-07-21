# ai-collab — AI 협업 시스템 플러그인

한 번 설치하면 **모든 프로젝트**에서 아래 슬래시 커맨드를 사용할 수 있는 Claude Code 플러그인입니다.
(플러그인 커맨드는 네임스페이스가 붙습니다: `/ai-collab:<command>`)

| 커맨드 | 설명 |
|--------|------|
| `/ai-collab:explain-diff` | 변경사항에 대한 종합 설명 문서 + 5문항 자가검증 퀴즈 자동 생성 (+ Obsidian 저장) |
| `/ai-collab:micro-world` | 타임라인 스크럽 가능한 시각적 디버거 스캐폴딩 |
| `/ai-collab:share-to-space` | 설명/설계 요약을 Notion·Slack 공유 공간으로 내보내 집단 리뷰 |

## 설치

```bash
# 1) 마켓플레이스 등록 (GitHub)
/plugin marketplace add RohGyuMin/go

# 2) 플러그인 설치
/plugin install ai-collab@rohgyumin-plugins
```

로컬에서 먼저 테스트하려면:
```bash
/plugin marketplace add ./            # 이 저장소 루트(.claude-plugin/marketplace.json)
/plugin install ai-collab@rohgyumin-plugins
# 또는 단일 세션 로드
claude --plugin-dir ./plugin
```

## Obsidian 저장(선택)

셸 프로필에 볼트 경로를 지정하면 `explain-diff`가 볼트에도 설명 문서를 축적합니다.
```bash
export OBSIDIAN_VAULT="$HOME/Documents/ObsidianVault"
```

## 자가검증 규칙

의미 있는 코드 변경 후 `explain-diff`로 문서+퀴즈를 만들고, 본인이 5문항 중 4문항 이상 통과하지
못하면 머지하지 말고 동료 리뷰를 요청합니다. 이 규칙을 모든 프로젝트에 자동 적용하려면, 전역
`~/.claude/CLAUDE.md`에 규칙을 추가하세요(저장소 `scripts/install-global.sh --with-rule`).
