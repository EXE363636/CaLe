# In-App Chat / Contact — Readiness Decision (DEFERRED)

**Date:** 2026-05-30
**Task:** CORE-STABILITY-6 Part 6
**Decision:** **Defer.** Do not add a general chat/contact feature in
this stability pass.

## Why defer

Per the standing guardrail, chat/contact is only added once the final
assessment says the **core is stable AND complete**. CORE-STABILITY-6 is
a stability/bug pass — it fixes wallet withdrawal, deposit guards,
notification dedup/timestamps, and same-route intents. Several product
capabilities are still in flight or only proposed:

- Calendar availability + shift recommendation — **deferred proposal**
  (`calendar-availability-proposal.md`).
- Staff-supply / agency actor — **deferred proposal**
  (`staff-supply-proposal.md`).

Adding a real-time-feeling chat now would:

1. Introduce a new persistence shape (message threads) and a polling/
   event surface — and the project bans `setTimeout`/`setInterval`/
   polling for lifecycle, so a live chat would need careful design to
   stay within the `useLifecycleSync` + `AppHydrator` model.
2. Add a new route (chat inbox), breaching the **28-route invariant**.
3. Expand the moderation/abuse surface (free-text between strangers)
   with no backend to moderate it.

None of that belongs in a stability pass.

## What already covers the communication need

- **Notifications** (in-app, now timestamped + deduped) cover every
  lifecycle event both parties need: applied, approved, checked-in,
  checked-out, paid, disputed, resolved.
- **Disputes** already provide a structured, two-way, evidence-backed
  exchange channel (worker ↔ employer ↔ admin) for the one case where
  free text genuinely matters — a contested shift.

So the core does **not** currently have an unmet communication gap that
blocks the happy path.

## If chat is later greenlit — minimal, safe option

Recommend **dispute-scoped messaging only**, not open chat:

- Reuse the existing dispute thread; allow short structured replies on
  an **open** dispute only (closed/resolved disputes are read-only).
- No new route — render inside the existing dispute detail UI.
- No polling — messages are part of the dispute record, surfaced on the
  normal dashboard mount / lifecycle sync like every other state.
- Idempotent append (same guardrails as notifications/ledger: no
  duplicate entries on repeat submit).

This keeps the blast radius tiny, stays within 28 routes, avoids a
general stranger-to-stranger chat moderation problem, and only opens
text where the product already expects a back-and-forth.

## Recommendation

**Defer chat.** Communication needs are met by timestamped notifications
+ structured disputes. If a text channel is later required, scope it to
**dispute-only replies** (above) as its own small spec — do not add
general chat in a stability pass.
