## ADDED Requirements

### Requirement: Action writes coding files under output_dir
When widget `coding` renders successfully, the Action MUST write the card under yaml `output_dir` using yaml `filename` (default `wakatime`) plus the format extension (`svg` → `wakatime.svg`). `output_pair: true` MUST still write `filename` plus `filename-dark` under `output_dir`. The coding widget MUST stay HTTP-free: the Action fetches via the shared wakatime client (`fetchStats`) and then calls `renderCodingSvg`. The Action MUST NOT add a widget-package `renderCodingFromClient` helper.

Empty payload after filters MUST write a “No coding data” card (this is `render`, not skip). A 404 stats response MUST be `fail_widget` and MUST NOT write files. A 401 MUST be `fail_run` and MUST NOT write files. A skipped coding widget MUST NOT write or overwrite files (inherited skip-without-write). Card size MUST remain 480×160.

`dry_run` MUST list the would-be coding files and MUST set `did_commit` false. `dry_run` MUST NOT call commit or gist ports.

#### Scenario: coding render writes under output_dir filename
- **WHEN** the wakatime pack is on, a token is present, and stats fetch succeeds
- **THEN** the Action MUST write the coding card under `output_dir` using `filename` (default `wakatime.svg` for svg) and the opening SVG MUST be 480×160

#### Scenario: empty coding payload still writes
- **WHEN** stats fetch succeeds and the payload has no remaining rows after filters
- **THEN** the Action MUST write a “No coding data” card under `output_dir` and MUST NOT skip the widget

#### Scenario: coding 404 writes no files
- **WHEN** the wakatime stats endpoint returns HTTP 404
- **THEN** the widget MUST fail (`fail_widget`) and the Action MUST NOT write that widget’s output file

#### Scenario: coding 401 fails the run without write
- **WHEN** the wakatime stats endpoint returns HTTP 401
- **THEN** the run MUST fail (`fail_run`) and the Action MUST NOT write coding output

#### Scenario: dry_run lists coding files and does not commit
- **WHEN** coding would write files and `dry_run` is true
- **THEN** the Action MUST list those files, MUST set `did_commit` false, and MUST NOT call commit or gist ports
