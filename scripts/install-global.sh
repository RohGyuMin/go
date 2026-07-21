#!/usr/bin/env bash
# AI 협업 시스템 — 전역(유저 레벨) 설치기
# 슬래시 커맨드를 ~/.claude/commands/ 에 설치해 "모든 프로젝트"에서 쓸 수 있게 하고,
# (선택) 자가검증 규칙을 전역 CLAUDE.md 에 추가하며, Obsidian 저장 설정을 안내합니다.
#
# 사용법:
#   ./scripts/install-global.sh                 # 커맨드만 전역 설치
#   ./scripts/install-global.sh --with-rule     # + 전역 CLAUDE.md 에 자가검증 규칙 추가
set -euo pipefail

if ! ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"; then
  ROOT="$(cd "$(dirname "$0")/.." && pwd)"
fi
CLAUDE_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
DEST="$CLAUDE_DIR/commands"
mkdir -p "$DEST"

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

# (선택) 자가검증 규칙을 전역 CLAUDE.md 에 추가
if [[ "${1:-}" == "--with-rule" ]]; then
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
