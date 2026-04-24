#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source_root="${PRIVATE_XENODIA_ROOT:-$(cd "$repo_root/.." && pwd)}"
manifest="${SAFE_SYNC_MANIFEST:-$repo_root/.safe-sync-manifest}"
dry_run=0

if [[ "${1:-}" == "--dry-run" ]]; then
  dry_run=1
fi

fail() {
  echo "safe-sync: $*" >&2
  exit 1
}

warn() {
  echo "safe-sync: warning: $*" >&2
}

[[ -f "$manifest" ]] || fail "manifest not found: $manifest"
[[ -d "$source_root" ]] || fail "private source root not found: $source_root"

source_root="$(cd "$source_root" && pwd)"
echo "safe-sync: source root: $source_root"
echo "safe-sync: repo root: $repo_root"

copied=0
missing=0

while IFS= read -r raw_line || [[ -n "$raw_line" ]]; do
  line="${raw_line#"${raw_line%%[![:space:]]*}"}"
  line="${line%"${line##*[![:space:]]}"}"

  [[ -z "$line" || "${line:0:1}" == "#" ]] && continue
  [[ "$line" == *"|"* ]] || fail "invalid manifest line: $raw_line"

  src_rel="${line%%|*}"
  dst_rel="${line#*|}"

  [[ -n "$src_rel" && -n "$dst_rel" ]] || fail "empty source or destination in: $raw_line"
  [[ "$src_rel" != /* && "$dst_rel" != /* ]] || fail "absolute paths are not allowed: $raw_line"
  [[ "$src_rel" != *".."* && "$dst_rel" != *".."* ]] || fail "parent traversal is not allowed: $raw_line"

  case "$src_rel" in
    *".env"*|*"gateway-svc/internal"*|*"billing-svc"*|*"auth-svc"*|*"provider_pool"*|*"pool_account"*|*"channel_router"*|*"llm"*|*"openai"*|*"anthropic"*|*"logs"*)
      fail "blocked source path: $src_rel"
      ;;
  esac

  src_abs="$source_root/$src_rel"
  dst_abs="$repo_root/$dst_rel"

  case "$src_abs" in
    "$source_root"/*) ;;
    *) fail "source escapes private root: $src_rel" ;;
  esac

  case "$dst_abs" in
    "$repo_root"/*) ;;
    *) fail "destination escapes repo root: $dst_rel" ;;
  esac

  if [[ ! -e "$src_abs" ]]; then
    warn "missing source, skipped: $src_rel"
    missing=$((missing + 1))
    continue
  fi

  [[ -f "$src_abs" ]] || fail "manifest supports files only, not directories: $src_rel"

  echo "safe-sync: $src_rel -> $dst_rel"
  if [[ "$dry_run" -eq 0 ]]; then
    mkdir -p "$(dirname "$dst_abs")"
    cp "$src_abs" "$dst_abs"
  fi
  copied=$((copied + 1))
done < "$manifest"

if [[ "$dry_run" -eq 1 ]]; then
  echo "safe-sync: dry run complete; $copied file(s) would be copied, $missing missing source(s)."
  exit 0
fi

"$repo_root/scripts/submission-guard.sh"
echo "safe-sync: complete; $copied file(s) copied, $missing missing source(s)."

