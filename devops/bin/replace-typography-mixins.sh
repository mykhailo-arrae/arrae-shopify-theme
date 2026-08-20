#!/usr/bin/env bash
#
# Replaces deprecated typography size mixins with the get-font-size() function.
#
#   @include typography.large();   -->  font-size: typography.get-font-size(large);
#   @include large();              -->  font-size: get-font-size(large);
#                                       (inside _typography.scss itself)
#
# Run from the project root.
set -euo pipefail

ALL_SIZES=(size-120 size-112 size-96 size-88 size-80 size-72 size-64 size-56 size-48 size-40 size-36 size-32 size-24 size-20 size-16 size-14 size-12 size-8 size-4 size-2 size-0)

usage() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS] [SIZE ...]

Replace deprecated typography size mixins with get-font-size() calls.

Sizes:
  ${ALL_SIZES[*]}

  If no sizes are given, all of the above are replaced.

Options:
  -n, --dry-run   Show what would be changed without modifying files
  -h, --help      Show this help message

Examples:
  $(basename "$0")                   # Replace all sizes
  $(basename "$0") large medium      # Replace only large and medium
  $(basename "$0") --dry-run         # Preview all changes
  $(basename "$0") -n large          # Preview changes for large only
EOF
  exit 0
}

DRY_RUN=false
SIZES=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)   usage ;;
    -n|--dry-run) DRY_RUN=true; shift ;;
    -*)          echo "Unknown option: $1" >&2; usage ;;
    *)           SIZES+=("$1"); shift ;;
  esac
done

if [[ ${#SIZES[@]} -eq 0 ]]; then
  SIZES=("${ALL_SIZES[@]}")
fi

TYPOGRAPHY_FILE="_sass/core/style-guide/_typography.scss"

for size in "${SIZES[@]}"; do
  echo "=== Replacing: $size ==="

  # rg uses Rust regex: \( is literal paren
  # sed BRE uses: () for literal parens, \(\) for capture groups
  rg_ext="@include typography\.${size}\(\);"
  rg_int="@include ${size}\(\);"
  sed_ext="@include typography\.${size}();"
  sed_ext_repl="font-size: typography.get-font-size(${size});"
  sed_int="@include ${size}();"
  sed_int_repl="font-size: get-font-size(${size});"

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "  [dry-run] External: s/${sed_ext}/${sed_ext_repl}/g"
    rg --glob '*.scss' --files-with-matches "$rg_ext" . 2>/dev/null | while read -r f; do
      echo "    would modify: $f"
    done || true

    echo "  [dry-run] Internal: s/${sed_int}/${sed_int_repl}/g"
    if rg -q "$rg_int" "$TYPOGRAPHY_FILE" 2>/dev/null; then
      echo "    would modify: $TYPOGRAPHY_FILE"
    fi
  else
    # Replace in all external SCSS files (excluding the typography source itself)
    rg --glob '*.scss' --files-with-matches "$rg_ext" . 2>/dev/null \
      | grep -v "$TYPOGRAPHY_FILE" \
      | while read -r f; do
          sed -i "s/${sed_ext}/${sed_ext_repl}/g" "$f"
          echo "  updated: $f"
        done || true

    # Replace internal usages within _typography.scss
    if rg -q "$rg_int" "$TYPOGRAPHY_FILE" 2>/dev/null; then
      sed -i "s/${sed_int}/${sed_int_repl}/g" "$TYPOGRAPHY_FILE"
      echo "  updated: $TYPOGRAPHY_FILE (internal)"
    fi
  fi
done

echo ""
echo "Done."
