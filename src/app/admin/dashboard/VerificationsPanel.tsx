'use client';

/**
 * Admin verification queue — Phase 10A.
 *
 * Three subsections:
 *   1. Pending worker verifications
 *   2. Pending employer verifications
 *   3. Recent review history (last 10 reviewed actions)
 *
 * Admin-only surface. Renders full mock document info (file names,
 * masked + full identifiers) — public consumers (worker / employer
 * dashboards, applicant card) read different selectors that hide the
 * full payload.
 *
 * Notifications are pushed on every action so the affected user sees
 * a deep-linked notification after the admin's decision.
 */

import { useMemo, useState } from 'react';

import { Button, Badge, Card, Modal, Textarea } from '@/components/ui';
import {
  useAuthStore,
  useVerificationStore,
  useNotificationStore,
  useUserStore,
  asWorker,
  asEmployer,
  workerDocLabel,
  employerDocLabel,
  employerTypeLabel,
  getPendingWorkerVerifications,
  getPendingEmployerVerifications,
  getPendingTypeChangeRequests,
  getRecentVerificationHistory,
  verificationStatusLabel,
  verificationStatusTone,
} from '@/stores';
import { showSuccess, showError } from '@/lib/toast';
import { formatDateVN, formatTimeVN } from '@/lib/format';
import type {
  EmployerTypeChangeRequest,
  EmployerVerificationDocument,
  WorkerVerificationDocument,
} from '@/types';

type ReviewAction = 'approve' | 'reject' | 'needs-more-info';

interface ReviewDialogState {
  kind: 'worker' | 'employer';
  documentId: string;
  action: 'reject' | 'needs-more-info';
}

