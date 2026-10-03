/**
 * `buildPersonalSnapshot` (bong bóng hỗ trợ): dữ liệu của CHÍNH người hỏi cho trợ lý —
 * khách = null; chỉ bản ghi của mình; ca sắp tới theo đồng hồ (bỏ ca huỷ / hết hạn);
 * số dư production chỉ khi ví đã nạp (không đoán); demo = sổ cái mô phỏng.
 */

import { describe, expect, it } from 'vitest';

import { buildPersonalSnapshot, type PersonalSources } from '@/components/support/personalSnapshot';
import type { Application, ChatThread, Shift, User, WalletLedgerEntry } from '@/types';

const NOW = new Date('2099-03-10T08:00:00');

const worker = { id: 'w1', role: 'worker', fullName: 'Nguyễn Văn An', email: 'an@x.vn' } as unknown as User;
const employer = { id: 'e1', role: 'employer', companyName: 'Quán Phở Hà', email: 'pho@x.vn' } as unknown as User;

const shift = (id: string, over: Partial<Shift> = {}): Shift =>
  ({
    id,
    employerId: 'e1',
    title: `Ca ${id}`,
    date: '2099-03-12',
    startTime: '08:00',
    endTime: '12:00',
    status: 'Published',
    ...over,
  }) as unknown as Shift;

const app = (id: string, shiftId: string, status: Application['status'], workerId = 'w1'): Application =>
  ({ id, shiftId, workerId, status }) as unknown as Application;

const ledger = (userId: string, amount: number): WalletLedgerEntry => ({
  id: `l-${userId}-${amount}`,
  occurredAt: '2099-01-01T00:00:00.000Z',
  userId,
  kind: 'TopUp',
  amount,
} as unknown as WalletLedgerEntry);

function sources(over: Partial<PersonalSources>): PersonalSources {
  return {
    user: worker,
    live: false,
    shifts: [],
    applications: [],
    wallets: [],
    ledger: [],
    threads: [],
    locale: 'vi',
    now: NOW,
    ...over,
  };
}

describe('buildPersonalSnapshot', () => {
  it('khách → null', () => {
    expect(buildPersonalSnapshot(sources({ user: null }))).toBeNull();
  });

  it('người lao động: tên, số dư sổ cái demo (chỉ của mình), ca được nhận sớm nhất, đơn, tin chưa đọc', () => {
    const snap = buildPersonalSnapshot(
      sources({
        shifts: [
          shift('later', { date: '2099-03-20' }),
          shift('soon', { date: '2099-03-11', title: 'Phục vụ tiệc' }),
          shift('cancelled', { date: '2099-03-10', startTime: '10:00', status: 'Cancelled' }),
          shift('past', { date: '2099-03-01' }),
          shift('pending'),
          shift('other'),
        ],
        applications: [
          app('a1', 'later', 'Approved'),
          app('a2', 'soon', 'Approved'),
          app('a3', 'cancelled', 'Approved'),
          app('a4', 'past', 'Approved'),
          app('a5', 'pending', 'Pending'),
          app('a6', 'other', 'Approved', 'w2'),
        ],
        ledger: [ledger('w1', 500_000), ledger('w1', -200_000), ledger('w2', 9_999_999)],
        threads: [{ unread: 2 } as ChatThread, { unread: 1 } as ChatThread],
      }),
    );
    expect(snap).toEqual({
      name: 'Nguyễn Văn An',
      balance: 300_000,
      unreadMessages: 3,
      nextShift: { title: 'Phục vụ tiệc', when: expect.stringContaining('08:00–12:00'), href: '/shifts/soon' },
      applications: { pending: 1, approved: 2 },
    });
  });

  it('không có ca sắp tới → nextShift = null', () => {
    const snap = buildPersonalSnapshot(sources({}));
    expect(snap?.nextShift).toBeNull();
  });

  it('production: số dư chỉ khi ví đã nạp từ server; chưa có → undefined (không đoán từ sổ cái)', () => {
    const notLoaded = buildPersonalSnapshot(sources({ live: true, ledger: [ledger('w1', 500_000)] }));
    expect(notLoaded?.balance).toBeUndefined();
    const loaded = buildPersonalSnapshot(
      sources({ live: true, wallets: [{ userId: 'w1', balance: 1_250_000, updatedAt: '' }, { userId: 'x', balance: 1, updatedAt: '' }] }),
    );
    expect(loaded?.balance).toBe(1_250_000);
  });

  it('nhà tuyển dụng: ca đã đăng sớm nhất của mình, số đơn chờ duyệt; không gọi tên doanh nghiệp', () => {
    const snap = buildPersonalSnapshot(
      sources({
        user: employer,
        locale: 'en',
        shifts: [
          shift('mine', { date: '2099-03-11' }),
          shift('draft', { date: '2099-03-10', startTime: '09:00', status: 'Draft' }),
          shift('theirs', { employerId: 'e2', date: '2099-03-10', startTime: '09:00' }),
        ],
        applications: [app('a1', 'mine', 'Pending', 'w1'), app('a2', 'mine', 'Pending', 'w2'), app('a3', 'theirs', 'Pending')],
      }),
    );
    expect(snap?.name).toBeUndefined();
    expect(snap?.nextShift?.href).toBe('/employer/shifts/mine');
    expect(snap?.nextShift?.when).toContain('Tomorrow');
    expect(snap?.pendingReviews).toBe(2);
    expect(snap?.applications).toBeUndefined();
  });
});
