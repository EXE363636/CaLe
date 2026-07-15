---
target: landing
total_score: 31
p0_count: 0
p1_count: 2
timestamp: 2026-07-10T17-09-49Z
slug: src-app-page-tsx
---
Method: dual-agent (A: design-review sub-agent · B: detector-evidence sub-agent)

## Design Health Score

| # | Heuristic | Score | Key issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Live board (countdown, "Đang tuyển", "cập nhật theo thời gian thực") strong; hydration-gated rep/upcoming rows pop in after paint → layout shift |
| 2 | Match System / Real World | 3 | Idiomatic VN + correct lowercase "đ"; "prototype" in `simNote` is a techy loanword for a phổ-thông audience |
| 3 | User Control & Freedom | 3 | Reduced-motion honored; employer path always secondary (must hunt past the worker default) |
| 4 | Consistency & Standards | 2 | Orange marks action + every icon + a status chip (breaks One Orange Rule); "Đang tuyển" chip orange vs Lifecycle info-blue; CTAs bespoke `rounded-xl` vs system `rounded-lg` Button |
| 5 | Error Prevention | 3 | No forms; honesty microcopy prevents the "is this real money?" error |
| 6 | Recognition > Recall | 4 | Nothing to memorize; how-it-works spelled out; the board is a worked example |
| 7 | Flexibility & Efficiency | 3 | One fast repeated path; no in-page anchors (page short enough) |
| 8 | Aesthetic & Minimalist | 3 | Visually clean, but content isn't minimal: trust strip ↔ safety teach the same ideas; disclaimer ×3 |
| 9 | Error Recovery | 3 | Board no-shift fallback is a graceful empty state |
| 10 | Help & Documentation | 4 | Inline how-it-works + "Xem hướng dẫn chi tiết" → /user-guide + honest disclaimers |
| **Total** | | **31/40** | **Good — ship-worthy with targeted fixes** |

Weakest link: **Consistency (2)** — the design system fighting itself over the colour orange.

## Anti-Patterns Verdict

**Does this look AI-generated? Not slop — but not distinctive.**

- **LLM assessment:** reads *competent-conventional*, in the "warm friendly SaaS / Tailwind-UI dialect" lane (cream + coral, soft-shadow white cards, humanist sans, icon-per-row trust list, numbered timeline, dual CTA). NOT in the saturated editorial-typographic reflex-reject lane (good), but "generic warm SaaS" is its own crowded family. Two things rescue it: the **live dispatch board** (real, data-backed) and the **radical-honesty copy** (under-promising where most AI landings over-promise). Restraint is intentional and mostly earns its keep — but stops one bold move short of memorable.
- **Deterministic scan:** 4 findings, all `gray-on-color` (`text-gray-900 on bg-orange-500`) at page.tsx:21/126/283/318; `FeaturedJobMockup.tsx` = 0. **All 4 are documented false positives** — the locked, WCAG-AA primary-CTA pairing (dark ink #37373B on orange #FF9A5F) + the StepNumber badge. No genuine detector findings remain.
- **Synthesis:** the detector flagged the *one place orange is used correctly* (the CTA) and missed the real problem the review found — orange is **over-used everywhere else** (7 icons, StepNumber, the status chip). The tool's blind spot is the inverse of the actual issue.
- **Visual overlays:** unavailable — no browser-automation tool in this environment; CLI-only fallback.

## Overall Impression
Honest, trustworthy, and clear — a real achievement for a money-adjacent surface, and it nails the "đáng tin / rõ ràng" personality. What it lacks is **voice**: it's the modal marketplace skeleton with one genuinely distinctive asset (the board) confined to the hero. Biggest single opportunity: enforce the One Orange Rule so the CTA owns the colour, and let the dispatch-board identity carry through the page so it ends on a peak.

## What's Working
1. **The live dispatch-board hero (`FeaturedJobMockup`)** — real store data, `effectiveFilledCount` "Còn X/Y", a mount-gated live countdown, a real `/shifts/[id]` link, graceful fallback. Makes "rõ ca – rõ tiền" literal and proves the product is real. The north star made tangible; the page's biggest anti-slop move.
2. **Honesty placed at the point of anxiety** — `trustHint` sits directly under the CTAs ("Đây là bản demo · … mô phỏng"), answering "is my money real?" the instant the question forms. Satisfies the mandatory honesty rule.
3. **Worker-first hierarchy + genuine a11y care** — orange→/shifts, outline→/register consistent across hero/split/final; honest touch targets (52/48/44px); every animation enumerated in the `prefers-reduced-motion` block.

## Priority Issues

**[P1] Orange overload dilutes the One Orange Rule.** All 7 icons, `StepNumber`, the "Đang tuyển" chip, and the CTAs are orange-500. DESIGN.md makes orange's *scarcity* the whole point (action/accent, ≤10%). When orange decorates everything, the primary CTA no longer owns it and stops reading as "click here." *Fix:* demote decorative icons to muted ink; reserve orange-500 for the primary CTA + true accents (one headline word, the board's live dot). *Command:* `/impeccable quieter src/app/page.tsx`

