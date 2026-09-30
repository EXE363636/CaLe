'use client';

/**
 * P2-1 (0028) — admin xử khiếu nại "bị đánh vắng mặt" của người lao động:
 *   - có tiền cọc: hoàn cho người lao động hoặc chuyển cho nhà tuyển dụng (gồm
 *     cả khoản hệ thống giữ lại vì NTD đã nhận quá trần 24 giờ);
 *   - không kèm cọc (L1): chấp nhận → lần vắng mặt không tính khi xét miễn cọc.
 * Ghi chú quyết định bắt buộc (người lao động thấy ghi chú này). Server chặn
 * admin tự xử khoản mà mình là một bên.
 */

import { useEffect, useState } from 'react';

import { Button, Card, Textarea } from '@/components/ui';
import {
  adminListNoShowCases,
  adminResolveNoShowCase,
  type AdminNoShowCase,
} from '@/data/repos/workerDepositRepo';
import { toastFromStoreError } from '@/lib/errorMap';
import { formatDateVN, formatVND } from '@/lib/format';
import { showError, showSuccess } from '@/lib/toast';
import { t } from '@/i18n/vi';

export function WorkerHoldContestList() {
  const [items, setItems] = useState<AdminNoShowCase[] | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [failedKey, setFailedKey] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    adminListNoShowCases()
      .then((r) => {
        if (alive) setItems(r);
      })
      .catch(() => {
        if (alive) setFailedKey(reloadKey);
      });
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  // Không có gì để xử → không chiếm chỗ trên trang Thống kê.
  if (items && items.length === 0) return null;

  return (
    <Card>
      <h2 className="font-semibold text-gray-900">{t('admin.workerHolds.title')}</h2>
      {!items && failedKey === reloadKey ? (
        <div
          role="alert"
          className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <span>{t('admin.settings.loadError')}</span>
          <Button size="sm" variant="secondary" onClick={() => setReloadKey((k) => k + 1)}>
            {t('btn.retry')}
          </Button>
        </div>
      ) : !items ? (
        <p className="mt-1 text-sm text-gray-600" role="status">{t('common.loading')}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {items.map((c) => (
            <CaseItem key={c.key} item={c} onResolved={() => setReloadKey((k) => k + 1)} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function CaseItem({ item, onResolved }: { item: AdminNoShowCase; onResolved: () => void }) {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState<null | 'worker' | 'employer'>(null);
  const withDeposit = item.holdId !== null;

  async function resolve(forWorker: boolean) {
    setSaving(forWorker ? 'worker' : 'employer');
    try {
      await adminResolveNoShowCase(item, forWorker, note.trim());
      showSuccess(t('admin.workerHolds.resolved'));
      onResolved();
    } catch (e) {
      showError(toastFromStoreError(e instanceof Error ? e.message : 'BACKEND_ERROR'));
    } finally {
      setSaving(null);
    }
  }

  const noteOk = note.trim().length > 0;
  // L7: chuỗi người dùng nhập thay bằng hàm → không bị diễn giải mẫu `$&`.
  const fill = (key: string, map: Record<string, string>) =>
    Object.entries(map).reduce((acc, [k, v]) => acc.replace(`{${k}}`, () => v), t(key));

  return (
    <li className="rounded-lg border border-gray-200 p-3 text-sm text-gray-800">
      <p className="font-semibold">
        {fill('admin.workerHolds.shift', {
          shift: item.shiftTitle,
          date: formatDateVN(item.shiftDate),
          start: item.startTime,
          end: item.endTime,
        })}
      </p>
      <p className="mt-1 text-gray-600">
        {fill('admin.workerHolds.parties', {
          worker: item.workerName || item.workerId.slice(0, 8),
          employer: item.employerName || item.employerId.slice(0, 8),
        })}
      </p>
      <p className="mt-1">
        {withDeposit
          ? fill('admin.workerHolds.amount', { amount: formatVND(item.amount) })
          : t('admin.workerHolds.noDeposit')}
      </p>
      {item.reviewReason === 'EMPLOYER_DAILY_CAP' && (
        <p className="mt-1 text-amber-800">{t('admin.workerHolds.reviewCap')}</p>
      )}
      {item.reviewReason === 'AUTO_NO_SHOW' && (
        <p className="mt-1 text-amber-800">{t('admin.workerHolds.reviewAuto')}</p>
      )}
      <p className="mt-1 whitespace-pre-line">
        {item.contestReason
          ? fill('admin.workerHolds.reason', { reason: item.contestReason })
          : t('admin.workerHolds.noReason')}
      </p>
      <div className="mt-2">
        <Textarea
          id={`worker-hold-note-${item.key}`}
          label={t('admin.workerHolds.noteLabel')}
          value={note}
          maxLength={500}
          rows={2}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={!noteOk || saving !== null}
          loading={saving === 'worker'}
          onClick={() => void resolve(true)}
        >
          {withDeposit ? t('admin.workerHolds.toWorker') : t('admin.workerHolds.overturn')}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={!noteOk || saving !== null}
          loading={saving === 'employer'}
          onClick={() => void resolve(false)}
        >
          {withDeposit ? t('admin.workerHolds.toEmployer') : t('admin.workerHolds.reject')}
        </Button>
      </div>
    </li>
  );
}
