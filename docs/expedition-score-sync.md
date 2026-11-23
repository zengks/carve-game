# Expedition score sync preview

The browser and native clients use the same private CARVE account and store
completed Expedition results under `carve.expedition-v1` and `terrain-v1`.
Practice, Challenge and testing results have separate rankings. Local guest
play works with or without sign-in. The Account screen lets a player review
the completed results on the device and confirm the destination account before
copying. Sign-in, refresh, review and cancel send no unapproved results.

The copy includes height, score, active time, mode and banked or game-over
status. It keeps the original record and source platform. Active climbs,
wallets, skills, legacy course scores and purchases remain in their existing
storage. The shared list displays unverified personal records.

## Wire contract

See [the shared examples](../shared/fixtures/expedition-scores-v1.json).
The event ID combines course, source platform and the existing run ID.
The backend derives the owner from the verified session and checks the expected
account scope. The browser uses same-origin cookies and
`/api/expedition-progress?testing=true`. The native broker uses
`expedition_read` and `expedition_write` on `/api/native-progress/v1` with
its existing bearer and installation binding. Writes return the full immutable
`accepted_event` in addition to the snapshot.

Each account and testing bucket has a revision equal to its accepted result
count. Repeating the same result keeps the revision unchanged. Changing a
stored event returns a conflict. Each mode displays up to ten results sorted by
height descending, score descending, active time ascending and event ID
ascending. Private result rows and original course data reuse the existing
schema. No database migration is needed for this increment.

## Preview and tests

The browser preview entry is `/?terrain=1`. Its hosted runtime requires
`CARVE_EXPEDITION_SYNC_ENABLED=1` alongside the existing account and native
session configuration. Both transports reject the feature in production, and
the production static build omits the account JavaScript bundle.

`npm run build` exercises the full browser suite. The additional
`tests/expedition-score-database.mjs` test uses a fresh retained loopback
PostgreSQL database and the actual HTTP handlers, with signed synthetic
Google identities and the browser account module driven through test DOM
handlers. It covers the confirmation boundary, review cancellation, shared
reads on iOS and Android transport, lost receipts, account switches and
unchanged legacy courses. Hosted credentials and OS UI testing require
their own acceptance evidence.