**[P1] Cross-surface honesty contradiction (outside the landing, but it breaks the landing's promise).** Auth side-panel copy (`auth.side.*` — e.g. "thanh toán trước, tiền chỉ giải ngân khi hoàn thành" / "Thanh toán minh bạch") implies a *working* escrow / guaranteed payout — directly contradicting the landing's "chưa có giao dịch thật." A stress tester who registers hits it. Violates PRODUCT.md's mandatory honesty. *Fix:* relabel auth-side copy as simulated, consistent with the landing. *Command:* `/impeccable clarify src/components/layout/AuthSidePanel.tsx`

**[P2] Trust strip and safety section teach the same two ideas; disclaimer repeats 3×.** "Xác nhận hai chiều" + reputation appear in both blocks; the simulation disclaimer shows in hero + trust strip + safety. On a short page this reads as padding, and the triple disclaimer risks tipping honest → deflating. *Fix:* split roles (trust strip = outcomes/benefits, safety = mechanisms) or merge; state the disclaimer once prominently + one reinforcing line. *Command:* `/impeccable distill src/app/page.tsx`

**[P2] "Đang tuyển" chip uses off-system orange, contradicting the Shift Lifecycle Badge.** DESIGN.md's Single-Source-of-Truth rule says recruiting/published = `info` (blue) everywhere; the landing teaches an orange status the app then contradicts, eroding the consistency that IS the trust mechanism. *Fix:* render the canonical recruiting tone (info) in `FeaturedJobMockup`. *Command:* `/impeccable polish src/components/landing/FeaturedJobMockup.tsx`

**[P3] Generic structure + under-designed finale (distinctiveness).** The one distinctive asset lives only in the hero; the final CTA sits on bare cream (the designed `.cta-band` is unused) so the page ends soft, not on a peak. *Fix:* carry a dispatch/board motif (or one bold typographic moment) into ≥1 more section and give the finale a designed surface, within the One Orange budget. *Command:* `/impeccable bolder src/app/page.tsx` (or the pending "Warm Dispatch Editorial" pass via `/impeccable live`)

## Persona Red Flags

**Jordan (first-timer):** the triple "mô phỏng / bản demo / chưa có giao dịch thật" can read as "the whole thing is fake" — may not separate *money* simulated from *jobs* real; "prototype" is techy. "Điểm uy tín … trên thang 100" appears with zero context. Two CTAs before self-identifying as worker/employer. Clicking the board likely hits a detail/login wall unexpected from a marketing page.

**Riley (stress tester):** flags the trust ↔ safety duplication; notes the employer path is structurally second-class everywhere; catches orange doing four jobs and the orange "Đang tuyển" chip contradicting the info-blue system; scrolls to a quiet cream finale expecting a crescendo; **finds the auth-side escrow/payout contradiction (P1 above).**

**Casey (distracted mobile):** hero stacks copy-first, so the best asset (board) is pushed below the fold; trust strip then safety say nearly the same thing → bounce; a vertical column of 7 identical orange glyphs is low-scannability; the final employer link (inline underline) is a smaller thumb target than every other CTA.

## Minor Observations
- **Button drift:** CTAs use bespoke `rounded-xl` inline classes, not the `rounded-lg` (8px) Button primitive.
- **Orphaned CSS vocabulary:** `hero-panel`, `cta-band`, `section-wave`, `audience-card-*`, `section-shell`, `float-soft/blob`, `bg-dot-grid` are defined but unused by this landing — dead vocabulary, and the shipped page is quieter than the system implies.
- **Same glyph, two meanings:** `StarIcon` marks both trust-strip reputation and safety "Lịch sử uy tín."
- **Inward-facing badge:** the hero badge literally prints internal keywords "Rõ ràng · Đáng tin · Nhanh gọn" — telling values rather than showing them.
- **"Miễn phí dùng thử"** implies a future paid tier for a billing-less demo; "miễn phí" alone is safer.

## Questions to Consider
1. If the live board is your only genuinely distinctive asset and your literal north star, why does it appear **once** — why isn't the whole landing organized *as a board*, so the page **is** the product, not a brochure about it?
2. You disclose "it's simulated" **three times** — at what point does transparency curdle into "nothing here works yet," and would one confident disclosure build more trust than three anxious ones?
3. Your own One Orange Rule says scarcity is the point — strip orange from all seven decorative icons and let **only** the CTA wear it: does the page lose warmth, or does the call-to-action finally become impossible to miss?
