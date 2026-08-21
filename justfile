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

check:
    pnpm check

openspec *args:
    pnpm exec openspec {{ args }}
