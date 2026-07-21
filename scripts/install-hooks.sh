#!/usr/bin/env bash
# AI 협업 시스템 — git 훅 설치기
# push 전에 "설명 문서 + 퀴즈 + 자가검증"을 상기시키는 pre-push 훅을 설치합니다.
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
HOOK_SRC="$ROOT/scripts/git-hooks/pre-push"
HOOK_DST="$ROOT/.git/hooks/pre-push"

if [[ ! -f "$HOOK_SRC" ]]; then
  echo "✗ $HOOK_SRC 를 찾을 수 없습니다." >&2
  exit 1
fi

cp "$HOOK_SRC" "$HOOK_DST"
chmod +x "$HOOK_DST"
echo "✓ pre-push 훅 설치 완료: $HOOK_DST"
echo "  이제 push 전에 설명 문서/퀴즈 자가검증 리마인더가 표시됩니다."
echo "  건너뛰려면: git push --no-verify"
