set shell := ["bash", "-euo", "pipefail", "-c"]

# Install workspace dependencies.
install:
    pnpm install

lint:
    pnpm lint

test:
    pnpm test

docs:
    pnpm docs

docs-dev:
    pnpm docs-dev

# Local CLI (`profile-bits render`). Extra flags after `--`.
render *args:
    pnpm render -- {{ args }}

# Core codegen (thin action.yml). Pass `--check` in pre-commit/CI.
generate-action *args:
    pnpm generate-action {{ args }}

# Playground-fields snapshot. Pass `--check` in pre-commit/CI.
generate-docs *args:
    pnpm generate-docs {{ args }}

# Agent Plugins 1.0.0 gates for author + consumer plugin trees.
validate-agent-plugins:
    bash .agents/profile-bits/scripts/validate.sh
    bash .agents/profile-bits-readme/scripts/validate.sh

check:
    pnpm check
    just validate-agent-plugins

openspec *args:
    pnpm exec openspec {{ args }}
