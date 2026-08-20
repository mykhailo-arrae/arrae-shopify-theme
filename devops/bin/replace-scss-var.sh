#!/bin/bash

set -Eeuo pipefail

usage() {
  cat <<'USAGE'
Replace an SCSS variable reference with a literal value across the codebase.

Usage:
  replace-scss-var.sh <variable> <replacement>

Arguments:
  <variable>      The SCSS variable reference to find (e.g. s.$border-radius)
  <replacement>   The value to replace it with (e.g. u.rem-calc(4))

Examples:
  replace-scss-var.sh 's.$border-radius' 'u.rem-calc(4)'
  replace-scss-var.sh 's.$column-gutter' 'u.rem-calc(40)'
  replace-scss-var.sh 's.$page-width' 'u.rem-calc(1512)'

Options:
  --dry-run   Show what would be changed without modifying files
  -h, --help  Show this help message
USAGE
}

dry_run=false

positional=()
for arg in "$@"; do
  case "$arg" in
    --dry-run) dry_run=true ;;
    -h|--help) usage; exit 0 ;;
    *) positional+=("$arg") ;;
  esac
done

if [[ ${#positional[@]} -ne 2 ]]; then
  usage
  exit 1
fi

variable="${positional[0]}"
replacement="${positional[1]}"

search_dirs=("_sass" "_js")
existing_dirs=()
for d in "${search_dirs[@]}"; do
  [[ -d "$d" ]] && existing_dirs+=("$d")
done

if [[ ${#existing_dirs[@]} -eq 0 ]]; then
  echo "Error: No SCSS source directories found (_sass, _js)" >&2
  exit 1
fi

matches=$(rg -F -l --glob '*.scss' "$variable" "${existing_dirs[@]}" 2>/dev/null || true)

if [[ -z "$matches" ]]; then
  echo "No occurrences of '$variable' found."
  exit 0
fi

file_count=$(echo "$matches" | wc -l)
total_count=$(rg -F -c --glob '*.scss' "$variable" "${existing_dirs[@]}" 2>/dev/null \
  | awk -F: '{s+=$NF} END {print s}')

echo "Found $total_count occurrence(s) of '$variable' in $file_count file(s):"
echo ""
rg -F -n --glob '*.scss' "$variable" "${existing_dirs[@]}" 2>/dev/null | while IFS= read -r line; do
  echo "  $line"
done
echo ""

if $dry_run; then
  echo "[dry-run] No files were modified."
  exit 0
fi

echo "$matches" | _FROM="$variable" _TO="$replacement" xargs -I{} \
  perl -pi -e 'BEGIN { $from = $ENV{_FROM}; $to = $ENV{_TO}; } s/\Q$from\E/$to/g;' "{}"

echo "Replaced '$variable' → '$replacement' in $file_count file(s)."