export function VerificationsPanel() {
  const adminId = useAuthStore((s) => s.currentUserId);
  const workerDocs = useVerificationStore((s) => s.workerDocuments);
  const employerDocs = useVerificationStore((s) => s.employerDocuments);
  const users = useUserStore((s) => s.users);
  const pushNotification = useNotificationStore((s) => s.push);

  // Approve actions
  const approveWorkerDocument = useVerificationStore(
    (s) => s.approveWorkerDocument,
  );
  const rejectWorkerDocument = useVerificationStore(
    (s) => s.rejectWorkerDocument,
  );
  const requestMoreWorkerInfo = useVerificationStore(
    (s) => s.requestMoreWorkerInfo,
  );
  const approveEmployerDocument = useVerificationStore(
    (s) => s.approveEmployerDocument,
  );
  const rejectEmployerDocument = useVerificationStore(
    (s) => s.rejectEmployerDocument,
  );
  const requestMoreEmployerInfo = useVerificationStore(
    (s) => s.requestMoreEmployerInfo,
  );
  // Phase 10A-Fix-1: type-change request slice + actions
  const typeChangeRequests = useVerificationStore((s) => s.typeChangeRequests);
  const approveTypeChange = useVerificationStore(
    (s) => s.approveEmployerTypeChangeRequest,
  );
  const rejectTypeChange = useVerificationStore(
    (s) => s.rejectEmployerTypeChangeRequest,
  );
  const updateUser = useUserStore((s) => s.updateUser);

  const pendingWorkers = useMemo(
    () => getPendingWorkerVerifications(workerDocs),
    [workerDocs],
  );
  const pendingEmployers = useMemo(
    () => getPendingEmployerVerifications(employerDocs),
    [employerDocs],
  );
  const recentHistory = useMemo(
    () => getRecentVerificationHistory(workerDocs, employerDocs, 10),
    [workerDocs, employerDocs],
  );
  const pendingTypeChanges = useMemo(
    () => getPendingTypeChangeRequests(typeChangeRequests),
    [typeChangeRequests],
  );

  const userMap = useMemo(() => {
    const m = new Map<string, (typeof users)[number]>();
    for (const u of users) m.set(u.id, u);
    return m;
  }, [users]);

  const [dialog, setDialog] = useState<ReviewDialogState | null>(null);
  const [reason, setReason] = useState('');

  // Phase 10A-Fix-1: history-detail modal + type-change-decision modal.
  const [historyDetail, setHistoryDetail] = useState<
    | { kind: 'worker'; doc: WorkerVerificationDocument }
    | { kind: 'employer'; doc: EmployerVerificationDocument }
    | null
  >(null);
  const [typeChangeDialog, setTypeChangeDialog] = useState<{
    request: EmployerTypeChangeRequest;
    action: 'approve' | 'reject';
  } | null>(null);
  const [typeChangeReason, setTypeChangeReason] = useState('');

  function closeDialog() {
    setDialog(null);
    setReason('');
  }

  function handleTypeChangeAction(
    request: EmployerTypeChangeRequest,
    action: 'approve' | 'reject',
  ) {
    if (!adminId) {
      showError('Không tìm thấy phiên quản trị viên.');
      return;
    }
    if (action === 'approve') {
      const r = approveTypeChange(request.id, adminId);
      if (!r.ok) {
        showError(`Không thể duyệt: ${r.error}`);
        return;
      }
      // Apply the type change to the employer record.
      updateUser(request.employerId, { employerType10A: request.requestedType });
      pushNotification({
        userId: request.employerId,
        kind: 'ReputationAdjusted',
        title: 'Yêu cầu đổi loại tài khoản đã được duyệt',
        body: `Loại tài khoản của bạn đã được đổi từ ${employerTypeLabel(request.currentType)} sang ${employerTypeLabel(request.requestedType)}. Bạn có thể cần cập nhật lại tài liệu xác minh.`,
        link: '/employer/profile',
      });
      showSuccess('Đã duyệt yêu cầu đổi loại tài khoản.');
      return;
    }
    // reject — open dialog to collect reason
    setTypeChangeDialog({ request, action: 'reject' });
    setTypeChangeReason('');
  }

  function submitTypeChangeRejection() {
    if (!typeChangeDialog || !adminId) return;
    const trimmed = typeChangeReason.trim();
    if (!trimmed) {
      showError('Vui lòng nhập lý do.');
      return;
    }
    const r = rejectTypeChange(typeChangeDialog.request.id, adminId, trimmed);
    if (!r.ok) {
      showError(`Không thể xử lý: ${r.error}`);
      return;
    }
    pushNotification({
      userId: typeChangeDialog.request.employerId,
      kind: 'ReputationAdjusted',
      title: 'Yêu cầu đổi loại tài khoản bị từ chối',
      body: `Loại tài khoản của bạn vẫn là ${employerTypeLabel(typeChangeDialog.request.currentType)}. Lý do: ${trimmed}`,
      link: '/employer/profile',
    });
    showSuccess('Đã từ chối yêu cầu.');
    setTypeChangeDialog(null);
    setTypeChangeReason('');
  }

  function handleAction(
    kind: 'worker' | 'employer',
    documentId: string,
    action: ReviewAction,
  ) {
    if (!adminId) {
      showError('Không tìm thấy phiên quản trị viên.');
      return;
    }

    if (action === 'approve') {
      const r =
        kind === 'worker'
          ? approveWorkerDocument(documentId, adminId)
          : approveEmployerDocument(documentId, adminId);
      if (!r.ok) {
        showError(`Không thể duyệt: ${r.error}`);
        return;
      }
      const targetUserId =
        kind === 'worker'
          ? (r.value as WorkerVerificationDocument).workerId
          : (r.value as EmployerVerificationDocument).employerId;
      pushNotification({
        userId: targetUserId,
        kind: 'ReputationAdjusted',
        title: 'Hồ sơ đã được xác minh',
        body: `Quản trị viên đã duyệt giấy tờ "${r.value.displayLabel}". Bạn có thể xem trạng thái trong mục Hồ sơ.`,
        link: kind === 'worker' ? '/worker/profile' : '/employer/profile',
      });
      showSuccess('Đã duyệt giấy tờ.');
      return;
    }

    // reject / needs-more-info — open dialog to collect reason.
    setDialog({ kind, documentId, action });
    setReason('');
  }

  function submitDialog() {
    if (!dialog) return;
    if (!adminId) {
      showError('Không tìm thấy phiên quản trị viên.');
      return;
    }
    const trimmed = reason.trim();
    if (!trimmed) {
      showError('Vui lòng nhập lý do.');
      return;
    }

    const r =
      dialog.kind === 'worker'
        ? dialog.action === 'reject'
          ? rejectWorkerDocument(dialog.documentId, adminId, trimmed)
          : requestMoreWorkerInfo(dialog.documentId, adminId, trimmed)
        : dialog.action === 'reject'
        ? rejectEmployerDocument(dialog.documentId, adminId, trimmed)
        : requestMoreEmployerInfo(dialog.documentId, adminId, trimmed);

    if (!r.ok) {
      showError(`Không thể xử lý: ${r.error}`);
      return;
    }

    const targetUserId =
      dialog.kind === 'worker'
        ? (r.value as WorkerVerificationDocument).workerId
        : (r.value as EmployerVerificationDocument).employerId;

    pushNotification({
      userId: targetUserId,
      kind: 'ReputationAdjusted',
      title:
        dialog.action === 'reject'
          ? 'Giấy tờ xác minh bị từ chối'
          : 'Cần bổ sung thông tin xác minh',
      body: `Giấy tờ "${r.value.displayLabel}": ${trimmed}`,
      link: dialog.kind === 'worker' ? '/worker/profile' : '/employer/profile',
    });

    showSuccess(
      dialog.action === 'reject'
        ? 'Đã từ chối giấy tờ.'
        : 'Đã yêu cầu bổ sung thông tin.',
    );
    closeDialog();
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Pending worker section ──────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">
          Người lao động chờ duyệt
          <span className="ml-2 text-sm font-medium text-gray-500">
            ({pendingWorkers.length})
          </span>
        </h2>
        {pendingWorkers.length === 0 ? (
          <Card>
            <p className="text-sm text-gray-500">
              Không có giấy tờ người lao động đang chờ duyệt.
            </p>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {pendingWorkers.map((doc) => {
              const owner = asWorker(userMap.get(doc.workerId));
              return (
                <Card key={doc.id}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900">
                        {owner?.fullName ?? 'Người lao động không tồn tại'}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {owner?.email ?? '—'} · {owner?.phone ?? '—'}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge tone="warning">
                          {doc.displayLabel}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          Gửi lúc {formatDateVN(doc.submittedAt)}{' '}
                          {formatTimeVN(doc.submittedAt.slice(11, 16))}
                        </span>
                      </div>
                      {(doc.maskedIdentifier || doc.fullIdentifier) && (
                        <p className="mt-2 text-xs text-gray-700">
                          <span className="font-medium">Số đăng ký:</span>{' '}
                          <span className="font-mono">
                            {doc.fullIdentifier ?? doc.maskedIdentifier}
                          </span>
                          {doc.maskedIdentifier && doc.fullIdentifier && (
                            <span className="ml-2 text-gray-500">
                              (hiển thị công khai: {doc.maskedIdentifier})
                            </span>
                          )}
                        </p>
                      )}
                      <DocumentPreview
                        front={doc.mockFrontImageUrl}
                        back={doc.mockBackImageUrl}
                        selfie={doc.mockSelfieImageUrl}
                      />
                      {doc.notes && (
                        <p className="mt-2 text-xs text-gray-600">
                          <span className="font-medium">Ghi chú:</span> {doc.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleAction('worker', doc.id, 'approve')}
                      >
                        Duyệt
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleAction('worker', doc.id, 'reject')}
                      >
                        Từ chối
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          handleAction('worker', doc.id, 'needs-more-info')
                        }
                      >
                        Yêu cầu bổ sung
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Pending employer section ────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">
          Nhà tuyển dụng chờ duyệt
          <span className="ml-2 text-sm font-medium text-gray-500">
            ({pendingEmployers.length})
          </span>
        </h2>
        {pendingEmployers.length === 0 ? (
          <Card>
            <p className="text-sm text-gray-500">
              Không có giấy tờ nhà tuyển dụng đang chờ duyệt.
            </p>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {pendingEmployers.map((doc) => {
              const owner = asEmployer(userMap.get(doc.employerId));
              return (
                <Card key={doc.id}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900">
                        {owner?.companyName ?? 'Nhà tuyển dụng không tồn tại'}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {owner?.email ?? '—'} · {owner?.phone ?? '—'} ·{' '}
                        {employerTypeLabel(doc.employerType)}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge tone="warning">{doc.displayLabel}</Badge>
                        <span className="text-xs text-gray-500">
                          Gửi lúc {formatDateVN(doc.submittedAt)}{' '}
                          {formatTimeVN(doc.submittedAt.slice(11, 16))}
                        </span>
                      </div>
                      {(doc.mockFileName || doc.mockImageUrl) && (
                        <div className="mt-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Mô phỏng tài liệu
                          </p>
                          <p className="mt-1 break-all font-mono text-xs text-gray-700">
                            {doc.mockFileName ?? doc.mockImageUrl}
                          </p>
                          <p className="mt-1 text-xs italic text-gray-500">
                            (Trong bản MVP, file không được upload thật.)
                          </p>
                        </div>
                      )}
                      {doc.notes && (
                        <p className="mt-2 text-xs text-gray-600">
                          <span className="font-medium">Ghi chú:</span> {doc.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleAction('employer', doc.id, 'approve')}
                      >
                        Duyệt
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleAction('employer', doc.id, 'reject')}
                      >
                        Từ chối
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          handleAction('employer', doc.id, 'needs-more-info')
                        }
                      >
                        Yêu cầu bổ sung
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Type change requests ───────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">
          Yêu cầu đổi loại tài khoản
          <span className="ml-2 text-sm font-medium text-gray-500">
            ({pendingTypeChanges.length})
          </span>
        </h2>
        {pendingTypeChanges.length === 0 ? (
          <Card>
            <p className="text-sm text-gray-500">
              Không có yêu cầu đổi loại tài khoản đang chờ duyệt.
            </p>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {pendingTypeChanges.map((req) => {
              const owner = asEmployer(userMap.get(req.employerId));
              return (
                <Card key={req.id}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900">
                        {owner?.companyName ?? 'Nhà tuyển dụng không tồn tại'}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {owner?.email ?? '—'} · {owner?.phone ?? '—'}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge tone="neutral">
                          Hiện tại: {employerTypeLabel(req.currentType)}
                        </Badge>
                        <span aria-hidden="true" className="text-gray-400">
                          →
                        </span>
                        <Badge tone="warning">
                          Yêu cầu: {employerTypeLabel(req.requestedType)}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {formatDateVN(req.submittedAt)}{' '}
                          {formatTimeVN(req.submittedAt.slice(11, 16))}
                        </span>
                      </div>
                      <div className="mt-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
                        <span className="font-medium">Lý do:</span> {req.reason}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleTypeChangeAction(req, 'approve')}
                      >
                        Duyệt
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleTypeChangeAction(req, 'reject')}
                      >
                        Từ chối
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Recent history ──────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">
          Lịch sử duyệt gần đây
        </h2>
        {recentHistory.length === 0 ? (
          <Card>
            <p className="text-sm text-gray-500">
              Chưa có lịch sử duyệt.
            </p>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {recentHistory.map((entry) => {
              const doc = entry.doc;
              const owner =
                entry.kind === 'worker'
                  ? asWorker(userMap.get((doc as WorkerVerificationDocument).workerId))
                  : asEmployer(
                      userMap.get((doc as EmployerVerificationDocument).employerId),
                    );
              const ownerName =
                entry.kind === 'worker'
                  ? owner && 'fullName' in owner
                    ? owner.fullName
                    : 'Người lao động'
                  : owner && 'companyName' in owner
                    ? owner.companyName
                    : 'Nhà tuyển dụng';
              const docLabel =
                entry.kind === 'worker'
                  ? workerDocLabel(
                      (doc as WorkerVerificationDocument).documentType,
                    )
                  : employerDocLabel(
                      (doc as EmployerVerificationDocument).documentType,
                    );
              return (
                <Card key={doc.id}>
                  {/* Phase 10A-Fix-1: clickable history row that opens
                      a detail modal with full mock-data dump (admin
                      only). Wrapping the inner content in a button
                      keeps the click target the entire card. */}
                  <button
                    type="button"
                    onClick={() => setHistoryDetail(entry)}
                    className="-m-4 flex w-full items-center justify-between gap-2 rounded-2xl p-4 text-left hover:bg-orange-50/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {ownerName}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {docLabel}
                        {doc.reviewedAt && (
                          <>
                            {' · '}
                            {formatDateVN(doc.reviewedAt)}{' '}
                            {formatTimeVN(doc.reviewedAt.slice(11, 16))}
                          </>
                        )}
                      </p>
                      {doc.rejectionReason && (
                        <p className="mt-0.5 truncate text-xs text-gray-600">
                          Lý do: {doc.rejectionReason}
                        </p>
                      )}
                    </div>
                    <Badge tone={verificationStatusTone(doc.status)}>
                      {verificationStatusLabel(doc.status)}
                    </Badge>
                  </button>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Reason dialog for reject / needs-more-info */}
      <Modal
        open={dialog !== null}
        onClose={closeDialog}
        title={
          dialog?.action === 'reject'
            ? 'Từ chối giấy tờ'
            : 'Yêu cầu bổ sung thông tin'
        }
      >
        <div className="flex flex-col gap-3 text-sm text-gray-700">
          <p>
            Nhập lý do để người{' '}
            {dialog?.kind === 'worker' ? 'lao động' : 'tuyển dụng'} hiểu cần
            điều chỉnh gì. Lý do sẽ được gửi kèm thông báo.
          </p>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ví dụ: Ảnh mặt sau bị mờ, vui lòng chụp lại."
            rows={4}
          />
          <div className="mt-1 flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={closeDialog}>
              Huỷ
            </Button>
            <Button
              size="sm"
              variant={dialog?.action === 'reject' ? 'danger' : 'primary'}
              onClick={submitDialog}
            >
              {dialog?.action === 'reject' ? 'Từ chối' : 'Gửi yêu cầu'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Phase 10A-Fix-1 — history detail modal (admin-only full doc view) */}
      <Modal
        open={historyDetail !== null}
        onClose={() => setHistoryDetail(null)}
        title="Chi tiết tài liệu xác minh"
      >
        {historyDetail && (
          <HistoryDetailBody
            entry={historyDetail}
            ownerName={
              historyDetail.kind === 'worker'
                ? (asWorker(
                    userMap.get(
                      (historyDetail.doc as WorkerVerificationDocument).workerId,
                    ),
                  )?.fullName ?? 'Người lao động')
                : (asEmployer(
                    userMap.get(
                      (historyDetail.doc as EmployerVerificationDocument).employerId,
                    ),
                  )?.companyName ?? 'Nhà tuyển dụng')
            }
            onClose={() => setHistoryDetail(null)}
          />
        )}
      </Modal>

      {/* Phase 10A-Fix-1 — type-change rejection reason dialog */}
      <Modal
        open={typeChangeDialog !== null}
        onClose={() => {
          setTypeChangeDialog(null);
          setTypeChangeReason('');
        }}
        title="Từ chối yêu cầu đổi loại tài khoản"
      >
        <div className="flex flex-col gap-3 text-sm text-gray-700">
          <p>
            Yêu cầu đổi từ{' '}
            <span className="font-semibold">
              {typeChangeDialog
                ? employerTypeLabel(typeChangeDialog.request.currentType)
                : ''}
            </span>{' '}
            sang{' '}
            <span className="font-semibold">
              {typeChangeDialog
                ? employerTypeLabel(typeChangeDialog.request.requestedType)
                : ''}
            </span>
            .
          </p>
          <Textarea
            value={typeChangeReason}
            onChange={(e) => setTypeChangeReason(e.target.value)}
            placeholder="Ví dụ: Doanh nghiệp chưa cung cấp giấy phép kinh doanh hợp lệ."
            rows={4}
          />
          <div className="mt-1 flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setTypeChangeDialog(null);
                setTypeChangeReason('');
              }}
            >
              Huỷ
            </Button>
            <Button size="sm" variant="danger" onClick={submitTypeChangeRejection}>
              Từ chối
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/**
 * Phase 10A-Fix-1 — admin-only history detail body. Renders every
 * field of the reviewed submission inline. Public-facing surfaces
 * never see this view.
 */
function HistoryDetailBody({
  entry,
  ownerName,
  onClose,
}: {
  entry:
    | { kind: 'worker'; doc: WorkerVerificationDocument }
    | { kind: 'employer'; doc: EmployerVerificationDocument };
  ownerName: string;
  onClose: () => void;
}) {
  const doc = entry.doc;
  return (
    <div className="flex flex-col gap-3 text-sm text-gray-700">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Tài khoản
        </p>
        <p className="mt-0.5 font-medium text-gray-900">
          {ownerName} ·{' '}
          {entry.kind === 'worker' ? 'Người lao động' : 'Nhà tuyển dụng'}
          {entry.kind === 'employer' &&
            ' · ' +
              employerTypeLabel((doc as EmployerVerificationDocument).employerType)}
        </p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Tài liệu
        </p>
        <p className="mt-0.5">
          {entry.kind === 'worker'
            ? workerDocLabel((doc as WorkerVerificationDocument).documentType)
            : employerDocLabel(
                (doc as EmployerVerificationDocument).documentType,
              )}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="font-semibold text-gray-500">Trạng thái</p>
          <Badge tone={verificationStatusTone(doc.status)}>
            {verificationStatusLabel(doc.status)}
          </Badge>
        </div>
        <div>
          <p className="font-semibold text-gray-500">Gửi lúc</p>
          <p>
            {formatDateVN(doc.submittedAt)}{' '}
            {formatTimeVN(doc.submittedAt.slice(11, 16))}
          </p>
        </div>
        {doc.reviewedAt && (
          <>
            <div>
              <p className="font-semibold text-gray-500">Duyệt lúc</p>
              <p>
                {formatDateVN(doc.reviewedAt)}{' '}
                {formatTimeVN(doc.reviewedAt.slice(11, 16))}
              </p>
            </div>
            <div>
              <p className="font-semibold text-gray-500">Duyệt bởi</p>
              <p className="font-mono text-gray-700">
                {doc.reviewedByAdminId ?? '—'}
              </p>
            </div>
          </>
        )}
      </div>
      {doc.rejectionReason && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          <span className="font-semibold">Lý do:</span> {doc.rejectionReason}
        </div>
      )}
      {doc.notes && (
        <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700">
          <span className="font-semibold">Ghi chú:</span> {doc.notes}
        </div>
      )}
      {entry.kind === 'worker' && (
        <>
          {(doc as WorkerVerificationDocument).fullIdentifier && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Số đăng ký
              </p>
              <p className="mt-0.5 font-mono text-gray-900">
                {(doc as WorkerVerificationDocument).fullIdentifier}
                {(doc as WorkerVerificationDocument).maskedIdentifier && (
                  <span className="ml-2 text-gray-500">
                    (hiển thị công khai:{' '}
                    {(doc as WorkerVerificationDocument).maskedIdentifier})
                  </span>
                )}
              </p>
            </div>
          )}
          <DocumentPreview
            front={(doc as WorkerVerificationDocument).mockFrontImageUrl}
            back={(doc as WorkerVerificationDocument).mockBackImageUrl}
            selfie={(doc as WorkerVerificationDocument).mockSelfieImageUrl}
          />
        </>
      )}
      {entry.kind === 'employer' &&
        ((doc as EmployerVerificationDocument).mockFileName ||
          (doc as EmployerVerificationDocument).mockImageUrl) && (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Mô phỏng tài liệu
            </p>
            <p className="mt-1 break-all font-mono text-xs text-gray-700">
              {(doc as EmployerVerificationDocument).mockFileName ??
                (doc as EmployerVerificationDocument).mockImageUrl}
            </p>
            <p className="mt-1 text-xs italic text-gray-500">
              (Trong bản MVP, file không được upload thật.)
            </p>
          </div>
        )}
      <div className="mt-2 flex justify-end">
        <Button size="sm" variant="primary" onClick={onClose}>
          Đóng
        </Button>
      </div>
    </div>
  );
}

function DocumentPreview({
  front,
  back,
  selfie,
}: {
  front?: string;
  back?: string;
  selfie?: string;
}) {
  const items: Array<{ label: string; src?: string }> = [
    { label: 'Mặt trước', src: front },
    { label: 'Mặt sau', src: back },
    { label: 'Selfie', src: selfie },
  ].filter((i) => i.src !== undefined);
  if (items.length === 0) return null;
  return (
    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
      {items.map((i) => (
        <div
          key={i.label}
          className="flex flex-col gap-1 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3 text-xs"
        >
          <span className="font-semibold text-gray-700">{i.label}</span>
          <span className="break-all font-mono text-gray-600">{i.src}</span>
          <span className="italic text-gray-500">
            (Mô phỏng — không có upload thật.)
          </span>
        </div>
      ))}
    </div>
  );
}
