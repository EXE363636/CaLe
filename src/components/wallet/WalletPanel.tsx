'use client';

/**
 * Phase 10C-Stab-1 Batch 4B — wallet balance tile + ledger modal.
 *
 * Mock-only. Reads from `useWalletStore.getBalance(userId)` for the
 * balance and `useWalletStore.forUser(userId)` for the ledger entries.
 * The component is intentionally generic: the same tile renders on
 * both the worker and employer dashboards. Balance can go negative
 * when the employer holds outstanding deposits — the styling
 * accommodates either sign without distinction.
 */

import { useMemo, useState } from 'react';
import { Button, Card, Modal } from '@/components/ui';
import { formatVND } from '@/lib/format';
import { t } from '@/i18n/vi';
import { useWalletStore } from '@/stores/walletStore';
import type { WalletLedgerEntry } from '@/types';

interface WalletPanelProps {
  userId: string;
  /**
   * Optional title override for the tile (default `t('wallet.title')`).
   * Useful when a dashboard wants to label the tile per role.
   */
  title?: string;
  /**
   * Maximum number of ledger entries to render in the inline preview.
   * Defaults to 3. The "Xem lịch sử giao dịch" button always opens
   * the full modal regardless of this value.
   */
  recentLimit?: number;
  className?: string;
}

const DATE_FMT = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

function formatOccurredAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return DATE_FMT.format(d);
}

function entryToneClass(amount: number): string {
  if (amount > 0) return 'text-emerald-700';
  if (amount < 0) return 'text-rose-700';
  return 'text-gray-700';
}

function LedgerRow({ entry }: { entry: WalletLedgerEntry }) {
  const sign = entry.amount > 0 ? '+' : '';
  return (
    <li className="flex flex-col gap-0.5 rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-xs">
      <span className="font-medium text-gray-900">
        {t(`wallet.kind.${entry.kind}`)}
      </span>
      <span className="font-mono text-[11px] text-gray-500">
        {formatOccurredAt(entry.occurredAt)}
      </span>
      <span className={`font-semibold ${entryToneClass(entry.amount)}`}>
        {sign}
        {formatVND(Math.abs(entry.amount))}
      </span>
      {entry.note && (
        <span className="leading-relaxed text-gray-600">{entry.note}</span>
      )}
    </li>
  );
}

export function WalletPanel({
  userId,
  title,
  recentLimit = 3,
  className = '',
}: WalletPanelProps) {
  const balance = useWalletStore((s) => s.getBalance(userId));
  const ledger = useWalletStore((s) => s.ledger);

  const userLedger = useMemo(
    () =>
      ledger
        .filter((l) => l.userId === userId)
        .slice()
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
    [ledger, userId],
  );
  const recent = useMemo(
    () => userLedger.slice(0, recentLimit),
    [userLedger, recentLimit],
  );

  const [modalOpen, setModalOpen] = useState(false);

  return (
    <Card className={className}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-gray-700">
            {title ?? t('wallet.title')}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {t('wallet.balance.label')}
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {formatVND(balance)}
          </p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setModalOpen(true)}
          disabled={userLedger.length === 0}
        >
          {t('wallet.ledger.openButton')}
        </Button>
      </div>

      {userLedger.length === 0 ? (
        <p className="mt-3 text-xs italic text-gray-500">
          {t('wallet.balance.empty')}
        </p>
      ) : (
        <div className="mt-3">
          <p className="mb-1 text-xs font-medium text-gray-700">
            {t('wallet.ledger.recent')}
          </p>
          <ul className="flex flex-col gap-2">
            {recent.map((entry) => (
              <LedgerRow key={entry.id} entry={entry} />
            ))}
          </ul>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={t('wallet.ledger.modal.title')}
      >
        <div className="flex flex-col gap-3 text-sm">
          {userLedger.length === 0 ? (
            <p className="italic text-gray-500">
              {t('wallet.balance.empty')}
            </p>
          ) : (
            <ul className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto pr-1">
              {userLedger.map((entry) => (
                <LedgerRow key={entry.id} entry={entry} />
              ))}
            </ul>
          )}
          <div className="flex justify-end pt-2">
            <Button
              size="sm"
              variant="primary"
              onClick={() => setModalOpen(false)}
            >
              {t('wallet.ledger.modal.close')}
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
