'use client';

import { useState } from 'react';
import { StarRating, Button, Textarea } from '@/components/ui';
import { t } from '@/i18n/vi';

interface RatingFormProps {
  onSubmit: (rating: { stars: 1 | 2 | 3 | 4 | 5; feedback?: string }) => void;
  loading?: boolean;
  className?: string;
}

export function RatingForm({ onSubmit, loading = false, className = '' }: RatingFormProps) {
  const [stars, setStars] = useState<number>(0);
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className={['rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700', className].join(' ')}>
        {t('rating.submitted')}
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (stars === 0 || loading) return;
    onSubmit({
      stars: stars as 1 | 2 | 3 | 4 | 5,
      feedback: feedback.trim() || undefined,
    });
    setSubmitted(true);
  }

  return (
    <form onSubmit={handleSubmit} className={['flex flex-col gap-4', className].join(' ')}>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-700">{t('form.rating')}</span>
        <StarRating
          value={stars}
          onChange={setStars as (s: 1 | 2 | 3 | 4 | 5) => void}
          size="lg"
        />
      </div>

      <Textarea
        label={t('form.feedback')}
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        maxLength={500}
        rows={3}
        placeholder="Nhận xét về người lao động..."
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
