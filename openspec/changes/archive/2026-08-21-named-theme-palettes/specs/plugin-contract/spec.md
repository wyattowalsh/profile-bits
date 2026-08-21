## MODIFIED Requirements

### Requirement: Yaml document shape
A valid yaml document MUST accept exactly this shape (unknown keys fail parse). Root fields MUST be `version`, `format`, `theme`, `output_pair`, `animated`, `timezone`, `output_dir`, and `plugins`. Default values MUST match:

```yaml
version: 1
format: svg
theme: dark
output_pair: false
animated: false
timezone: UTC
output_dir: profile-bits
plugins:
  github:
    widgets:
      stats:
        filename: stats
        include: [followers, repos, stars]
        hide_rank: true
        avatar: true
        animate: false
        include_private: false
        include_forks: false
        include_archived: false
      languages:
        filename: languages
        limit: 8
        min_pct: 1
        exclude: []
        animate: false
        include_private: false
        include_forks: false
        include_archived: false
```

`theme` MUST be a named catalog id string **or** a custom object `theme: { custom: { bg, card, text, muted, accent, border, pair? } }` (default named id `dark`). Named ids MUST be one of the 47 catalog ids defined by `theme-catalog`. Custom role values MUST be color refs `{flavorId}.{swatchId}` | `{flavorId}.{role}` | hex `#RGB` / `#RRGGBB` / `#RRGGBBAA`. `pair` MUST be a named catalog id **or** a second 7-role map (the opposite polarity file). This change MUST NOT add first-party plugin ids. Theme MUST remain a run-global root field (not under `plugins.*`).

When `output_pair` is true, the Action MUST write polarity files under `output_dir`: `{filename}` MUST be the light member of the pair and `{filename}-dark` MUST be the dark member of the pair. `theme` selects the family and which dark/light flavor when a family has several. When `output_pair` is false, the Action MUST write `{filename}` only in the selected flavor (even if that flavor is dark). `format: apng` MUST use a `.png` extension. Tokens, `user`, `output_action`, `dry_run`, `allow_skipped`, `committer_*`, `output_condition`, and `config` path MUST stay in thin `action.yml`, not in this yaml document.

#### Scenario: Default yaml shape
- **WHEN** a consumer commits the default `.github/profile-bits.yml`
- **THEN** parse MUST succeed with `version: 1`, `format: svg`, `theme: dark`, `output_pair: false`, `animated: false`, `timezone: UTC`, `output_dir: profile-bits`, and github widgets `stats` and `languages` using the default option values above

#### Scenario: output_pair writes paired files
- **WHEN** yaml `output_pair` is true
- **THEN** the Action MUST write both `filename` and `filename-dark` under `output_dir`

#### Scenario: output_pair polarity files
- **WHEN** yaml `output_pair` is true and `theme` is `catppuccin-mocha`
- **THEN** the Action MUST write the light pair member (`catppuccin-latte`) as `{filename}` and the dark member (`catppuccin-mocha`) as `{filename}-dark`

#### Scenario: output_pair false writes selected flavor only
- **WHEN** yaml `output_pair` is false and `theme` is a dark named id
- **THEN** the Action MUST write `{filename}` only in that selected flavor and MUST NOT write `{filename}-dark`

#### Scenario: Named theme id parses
- **WHEN** yaml `theme` is `catppuccin-mocha`
- **THEN** parse MUST succeed and MUST treat the run theme as that named id

#### Scenario: Custom theme object parses
- **WHEN** yaml `theme` is `{ custom: { bg, card, text, muted, accent, border } }` with valid color refs
- **THEN** parse MUST succeed

## ADDED Requirements

### Requirement: Unknown theme ids and custom refs fail parse
Unknown named theme ids MUST fail parse. Custom theme parse MUST fail when any color ref’s flavor, swatch, or role is unknown, when hex is malformed, when a required role (`bg`, `card`, `text`, `muted`, `accent`, `border`) is missing, or when `output_pair` is true with a custom theme and `pair` is absent. Parse MUST NOT silently fall back to `dark`. Unknown yaml keys MUST still fail parse. This schema widening is a freeze exception for this change only; the system MUST NOT add further first-party plugin ids or flattened color inputs in this change.

#### Scenario: Unknown named id fails parse
- **WHEN** yaml `theme` is `radical` or another id not in the 47-id catalog
- **THEN** parse MUST fail the job and MUST NOT fall back to `dark`

#### Scenario: Unknown custom ref fails parse
- **WHEN** a custom role ref uses an unknown flavor, swatch, or role
- **THEN** parse MUST fail the job

#### Scenario: Custom missing role fails parse
- **WHEN** yaml `theme.custom` omits `bg`, `card`, `text`, `muted`, `accent`, or `border`
- **THEN** parse MUST fail the job

#### Scenario: Custom plus output_pair without pair fails parse
- **WHEN** yaml `output_pair` is true and `theme.custom` has no `pair`
- **THEN** parse MUST fail the job

### Requirement: Thin Action theme override is named id only
The thin Action `theme` input MUST accept a named catalog id string only. The Action MUST reject `theme: custom` and MUST NOT accept a custom object as an Action input. When yaml uses a custom object and the Action `theme` input is a named id, the Action named id MUST win. The Action MUST NOT add flattened `plugin_<plugin>_<widget>_<color>` inputs or other color Marketplace inputs. Codegen `--check` MUST fail if a generated input matches a flattened color name.

#### Scenario: Action theme named id overrides yaml
- **WHEN** yaml `theme` is a custom object and the Action `theme` input is `nord`
- **THEN** the run MUST use `nord`

#### Scenario: Action theme custom fails
- **WHEN** the Action `theme` input is `custom`
- **THEN** the Action MUST fail and MUST NOT treat that input as a custom mix

#### Scenario: Flattened color inputs are rejected
- **WHEN** generated `action.yml` contains `plugin_github_stats_bg` or another `plugin_<plugin>_<widget>_<color>` name
- **THEN** `generate-action --check` MUST fail
