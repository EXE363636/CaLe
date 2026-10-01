'use client';

/**
 * P2-1 (F9) — admin bật/tắt + đặt mức cọc người lao động (supabase, migration
 * 0028). Mặc định TẮT. Mỗi lần đổi server ghi nhật ký. Tắt chỉ dừng giữ cọc
 * mới; khoản đang giữ vẫn được hoàn / chuyển như thường.
 */

import { useEffect, useState } from 'react';

import { Button, Card, Input } from '@/components/ui';
import {
  adminGetWorkerDepositSettings,
  adminSetWorkerDepositSettings,
  type AdminWorkerDepositSettings,
} from '@/data/repos/workerDepositRepo';
import type { WorkerDepositSettings } from '@/domain/workerDeposit';
import { toastFromStoreError } from '@/lib/errorMap';
import { formatVND } from '@/lib/format';
import { formatNumberVNInput, parseVNNumberInput } from '@/lib/numberVN';
import { showError, showSuccess } from '@/lib/toast';
import { t } from '@/i18n/vi';

function errMsg(e: unknown): string {
  return toastFromStoreError(e instanceof Error ? e.message : 'BACKEND_ERROR');
}

const digits = (s: string): number => (/^\d+$/.test(s) ? Number(s) : -1);

export function WorkerDepositCard() {
  const [data, setData] = useState<AdminWorkerDepositSettings | null>(null);
  const [ratioText, setRatioText] = useState('');
  const [maxText, setMaxText] = useState('');
  const [exemptText, setExemptText] = useState('');
  const [windowText, setWindowText] = useState('');
  const [maxOpenText, setMaxOpenText] = useState('');
  const [capText, setCapText] = useState('');
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [failedKey, setFailedKey] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    adminGetWorkerDepositSettings()
      .then((d) => {
        if (!alive) return;
        setData(d);
        setRatioText(String(d.ratioPct));
        setMaxText(formatNumberVNInput(String(d.maxAmount)));
        setExemptText(String(d.exemptAfter));
        setWindowText(String(d.windowDays));
        setMaxOpenText(String(d.maxOpenHolds));
        setCapText(formatNumberVNInput(String(d.forfeitDailyCap)));
      })
      .catch(() => {
        if (alive) setFailedKey(reloadKey);
      });
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  if (!data && failedKey === reloadKey) {
    return (
      <Card>
        <h2 className="font-semibold text-gray-900">{t('admin.workerDeposit.title')}</h2>
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

  async function save(next: WorkerDepositSettings) {
    setSaving(true);
    try {
      await adminSetWorkerDepositSettings(next);
      showSuccess(t('admin.workerDeposit.saved'));
      setReloadKey((k) => k + 1);
    } catch (e) {
      showError(errMsg(e));
    } finally {
      setSaving(false);
    }
  }

  const money = (s: string): number => {
    const v = parseVNNumberInput(s);
    return Number.isFinite(v) ? v : -1;
  };
  const draft: WorkerDepositSettings = {
    enabled: data?.enabled ?? false,
    ratioPct: digits(ratioText),
    maxAmount: money(maxText),
    exemptAfter: digits(exemptText),
    windowDays: digits(windowText),
    maxOpenHolds: digits(maxOpenText),
    forfeitDailyCap: money(capText),
  };
  // Khớp ràng buộc server admin_set_worker_deposit_settings.
  const valid =
    draft.ratioPct >= 1 && draft.ratioPct <= 100 &&
    draft.maxAmount >= 1000 && draft.maxAmount <= 500000 &&
    draft.exemptAfter >= 1 && draft.exemptAfter <= 100 &&
    draft.windowDays >= 1 && draft.windowDays <= 365 &&
    draft.maxOpenHolds >= 1 && draft.maxOpenHolds <= 20 &&
    draft.forfeitDailyCap >= 0 && draft.forfeitDailyCap <= 10_000_000;
  const unchanged =
    !!data &&
    draft.ratioPct === data.ratioPct &&
    draft.maxAmount === data.maxAmount &&
    draft.exemptAfter === data.exemptAfter &&
    draft.windowDays === data.windowDays &&
    draft.maxOpenHolds === data.maxOpenHolds &&
    draft.forfeitDailyCap === data.forfeitDailyCap;

  return (
    <Card>
      <h2 className="font-semibold text-gray-900">{t('admin.workerDeposit.title')}</h2>
      <p className="mt-1 text-sm text-gray-600" role="status">
        {!data
          ? t('common.loading')
          : data.enabled
            ? t('admin.workerDeposit.status.on')
                .replace('{pct}', String(data.ratioPct))
                .replace('{max}', formatVND(data.maxAmount))
                .replace('{n}', String(data.exemptAfter))
                .replace('{days}', String(data.windowDays))
            : t('admin.workerDeposit.status.off')}
      </p>
      {data && (data.heldCount > 0 || data.contestedCount > 0) && (
        <p className="mt-1 text-sm text-gray-700">
          {t('admin.workerDeposit.held')
            .replace('{count}', String(data.heldCount))
            .replace('{amount}', formatVND(data.heldAmount))
            .replace('{contested}', String(data.contestedCount))}
        </p>
      )}
      {data && data.overdueHeldCount > 0 && (
        <p role="alert" className="mt-1 text-sm font-semibold text-red-700">
          {t('admin.workerDeposit.overdue').replace('{count}', String(data.overdueHeldCount))}
        </p>
      )}
      <p className="mt-1 text-xs text-gray-500">{t('admin.workerDeposit.hint')}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Input
          id="worker-deposit-ratio"
          label={t('admin.workerDeposit.ratio')}
          inputMode="numeric"
          value={ratioText}
          onChange={(e) => setRatioText(e.target.value.replace(/\D/g, ''))}
        />
        <Input
          id="worker-deposit-max"
          label={t('admin.workerDeposit.max')}
          inputMode="numeric"
          value={maxText}
          onChange={(e) => setMaxText(formatNumberVNInput(e.target.value))}
        />
        <Input
          id="worker-deposit-exempt"
          label={t('admin.workerDeposit.exemptAfter')}
          inputMode="numeric"
          value={exemptText}
          onChange={(e) => setExemptText(e.target.value.replace(/\D/g, ''))}
        />
        <Input
          id="worker-deposit-window"
          label={t('admin.workerDeposit.windowDays')}
          inputMode="numeric"
          value={windowText}
          onChange={(e) => setWindowText(e.target.value.replace(/\D/g, ''))}
        />
        <Input
          id="worker-deposit-max-open"
          label={t('admin.workerDeposit.maxOpen')}
          inputMode="numeric"
          value={maxOpenText}
          onChange={(e) => setMaxOpenText(e.target.value.replace(/\D/g, ''))}
        />
        <Input
          id="worker-deposit-forfeit-cap"
          label={t('admin.workerDeposit.forfeitCap')}
          inputMode="numeric"
          value={capText}
          onChange={(e) => setCapText(formatNumberVNInput(e.target.value))}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant="secondary"
          disabled={!data || !valid || unchanged}
          loading={saving}
          onClick={() => void save(draft)}
        >
          {t('btn.save')}
        </Button>
        {data && (
          <Button
            variant={data.enabled ? 'ghost' : 'primary'}
            disabled={saving || !valid}
            onClick={() => void save({ ...draft, enabled: !data.enabled })}
          >
            {data.enabled ? t('admin.workerDeposit.disable') : t('admin.workerDeposit.enable')}
          </Button>
        )}
      </div>
    </Card>
  );
}
