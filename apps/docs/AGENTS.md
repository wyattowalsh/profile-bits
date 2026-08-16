# @profile-bits/docs

Fumadocs + shadcn playground (`/playground`, `/playground/github`). Emits thin Action YAML, `.github/profile-bits.yml`, and README markdown for the user to paste.

## Preview

- `POST /api/preview` is a **docs layout/time-axis preview**, not a stable embed API. Do not cache or document it as one.
- Dual pane: WASM layout + README mode (`renderSvg` / `renderAnimation` bytes).
- **No App token → fixtures, zero outbound GitHub.** Never unauthenticated REST. Never log visitor tokens (sessionStorage only).
- Playground is not a Camo/sanitize oracle.

`ImageResponse` (`takumi-js/response`) is allowed here for still frames; animation preview uses `renderAnimation` and returns the file.
