#!/usr/bin/env bash
# AI 협업 시스템 — 전역(유저 레벨) 설치기
# "모든 프로젝트에 반영"되도록 세 가지를 유저 레벨에 설치합니다:
#   1) 슬래시 커맨드      → ~/.claude/commands/         (모든 프로젝트에서 /explain-diff 등 사용)
#   2) 자가검증 규칙      → ~/.claude/CLAUDE.md         (--with-rule)
#   3) push 리마인더 훅   → git --global core.hooksPath (--global-git-hooks, 모든 git repo)
#
# 사용법:
#   ./scripts/install-global.sh                    # 커맨드만 전역 설치
#   ./scripts/install-global.sh --with-rule        # + 전역 CLAUDE.md 규칙
#   ./scripts/install-global.sh --global-git-hooks # + 모든 git repo 에 pre-push 리마인더
#   ./scripts/install-global.sh --all              # 위 셋 전부
set -euo pipefail

WITH_RULE=0; GLOBAL_HOOKS=0
for arg in "$@"; do
  case "$arg" in
    --with-rule)        WITH_RULE=1 ;;
    --global-git-hooks) GLOBAL_HOOKS=1 ;;
    --all)              WITH_RULE=1; GLOBAL_HOOKS=1 ;;
    -h|--help)
      grep -E '^#( |$)' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "알 수 없는 옵션: $arg (--help 참고)" >&2; exit 2 ;;
  esac
done

if ! ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"; then
  ROOT="$(cd "$(dirname "$0")/.." && pwd)"
fi
CLAUDE_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
DEST="$CLAUDE_DIR/commands"
mkdir -p "$DEST"

# 1) 전역 슬래시 커맨드
echo "▶ 전역 커맨드 설치 → $DEST"
for cmd in explain-diff micro-world share-to-space; do
  src="$ROOT/.claude/commands/$cmd.md"
  if [[ -f "$src" ]]; then
    cp "$src" "$DEST/$cmd.md"
    echo "  ✓ /$cmd  (이제 모든 프로젝트에서 사용 가능)"
  else
    echo "  ✗ $src 없음 — 건너뜀" >&2
  fi
done

# 2) 전역 CLAUDE.md 자가검증 규칙
if [[ "$WITH_RULE" == 1 ]]; then
  GLOBAL_MD="$CLAUDE_DIR/CLAUDE.md"
  MARK="<!-- ai-collab-self-verification -->"
  if [[ -f "$GLOBAL_MD" ]] && grep -qF "$MARK" "$GLOBAL_MD"; then
    echo "▶ 전역 CLAUDE.md 에 자가검증 규칙이 이미 있음 — 건너뜀"
  else
    {
      echo ""
      echo "$MARK"
      echo "## 🚦 자가검증 규칙 (모든 프로젝트 공통)"
      echo "의미 있는 코드 변경 후 \`/explain-diff\` 로 설명 문서 + 5문항 퀴즈를 만들고,"
      echo "본인이 4문항 이상 통과하지 못하면 머지하지 말고 동료 리뷰를 요청한다."
    } >> "$GLOBAL_MD"
    echo "▶ 전역 CLAUDE.md 에 자가검증 규칙 추가: $GLOBAL_MD"
  fi
fi

# 3) 전역 git pre-push 훅 (모든 git 저장소에 적용)
if [[ "$GLOBAL_HOOKS" == 1 ]]; then
  HOOKS_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/ai-collab/git-hooks"
  EXISTING="$(git config --global --get core.hooksPath || true)"
  if [[ -n "$EXISTING" && "$EXISTING" != "$HOOKS_DIR" ]]; then
    echo "⚠ git 전역 core.hooksPath 가 이미 '$EXISTING' 로 설정돼 있습니다."
    echo "  덮어쓰지 않습니다. 기존 훅 디렉터리에 scripts/git-hooks/pre-push 를 직접 추가하세요:"
    echo "    cp \"$ROOT/scripts/git-hooks/pre-push\" \"$EXISTING/pre-push\""
  else
    mkdir -p "$HOOKS_DIR"
    cp "$ROOT/scripts/git-hooks/pre-push" "$HOOKS_DIR/pre-push"
    chmod +x "$HOOKS_DIR/pre-push"
    git config --global core.hooksPath "$HOOKS_DIR"
    echo "▶ 전역 git 훅 설치: $HOOKS_DIR (git --global core.hooksPath)"
    echo "  이제 모든 git 저장소의 push 전에 자가검증 리마인더가 표시됩니다."
    echo "  해제: git config --global --unset core.hooksPath"
  fi
fi

# Obsidian 저장 안내
echo ""
echo "▶ Obsidian 저장(선택): 아래를 셸 프로필(~/.zshrc 또는 ~/.bashrc)에 추가하세요."
echo '    export OBSIDIAN_VAULT="$HOME/Documents/ObsidianVault"   # ← 본인 볼트 경로로 변경'
if [[ -n "${OBSIDIAN_VAULT:-}" ]]; then
  echo "  현재 감지됨: OBSIDIAN_VAULT=$OBSIDIAN_VAULT"
  mkdir -p "$OBSIDIAN_VAULT/AI-협업/설명문서" 2>/dev/null && \
    echo "  ✓ 볼트 하위 폴더 준비 완료: $OBSIDIAN_VAULT/AI-협업/설명문서" || \
    echo "  ⚠ 볼트 경로에 폴더를 만들지 못했습니다. 경로를 확인하세요."
else
  echo "  현재 미설정 — 설정 후 /explain-diff 실행 시 볼트에도 자동 저장됩니다."
fi

echo ""
echo "완료. Claude Code 를 재시작하거나 새 세션에서 /explain-diff 를 사용하세요."
