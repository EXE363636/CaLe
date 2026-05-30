# Baseline Security / Access-Control Report — Phase 6

**Run date:** 2026-05-30
**Scope:** Authorized, non-destructive baseline pass on the local demo
app only (localhost). No brute force, no external systems, no
destructive actions. The app is a localStorage-only Next.js mock with
NO backend — the "authorization boundary" is the client-side
`RoleGuard` + page-level ownership guards, which is appropriate and
explicitly documented for the demo.

## A. Dependency / `npm audit`

`npm audit` → **2 moderate, 0 high, 0 critical.**

| Package | Severity | Advisory | Path | Classification |
|---------|----------|----------|------|----------------|
| postcss (<8.5.10) | Moderate | GHSA-qx2v-qp2m-jg93 — XSS via unescaped `</style>` in CSS Stringify output | transitive via `next` → `node_modules/next/node_modules/postcss` | **Acceptable for demo / deferred** |
| next (9.3.4-canary..16.3.0-canary) | Moderate | depends on the vulnerable postcss above | `node_modules/next` | **Deferred** |

**Decision: do NOT auto-fix.** The only remediation npm offers is
`npm audit fix --force`, which downgrades Next.js to **9.3.3** — a
catastrophic breaking change that violates the project's Next.js 16
invariant and would break the entire App Router app. The postcss
advisory concerns CSS *build-time* stringification (a toolchain
surface), not a runtime user-facing vector in this localStorage-only
mock with no server-rendered untrusted CSS. Re-evaluate when Next.js
ships a patched postcss in a non-breaking release.

- **Blocker:** none
- **Acceptable for demo:** both moderate findings
- **Deferred:** upgrade Next.js/postcss when a non-breaking patch lands

## B. Access-control (Playwright) — `e2e/17-access-control.spec.ts` (14 tests, all pass)

| Check | Result |
|-------|--------|
| Unauthenticated guest → every protected route (`/worker/*`, `/employer/*`, `/admin/*`) redirects to `/login` | **PASS** (8 routes) |
| Worker → employer route → bounced to `/worker/dashboard` | **PASS** |
| Worker → `/admin/dashboard` → bounced to `/worker/dashboard` | **PASS** |
| Employer → worker route → bounced to `/employer/dashboard` | **PASS** |
| Employer → `/admin/dashboard` → bounced to `/employer/dashboard` | **PASS** |
| Admin → worker route → bounced to `/admin/dashboard` | **PASS** |
| Cross-tenant: Employer A opening Employer B's shift → `notFound()` 404 (no title, no owner controls) | **PASS** |

Additional findings from code review:
- `/employer/shifts/[id]` enforces `if (shift.employerId !== currentUserId) return notFound();` — a real ownership guard, not just hidden controls.
- Worker A vs Worker B application/dispute isolation: worker-scoped pages render only the current user's applications (resolved by `currentUserId`); there is no UI surface to view another worker's application/dispute, and admin-only resolution lives behind `RoleGuard role="admin"`.
- Admin-only dispute resolution (`resolveDispute` / `requestMoreEvidence`) is reachable only from `/admin/dashboard`, which is `RoleGuard`-gated.

**Note (by design, documented):** Zustand store actions do not
re-check authorization (no backend). The enforced boundary is the UI.
For a real deployment this must move server-side — see deferred items.

## C. Input / XSS

- **Repo grep:** `dangerouslySetInnerHTML` → **0 occurrences.** All user
  content renders through React's default escaping.
- **Regression test:** `src/components/shift/ShiftCardXss.test.tsx` injects
  `<img src=x onerror=...> <script>...</script>` into shift title /
  location and asserts: the payload renders as **literal escaped text**,
  **no** `<script>` node is injected, **no** `<img src="x">` node is
  injected, and the payload **does not execute** (`window.__xss`
  stays `undefined`).
- Representative of dispute reason, evidence description, feedback, and
  description fields — all flow through the same JSX text-escaping path.

**Result:** no unsafe HTML rendering; no script execution from user input.

## D. PII / internal-ID exposure (code review)

- Public shift list (`/shifts`) shows shift title, location, wage,
  positions, employer display name — no worker PII, no verification
  documents.
- Dispute evidence filenames / descriptions are scoped to
  owner/admin views (Phase 10C privacy contract); non-owner/guest
  surfaces do not render them.
- Internal IDs (shift/application ids) appear in URLs (acceptable for a
  demo) but not as user-facing copy.

## Summary

- **Critical/High security or access-control bugs:** **0**
- **Moderate dependency findings:** 2 (postcss/next, deferred — fix is a breaking Next.js downgrade)
- **XSS:** none (no `dangerouslySetInnerHTML`, React escaping verified)
- **Access control:** RoleGuard + ownership `notFound()` guards verified by 14 passing E2E tests

No security/access-control blockers for the demo. Real-deployment
hardening (server-side authz, dependency patch) recorded as deferred.
