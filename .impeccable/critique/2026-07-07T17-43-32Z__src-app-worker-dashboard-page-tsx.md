---
target: worker dashboard
total_score: 28
p0_count: 0
p1_count: 2
timestamp: 2026-07-07T17-43-32Z
slug: src-app-worker-dashboard-page-tsx
---
Method: ⚠️ DEGRADED: single-context (sub-agent runs aborted by user; Assessment A + B done inline)

# Critique — Worker Dashboard (`src/app/worker/dashboard/page.tsx`)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Lifecycle badges + toasts + attendance copy are strong; two badge systems on one card muddy it |
| 2 | Match System / Real World | 3 | Natural Vietnamese; role-correct "bạn"; a few raw status enums leak visually |
| 3 | User Control and Freedom | 3 | Cancel dialogs, modal ESC/close, checkout dialog — solid escape paths |
| 4 | Consistency and Standards | 3 | Great component reuse; but dual status vocabulary + gradient surfaces diverge from DESIGN.md restraint |
| 5 | Error Prevention | 3 | Cancel confirmation, quota surfaced, checkout evidence gate |
| 6 | Recognition Rather Than Recall | 2 | Stat-tile "Xem chi tiết" cue is hover-only; heavy scan load |
| 7 | Flexibility and Efficiency | 2 | No keyboard shortcuts / bulk actions; long scroll; detail locked in modals |
| 8 | Aesthetic and Minimalist Design | 2 | Wall of ~9 stacked sections + competing gradient surfaces; weakest axis |
| 9 | Error Recovery | 3 | Clear, mapped error messages; rejection/expiry reasons shown inline |
| 10 | Help and Documentation | 4 | PageHelpButton + HelpPopover in modals + /user-guide links — genuinely excellent |
| **Total** | | **28/40** | **Good — solid foundation, address minimalism/efficiency** |

## Anti-Patterns Verdict

**LLM assessment:** Does NOT read as generic AI slop — it has a real, committed identity (warm cream + orange, consistent components, honest simulated-wallet copy). The risk here is the opposite of flatness: **over-decoration**. The saturated orange gradient hero + four tinted gradient stat tiles + a second gradient hero inside the reputation modal push toward the "colourful gig-app" anti-reference in PRODUCT.md, and work against this project's own DESIGN.md rules (*One Orange Rule*: cam ≤10%; *Warmth-From-Background*: warmth from bg, not from coloring surfaces). Note: the page predates DESIGN.md, so this is drift to reconcile, not a betrayal.

**Deterministic scan:** `node scripts/detect.mjs --json src/app/worker/dashboard/page.tsx` → `[]`, exit 0. **No automated anti-patterns** (no side-stripe borders, no gradient-text, no glass). The detector and the LLM agree the page is clean at the token/markup level; the issues are compositional (density, hierarchy), which the detector doesn't measure.

**Browser overlay evidence:** unavailable (no browser tool in this environment) — CLI detector only.

## Overall Impression

This is a capable, trustworthy dashboard that tries to show *everything* at once. The single biggest opportunity is **subtraction**: the worker's core question — "what's my next shift and what do I do right now?" — competes with eight other sections and a lot of colour. For a product whose promise is *nhanh gọn*, the home surface is the least *nhanh gọn* screen.

## What's Working

1. **Status system is a genuine strength.** `ShiftLifecycleBadge` (single source of truth) + text labels mean status never rides on colour alone — good for trust and accessibility, exactly on-brand.
2. **Honest, reassuring copy at high-stakes moments.** Cancelled-by-employer and expired sections both state "bạn không bị trừ điểm uy tín / hạn mức" — real reassurance, and it keeps the simulated-wallet promise honest.
3. **Help is excellent.** `PageHelpButton` with structured sections + `HelpPopover` inside each detail modal + `/user-guide` links. Rare to see this done well.

## Priority Issues

- **[P1] Wall of stacked sections (cognitive overload).**
  - *Why it matters:* The main column renders up to ~9 sections (upcoming, applied, rejected, cancelled-by-employer, expired, feedback-pending, recommended, skills, reputation hint) + 4 stat tiles + wallet + notifications. A worker on the go can't find "next shift + next action" fast. Fails single-focus, chunking, and minimal-choices at once.
  - *Fix:* Consolidate the three "bad-news" history blocks (rejected / expired / cancelled-by-employer) into one collapsible "Lịch sử gần đây". Demote skills + reputation-hint into disclosure or the profile. Let "Ca sắp tới" be the unmistakable top priority.
  - *Suggested command:* `/impeccable distill`

