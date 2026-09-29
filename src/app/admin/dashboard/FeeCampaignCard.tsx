'use client';

/**
 * P2-3 (F12) — admin bật/tắt đợt miễn phí dịch vụ (supabase, migration 0025).
 * Ca giữ cọc đến HẾT ngày đã chọn (giờ Việt Nam) có phí 0%; ca đăng trước đó
 * không đổi. Dùng cho campaign "Miễn phí 1 tuần" / "Free cả tháng".
 */

import { useEffect, useState } from 'react';

import { Button, Card, DateFieldVN } from '@/components/ui';
import { adminSetFeeFreeUntil, getFeeSettings } from '@/data/repos/feeRepo';
import { isFeeFreeActive, vietnamDate } from '@/domain/deposit';
import { toastFromStoreError } from '@/lib/errorMap';
import { formatDateVN } from '@/lib/format';
import { showError, showSuccess } from '@/lib/toast';
import { t } from '@/i18n/vi';

function errMsg(e: unknown): string {
  return toastFromStoreError(e instanceof Error ? e.message : 'BACKEND_ERROR');
}

export function FeeCampaignCard() {
  // undefined = đang tải; null = không có đợt.
  const [until, setUntil] = useState<string | null | undefined>(undefined);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    getFeeSettings()
      .then((s) => {
        if (!alive) return;
        setUntil(s.feeFreeUntil);
        setDraft(s.feeFreeUntil ?? '');
      })
      .catch((e) => showError(errMsg(e)));
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  async function save(next: string | null) {
    setSaving(true);
    try {
      await adminSetFeeFreeUntil(next);
      showSuccess(next ? t('admin.feeFree.saved') : t('admin.feeFree.cleared'));
      setReloadKey((k) => k + 1);
    } catch (e) {
      showError(errMsg(e));
    } finally {
      setSaving(false);
    }
  }

  const nowIso = new Date().toISOString();
  const today = vietnamDate(nowIso);
  const active = until !== undefined && isFeeFreeActive(until, nowIso);
  const draftValid = draft !== '' && draft >= today;

  return (
    <Card>
      <h2 className="font-semibold text-gray-900">{t('admin.feeFree.title')}</h2>
      <p className="mt-1 text-sm text-gray-600" role="status">
        {until === undefined
          ? t('common.loading')
          : active
            ? t('admin.feeFree.status.active').replace('{date}', formatDateVN(until ?? ''))
            : t('admin.feeFree.status.off')}
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="sm:w-56">
          <DateFieldVN
            id="fee-free-until"
            label={t('admin.feeFree.dateLabel')}
            hint={t('admin.feeFree.hint')}
            value={draft}
            onChange={setDraft}
          />
        </div>
        <Button
          variant="secondary"
          disabled={until === undefined || !draftValid || draft === until}
          loading={saving}
          onClick={() => void save(draft)}
        >
          {t('btn.save')}
        </Button>
        {until && (
          <Button variant="ghost" disabled={saving} onClick={() => void save(null)}>
            {t('admin.feeFree.clear')}
          </Button>
        )}
      </div>
    </Card>
  );
}
