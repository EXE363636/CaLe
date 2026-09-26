'use client';

/**
 * ReviewList — MỘT cách hiển thị đánh giá cho cả hai chiều:
 *   - người lao động → nhà tuyển dụng (EmployerFeedbackList),
 *   - nhà tuyển dụng → người lao động (hồ sơ worker, modal hồ sơ).
 *
 * Kiểu Google Maps: khung tóm tắt (sao + điểm trung bình + số lượt + phân bố
 * sao), bộ sắp xếp, từng đánh giá (sao, thời điểm, nhãn nhanh, nhận xét).
 * "Báo cáo đánh giá" chỉ có ở bản demo — production chưa có luồng báo cáo
 * phía server nên không hiện nút một thao tác không đi tới đâu.
 */

import { useMemo, useState } from 'react';
import { StarRating, Button, Modal, Textarea, Badge } from '@/components/ui';
import { useReviewReportStore } from '@/stores/reviewReportStore';
import { useAuthStore } from '@/stores/authStore';
import { isSupabaseEnv } from '@/data/supabaseClient';
import { formatLogDateTime } from '@/lib/format';
import { showSuccess } from '@/lib/toast';
import { t } from '@/i18n/vi';
import type { EmployerFeedbackTag } from '@/types';

export interface ReviewItem {
  id: string;
  stars: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  tags?: EmployerFeedbackTag[];
  createdAt: string;
}

interface ReviewListProps {
  items: ReviewItem[];
  /** Loại đánh giá cho luồng báo cáo (bản demo). */
  reportKind: 'employerFeedback' | 'rating';
  /** Số đánh giá hiển thị tối đa. */
  limit?: number;
  emptyText: string;
  /** Ẩn khung tóm tắt khi nơi hiển thị đã có điểm trung bình riêng. */
  showSummary?: boolean;
}

type SortMode = 'newest' | 'oldest' | 'highest' | 'lowest' | 'withComment';

const SORT_OPTIONS: ReadonlyArray<{ value: SortMode; key: string }> = [
  { value: 'newest', key: 'review.sort.newest' },
  { value: 'oldest', key: 'review.sort.oldest' },
  { value: 'highest', key: 'review.sort.highest' },
  { value: 'lowest', key: 'review.sort.lowest' },
  { value: 'withComment', key: 'review.sort.withComment' },
];

