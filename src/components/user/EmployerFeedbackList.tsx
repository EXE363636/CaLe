'use client';

/**
 * Worker → employer feedback list (Phase 6, upgraded CORE-STABILITY-7
 * Part 6).
 *
 * Google-Maps-style review surface:
 *   - sortable (newest / oldest / highest / lowest / with-comment),
 *   - full timestamp (date + time + seconds, vi-VN),
 *   - rating summary (average + count + star distribution),
 *   - per-review "Báo cáo đánh giá" report action (admin-notified,
 *     never auto-deletes; flags the review as "Đang được xem xét").
 *
 * Used inside `EmployerProfileModal` and the employer branch of
 * `AdminUserProfileModal` so both audiences see the same trust signal.
 */

import { useMemo, useState } from 'react';
import { StarRating, Button, Modal, Textarea, Badge } from '@/components/ui';
import { useEmployerFeedbackStore } from '@/stores/employerFeedbackStore';
import { useReviewReportStore } from '@/stores/reviewReportStore';
import { useAuthStore } from '@/stores/authStore';
import { formatLogDateTime } from '@/lib/format';
import { showSuccess } from '@/lib/toast';
import { t } from '@/i18n/vi';
import type { EmployerFeedback, EmployerFeedbackTag } from '@/types';

interface EmployerFeedbackListProps {
  employerId: string;
  /** Maximum number of entries to render. Defaults to 5. */
  limit?: number;
}

type SortMode = 'newest' | 'oldest' | 'highest' | 'lowest' | 'withComment';

const SORT_OPTIONS: ReadonlyArray<{ value: SortMode; key: string }> = [
  { value: 'newest', key: 'review.sort.newest' },
  { value: 'oldest', key: 'review.sort.oldest' },
  { value: 'highest', key: 'review.sort.highest' },
  { value: 'lowest', key: 'review.sort.lowest' },
  { value: 'withComment', key: 'review.sort.withComment' },
];

