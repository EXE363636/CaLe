'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui';
import { t } from '@/i18n/vi';

interface ShiftSearchBarProps {
  value: string;
  onSearch: (value: string) => void;
  className?: string;
}

function SearchIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4 text-gray-400"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export function ShiftSearchBar({ value, onSearch, className = '' }: ShiftSearchBarProps) {
  const [draft, setDraft] = useState(value);

  // Sync external value changes (e.g. clear filters)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional controlled→local draft sync (e.g. clear filters); refactor would desync the search input
    setDraft(value);
  }, [value]);

  // Debounce: fire onSearch 300 ms after the user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(draft);
    }, 300);
    return () => clearTimeout(timer);
  }, [draft, onSearch]);

  return (
    <div className={`relative ${className}`}>
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
        <SearchIcon />
      </span>
      <Input
        type="search"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={t('form.searchPlaceholder')}
        className="pl-9"
        aria-label={t('btn.search')}
      />
    </div>
  );
}
