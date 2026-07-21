---
description: 현재 변경사항에 대한 종합 설명 문서 + 5문항 퀴즈를 생성한다
---

당신은 팀의 "이해 속도"를 지키는 역할입니다. 아래 절차를 따라 **종합 설명 문서**와
**자가검증용 5문항 퀴즈**를 생성하세요. 단순 diff 요약이 아니라 맥락·의도·직관을 담아야 합니다.

## 1. 변경사항 수집

```
!git diff --stat $(git merge-base HEAD origin/dev 2>/dev/null || echo HEAD~1)..HEAD
!git diff $(git merge-base HEAD origin/dev 2>/dev/null || echo HEAD~1)..HEAD
```

(스테이징된/커밋 안 된 변경만 있으면 `git diff HEAD` 및 `git diff --staged`도 확인하세요.)

## 2. 설명 문서 작성

`templates/explanation.md` 구조를 따라 `docs/explanations/<오늘날짜:YYYY-MM-DD>-<slug>.md`에 작성합니다.
반드시 아래를 채우세요.

- **배경/맥락**: 왜 이 변경이 필요한가? 전체 시스템에서 어디에 위치하는가? (기존 코드를 읽어 근거를 확보)
- **직관적 개요**: 비전문가도 이해할 한 문단 요약. 필요하면 Mermaid 다이어그램.
- **핵심 변경과 작성 의도**: 파일별로 *무엇을* 바꿨는지가 아니라 *왜* 그렇게 했는지, 고려한 대안/트레이드오프.
- **파급 효과 & 리스크**: 영향받는 모듈, 잠재적 부작용, 롤백 방법.

## 3. 퀴즈 생성 (5문항, 중간 난이도)

- 단순 암기(X) → "왜/어떻게/만약에"(O)를 묻습니다.
- 최소 2문항은 "이 코드를 이렇게 바꾸면 무슨 일이 생기나?" 같은 응용 문제로.
- 각 문항은 4지선다 또는 단답형. **정답과 해설은 `<details>` 접이식**으로 문서 하단에 넣어
  본인이 먼저 풀어볼 수 있게 합니다.

## 3.5. Obsidian Vault 에도 저장 (모든 프로젝트 공통 지식 축적)

`OBSIDIAN_VAULT` 환경변수가 설정되어 있으면, 같은 설명 문서를 Obsidian 볼트에도 저장해
**프로젝트를 넘나드는 개인 지식 그래프**로 축적합니다.

```
!echo "OBSIDIAN_VAULT=${OBSIDIAN_VAULT:-(미설정)}"
!basename "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
```

- **미설정이면**: 이 단계를 건너뛰고, 켜는 법만 한 줄 안내합니다 →
  `셸 프로필에 export OBSIDIAN_VAULT="~/경로/볼트" 추가` (자세히는 `scripts/install-global.sh`).
- **설정되어 있으면**: `templates/obsidian-note.md` 형식을 따라 아래 경로에 저장합니다.
  ```
  $OBSIDIAN_VAULT/AI-협업/설명문서/<프로젝트명>/<YYYY-MM-DD>-<slug>.md
  ```
  1. 문서 맨 위에 Obsidian **frontmatter**(YAML)를 붙입니다: `tags`, `project`, `branch`,
     `created`, `quiz_passed: null`, `source`(원본 repo 경로/PR 링크).
  2. 본문은 프로젝트에 저장한 설명 문서와 동일하되, 관련 개념은 `[[위키링크]]`로 연결합니다.
  3. **MOC 갱신**: `$OBSIDIAN_VAULT/AI-협업/설명문서 MOC.md`가 없으면 만들고, 이 노트로의
     wikilink 한 줄(`- [[<YYYY-MM-DD>-<slug>]] — <프로젝트> — <한줄요약>`)을 최상단 목록에 추가합니다.
  4. 볼트 경로는 개인 파일이므로 git 에는 커밋하지 않습니다(프로젝트 `docs/explanations/`에만 커밋).

## 4. 자가검증 안내 출력

문서를 저장한 뒤, 사용자에게 다음을 명확히 안내하세요:

> ✅ 설명 문서 생성 완료: `docs/explanations/...md`
> 🔗 Obsidian 저장: `$OBSIDIAN_VAULT/AI-협업/...` (설정된 경우) — MOC 갱신됨
> 이제 하단 퀴즈 5문항을 **직접** 풀어보세요.
> 4문항 이상 맞히지 못하면 → 머지하지 말고 동료 리뷰를 요청하세요. (자가검증 규칙, CLAUDE.md 참조)

문서 링크와 퀴즈 문항을 채팅에도 요약해 보여주세요.
퀴즈 채점 후, Obsidian 노트의 `quiz_passed` frontmatter 를 `true`/`false`로 갱신하도록 제안하세요.
