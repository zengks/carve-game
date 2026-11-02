# First Ascent shared saves — agreed native/web v1

2026-11-02. Preview only: PR17 and mobile PR46 stay draft/unmerged. This contract
is agreed with carve-mobile. The preview endpoint/database code now implements
this contract; real PostgreSQL and independent native integration are separate
acceptance checkpoints. No hosted/provider setup, old-data migration, payment or live change.

## Identity and transport

POST `/api/native-progress/v1` uses the existing broker's native-purpose bearer
and X-Carve-Native-Binding. Cookie/Origin headers (including empty) reject. Only
registered broker clients listed in the separate server-only
CARVE_NATIVE_PROGRESS_CLIENTS JSON alias-to-ios/android map may call it. This map
is provenance checking, not OS attestation or anti-cheat verification.
Production and unconfigured environments independently stay disabled.

Input <=8192 UTF-8 bytes, output <=16384 bytes, strict exact JSON schemas and no
duplicate decoded keys at any nesting level. Replies are no-store/no-referrer,
no cookies/CORS. Same raw Fetch adapter as the native broker; no provider/app
secret belongs in a URL. Original session expiry never extends on save/read.

Exact request common keys:

- contract_version: integer1
- action: read or write
- client_id: registered alias
- account_scope: expected current 64-lowercase-hex account scope
- testing: boolean

Write adds only event. The expected scope is a mismatch guard, never an owner
selector. Player/scope derive from the locked, live server session and canonical
identity map. A changed scope rejects409; invalid/revoked/expired authority401.
Authorization and the result read/write share a transaction and native instance
lock with signout. No client player_id is accepted. Late client replies need the
native generation/context guard before applying or acknowledging any data.

## Completed event

Exact root: contract_version,event_id,kind,course_id,rules_version,mode,
source_platform,payload. Values:

- contract_version1, kind completed_run
- course_id native.first-ascent-v1; rules_version native-fa-rules-1
- mode guided or replay; source_platform ios or android
- event_id = course_id + ':' + canonical lowercase UUID payload.run_id

Exact payload10: run_id,course_version,rules_version,tutorial_version,active_ms,
best_chain,falls,resumed,tutorial_mask,testing.

| Payload | Accepted value | Native meaning |
| --- | --- | --- |
| course_version | first-ascent-1 | Existing fixed First Ascent course1 |
| rules_version | integer1 | Explicit root native-fa-rules-1 mapping |
| tutorial_version | integer1 | Five teaching bits, completion bit16 |
| active_ms | integer1..86400000 | Active course time incl falls/recovery, excluding pause/background |
| best_chain | integer0..10 | Distinct-surface chain, not Flow height/score |
| falls | integer0..10000 | Course falls |
| resumed | boolean | Continuous and resumed bests kept separate |
| tutorial_mask | integer0..31 with bit16 set | Actual completed-run teaching snapshot |
| testing | boolean matching request | Separate record/progress bucket; not verification |

run_id is immutable and independent of source device. The stored event cannot
change on retry. Every write, including a retry, must match the registered
client's source platform. Cross-device reads contain both platforms; native only
retries original local pending events from a platform-bound profile. Controls and
outcome fields are omitted: existing native records do not capture real control
history, and completed_run plus bit16 establishes the completion claim. It is
still client-reported, not server-verified gameplay.

No active run, height, score, wallet, entitlement, standalone teaching/unlock,
automatic guest import, Stage D/E import or web Flow conversion is accepted.
Preview shell records use testing=true. Future testing=false records stay a
separate bucket and are equally client-reported.

## Snapshot and acknowledgment

Exact read success keys:
contract_version,client_id,result,player_id,account_scope,course_id,rules_version,
tutorial_version,testing,revision,completed,tutorial_mask,bests,recent_events,validation.

result is snapshot for read, accepted for write. Constants match the event's root
course/rules, tutorial_version1 and validation client_reported. A write adds only
accepted_event: the full immutable stored event, even if its original receipt is
older than the recent20. Native must compare that entire validated event to its
frozen pending payload before acknowledging it; an ID alone is insufficient.

Revision is a nonnegative safe integer scoped to player/course/rules/testing.
Only a newly accepted event increments it. Same-event retry does not. Empty
snapshot: revision0,completed=false,tutorial_mask0,bests[],recent_events[].
An old same-owner snapshot revision cannot replace newer progress; a matching
accepted_event may still acknowledge its pending event independently.

bests contains at most4 exact entries {mode,resumed,best_time_ms,best_chain,
fewest_falls}, sorted mode then resumed. Time/falls are MIN, chainMAX, grouped by
guided/replay x resumed/continuous within the testing bucket. These extrema may
come from different completed runs. Tutorial bits OR only accepted complete runs.
recent_events contains at most20 full envelopes ordered server receipt time DESC,
event_id DESC, not client completion time. Returned source provenance is unchanged.

Results are immutable per player/event ID. Same canonical JSON returns accepted;
a changed payload returns event_conflict409 without changing progress. Different
accounts cannot select/read/write each other's rows through caller fields. This
is not proof that a malicious player actually completed a client-reported run.

## Errors and release gates

Exact error reply {contract_version:1,error:<code>}:

- 400 invalid_request,unsupported_contract,invalid_event,unsupported_course,platform_mismatch
- 401 sign_in_required
- 403 client_rejected
- 409 account_changed,event_conflict
- 405 method_not_allowed;413 request_too_large;415 json_required
- 503 not_configured,unavailable

Network/503 keeps frozen pending data for retry;409 never silently overwrites or
moves it. A partial HTTP failure after a commit retries the same event. Session
ownership and native generation changes must prevent stale read/ack application.

Private native result/progress tables and shared canonical player identity are
used only in newly created retained QA databases until approved hosted setup.
Existing Flow validators/tables/snapshots and Stage D native backend stay intact.
Real OAuth/browser/App-Link/TLS, production session TTL/refresh UX, rate/retention
operations, hosted migration and monetary systems remain separate release gates.

Reviewed vectors: shared/fixtures/native-first-ascent-v1.json and
native-first-ascent-cases-v1.json. Native mirrors independently before integration.

Implementation checkpoint:52 synthetic-transaction API assertions pass, alongside
75 contract vectors and unchanged broker readiness checks. No database/service
was started for that checkpoint; it is not real PostgreSQL acceptance.

Real PostgreSQL checkpoint:113 assertions pass against actual signed synthetic
broker callbacks and the actual Fetch progress route in a newly created retained
QA database. Covers same-owner iOS/Android reads, strict source writes, concurrent
new/retry events, full echoes after recent-history truncation, immutable conflicts,
canonical-owner fault rejection, RLS, untouched Flow tables, scoped signout and
expiry during a held SQL row lock. Read/write never renew original session time.
Independent native integration and hosted/provider readiness remain separate.
