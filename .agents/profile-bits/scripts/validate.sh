#!/usr/bin/env bash
# Agent Plugin gate for profile-bits (Agent Plugins 1.0.0).
# 1. Validate plugin.json against the vendored closed schema ($schema const).
# 2. Reject mcp.json if present.
# 3. Run `pnpm dlx skills-ref validate` on each skills/<id> (agentskills fallback).
#    Frontmatter name MUST match the skill directory.
# 4. If generate-action exists, run `just generate-action --check` (or `pnpm generate-action --check`).
# 5. Fail if any template path contains `../`.
# Walking up to the repo root at runtime is allowed and is not a template `../`.
set -euo pipefail

die() {
  printf 'error: %s\n' "$*" >&2
  exit 1
}

require_node_24() {
  command -v node >/dev/null 2>&1 || die "Node 24 or newer is required"
  local major
  major="$(node -p "process.versions.node.split('.')[0]")"
  if [[ "$major" -lt 24 ]]; then
    die "Node 24 or newer is required, found $(node -v)"
  fi
}

find_repo_root() {
  local dir="$1"
  while [[ -n "$dir" && "$dir" != "/" ]]; do
    if [[ -f "$dir/justfile" && -f "$dir/pnpm-workspace.yaml" ]]; then
      printf '%s\n' "$dir"
      return 0
    fi
    dir="$(dirname "$dir")"
  done
  return 1
}

justfile_has_recipe() {
  local root="$1"
  local recipe="$2"
  [[ -f "$root/justfile" ]] || return 1
  if command -v just >/dev/null 2>&1; then
    if (cd "$root" && just --list) 2>/dev/null | grep -Eq "(^|[[:space:]])${recipe}([[:space:]]|$)"; then
      return 0
    fi
  fi
  grep -Eq "^${recipe}([[:space:]:*]|$)" "$root/justfile"
}

pnpm_has_script() {
  local root="$1"
  local script="$2"
  [[ -f "$root/package.json" ]] || return 1
  PACKAGE_JSON="$root/package.json" SCRIPT_NAME="$script" node --input-type=module <<'EOF'
import { readFileSync } from "node:fs";
const pkg = JSON.parse(readFileSync(process.env.PACKAGE_JSON, "utf8"));
process.exit(pkg.scripts?.[process.env.SCRIPT_NAME] ? 0 : 1);
EOF
}

has_repo_task() {
  local root="$1"
  local name="$2"
  justfile_has_recipe "$root" "$name" || pnpm_has_script "$root" "$name"
}

run_just_or_pnpm() {
  local root="$1"
  shift
  if command -v just >/dev/null 2>&1 && [[ -f "$root/justfile" ]]; then
    (cd "$root" && just "$@")
    return
  fi
  command -v pnpm >/dev/null 2>&1 || die "just or pnpm is required to run: $*"
  (cd "$root" && pnpm "$@")
}

