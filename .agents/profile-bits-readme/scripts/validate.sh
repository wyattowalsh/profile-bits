#!/usr/bin/env bash
# Agent Plugin gate for profile-bits-readme (Agent Plugins 1.0.0).
# 1. Validate plugin.json against the vendored closed schema ($schema const).
# 2. Assert plugin.json identity (name profile-bits-readme, version 0.1.0, license MIT).
# 3. Reject mcp.json anywhere under the plugin root (recursive find).
# 4. Run `pnpm dlx skills-ref@0.1.5 validate` on skills/render.
#    Frontmatter name MUST match the skill directory.
# 5. If generate-action exists, run `just generate-action --check` (or `pnpm generate-action --check`).
# 6. Fail if any template resolves outside the plugin root (Node fs.realpathSync +
#    path.relative). Do not content-grep `../` (comments that say “do not use ../”
#    must not false-fail). Walking up to the repo root at runtime is allowed.
set -euo pipefail

SKILLS_REF_PIN="0.1.5"

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
const identity = [
  ["name", "profile-bits-readme"],
  ["version", "0.1.0"],
  ["license", "MIT"],
];
for (const [key, expected] of identity) {
  if (manifest[key] !== expected) {
    errors.push(
      `$: ${key} must be ${JSON.stringify(expected)}, got ${JSON.stringify(manifest[key])}`,
    );
  }
}
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
  local matches
  matches="$(find "$plugin_root" -name mcp.json -print)"
  if [[ -n "$matches" ]]; then
    printf 'error: mcp.json is not allowed in this plugin (v0 has no MCP):\n%s\n' "$matches" >&2
    exit 1
  fi
}

assert_templates_contained() {
  local plugin_root="$1"
  local skills_dir="$plugin_root/skills"
  [[ -d "$skills_dir" ]] || return 0

  PLUGIN_ROOT="$plugin_root" node --input-type=module 3< <(
    find "$skills_dir" \( -path '*/assets/templates/*' -o -name '*.template' \) -print0 2>/dev/null
  ) <<'EOF'
import { readFileSync, realpathSync } from "node:fs";
import path from "node:path";

const pluginRoot = process.env.PLUGIN_ROOT;
if (!pluginRoot) {
  console.error("error: PLUGIN_ROOT is required for template containment");
  process.exit(1);
}

let rootReal;
try {
  rootReal = realpathSync(pluginRoot);
} catch (error) {
  console.error(`error: cannot resolve plugin root ${pluginRoot}: ${error.message}`);
  process.exit(1);
}

let raw;
try {
  raw = readFileSync(3);
} catch (error) {
  console.error(`error: cannot read template path list: ${error.message}`);
  process.exit(1);
}

const candidates = raw.toString("utf8").split("\0").filter(Boolean);
let failed = false;

for (const candidate of candidates) {
  let resolved;
  try {
    resolved = realpathSync(candidate);
  } catch (error) {
    console.error(
      `error: cannot resolve template path ${candidate}: ${error.message}`,
    );
    failed = true;
    continue;
  }
  const rel = path.relative(rootReal, resolved);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    console.error(
      `error: template path escapes plugin root: ${candidate} -> ${rel}`,
    );
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}
EOF
}

validate_skill_dir() {
  local plugin_root="$1"
  local skill_dir="$2"
  local skill_id
  skill_id="$(basename "$skill_dir")"
  (cd "$plugin_root" && pnpm dlx "skills-ref@${SKILLS_REF_PIN}" validate "skills/${skill_id}")
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
  command -v pnpm >/dev/null 2>&1 || die "pnpm is required to run skills-ref@${SKILLS_REF_PIN}"

  local skill_dir skill_id
  shopt -s nullglob
  for skill_dir in "$skills_dir"/*/; do
    skill_id="$(basename "$skill_dir")"
    [[ "$skill_id" == .* ]] && continue
    require_skill_name_matches_dir "${skill_dir%/}"
    printf 'validating skill %s\n' "$skill_id"
    validate_skill_dir "$plugin_root" "${skill_dir%/}"
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
assert_templates_contained "$PLUGIN_ROOT" \
  || die "template path escapes plugin root (Agent Plugins containment)"
run_generate_action_check

printf 'ok: %s\n' "$PLUGIN_ROOT"
