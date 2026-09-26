/**
 * Cluster 5 · Property 7 — "Practical handbook content + menu label".
 *
 * Validates: Requirements 1.7, 2.7
 *
 * ---------------------------------------------------------------------------
 * HISTORY — why this test targets /handbook (not /user-guide)
 * ---------------------------------------------------------------------------
 * The original exploration test (task 16) encoded req 2.7 against
 * `/user-guide`: rename `nav.label.userGuide` to "Cẩm nang" and rewrite that
 * page as a practical handbook. Commit 9705a53 ("Update Handbook") later made
 * a deliberate product split instead:
 *
 *   • `/user-guide` — "Hướng dẫn sử dụng": the procedural app walkthrough.
 *   • `/handbook`   — "Cẩm nang làm việc": the practical, article-based
 *                     handbook for workers and employers.
 *
 * Req 2.7's intent is unchanged — a menu entry named as a handbook ("Cẩm
 * nang", not the trust/safety framing) leading to ORIGINAL, PRACTICAL content
 * for BOTH audiences — so this test now asserts it where it lives today:
 *
 *   (1) the handbook menu label `nav.label.handbook` contains "cẩm nang" and
 *       is not framed as trust/safety; the usage-guide label is no longer the
 *       old "Bắt đầu nhanh";
 *   (2) the handbook articles, per audience, carry the practical topics:
 *         - workers   — satisfying employers ("hài lòng" | "vừa lòng") and
 *                       punctuality ("đúng giờ");
 *         - employers — attracting staff ("thu hút" | "giữ chân") and
 *                       appropriate pay ("hợp lý" | "tương xứng").
 *
 * Topic anchors are small OR-sets of natural Vietnamese phrasings so the
 * content is not pinned to one sentence.
 */

import { describe, expect, it } from 'vitest';

import { t } from '@/i18n/vi';
import { handbookArticles, type HandbookAudience } from '@/data/mock/handbookArticles';

// ---------------------------------------------------------------------------
// Normalization helpers — Vietnamese diacritics compare reliably in NFC.
// ---------------------------------------------------------------------------

/** Unicode-normalize (NFC) so composed/decomposed diacritics compare equal. */
const nfc = (s: string | null | undefined): string => (s ?? '').normalize('NFC');
/** NFC + lower-case for case-insensitive substring checks. */
const lc = (s: string | null | undefined): string => nfc(s).toLowerCase();

/** True iff `haystack` contains ANY of the (NFC+lower-cased) `needles`. */
const includesAny = (haystack: string, needles: string[]): boolean =>
  needles.some((n) => haystack.includes(lc(n)));

/** All reader-visible text of one audience's handbook articles, lower-cased. */
function audienceText(audience: HandbookAudience): string {
  return lc(
    handbookArticles
      .filter((a) => a.audience === audience)
      .map((a) =>
        [
          a.title,
          a.excerpt,
          ...a.content.flatMap((s) => [
            s.heading ?? '',
            ...(s.paragraphs ?? []),
            ...(s.bullets ?? []),
            s.note ?? '',
          ]),
        ].join(' '),
      )
      .join(' '),
  );
}

// ---------------------------------------------------------------------------
// The exact strings the assertions key on.
// ---------------------------------------------------------------------------

/** The required handbook marker in the menu label. */
const HANDBOOK_LABEL_MARKER = 'cẩm nang';
/** The old quick-start label that must not come back. */
const OLD_QUICK_START_LABEL = 'Bắt đầu nhanh';
/** The trust/safety framing words the handbook label must NOT use. */
const TRUST_SAFETY_MARKERS = ['tin cậy', 'an toàn'];

const WORKER_SATISFY = ['hài lòng', 'vừa lòng']; // satisfying employers
const WORKER_PUNCTUAL = ['đúng giờ']; //             arriving on time
const EMPLOYER_ATTRACT = ['thu hút', 'giữ chân']; // attracting staff
const EMPLOYER_FAIR_PAY = ['hợp lý', 'tương xứng']; // setting appropriate pay

// ---------------------------------------------------------------------------
// Surface 1 — the handbook menu label (asserted via the i18n VALUE)
// ---------------------------------------------------------------------------

describe('Property 7: handbook menu label', () => {
  it('names the handbook "Cẩm nang…" without trust/safety framing', () => {
    const label = t('nav.label.handbook');

    expect(lc(label)).toContain(HANDBOOK_LABEL_MARKER);
    for (const marker of TRUST_SAFETY_MARKERS) {
      expect(lc(label)).not.toContain(marker);
    }
  });

  it('no longer labels the usage guide "Bắt đầu nhanh"', () => {
    expect(nfc(t('nav.label.userGuide'))).not.toBe(nfc(OLD_QUICK_START_LABEL));
  });
});

// ---------------------------------------------------------------------------
// Surface 2 — the /handbook articles (per audience)
// ---------------------------------------------------------------------------

describe('Property 7: /handbook is a practical dual-audience handbook', () => {
  it('has articles for both workers and employers', () => {
    expect(handbookArticles.some((a) => a.audience === 'worker')).toBe(true);
    expect(handbookArticles.some((a) => a.audience === 'employer')).toBe(true);
  });

  it('gives WORKERS practical guidance (satisfying employers + punctuality)', () => {
    const text = audienceText('worker');
    expect(includesAny(text, WORKER_SATISFY)).toBe(true);
    expect(includesAny(text, WORKER_PUNCTUAL)).toBe(true);
  });

  it('gives EMPLOYERS practical guidance (attracting staff + appropriate pay)', () => {
    const text = audienceText('employer');
    expect(includesAny(text, EMPLOYER_ATTRACT)).toBe(true);
    expect(includesAny(text, EMPLOYER_FAIR_PAY)).toBe(true);
  });
});
