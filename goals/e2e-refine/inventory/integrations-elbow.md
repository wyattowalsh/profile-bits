# New integrations elbow (inventory)

N = 4: `spotify`, `leetcode`, `chess`, `steam`. Rank 5 `codeforces` is the first peer-niche plateau.

| rank | id | auth | api | widgets | bits |
| ---: | --- | --- | --- | --- | --- |
| 1 | spotify | required (refresh + client id/secret env) | JSON | now-playing, top | Cover |
| 2 | leetcode | none | POST GraphQL (HTML fallback if blocked) | solved, heatmap | Heatmap |
| 3 | chess | none | JSON (chess.com + lichess) | ratings, game | Board |
| 4 | steam | required (`?key=`) | JSON | player, recent | Cover (shared) |
| 5 | codeforces | none | JSON | rating, activity | Heatmap | elbow |

Drop as packs: youtube (chips+rss), hashnode/dev.to (rss), npm/docker (chips), twitter (paid/hostile), github streak (same github integration after Heatmap).

OpenSpec must add auth schemes `oauth-refresh` and `query-key` before author-integration will copy them. Widget id `stats` is taken.

Chess is one pack, two integrations (`chesscom`, `lichess`).