validate_plugin_json() {
  local plugin_json="$1"
  local schema_json="$2"
  [[ -f "$plugin_json" ]] || die "missing plugin.json at $plugin_json"
  [[ -f "$schema_json" ]] || die "missing vendored schema at $schema_json (needed for offline validate)"

  PLUGIN_JSON="$plugin_json" PLUGIN_SCHEMA="$schema_json" node --input-type=module <<'EOF'
import { readFileSync } from "node:fs";

const pluginPath = process.env.PLUGIN_JSON;
const schemaPath = process.env.PLUGIN_SCHEMA;

function jsonType(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function validate(schema, instance, path) {
  const errors = [];
  if (schema.type && jsonType(instance) !== schema.type) {
    errors.push(`${path}: expected type ${schema.type}, got ${jsonType(instance)}`);
    return errors;
  }
  if (Object.prototype.hasOwnProperty.call(schema, "const") && instance !== schema.const) {
    errors.push(`${path}: must equal ${JSON.stringify(schema.const)}`);
  }
  if (schema.type === "string") {
    if (schema.minLength != null && instance.length < schema.minLength) {
      errors.push(`${path}: shorter than minLength ${schema.minLength}`);
    }
    if (schema.maxLength != null && instance.length > schema.maxLength) {
      errors.push(`${path}: longer than maxLength ${schema.maxLength}`);
    }
    if (schema.pattern) {
      const pattern = new RegExp(schema.pattern);
      if (!pattern.test(instance)) {
        errors.push(`${path}: does not match pattern ${schema.pattern}`);
      }
    }
  }
  if (schema.type === "array" && schema.items) {
    instance.forEach((item, index) => {
      errors.push(...validate(schema.items, item, `${path}/${index}`));
    });
  }
  if (schema.type === "object") {
    const properties = schema.properties ?? {};
    const required = schema.required ?? [];
    for (const key of required) {
      if (!Object.prototype.hasOwnProperty.call(instance, key)) {
        errors.push(`${path}: missing required property ${key}`);
      }
    }
    for (const [key, value] of Object.entries(instance)) {
      const child = `${path}/${key}`;
      if (Object.prototype.hasOwnProperty.call(properties, key)) {
        errors.push(...validate(properties[key], value, child));
      } else if (schema.additionalProperties === false) {
        errors.push(`${path}: additional property not allowed: ${key}`);
      } else if (
        schema.additionalProperties &&
        typeof schema.additionalProperties === "object"
      ) {
        errors.push(...validate(schema.additionalProperties, value, child));
      }
    }
  }
  return errors;
}

let schema;
let manifest;
try {
  schema = JSON.parse(readFileSync(schemaPath, "utf8"));
} catch (error) {
  console.error(`error: invalid schema JSON at ${schemaPath}: ${error.message}`);
  process.exit(1);
}
try {
  manifest = JSON.parse(readFileSync(pluginPath, "utf8"));
} catch (error) {
  console.error(`error: invalid plugin.json at ${pluginPath}: ${error.message}`);
  process.exit(1);
}

const errors = validate(schema, manifest, "$");
if (errors.length > 0) {
  console.error("error: plugin.json failed Agent Plugins 1.0.0 validation:");
  for (const error of errors) {
    console.error(`  ${error}`);
  }
  process.exit(1);
}
EOF
}

reject_mcp_json() {
  local plugin_root="$1"
  if [[ -e "$plugin_root/mcp.json" ]]; then
    die "mcp.json is not allowed in this plugin (v0 has no MCP)"
  fi
}

template_paths_contain_parent() {
  local plugin_root="$1"
  local skills_dir="$plugin_root/skills"
  [[ -d "$skills_dir" ]] || return 0

  local failed=0
  local path rel target

  while IFS= read -r -d '' path; do
    rel="${path#"$plugin_root/"}"
    if [[ "$rel" == *'..'* ]]; then
      printf 'error: template path contains ../: %s\n' "$rel" >&2
      failed=1
    fi
    if [[ -L "$path" ]]; then
      target="$(readlink "$path")"
      if [[ "$target" == *'..'* ]]; then
        printf 'error: template path contains ../: %s -> %s\n' "$rel" "$target" >&2
        failed=1
      fi
    fi
    if [[ -f "$path" ]] && grep -n -E '\.\./' "$path" >/dev/null 2>&1; then
      printf 'error: template path contains ../ in %s:\n' "$rel" >&2
      grep -n -E '\.\./' "$path" >&2 || true
      failed=1
    fi
  done < <(
    find "$skills_dir" \( -path '*/assets/templates/*' -o -name '*.template' \) -print0 2>/dev/null
  )

  [[ "$failed" -eq 0 ]]
}

is_missing_package_error() {
  printf '%s' "$1" | grep -Eqi \
    'ERR_PNPM_FETCH_404|ERR_PNPM_NO_MATCHING_VERSION|404 Not Found|No matching version|Cannot find package|command not found|Unknown command'
}

validate_skill_dir() {
  local skill_dir="$1"
  local output status

  set +e
  output="$(pnpm dlx skills-ref validate "$skill_dir" 2>&1)"
  status=$?
  set -e
  if [[ "$status" -eq 0 ]]; then
    printf '%s\n' "$output"
    return 0
  fi

  if is_missing_package_error "$output"; then
    printf 'skills-ref unavailable; trying agentskills CLI\n' >&2
    set +e
    output="$(pnpm dlx agentskills validate "$skill_dir" 2>&1)"
    status=$?
    set -e
    if [[ "$status" -eq 0 ]]; then
      printf '%s\n' "$output"
      return 0
    fi
    if command -v agentskills >/dev/null 2>&1; then
      agentskills validate "$skill_dir"
      return
    fi
  fi

  printf '%s\n' "$output" >&2
  return "$status"
}

skill_frontmatter_name() {
  local skill_md="$1"
  awk '
    BEGIN { in_fm = 0 }
    NR == 1 && $0 == "---" { in_fm = 1; next }
    in_fm && $0 == "---" { exit }
    in_fm && $0 ~ /^name:[[:space:]]*/ {
      sub(/^name:[[:space:]]*/, "")
      gsub(/^["'\'']+|["'\'']+$/, "")
      print
      exit
    }
  ' "$skill_md"
}

require_skill_name_matches_dir() {
  local skill_dir="$1"
  local skill_id
  skill_id="$(basename "$skill_dir")"
  local skill_md="$skill_dir/SKILL.md"
  [[ -f "$skill_md" ]] || die "missing SKILL.md in skills/${skill_id}"
  local declared
  declared="$(skill_frontmatter_name "$skill_md")"
  [[ -n "$declared" ]] || die "skills/${skill_id}/SKILL.md missing frontmatter name"
  [[ "$declared" == "$skill_id" ]] ||
    die "skill name '${declared}' must match directory '${skill_id}'"
}

validate_skills() {
  local plugin_root="$1"
  local skills_dir="$plugin_root/skills"
  [[ -d "$skills_dir" ]] || return 0

  local skill_dir skill_id
  shopt -s nullglob
  for skill_dir in "$skills_dir"/*/; do
    skill_id="$(basename "$skill_dir")"
    [[ "$skill_id" == .* ]] && continue
    require_skill_name_matches_dir "${skill_dir%/}"
    printf 'validating skill %s\n' "$skill_id"
    validate_skill_dir "${skill_dir%/}"
  done
  shopt -u nullglob
}

run_generate_action_check() {
  local repo_root=""
  if ! repo_root="$(find_repo_root "$PLUGIN_ROOT")"; then
    return 0
  fi
  if has_repo_task "$repo_root" "generate-action"; then
    printf 'running generate-action --check\n'
    run_just_or_pnpm "$repo_root" generate-action --check
  fi
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

require_node_24
validate_plugin_json \
  "$PLUGIN_ROOT/plugin.json" \
  "$PLUGIN_ROOT/references/plugin.schema.json"
reject_mcp_json "$PLUGIN_ROOT"
validate_skills "$PLUGIN_ROOT"
template_paths_contain_parent "$PLUGIN_ROOT" \
  || die "template path contains ../ (Agent Plugins containment)"
run_generate_action_check

printf 'ok: %s\n' "$PLUGIN_ROOT"
