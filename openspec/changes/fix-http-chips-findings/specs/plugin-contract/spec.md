## ADDED Requirements

### Requirement: Compose routes chips through the existing json http adapter
The Action compositor MUST route widget ids `json` and `chips` to the existing json http adapter slot. The compositor MUST NOT add a separate chips adapter key and MUST NOT rename that json slot. Widget `stats` MUST still route to github. Widget `feed` MUST remain on the feed adapter when injected.

Json plus chips in one Action run MUST NOT throw `UnhandledActionWidgetError`. A chips `fail_widget` after a successful json render MUST NOT drop the json writes. This change MUST NOT edit Action entry `main.ts`. Json is already injected there; chips MUST become handled by compose plus the http adapter.

#### Scenario: chips uses the json adapter slot
- **WHEN** compose receives widget id `chips`
- **THEN** it MUST invoke the existing json http adapter and MUST NOT fall through to github

#### Scenario: stats still uses github
- **WHEN** compose receives widget id `stats`
- **THEN** it MUST invoke the github adapter and MUST NOT send stats to the http adapter

#### Scenario: feed remains on the feed adapter
- **WHEN** compose receives widget id `feed` and a feed adapter is injected
- **THEN** it MUST invoke that feed adapter unchanged

#### Scenario: mixed json and chips does not throw unhandled Action widget
- **WHEN** yaml enables json and chips in one run
- **THEN** the Action MUST NOT throw `UnhandledActionWidgetError` for chips

#### Scenario: chips 404 does not drop json writes
- **WHEN** json renders successfully and chips then fails `fail_widget`
- **THEN** the Action MUST still write the json files and MUST NOT skip `writeFiles` because chips threw

#### Scenario: this change does not edit main.ts
- **WHEN** this change is applied
- **THEN** `packages/action/src/main.ts` MUST remain unedited and chips MUST be handled without a new compose key in that file

### Requirement: Http pack bitsUsed is Theme Frame Muted Chip
The first-party `http` pack MUST keep widgets `[json, chips]` and MUST declare `bitsUsed` `["Theme","Frame","Muted","Chip"]`. Json MAY use zero bits. Chips MUST NOT be restyled onto bits `Row` as a substitute for Chip chrome.

#### Scenario: pack widgets and bitsUsed
- **WHEN** the http pack identity is read
- **THEN** widgets MUST be `[json, chips]` and `bitsUsed` MUST be `["Theme","Frame","Muted","Chip"]`
