set shell := ["bash", "-euo", "pipefail", "-c"]

# Install workspace dependencies. T014 owns the lockfile; do not run until then.
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

# Renderer format smoke. Filled by T100/T101.
render *args:
    pnpm render {{ args }}

# Core codegen (thin action.yml). Filled by T030c. Pass `--check` in pre-commit/CI.
generate-action *args:
    pnpm generate-action {{ args }}

generate-docs *args:
    pnpm generate-docs {{ args }}

check:
    pnpm check

openspec *args:
    pnpm exec openspec {{ args }}
