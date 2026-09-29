'use client';

/**
 * P2-2 (F10) — admin đặt chương trình thưởng nạp ví (supabase, migration 0026).
 * Chỉ nhà tuyển dụng; tiền thưởng chỉ trả phí dịch vụ, không rút được, không
 * hết hạn. Tiền thưởng = 0 → tắt. Mỗi lần đổi server ghi nhật ký.
 */

import { useEffect, useState } from 'react';

import { Button, Card, Input } from '@/components/ui';
import { adminSetTopUpBonus, getTopUpBonus } from '@/data/repos/topupBonusRepo';
import type { TopUpBonusRule } from '@/domain/topupBonus';
import { toastFromStoreError } from '@/lib/errorMap';
import { formatVND } from '@/lib/format';
import { formatNumberVNInput, parseVNNumberInput } from '@/lib/numberVN';
import { showError, showSuccess } from '@/lib/toast';
import { t } from '@/i18n/vi';

function errMsg(e: unknown): string {
  return toastFromStoreError(e instanceof Error ? e.message : 'BACKEND_ERROR');
}

export function TopUpBonusCard() {
  const [rule, setRule] = useState<TopUpBonusRule | null>(null);
  const [minText, setMinText] = useState('');
  const [amountText, setAmountText] = useState('');
  const [maxText, setMaxText] = useState('');
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  // Lỗi của lần tải hiện tại (theo reloadKey) — không kẹt "Đang tải..." mãi.
  const [failedKey, setFailedKey] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    getTopUpBonus()
      .then((r) => {
        if (!alive) return;
        setRule(r);
        setMinText(formatNumberVNInput(String(r.minAmount)));
        setAmountText(formatNumberVNInput(String(r.bonusAmount)));
        setMaxText(String(r.maxPerUser));
      })
      .catch(() => {
        if (alive) setFailedKey(reloadKey);
      });
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  if (!rule && failedKey === reloadKey) {
    return (
      <Card>
        <h2 className="font-semibold text-gray-900">{t('admin.topupBonus.title')}</h2>
        <div
          role="alert"
          className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <span>{t('admin.settings.loadError')}</span>
          <Button size="sm" variant="secondary" onClick={() => setReloadKey((k) => k + 1)}>
            {t('btn.retry')}
          </Button>
        </div>
      </Card>
    );
  }

  async function save(next: TopUpBonusRule) {
    setSaving(true);
    try {
      await adminSetTopUpBonus(next);
      showSuccess(t('admin.topupBonus.saved'));
      setReloadKey((k) => k + 1);
    } catch (e) {
      showError(errMsg(e));
    } finally {
      setSaving(false);
    }
  }

  const toNum = (s: string): number => {
    const v = parseVNNumberInput(s);
    return Number.isFinite(v) ? v : -1;
  };
  const draft: TopUpBonusRule = {
    minAmount: toNum(minText),
    bonusAmount: toNum(amountText),
    maxPerUser: /^\d+$/.test(maxText) ? Number(maxText) : -1,
  };
  // Khớp ràng buộc server admin_set_topup_bonus.
  const valid =
    draft.minAmount >= 2000 &&
    draft.minAmount <= 100_000_000 &&
    draft.bonusAmount >= 0 &&
    draft.bonusAmount <= Math.floor(draft.minAmount / 2) &&
    draft.maxPerUser >= 0 &&
    draft.maxPerUser <= 100;
  const unchanged =
    !!rule &&
    draft.minAmount === rule.minAmount &&
    draft.bonusAmount === rule.bonusAmount &&
    draft.maxPerUser === rule.maxPerUser;

  return (
    <Card>
      <h2 className="font-semibold text-gray-900">{t('admin.topupBonus.title')}</h2>
      <p className="mt-1 text-sm text-gray-600" role="status">
        {!rule
          ? t('common.loading')
          : rule.bonusAmount > 0
            ? t('admin.topupBonus.status.on')
                .replace('{min}', formatVND(rule.minAmount))
                .replace('{bonus}', formatVND(rule.bonusAmount))
                .replace('{max}', String(rule.maxPerUser))
            : t('admin.topupBonus.status.off')}
      </p>
      <p className="mt-1 text-xs text-gray-500">{t('admin.topupBonus.hint')}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Input
          id="topup-bonus-min"
          label={t('admin.topupBonus.min')}
          inputMode="numeric"
          value={minText}
          onChange={(e) => setMinText(formatNumberVNInput(e.target.value))}
        />
        <Input
          id="topup-bonus-amount"
          label={t('admin.topupBonus.amount')}
          inputMode="numeric"
          value={amountText}
          onChange={(e) => setAmountText(formatNumberVNInput(e.target.value))}
        />
        <Input
          id="topup-bonus-max"
          label={t('admin.topupBonus.max')}
          inputMode="numeric"
          value={maxText}
          onChange={(e) => setMaxText(e.target.value.replace(/\D/g, ''))}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant="secondary"
          disabled={!rule || !valid || unchanged}
          loading={saving}
          onClick={() => void save(draft)}
        >
          {t('btn.save')}
        </Button>
        {rule && rule.bonusAmount > 0 && (
          <Button
            variant="ghost"
            disabled={saving}
            onClick={() => void save({ ...rule, bonusAmount: 0 })}
          >
            {t('admin.topupBonus.off')}
          </Button>
        )}
      </div>
    </Card>
  );
}
