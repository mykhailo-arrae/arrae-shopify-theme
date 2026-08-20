#!/usr/bin/env bash
set -euo pipefail

SIZES=(xxxlarge xxlarge xlarge large medium regular small xsmall xxsmall)

usage() {
  cat <<EOF
Migrate deprecated spacing variable usage to spacing.get() across SCSS files.

Step 1: u.rem-calc(spacing.\$SIZE) → spacing.get(SIZE)
Step 2: spacing.\$SIZE              → spacing.get(SIZE)
Step 3: spacing.as-rem(SIZE)       → spacing.get(SIZE)

Usage:
  $(basename "$0") [OPTIONS]

Options:
  --size SIZE    Only replace the given size (e.g. regular, medium, small).
                 Can be specified multiple times. Default: all sizes.
  --dry-run      Show what would change without modifying files.
  -h, --help     Show this help message.

Valid sizes: ${SIZES[*]}

Examples:
  $(basename "$0")                              # Replace all sizes
  $(basename "$0") --dry-run                    # Preview all changes
  $(basename "$0") --size regular               # Replace one size
  $(basename "$0") --size regular --size medium  # Replace specific sizes
EOF
  exit 0
}

selected_sizes=()
dry_run=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --size)
      shift
      selected_sizes+=("$1")
      ;;
    --dry-run)
      dry_run=true
      ;;
    -h|--help)
      usage
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      ;;
  esac
  shift
done

if [[ ${#selected_sizes[@]} -eq 0 ]]; then
  selected_sizes=("${SIZES[@]}")
fi

for size in "${selected_sizes[@]}"; do
  if ! printf '%s\n' "${SIZES[@]}" | grep -qx "$size"; then
    echo "Error: '$size' is not a valid size. Valid sizes: ${SIZES[*]}" >&2
    exit 1
  fi
done

cd "$(git rev-parse --show-toplevel)"

replace_pattern() {
  local label="$1" grep_pat="$2" sed_pat="$3" sed_repl="$4"

  for size in "${selected_sizes[@]}"; do
    local gp="${grep_pat//SIZE/$size}"
    local sp="${sed_pat//SIZE/$size}"
    local sr="${sed_repl//SIZE/$size}"

    local matches
    matches=$(grep -rl "$gp" --include='*.scss' . 2>/dev/null || true)
    if [[ -z "$matches" ]]; then
      continue
    fi

    echo "=== ${label//SIZE/$size} ==="

    while IFS= read -r file; do
      if $dry_run; then
        echo "  [dry-run] $file"
        grep -n "$gp" "$file" | sed 's/^/    /'
      else
        sed -i "s/$sp/$sr/g" "$file"
        echo "  updated: $file"
      fi
    done <<< "$matches"
  done
}

# Step 1: u.rem-calc(spacing.$SIZE) → spacing.get(SIZE)
echo "── Step 1: u.rem-calc(spacing.\$SIZE) → spacing.get(SIZE) ──"
replace_pattern \
  'u.rem-calc(spacing.$SIZE) → spacing.get(SIZE)' \
  'u\.rem-calc(spacing\.\$SIZE)' \
  'u\.rem-calc(spacing\.\$SIZE)' \
  'spacing.get(SIZE)'

# Step 2: spacing.$SIZE → spacing.get(SIZE)
# Runs after step 1, so only bare spacing.$SIZE references remain.
echo ""
echo "── Step 2: spacing.\$SIZE → spacing.get(SIZE) ──"
replace_pattern \
  'spacing.$SIZE → spacing.get(SIZE)' \
  'spacing\.\$SIZE' \
  'spacing\.\$SIZE' \
  'spacing.get(SIZE)'

# Step 3: spacing.as-rem(SIZE) → spacing.get(SIZE)
echo ""
echo "── Step 3: spacing.as-rem(SIZE) → spacing.get(SIZE) ──"
replace_pattern \
  'spacing.as-rem(SIZE) → spacing.get(SIZE)' \
  'spacing\.as-rem(SIZE)' \
  'spacing\.as-rem(SIZE)' \
  'spacing.get(SIZE)'

echo ""
echo "Done."
