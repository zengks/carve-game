# CARVE web collaboration

## User-approved autonomy and coordination

- The user authorized proactive, useful development, fixes and tests without
  asking about routine implementation decisions (2026-10-30). Choose a concrete,
  evidence-based milestone, use a `codex/` task branch and finish its verification.
- Coordinate directly and bidirectionally with the existing mobile chat whenever
  useful; the user need not relay or approve individual messages. Web chat:
  `01a18660-65a5-78b1-949f-d7c826a4d449`; mobile chat:
  `01a186c0-3882-7453-be13-a4502baf2f22`, host `local`.
- Own changes in this repository. Share rules, findings and acceptance limits
  with `carve-mobile`; arrange explicit ownership/handoff before operating on a
  shared simulator. Avoid duplicate work and acknowledgment-only message loops.
- Preserve every existing simulator, app, save, profile and unrelated change.
  A failing test is not permission to reset data. Keep physical-device evidence,
  scripted checks, browser emulation and manual playthrough results distinct.
- Continue useful milestones from `TASKS.md` without routine user-input gates.
  Use Android emulators/iOS simulators only for device testing; do not request
  phone unlocks or test participation under the current unattended-work steering.
- Follow the latest release instructions and verify a branch preview before
  production. Keep gameplay experiments isolated. Autonomy does not authorize
  purchases, new hosted services, store publication or expanded security access.
- Keep the mobile download/deep-link prompt disabled until native store releases
  and their verified links are ready. Shared gameplay/data convergence remains
  a coordinated milestone; do not mix incompatible course records or wallets.
- Product goal added by the user (2026-10-30): both web and native CARVE should
  support earning sustainable income after public launch. Keep the shared revenue
  roadmap in `docs/expedition.md` and the mobile plan aligned. This is a planning
  requirement, not approval to activate payments/ads or a claim of proven demand.

## Verification

- `src/expedition.html` is the current self-contained browser game. Run
  `npm run build` for syntax, regression, input, recovery, course and build checks.
  Supported CI runtimes are Node 24 and 26.
- Use browser checks for changed UI and touch behavior. A scripted climb does
  not establish human comfort, fun, retention or physical iOS/Android readiness.
