# Goal: e2e-refine

Finish the in-flight docs playground and README closeout, widen the four shipped integrations into complete typed dumps, then OpenSpec-first bits plus elbow new sources (`spotify`, `leetcode`, `chess`, `steam`) so profile-bits is as complete as the locks allow.

Shared understanding is [facts.md](facts.md). Execution order and workstreams are [plan.md](plan.md) plus [plans/](plans/). Grok Build runs [.grok/workflows/e2e-refine.rhai](../../.grok/workflows/e2e-refine.rhai) after this package is approved.

## Done

- Wave 1 can start: docs-full-catalog-playground, README stills/copy, Marketplace operator checklist, archive `add-github-repo-widget`.
- Facts are accepted and testable.
- Each first-class plan names files/systems and verification.
- `plan.md` passed Plannotator `--gate` (hyperfine DAG). Execution is `/e2e-refine-complete`.
- `/goal goals/e2e-refine/goal.md` is the launch command.
- Workflow: `/e2e-refine` with `args.wave` = `1` | `2` | `3` | `all` and optional `args.rank` to rerun one barrier. One implementer per graph node; same-file writes stay sequential.