- **[P1] Competing decorative surfaces vs the product's own restraint.**
  - *Why it matters:* Big saturated orange gradient hero + 4 tinted gradient stat tiles + gradient modal hero. This is the "colourful gig-app" pull PRODUCT.md warns against and breaks DESIGN.md's *One Orange Rule* and *Warmth-From-Background*. Nothing clearly commands the eye because many things shout.
  - *Fix:* Pick ONE hero moment (the welcome or the next-shift action, not both). Make stat tiles calm (neutral surface, colour only on the value/icon). Reserve the saturated orange for the single primary action.
  - *Suggested command:* `/impeccable quieter`

- **[P2] Stat-tile clickability is discoverable only on hover.**
  - *Why it matters:* The "Xem chi tiết →" cue is `opacity-0 group-hover:opacity-100`. On mobile (no hover) and for first-timers, the tiles don't look tappable. Keyboard/SR users get an aria-label, but sighted touch users get no persistent cue.
  - *Fix:* Add a persistent affordance (small chevron or "Xem chi tiết" always visible, or a pressed state) so the tile reads as interactive on touch.
  - *Suggested command:* `/impeccable clarify`

- **[P2] Dual status vocabulary on the shift card.**
  - *Why it matters:* `UpcomingShiftCard` shows BOTH the lifecycle badge (Đang diễn ra / Sắp bắt đầu…) AND the application-status badge (Đã duyệt / CheckedIn…), and `badgeToneFor` maps CheckedIn → purple, which DESIGN.md reserves as rare. Two parallel status axes on one card force the worker to reconcile them.
  - *Fix:* Decide the primary badge per context and demote the other to plain text; align tones to the DESIGN.md status palette (drop purple for CheckedIn).
  - *Suggested command:* `/impeccable clarify`

- **[P2] Mobile ordering buries the core job.**
  - *Why it matters:* On mobile the tall gradient hero + 4 tiles + wallet panel all precede "Ca sắp tới", and the notifications panel (a status-driven product's pulse) sits at the very bottom after ~9 sections. Casey (thumb, on the go) scrolls a long way to act.
  - *Fix:* On small screens lead with "Ca sắp tới + hành động", collapse stats into a compact strip, and lift notifications above the long history blocks.
  - *Suggested command:* `/impeccable layout`

## Persona Red Flags

- **Casey (distracted mobile, on the go)** — the primary persona for a shift worker. Must scroll past hero + 4 tiles + wallet to reach the next shift; notifications land at the bottom; primary actions aren't in the thumb zone. This is the highest-impact failure.
- **Alex (power user)** — no keyboard shortcuts, no bulk actions; every stat detail requires opening a modal; repeated shifts can't be acted on in batch.
- **Sam (accessibility-dependent)** — strong baseline (text+icon status, 44px targets, focus rings, aria-hidden gauge). Watch: muted-gray text (gray-500) on tinted washes (orange-50/80) for the ≥4.5:1 target; hover-only "Xem chi tiết" cue.
- **Project persona — "Duy, 19, sinh viên, Android đời thấp, tìm ca gấp giữa hai buổi học":** opens the dashboard wanting the nearest shift and one clear action. Meets a long, colourful, multi-section page and two badge systems. Wants "ca sắp tới + nút" at the top and less to parse.

## Minor Observations

- Reputation modal is very rich (gradient hero + conic gauge + rules + 2 stat cards + scrollable timeline) — acceptable as progressive disclosure, but it's a lot; watch it doesn't become its own overload.
- Low-reputation state stacks a red restriction banner + a red reputation tile + possibly rejected/no-show history — can feel punitive; soften the peak-end for struggling workers.
- "Xem chi tiết →" arrow and several sections repeat the same interaction affordance with slightly different treatments; unify.

## Questions to Consider

- What if the dashboard opened on ONE thing — the next shift and its next action — with everything else one tap away?
- Does a worker need reputation, skills, wallet, and four history categories on the *home* screen, or on demand?
- What would the calmest possible version of this page look like while keeping the trust signals?
