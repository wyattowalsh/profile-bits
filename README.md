# profile-bits

`profile-bits` is a github profile page widget generator. It uses a plugin-based architecture where each plugin enables full widget customization & configuation. It builds off of the [`Takumi`](https://takumi.kane.tw/llms-full.txt) image renderer.

Visual identity and architecture live in [DESIGN.md](DESIGN.md). Requirement contracts live in [openspec/specs/](openspec/specs/).

---

- pre-commit
- ci/cd (gh actions)
- justfile
- pnpm
- fumadocs (fully extended/configured (eg SEO/AEO optimizations))
  - NOTE: use the `shadcn` fumadocs theme + tailwindcss
- (nested) `AGENTS` agent instruction files
- takumi (https://takumi.kane.tw/llms-full.txt)

## questions