function sortItems(entries: ReviewItem[], mode: SortMode): ReviewItem[] {
  const copy = [...entries];
  switch (mode) {
    case 'newest':
      return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    case 'oldest':
      return copy.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    case 'highest':
      return copy.sort((a, b) => b.stars - a.stars || b.createdAt.localeCompare(a.createdAt));
    case 'lowest':
      return copy.sort((a, b) => a.stars - b.stars || b.createdAt.localeCompare(a.createdAt));
    case 'withComment':
      return copy
        .filter((f) => Boolean(f.comment && f.comment.trim()))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

export function ReviewList({
  items,
  reportKind,
  limit = 5,
  emptyText,
  showSummary = true,
}: ReviewListProps) {
  const reports = useReviewReportStore((s) => s.reports);
  const submitReport = useReviewReportStore((s) => s.submit);
  const currentUserId = useAuthStore((s) => s.currentUserId);
  const reportingEnabled = !isSupabaseEnv();

  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportNote, setReportNote] = useState('');
  const [reportError, setReportError] = useState<string | null>(null);

  const entries = useMemo(
    () => sortItems(items, sortMode).slice(0, limit),
    [items, sortMode, limit],
  );

  const summary = useMemo(() => {
    const dist = [0, 0, 0, 0, 0]; // index 0 = 1★ … index 4 = 5★
    let total = 0;
    for (const f of items) {
      dist[f.stars - 1] += 1;
      total += f.stars;
    }
    return { dist, avg: items.length === 0 ? null : total / items.length, count: items.length };
  }, [items]);

  function isReported(reviewId: string): boolean {
    return reports.some((r) => r.targetReviewId === reviewId && r.status === 'Open');
  }

  function submitReportForm() {
    if (!reportTargetId || !currentUserId) return;
    const result = submitReport({
      targetKind: reportKind,
      targetReviewId: reportTargetId,
      reportedByUserId: currentUserId,
      reason: reportReason,
      note: reportNote,
    });
    if (!result.ok) {
      setReportError(
        result.error === 'ALREADY_REPORTED'
          ? t('review.report.error.already')
          : t('review.report.error.reasonRequired'),
      );
      return;
    }
    showSuccess(t('review.report.success'));
    setReportTargetId(null);
  }

  if (items.length === 0) {
    return <p className="text-sm text-gray-600">{emptyText}</p>;
  }

  return (
    <div>
      {showSummary && summary.avg !== null && (
        <div className="mb-3 rounded-lg bg-gray-50 px-3 py-2 ring-1 ring-gray-100">
          <div className="flex flex-wrap items-center gap-2">
            <StarRating value={Math.round(summary.avg)} readOnly size="sm" />
            <span className="text-sm font-semibold tabular-nums text-gray-900">
              {summary.avg.toFixed(1)} / 5
            </span>
            <span className="text-xs text-gray-600">
              ({summary.count} {t('review.summary.count')})
            </span>
          </div>
          <ul className="mt-2 flex flex-col gap-0.5" aria-label={t('review.summary.distribution')}>
            {[5, 4, 3, 2, 1].map((star) => {
              const c = summary.dist[star - 1];
              const pct = summary.count > 0 ? (c / summary.count) * 100 : 0;
              return (
                <li key={star} className="flex items-center gap-2 text-xs">
                  <span className="w-6 text-right tabular-nums text-gray-600">{star}★</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
                    <span className="block h-full bg-orange-400" style={{ width: `${pct}%` }} />
                  </span>
                  <span className="w-6 tabular-nums text-gray-600">{c}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="mb-2 flex flex-wrap gap-1.5">
        {SORT_OPTIONS.map((opt) => {
          const active = sortMode === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={active}
              onClick={() => setSortMode(opt.value)}
              className={[
                'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-1',
                active ? 'bg-orange-500 text-gray-900' : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
              ].join(' ')}
            >
              {t(opt.key)}
            </button>
          );
        })}
      </div>

      <ul className="flex flex-col gap-2">
        {entries.map((f) => {
          const reported = reportingEnabled && isReported(f.id);
          return (
            <li key={f.id} className="rounded-lg border border-gray-100 px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <StarRating value={f.stars} readOnly size="sm" />
                <span className="font-mono text-xs text-gray-600">{formatLogDateTime(f.createdAt)}</span>
              </div>
              {f.tags && f.tags.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {f.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800"
                    >
                      {t(`employerFeedback.tag.${tag}`)}
                    </span>
                  ))}
                </div>
              )}
              {f.comment && (
                <p className="mt-1.5 text-sm text-gray-700">&ldquo;{f.comment}&rdquo;</p>
              )}
              {reportingEnabled && (reported || currentUserId) && (
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  {reported ? <Badge tone="warning">{t('review.report.underReview')}</Badge> : <span />}
                  {currentUserId && !reported && (
                    <button
                      type="button"
                      onClick={() => {
                        setReportTargetId(f.id);
                        setReportReason('');
                        setReportNote('');
                        setReportError(null);
                      }}
                      className="rounded text-xs font-medium text-gray-600 hover:text-rose-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                    >
                      {t('review.report.button')}
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {reportingEnabled && (
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
              <Button size="sm" variant="ghost" onClick={() => setReportTargetId(null)}>
                {t('btn.cancel')}
              </Button>
              <Button size="sm" variant="primary" onClick={submitReportForm}>
                {t('review.report.modal.submit')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
