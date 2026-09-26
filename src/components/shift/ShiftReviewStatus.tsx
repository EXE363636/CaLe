'use client';

/**
 * Dòng tóm tắt đánh giá hai chiều của MỘT ca đã hoàn thành: bạn chấm đối
 * phương bao nhiêu sao, đối phương chấm bạn bao nhiêu sao. Chỉ là tóm tắt —
 * nội dung đầy đủ nằm ở hồ sơ (ReviewList).
 */

import { StarRating } from '@/components/ui';
import { t } from '@/i18n/vi';

interface ShiftReviewStatusProps {
  /** Số sao bạn đã chấm đối phương (undefined = chưa chấm). */
  givenStars?: number;
  /** Số sao đối phương đã chấm bạn (undefined = chưa chấm). */
  receivedStars?: number;
  /** Tên đối phương, ví dụ "Worker 1" hoặc tên nhà tuyển dụng. */
  counterpartName: string;
  className?: string;
}

export function ShiftReviewStatus({
  givenStars,
  receivedStars,
  counterpartName,
  className = '',
}: ShiftReviewStatusProps) {
  if (givenStars === undefined && receivedStars === undefined) return null;

  return (
    <dl
      className={[
        // 2 cột: nhãn (rộng theo nhãn dài nhất) | sao — sao của hai dòng thẳng hàng.
        'grid grid-cols-[max-content_auto] items-center gap-x-3 gap-y-1.5 text-sm text-gray-700',
        className,
      ].join(' ')}
    >
      {givenStars !== undefined && (
        <ReviewStat label={t('review.status.given')} stars={givenStars} />
      )}
      <ReviewStat
        label={t('review.status.received').replace('{name}', counterpartName)}
        stars={receivedStars}
      />
    </dl>
  );
}

function ReviewStat({ label, stars }: { label: string; stars?: number }) {
  return (
    <div className="contents">
      <dt className="text-gray-600">{label}</dt>
      <dd className="flex items-center gap-1.5">
        {stars === undefined ? (
          <span className="text-gray-600">{t('review.status.none')}</span>
        ) : (
          <>
            <StarRating value={stars} readOnly size="sm" />
            <span className="font-semibold tabular-nums text-gray-900">{stars}/5</span>
          </>
        )}
      </dd>
    </div>
  );
}
