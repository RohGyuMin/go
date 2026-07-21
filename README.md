# AI 협업 시스템 (AI Collaboration System)

AI가 코드를 **빠르게 작성**하는 시대에, 병목은 작성 속도가 아니라 **팀의 이해 속도**입니다.
이 저장소는 "작성 속도"와 "이해 속도"의 균형을 맞추기 위한 세 가지 축을 실제로 도입할 수 있는
툴킷(슬래시 커맨드 · git 훅 · CI · 템플릿)과 가이드 문서를 제공합니다.

## 세 가지 축

| 축 | 목적 | 핵심 산출물 |
|----|------|-------------|
| 1. **설명 문서 + 퀴즈** | 단순 diff가 아니라 *맥락·의도·직관적 개요*를 담은 종합 설명 + 자가검증용 퀴즈 | `/explain-diff`, `templates/explanation.md`, CI 게이트 |
| 2. **마이크로월드** | 코드를 읽는 대신 *시각적 디버거/시뮬레이션*으로 시스템 메커니즘을 감각적으로 이해 | `/micro-world`, `templates/micro-world/` |
| 3. **공유 공간 연동** | 1:1 AI 루프에서 벗어나 팀의 *집단적 이해*를 유지 (Notion/Slack) | `/share-to-space`, 운영 가이드 |

## 팀 전체에 배포 (플러그인) ⭐ 권장

한 번 설치하면 **모든 프로젝트**에서 커맨드가 뜨고, 팀원 각자도 두 줄로 설치됩니다. (커맨드는
`/ai-collab:explain-diff` 처럼 네임스페이스가 붙습니다.)

```bash
/plugin marketplace add RohGyuMin/go          # 마켓플레이스 등록
/plugin install ai-collab@rohgyumin-plugins   # 플러그인 설치
```

로컬 테스트: `/plugin marketplace add ./` 후 위 install, 또는 `claude --plugin-dir ./plugin`.
플러그인 상세는 [plugin/README.md](plugin/README.md).

## 5분 안에 시작하기 (플러그인 없이 스크립트로)

```bash
# 1) git 훅 설치 (push 전 설명문서+퀴즈 리마인더) — 이 프로젝트에만
./scripts/install-hooks.sh

# 1-b) 모든 프로젝트에 한 번에 반영 (커맨드 + 규칙 + 전역 git 훅) — 개인 머신 단위
./scripts/install-global.sh --all

# 1-c) (선택) 설명 문서를 Obsidian 볼트에도 축적하려면
export OBSIDIAN_VAULT="$HOME/Documents/ObsidianVault"   # 셸 프로필에 추가

# 2) 변경사항을 만든 뒤, 설명 문서 + 퀴즈 자동 생성
#    (Claude Code 세션에서) — OBSIDIAN_VAULT 설정 시 볼트에도 자동 저장
/explain-diff

# 3) 생성된 퀴즈를 스스로 풀어본다.
#    통과하지 못하면 → 머지 금지, 동료 리뷰 요청 (자가검증 규칙)
```

> **모든 프로젝트에 반영 + Obsidian 저장**: `install-global.sh`로 커맨드를 `~/.claude/commands/`에
> 설치하면 어느 저장소에서든 `/explain-diff`가 뜨고, `OBSIDIAN_VAULT`를 설정하면 생성된 설명 문서가
> `AI-협업/설명문서/<프로젝트>/`에 frontmatter·위키링크·MOC와 함께 쌓입니다.
> 자세히는 [docs/01](docs/01-explanations-and-quizzes.md#도입-방법).

## 문서

- [시스템 개요](docs/ai-collaboration-system.md)
- [1. 설명 문서 + 퀴즈](docs/01-explanations-and-quizzes.md)
- [2. 마이크로월드](docs/02-micro-worlds.md)
- [3. 공유 공간 연동](docs/03-shared-spaces.md)

## 핵심 규칙 — 자가검증 (Self-Verification)

> **개발자 본인이 자신의 변경에 대한 AI 생성 퀴즈를 통과하지 못하면,
> 코드베이스에 반영하지 않고 동료 리뷰를 요청한다.**

이 규칙은 이해 없이 코드가 쌓이는 것을 막는 "속도 조절 장치"입니다. 자세한 내용은
[CLAUDE.md](CLAUDE.md)와 [docs/01](docs/01-explanations-and-quizzes.md)을 참고하세요.
