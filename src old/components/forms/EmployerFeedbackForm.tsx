'use client';

/**
 * Worker → employer feedback form (Phase 6).
 *
 * Mirrors the employer-side `RatingForm` but adds a fixed-vocabulary tag
 * picker so workers can quickly leave structured signal without writing a
 * comment. Submission is one-shot — the parent removes the form from view
 * once it returns success.
 */

import { useState } from 'react';
import { Button, StarRating, Textarea } from '@/components/ui';
import { t } from '@/i18n/vi';
import type { EmployerFeedbackTag } from '@/types';

interface EmployerFeedbackFormProps {
  onSubmit: (input: {
    stars: 1 | 2 | 3 | 4 | 5;
    comment?: string;
    tags: EmployerFeedbackTag[];
  }) => void;
  loading?: boolean;
  className?: string;
}

const ALL_TAGS: ReadonlyArray<EmployerFeedbackTag> = [
  'PaidOnTime',
  'GoodEnvironment',
  'ClearCommunication',
  'AccurateDescription',
];

export function EmployerFeedbackForm({
  onSubmit,
  loading = false,
  className = '',
}: EmployerFeedbackFormProps) {
  const [stars, setStars] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [tags, setTags] = useState<Set<EmployerFeedbackTag>>(new Set());

  function toggleTag(tag: EmployerFeedbackTag) {
    setTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (stars === 0 || loading) return;
    onSubmit({
      stars: stars as 1 | 2 | 3 | 4 | 5,
      comment: comment.trim() || undefined,
      tags: Array.from(tags),
    });
  }

  return (
    <form onSubmit={handleSubmit} className={['flex flex-col gap-4', className].join(' ')}>
      <p className="text-sm text-gray-700">{t('employerFeedback.formIntro')}</p>

      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-700">{t('form.rating')}</span>
        <StarRating
          value={stars}
          onChange={setStars as (s: 1 | 2 | 3 | 4 | 5) => void}
          size="lg"
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-700">
          {t('employerFeedback.tagsLabel')}
        </span>
        <div className="flex flex-wrap gap-2">
          {ALL_TAGS.map((tag) => {
            const active = tags.has(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                aria-pressed={active}
                className={[
                  'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  active
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
                ].join(' ')}
              >
                {t(`employerFeedback.tag.${tag}`)}
              </button>
            );
          })}
        </div>
      </div>

      <Textarea
        label={t('employerFeedback.commentLabel')}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={500}
        rows={3}
        placeholder={t('employerFeedback.commentPlaceholder')}
      />

      <Button
        type="submit"
        variant="primary"
        disabled={stars === 0 || loading}
        loading={loading}
      >
        {t('btn.submit')}
      </Button>
    </form>
  );
}
