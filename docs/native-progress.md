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

## Coordinated playable checkpoint — 2026-11-02

Web runtime checkpoint `3d3834c` passes the full browser/game/broker build suite,
the PostgreSQL regression suites and Node 24/26 push/PR checks. The Ready branch
preview keeps the native progress endpoint unconfigured; no hosted account or
save service has been enabled and the live game is unchanged.

Native's independently reviewed local integration receipt records 117 engine
assertions and 11 database checks across 10 cold client processes. Actual HTTP,
signed synthetic provider callbacks and PostgreSQL cover iOS-to-Android and
Android-to-iOS completed-result reads, account isolation, local unfinished
checkpoints, offline/503 recovery, a lost accepted-write reply and late signout.
This uses an encrypted test-file vault and automated course completion; it does
not establish OS Keychain/Keystore behavior, real provider sign-in or manual play.
The receipt SHA256 is
efe69efc641e93d4aa826a71a24adab4dc609851bbc04b7bc24f04f58cc00197.

A separate 12-assertion actual-HTTP/PostgreSQL test verifies expiry during a
climb: the original account's local course can finish, retain its pending result
and sync exactly once after explicit reauthentication. It uses the same
test-file-vault evidence boundary. Receipt SHA256:
a6b8910cf73763cf234941848a3a4b74f1cc06339561d65f1f2f152b723e9718.
Both fixtures closed their listeners and database pools with zero remaining
database connections. Their fresh databases and artifacts are retained.

The final source-matched headless integration repeats 117 engine/11 database
checks after the account-screen fix; receipt SHA256:
1e8710d3cab7dcdf10e3d2a8f6aac6fe1c2c5e7f5ca145636458f037176124c1.
The refreshed 12-check mid-climb receipt SHA256 is
ad4ccac1c33e354724bd13fa8f3fbecd0cb421c8d1c849be399792c59d5a6c70.

Final Release acceptance uses newly created iOS 26.5/Android targets and real
virtual Keychain/Keystore stores against the actual local HTTP/PostgreSQL route:
133 scripted app assertions, 10 database assertions and 20 OS-delivered interaction
assertions (10 XCTest, 10 ADB). It covers both directions of shared-result reads,
cold account/checkpoint recovery, guest isolation, owner changes, lost replies,
offline/503 retry, expiry/reauthentication, one-thumb launch and optional
two-thumb controls. The actual touch sequence includes signing in, reading shared
results, swiping from a sign-in button without activating it, and returning through
the fixed Back footer. Course completions are automated, not a manual playthrough.
Provider callbacks are signed synthetic identities, not real Apple/Google OAuth.
Receipt SHA256:
6275277cbe9056a257ba4562403410ca7341ec4c395d088ce91856679b2e95c0.

Independent web review matched all 80 runtime source hashes, 43 iOS/44 Android
export input hashes, both exported Release binaries and all 3 embedded reports
against their original files. Account/results screenshots show the reachable
safe-area Back footer. The selected iOS target passed PosterBoard observation
and delayed post-shutdown scanning. This is virtual-device evidence; physical
performance/ergonomics, real providers, HTTPS/App Links and hosted readiness stay
separate gates. Failed/truncated/navigation attempts are retained and excluded.

Fixes found through testing include accurate failed-signout feedback, compact
safe-area layout, a fixed Back footer and account-button drag propagation without
accidental sign-in. Android QA report framing now survives the native logger's
1023-byte limit and rejects incomplete or damaged reports; this is test tooling,
not a gameplay/network failure. The final source-matched integration and mid-climb
receipts above supersede earlier source checkpoints for the fixed build.

After native explicitly released the service, independent metadata checks found
all 3 final OS/integration/mid-climb databases retained with zero connections and
zero other client consumers. The exact original PostgreSQL container identity,
volume mounts and loopback bindings matched the pre-test baseline; it was restored
to its original stopped state and port 55532 refuses connections. No database,
volume, target, app or save was deleted. The private peer verification record is
/private/tmp/carve-peer-game-q1793649543476.json and contains no credentials.
Native's final preservation audit reports all 143 prior simulator identities/states
and 59 retained app/vault/AVD scope digests unchanged. The original 140-device,
52-scope baseline is an exact subset of that baseline. One protected Apple Maps
cache was checked through metadata only; its contents are unverified. Do not
describe this as a content hash of every prior file.
Both PR17 and PR46 stay draft/unmerged; live gameplay, payments and the mobile
download prompt are unchanged/disabled as applicable.
