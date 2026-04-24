#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

fail() {
  echo "submission-guard: $*" >&2
  exit 1
}

print_matches_and_fail() {
  local label="$1"
  local file="$2"

  echo "submission-guard: blocked by $label" >&2
  sed -n '1,80p' "$file" >&2
  fail "review or remove the matched content"
}

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

bad_files="$tmp_dir/bad-files.txt"
find . -path './.git' -prune -o -type f \( \
  -name '.env' -o \
  -name '.env.*' -o \
  -name '*.pem' -o \
  -name '*.key' -o \
  -name 'id_rsa*' -o \
  -name '*.p12' -o \
  -name '*.sqlite' -o \
  -name '*.db' -o \
  -name '*.log' \
\) -print > "$bad_files"

if [[ -s "$bad_files" ]]; then
  print_matches_and_fail "sensitive file names" "$bad_files"
fi

bad_dirs="$tmp_dir/bad-dirs.txt"
find . -path './.git' -prune -o -type d \( \
  -path './myxeno' -o \
  -path './myxeno-fe' -o \
  -path './codex-proxy' -o \
  -path './xeno-axon' -o \
  -path './backend/gateway-svc/internal' -o \
  -path './backend/billing-svc' -o \
  -path './backend/auth-svc' \
\) -print > "$bad_dirs"

if [[ -s "$bad_dirs" ]]; then
  print_matches_and_fail "forbidden production directories" "$bad_dirs"
fi

scan() {
  local label="$1"
  local pattern="$2"
  local out="$tmp_dir/${label//[^A-Za-z0-9_-]/_}.txt"

  if rg -n -I --hidden --pcre2 -g '!.git' -- "$pattern" . > "$out"; then
    print_matches_and_fail "$label" "$out"
  fi
}

scan "OpenAI-style secret keys" 'sk-[A-Za-z0-9_-]{20,}'
scan "AWS access keys" 'AKIA[0-9A-Z]{16}'
scan "private key blocks" '-----BEGIN (?:RSA |EC |OPENSSH |)?PRIVATE KEY-----'
scan "provider API key assignments" '(?:OPENAI|ANTHROPIC|GEMINI|GOOGLE|XAI|MISTRAL|AZURE_OPENAI|LLM)_[A-Z0-9_]*API_KEY\s*='
scan "generic credential assignments" '(?i)(?:password|secret|private[_-]?key|api[_-]?key)\s*[:=]\s*["'\'']?[A-Za-z0-9_./+=-]{24,}'
scan "database URLs with credentials" 'postgres(?:ql)?://[^[:space:]]+:[^[:space:]@]+@'

echo "submission-guard: passed"
