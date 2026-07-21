---
description: 현재 변경사항에 대한 종합 설명 문서 + 5문항 자가검증 퀴즈를 생성한다 (+ Obsidian 저장)
---

당신은 팀의 "이해 속도"를 지키는 역할입니다. 단순 diff 요약이 아니라 **맥락·의도·직관**을 담은
종합 설명 문서와 **자가검증용 5문항 퀴즈**를 생성하세요. (이 커맨드는 어떤 프로젝트에서도 동작하도록
자체 완결형입니다 — 프로젝트에 별도 템플릿 파일이 없어도 됩니다.)

## 1. 변경사항 수집

```
!git diff --stat $(git merge-base HEAD origin/main 2>/dev/null || git merge-base HEAD origin/master 2>/dev/null || git merge-base HEAD origin/dev 2>/dev/null || echo HEAD~1)..HEAD
!git diff $(git merge-base HEAD origin/main 2>/dev/null || git merge-base HEAD origin/master 2>/dev/null || git merge-base HEAD origin/dev 2>/dev/null || echo HEAD~1)..HEAD
```
(커밋 안 된 변경만 있으면 `git diff HEAD` 및 `git diff --staged`도 확인하세요.)

## 2. 설명 문서 작성 → `docs/explanations/<YYYY-MM-DD>-<slug>.md`

아래 구조로 작성합니다(폴더가 없으면 만드세요). 기존 코드를 읽어 근거를 확보하세요.

```markdown
# <제목 — 한 줄 요약>
- 작성자 / 날짜 / 관련 브랜치·PR / 변경 규모

## 1. 배경 / 맥락 (왜 필요한가)
<이 변경이 왜 필요했나, 전체 시스템에서의 위치, 기존 동작>

## 2. 직관적 개요 (한 문단 + 필요 시 Mermaid 다이어그램)
<처음 보는 사람도 감을 잡을 "한 마디로, 이건 …">

## 3. 핵심 변경과 작성 의도 (표: 파일 | 무엇을 | **왜**·대안·트레이드오프)

## 4. 파급 효과 & 리스크 (영향 범위 · 부작용 · 롤백)
```

## 3. 퀴즈 생성 (5문항, 중간 난이도) — 문서 하단에 추가

- 단순 암기(X) → "왜/어떻게/만약에"(O). 최소 2문항은 "이 부분을 바꾸면?" 응용 문제.
- 각 문항 4지선다 또는 단답형. **정답·해설은 `<details>` 접이식**으로 넣어 스스로 먼저 풀게 합니다.
- 맨 아래 자가검증 체크리스트: `[ ] 5문항 풀이 / [ ] 4문항 이상 정답→병합 / [ ] 미만→리뷰 요청(리뷰어: __)`.

## 3.5. Obsidian Vault 에도 저장 (모든 프로젝트 공통 지식 축적)

```
!echo "OBSIDIAN_VAULT=${OBSIDIAN_VAULT:-(미설정)}"
!basename "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
```
- **미설정**: 건너뛰고 켜는 법만 한 줄 안내 → `셸 프로필에 export OBSIDIAN_VAULT="~/경로/볼트"`.
- **설정됨**: `$OBSIDIAN_VAULT/AI-협업/설명문서/<프로젝트명>/<YYYY-MM-DD>-<slug>.md` 에 저장.
  1. 문서 맨 위 Obsidian frontmatter(YAML): `tags`, `project`, `branch`, `created`, `quiz_passed: null`, `source`.
  2. 반복 개념은 `[[위키링크]]`로 연결.
  3. `$OBSIDIAN_VAULT/AI-협업/설명문서 MOC.md`(없으면 생성)에 이 노트 wikilink 한 줄 추가.
  4. 볼트는 개인 파일 → git 커밋하지 않음(프로젝트 docs/explanations 에만 커밋).

## 4. 자가검증 안내 출력

> ✅ 설명 문서: `docs/explanations/...md`  🔗 Obsidian: `$OBSIDIAN_VAULT/AI-협업/...`(설정 시)
> 이제 하단 퀴즈 5문항을 **직접** 풀어보세요. 4문항 미만이면 → 머지 말고 동료 리뷰 요청. (자가검증 규칙)

문서 링크·퀴즈 문항을 채팅에도 요약해 보여주고, 채점 후 Obsidian 노트의 `quiz_passed`를 갱신 제안하세요.
