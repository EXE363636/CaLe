---
target: worker dashboard
total_score: 34
p0_count: 0
p1_count: 0
timestamp: 2026-07-09T01-58-13Z
slug: src-app-worker-dashboard-page-tsx
---
Method: ⚠️ DEGRADED: single-context (re-critique after distill + quieter; Assessment A + B inline)

# Re-critique — Worker Dashboard (`src/app/worker/dashboard/page.tsx`)

Follow-up to the 28/40 baseline, after `/impeccable distill` then `/impeccable quieter`.

## Design Health Score: 34/40 (was 28)

| # | Heuristic | Score | Δ | Note |
|---|-----------|:----:|:--:|------|
| 1 | Visibility of System Status | 4 | +1 | Single primary lifecycle badge; the competing application-status badge is now quiet text |
| 2 | Match System / Real World | 3 | — | Natural Vietnamese, unchanged |
| 3 | User Control and Freedom | 3 | — | Collapsibles add control; escape paths intact |
| 4 | Consistency and Standards | 4 | +1 | Now honors DESIGN.md One-Orange + single-badge; purple CheckedIn removed |
| 5 | Error Prevention | 3 | — | Confirmations/quota/checkout gate intact |
| 6 | Recognition Rather Than Recall | 3 | +1 | Far less to scan; stat-tile hover-only affordance still pending |
| 7 | Flexibility and Efficiency | 3 | +1 | Shorter page, collapsed history; still no shortcuts/bulk actions |
| 8 | Aesthetic and Minimalist Design | 4 | +2 | The big win: calm white surfaces, one orange, consolidated sections |
| 9 | Error Recovery | 3 | — | Reassurance copy preserved inside the history disclosure |
| 10 | Help and Documentation | 4 | — | Still excellent |
| **Total** | | **34/40** | **+6** | **Good (upper) — near Excellent (36+)** |

## Anti-Patterns Verdict

**LLM assessment:** The over-decoration flagged before is resolved. The hero is a compact white "dispatch block" (ink text, one orange CTA), stat tiles are calm white with a soft accent on icon/value only, and there is now a single primary status badge per shift card. This matches the North Star ("bảng điều phối đáng tin") and the DESIGN.md rules (*One Orange Rule*, *Warmth-From-Background*, single-source status). Warmth still reads via the page's cream background + white cards.

**Deterministic scan:** `detect.mjs --json` → `[]`, exit 0. Still clean.

**Browser overlay evidence:** unavailable (no browser tool) — CLI detector only.

## What Changed

- **Distill:** three "bad-news" sections (rejected / employer-cancelled / expired) → one collapsed **"Lịch sử gần đây (N)"**; skill summary + reputation tips → one collapsed **"Kỹ năng & giữ uy tín"**. The always-visible work area now leads with upcoming shifts + actions, then pending applications.
- **Quieter:** gradient hero → compact white card; stat tiles neutralized (no tinted wash, no saturated gradient chips); the sole saturated orange is the primary "Tìm ca" CTA; `CheckedIn` no longer purple; the application-status badge demoted to small text so only the lifecycle badge carries the status colour.

## What's Working (now)

1. **Calm and legible.** One orange focal point per screen; the eye lands on the primary action, not four competing colour surfaces.
2. **Lower cognitive load.** Passive/negative content is one tap away instead of a permanent wall; the dashboard answers "next shift + next action" faster.
3. **On-brand + honest, retained.** Single-source status badges, simulated-wallet honesty, and excellent help all preserved.

## Remaining Issues (P2/P3)

- **[P2] Stat-tile clickability still hover-only.** The "Xem chi tiết →" cue is `opacity-0 group-hover:opacity-100`; touch users still get no persistent affordance. Not addressed by distill/quieter. → `/impeccable clarify`
- **[P2] Mobile source order still leads with hero → stats → wallet before "Ca sắp tới".** Distill shortened the page but didn't reorder the top blocks for small screens; Casey still scrolls to reach the core job, notifications remain last. → `/impeccable layout` (or `adapt`)
- **[P3] Application status is now quiet gray text.** Cleaner hierarchy, but for a far-future *approved* shift (lifecycle badge hidden while "Published") the positive "Đã duyệt" signal is subtle. Consider a small tone dot or a single conditional badge when the lifecycle badge is hidden.
- **[P3] Cross-dashboard parity.** The employer dashboard still has the old gradient hero + gradient stat tiles (only its merge-conflict/icon bug was fixed). Apply the same quieter treatment so both dashboards match DESIGN.md.

## Persona Red Flags (delta)

- **Casey (mobile):** improved (shorter page, calmer), but the top-of-page ordering still buries the next shift on small screens — the main remaining gap.
- **Duy (student, common device):** now meets a calmer, shorter page with one clear action; the two-badge confusion is gone.
- **Sam (accessibility):** single primary status badge + text is clearer; still verify muted-gray text on white meets 4.5:1, and the hover-only affordance still excludes touch.
- **Alex (power user):** shorter scroll helps; still no keyboard shortcuts / bulk actions.

## Questions to Consider

- Should mobile lead with "Ca sắp tới + hành động", collapsing stats into a compact strip above or below it?
- Is a quiet gray application-status enough for an approved-but-not-started shift, or does that one case deserve a single badge?
- Roll the same quieter pass into the employer dashboard now, for cross-surface consistency?
