import { Star, Flag } from 'lucide-react';
import { Card } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { cn } from '../../utils/helpers';
import { formatRelativeTime } from '../../utils/helpers';
import type { Review } from '../../types';

interface ReviewCardProps {
  review: Review;
  showReportButton?: boolean;
  onReport?: () => void;
}

export function ReviewCard({ review, showReportButton = true, onReport }: ReviewCardProps) {
  return (
    <Card padding="md">
      <div className="flex items-start gap-3">
        <Avatar name={review.reviewerName} size="md" />
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <div>
              <h4 className="font-medium text-gray-900">{review.reviewerName}</h4>
              <p className="text-xs text-gray-500">{formatRelativeTime(review.createdAt)}</p>
            </div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(i => (
                <Star
                  key={i}
                  className={cn(
                    'w-4 h-4',
                    i <= review.rating
                      ? 'text-warning-400 fill-warning-400'
                      : 'text-gray-300'
                  )}
                />
              ))}
            </div>
          </div>

          {/* Shift title */}
          <p className="text-xs text-gray-500 mb-2">Ca: {review.shiftTitle}</p>

          {/* Comment */}
          <p className="text-sm text-gray-700">{review.comment}</p>

          {/* Report status or button */}
          <div className="mt-3 flex items-center justify-between">
            {review.reported ? (
              <span className="text-xs text-warning-600 flex items-center gap-1">
                <Flag className="w-3 h-3" />
                Đang được xem xét
              </span>
            ) : showReportButton ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-gray-500"
                onClick={onReport}
              >
                <Flag className="w-3 h-3 mr-1" />
                Báo cáo
              </Button>
            ) : (
              <span />
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

interface ReviewsListProps {
  reviews: Review[];
  showReportButton?: boolean;
  onReport?: (reviewId: string) => void;
}

export function ReviewsList({ reviews, showReportButton = true, onReport }: ReviewsListProps) {
  return (
    <div className="space-y-4">
      {reviews.map(review => (
        <ReviewCard
          key={review.id}
          review={review}
          showReportButton={showReportButton}
          onReport={() => onReport?.(review.id)}
        />
      ))}
    </div>
  );
}
