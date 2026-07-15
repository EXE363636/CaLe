'use client';

// Feature: checkpoint-readiness-phase-1, Task 5.7 — RoleSwitcher.
//
// Client component that renders the two role choices and drives
// `roleSelectionStore`. Clicking a choice calls `select(role)`.
// Enhanced UI: larger buttons with icons, animated active indicator.

import { useRoleSelectionStore } from '@/stores/roleSelectionStore';
import { contentForRole, isRoleView } from './roleContentData';
import { t } from '@/i18n/vi';

function WorkerIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 21V9h6v12M3 9h18" />
    </svg>
  );
}

const ROLE_ICONS: Record<string, React.ReactNode> = {
  worker: <WorkerIcon />,
  employer: <BuildingIcon />,
};

export function RoleSwitcher() {
  const selectedRole = useRoleSelectionStore((s) => s.selectedRole);
  const select = useRoleSelectionStore((s) => s.select);

  const neutral = contentForRole(null);
  const options = isRoleView(neutral) ? [] : neutral.options;

  return (
    <div className="mx-auto max-w-xl">
      <div
        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        role="group"
        aria-label={t('landing.roleSwitcher.title')}
      >
        {options.map((option) => {
          const active = selectedRole === option.role;
          return (
            <button
              key={option.role}
              type="button"
              onClick={() => select(option.role)}
              aria-pressed={active}
              className={[
                'motion-press group relative inline-flex min-h-[60px] items-center justify-center gap-3 overflow-hidden rounded-2xl px-6 text-base font-bold shadow-sm transition-all duration-200',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2',
              ].join(' ')}
              style={
                active
                  ? {
                      background: 'linear-gradient(135deg, #ea580c 0%, #f97316 50%, #fb923c 100%)',
                      color: '#ffffff',
                      boxShadow: '0 8px 24px rgba(249, 115, 22, 0.35), 0 2px 8px rgba(249, 115, 22, 0.2)',
                      transform: 'translateY(-2px)',
                    }
                  : {
                      background: 'rgba(255, 255, 255, 0.85)',
                      color: 'var(--brand)',
                      border: '2px solid rgba(249, 115, 22, 0.25)',
                      backdropFilter: 'blur(8px)',
                    }
              }
            >
              {/* Shimmer on active */}
              {active && (
                <span className="shimmer pointer-events-none absolute inset-0 rounded-2xl" aria-hidden="true" />
              )}
              {/* Icon */}
              <span
                className={[
                  'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all duration-200',
                  active
                    ? 'bg-white/20 text-white'
                    : 'bg-orange-50 text-orange-600 group-hover:bg-orange-100',
                ].join(' ')}
              >
                {ROLE_ICONS[option.role]}
              </span>
              {/* Label */}
              <span className="relative z-10">{t(option.labelKey)}</span>
              {/* Active check */}
              {active && (
                <span className="relative z-10 ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/25">
                  <svg className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selectedRole !== null && (
        <p className="mt-3 text-center text-xs" style={{ color: 'var(--muted)' }}>
          {t('landing.roleSwitcher.switchHint')}
        </p>
      )}
    </div>
  );
}
