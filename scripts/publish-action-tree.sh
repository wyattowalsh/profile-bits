#!/usr/bin/env bash
# Produce a local orphan `release/v1` commit: action.yml, dist/**, LICENSE,
# slim action README. dist/ stays gitignored on main.
#
# Never checkout this working tree. Never tag. Never push.
# Floating @v1 MUST point at the orphan release/v1 commit only — do not
# create a `v1` tag at main.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PACK_CMD=(
  node --experimental-strip-types --disable-warning=ExperimentalWarning
  scripts/package-action.mts
)
SIZE_CMD=(
  node --experimental-strip-types --disable-warning=ExperimentalWarning
  scripts/check-action-size.mts
)

USAGE="Usage: publish-action-tree [--dry-run] [-h]

Pack the GitHub Action (scripts/package-action.mts), size-check dist/,
then create a local orphan commit on refs/heads/release/v1 with:

  action.yml
  dist/**
  LICENSE
  README.md  (from action/README.md)

  --dry-run   print the plan; do not pack, write refs, tag, or push
  -h, --help  show this help

Never git checkout the current worktree. Never tag v1 at main. Never push.
Floating @v1 points at the orphan release/v1 commit only.
"

dry_run=0
for arg in "$@"; do
  case "$arg" in
    -h | --help)
      printf '%s' "$USAGE"
      exit 0
      ;;
    --dry-run)
      dry_run=1
      ;;
    *)
      printf 'unknown argument: %s\n' "$arg" >&2
      printf '%s' "$USAGE" >&2
      exit 2
      ;;
  esac
done

require_sources() {
  if [[ ! -f action.yml || ! -f LICENSE || ! -f action/README.md ]]; then
    printf 'missing action.yml, LICENSE, or action/README.md\n' >&2
    exit 1
  fi
  if [[ ! -d .git && ! -f .git ]]; then
    printf 'not a git repository\n' >&2
    exit 1
  fi
}

print_plan() {
  cat <<EOF
Would pack: ${PACK_CMD[*]}
Would size-check: ${SIZE_CMD[*]}
Would copy: action.yml, LICENSE, action/README.md -> README.md, dist/**
Would git write-tree + commit-tree (orphan, no parent)
Would git update-ref refs/heads/release/v1 <commit>
Would NOT checkout, tag, or push
Never tag v1 at main. Floating @v1 points at orphan release/v1 only.
EOF
}

if [[ "$dry_run" -eq 1 ]]; then
  require_sources
  print_plan
  exit 0
fi

require_sources

HEAD_REF="$(git symbolic-ref -q HEAD || true)"
if [[ "$HEAD_REF" == "refs/heads/release/v1" ]]; then
  printf 'refusing to update refs/heads/release/v1 while it is the current branch\n' >&2
  exit 1
fi

GIT_DIR="$(git rev-parse --absolute-git-dir)"
export GIT_DIR

"${PACK_CMD[@]}"

if [[ ! -d dist || ! -f dist/index.js ]]; then
  printf 'dist/index.js missing after pack\n' >&2
  exit 1
fi

"${SIZE_CMD[@]}"

WORKDIR="$(mktemp -d "${TMPDIR:-/tmp}/profile-bits-release-v1.XXXXXX")"
INDEX="$(mktemp "${TMPDIR:-/tmp}/profile-bits-release-index.XXXXXX")"
# git rejects a 0-byte GIT_INDEX_FILE ("index file smaller than expected").
rm -f "$INDEX"
cleanup() {
  rm -rf "$WORKDIR"
  rm -f "$INDEX"
}
trap cleanup EXIT

cp "$ROOT/action.yml" "$WORKDIR/action.yml"
cp "$ROOT/LICENSE" "$WORKDIR/LICENSE"
cp "$ROOT/action/README.md" "$WORKDIR/README.md"
cp -R "$ROOT/dist" "$WORKDIR/dist"

export GIT_INDEX_FILE="$INDEX"
export GIT_WORK_TREE="$WORKDIR"
export GIT_AUTHOR_NAME="${GIT_AUTHOR_NAME:-profile-bits}"
export GIT_AUTHOR_EMAIL="${GIT_AUTHOR_EMAIL:-profile-bits@users.noreply.github.com}"
export GIT_COMMITTER_NAME="${GIT_COMMITTER_NAME:-$GIT_AUTHOR_NAME}"
export GIT_COMMITTER_EMAIL="${GIT_COMMITTER_EMAIL:-$GIT_AUTHOR_EMAIL}"

# dist/ and node_modules/ are gitignored on main; the orphan tree must
# include them. --force also covers global excludesFile / info/exclude.
git -c core.excludesFile=/dev/null -c core.sparseCheckout=false add --force -A -- .
TREE="$(git write-tree)"
unset GIT_WORK_TREE
unset GIT_INDEX_FILE

expected="$(printf '%s\n' LICENSE README.md action.yml dist | LC_ALL=C sort)"
actual="$(git ls-tree --name-only "$TREE" | LC_ALL=C sort)"
if [[ "$actual" != "$expected" ]]; then
  printf 'orphan tree has unexpected top-level paths:\n%s\n' "$actual" >&2
  exit 1
fi
for path in action.yml LICENSE README.md dist/index.js; do
  if ! git cat-file -e "${TREE}:${path}"; then
    printf 'orphan tree missing %s\n' "$path" >&2
    exit 1
  fi
done

COMMIT="$(
  git commit-tree "$TREE" -m "$(
    cat <<'EOF'
Publish slim Action tree for release/v1.

Orphan tree: action.yml, dist/**, LICENSE, README.md.
Never tag v1 at main. Floating @v1 points at this branch only.
EOF
  )"
)"

git update-ref refs/heads/release/v1 "$COMMIT"
printf 'Updated refs/heads/release/v1 -> %s\n' "$COMMIT"