function sortFeedback(
  entries: EmployerFeedback[],
  mode: SortMode,
): EmployerFeedback[] {
  const copy = [...entries];
  switch (mode) {
    case 'newest':
      return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    case 'oldest':
      return copy.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    case 'highest':
      return copy.sort(
        (a, b) => b.stars - a.stars || b.createdAt.localeCompare(a.createdAt),
      );
    case 'lowest':
      return copy.sort(
        (a, b) => a.stars - b.stars || b.createdAt.localeCompare(a.createdAt),
      );
    case 'withComment':
      return copy
        .filter((f) => Boolean(f.comment && f.comment.trim()))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

export function EmployerFeedbackList({
  employerId,
  limit = 5,
}: EmployerFeedbackListProps) {
  const all = useEmployerFeedbackStore((s) => s.feedback);
  const reports = useReviewReportStore((s) => s.reports);
  const submitReport = useReviewReportStore((s) => s.submit);
  const currentUserId = useAuthStore((s) => s.currentUserId);

  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportNote, setReportNote] = useState('');
  const [reportError, setReportError] = useState<string | null>(null);

  const allEntries = useMemo(
    () => all.filter((f) => f.toEmployerId === employerId),
    [all, employerId],
  );

  const entries = useMemo(
    () => sortFeedback(allEntries, sortMode).slice(0, limit),
    [allEntries, sortMode, limit],
  );

  // Star distribution + average across the whole set (not the slice).
  const summary = useMemo(() => {
    const dist = [0, 0, 0, 0, 0]; // index 0 = 1-star ... index 4 = 5-star
    let total = 0;
    for (const f of allEntries) {
      dist[f.stars - 1] += 1;
      total += f.stars;
    }
    const avg = allEntries.length === 0 ? null : total / allEntries.length;
    return { dist, avg, count: allEntries.length };
  }, [allEntries]);

  function isReported(reviewId: string): boolean {
    return reports.some(
      (r) => r.targetReviewId === reviewId && r.status === 'Open',
    );
  }

  function openReport(reviewId: string) {
    setReportTargetId(reviewId);
    setReportReason('');
    setReportNote('');
    setReportError(null);
  }

  function submitReportForm() {
    if (!reportTargetId || !currentUserId) return;
    const result = submitReport({
      targetKind: 'employerFeedback',
      targetReviewId: reportTargetId,
      reportedByUserId: currentUserId,
      reason: reportReason,
      note: reportNote,
    });
    if (!result.ok) {
      const message =
        result.error === 'ALREADY_REPORTED'
          ? t('review.report.error.already')
          : t('review.report.error.reasonRequired');
      setReportError(message);
      return;
    }
    showSuccess(t('review.report.success'));
    setReportTargetId(null);
  }

  if (allEntries.length === 0) {
    return (
      <p className="text-sm italic text-gray-400">
        {t('employerFeedback.empty')}
      </p>
    );
  }

  return (
    <div>
      {/* Rating summary */}
      {summary.avg !== null && (
        <div className="mb-3 rounded-lg bg-gray-50 px-3 py-2 ring-1 ring-gray-100">
          <div className="flex items-center gap-2">
            <StarRating value={Math.round(summary.avg)} readOnly size="sm" />
            <span className="text-sm font-semibold text-gray-900">
              {summary.avg.toFixed(1)} / 5
            </span>
            <span className="text-xs text-gray-500">
              ({summary.count} {t('review.summary.count')})
            </span>
          </div>
          {/* Star distribution */}
          <ul className="mt-2 flex flex-col gap-0.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const c = summary.dist[star - 1];
              const pct = summary.count > 0 ? (c / summary.count) * 100 : 0;
              return (
                <li key={star} className="flex items-center gap-2 text-xs">
                  <span className="w-6 text-right text-gray-600">{star}★</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
                    <span
                      className="block h-full bg-orange-400"
                      style={{ width: `${pct}%` }}
                    />
                  </span>
                  <span className="w-6 text-gray-500">{c}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Sort controls */}
      <div className="mb-2 flex flex-wrap gap-1.5">
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setSortMode(opt.value)}
            className={[
              'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
              sortMode === opt.value
                ? 'bg-orange-500 text-gray-900'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            ].join(' ')}
          >
            {t(opt.key)}
          </button>
        ))}
      </div>

      <ul className="flex flex-col gap-2">
        {entries.map((f) => {
          const reported = isReported(f.id);
          return (
            <li key={f.id} className="rounded-lg border border-gray-100 px-3 py-2">
              <div className="flex items-center justify-between">
                <StarRating value={f.stars} readOnly size="sm" />
                <span className="font-mono text-xs text-gray-400">
                  {formatLogDateTime(f.createdAt)}
                </span>
              </div>
              {f.tags.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {f.tags.map((tag) => (
                    <TagChip key={tag} tag={tag} />
                  ))}
                </div>
              )}
              {f.comment && (
                <p className="mt-1.5 text-sm text-gray-700">
                  &ldquo;{f.comment}&rdquo;
                </p>
              )}
              <div className="mt-1.5 flex items-center justify-between gap-2">
                {reported ? (
                  <Badge tone="warning">{t('review.report.underReview')}</Badge>
                ) : (
                  <span />
                )}
                {currentUserId && !reported && (
                  <button
                    type="button"
                    onClick={() => openReport(f.id)}
                    className="text-xs font-medium text-gray-400 hover:text-rose-600 hover:underline"
                  >
                    {t('review.report.button')}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Report modal */}
      <Modal
        open={reportTargetId !== null}
        onClose={() => setReportTargetId(null)}
        title={t('review.report.modal.title')}
      >
        <div className="flex flex-col gap-3 text-sm">
          <p className="text-gray-700">{t('review.report.modal.body')}</p>
          <Textarea
            label={t('review.report.modal.reasonLabel')}
            value={reportReason}
            onChange={(e) => {
              setReportReason(e.target.value);
              if (reportError) setReportError(null);
            }}
            rows={3}
            maxLength={500}
            placeholder={t('review.report.modal.reasonPlaceholder')}
          />
          <Textarea
            label={t('review.report.modal.noteLabel')}
            value={reportNote}
            onChange={(e) => setReportNote(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder={t('review.report.modal.notePlaceholder')}
          />
          {reportError && (
            <p role="alert" className="text-xs text-red-600">
              {reportError}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setReportTargetId(null)}
            >
              {t('btn.cancel')}
            </Button>
            <Button size="sm" variant="primary" onClick={submitReportForm}>
              {t('review.report.modal.submit')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function TagChip({ tag }: { tag: EmployerFeedbackTag }) {
  return (
    <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
      {t(`employerFeedback.tag.${tag}`)}
    </span>
  );
}
