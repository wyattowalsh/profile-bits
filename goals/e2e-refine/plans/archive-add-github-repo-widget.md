# Workstream: archive-add-github-repo-widget

Wave 1 hygiene. `openspec/changes/add-github-repo-widget` is 28/28 complete and not archived.

## Files

- `openspec/changes/add-github-repo-widget/`
- `openspec/specs/` after archive/sync

## Steps

1. `pnpm exec openspec status --change add-github-repo-widget --json`
2. Archive or sync-specs so main specs include the repo widget contract.
3. Do not reopen implementation.

## Verify

- Change is in `openspec/changes/archive/` or specs list includes repo widget requirements
- `just check` still green after archive

## Graph nodes

| id | rank | deps |
| --- | ---: | --- |
| W1-A-01 | 0 | — |
