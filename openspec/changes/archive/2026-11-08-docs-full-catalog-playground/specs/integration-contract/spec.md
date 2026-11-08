## MODIFIED Requirements

### Requirement: rss integration needs no auth
Integration `rss` MUST use auth `none`. It MUST never send an `Authorization` header, including credentials taken from URL userinfo. It MUST NOT add a new Action token input. One rss client instance MUST be shared per Action, playground, or generate preview run. Playground and docs preview MUST wrap rss fixture XML by default (zero live feeds when no typed live https url). Docs preview MAY serve `/playground/rss` for pack `rss` widget `feed`. Docs preview MUST NOT add `feed` to the github playground widget-id list.

#### Scenario: rss auth none
- **WHEN** a widget uses integration `rss`
- **THEN** no `Authorization` header MUST be sent and no new Action token MUST be required

#### Scenario: url userinfo never becomes Authorization
- **WHEN** a feed URL includes a username or password
- **THEN** the client MUST fail the widget and MUST NOT send an `Authorization` header

#### Scenario: Shared rss client per run
- **WHEN** two callers in one run use integration `rss`
- **THEN** they MUST share one client instance for that integration

#### Scenario: Playground uses rss fixture XML by default
- **WHEN** the docs playground previews the feed widget without a typed live https url
- **THEN** it MUST wrap rss fixture XML with zero live feeds, MUST NOT invent a second static JSON pack, MAY serve `/playground/rss`, and MUST NOT add `feed` to the github playground widget-id list
