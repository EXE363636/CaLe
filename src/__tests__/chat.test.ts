/**
 * Chat theo đơn ứng tuyển (đã duyệt 02/10, migration 0035): logic thuần, server
 * (0035) làm lại đúng các luật này.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  CHAT_MAX_LENGTH,
  CHAT_READONLY_AFTER_DAYS,
  chatAccess,
  detectOffPlatformHint,
  validateChatMessage,
} from '@/domain/chat';
import type { ApplicationStatus } from '@/types';

const shift = { date: '2026-10-10', startTime: '08:00', endTime: '12:00', status: 'Published' as const };
const iso = (s: string) => new Date(s).toISOString();
const BEFORE = iso('2026-10-09T10:00:00');
const AFTER_END_6D = iso('2026-10-16T11:00:00');
const AFTER_END_7D = iso('2026-10-17T12:00:00');

describe('chatAccess', () => {
  it('đơn chưa từng được duyệt → none', () => {
    for (const status of ['Pending', 'Rejected', 'CancelledByWorker'] as ApplicationStatus[]) {
      expect(chatAccess({ status }, shift, BEFORE)).toBe('none');
    }
  });

  it('đơn đang giữ chỗ / đã xong → open trước hạn 7 ngày sau giờ kết thúc', () => {
    for (const status of ['Approved', 'CancellationRequested', 'CheckedIn', 'CheckedOut', 'Confirmed'] as ApplicationStatus[]) {
      expect(chatAccess({ status, approvedAt: BEFORE }, shift, BEFORE)).toBe('open');
      expect(chatAccess({ status, approvedAt: BEFORE }, shift, AFTER_END_6D)).toBe('open');
    }
  });

  it('quá 7 ngày sau giờ kết thúc → readonly', () => {
    expect(CHAT_READONLY_AFTER_DAYS).toBe(7);
    expect(chatAccess({ status: 'Confirmed', approvedAt: BEFORE }, shift, AFTER_END_7D)).toBe('readonly');
  });

  it('từng được duyệt rồi huỷ / vắng / hết hạn → readonly (giữ lịch sử)', () => {
    for (const status of ['CancelledByWorker', 'CancelledByEmployer', 'NoShow', 'Expired'] as ApplicationStatus[]) {
      expect(chatAccess({ status, approvedAt: BEFORE }, shift, BEFORE)).toBe('readonly');
    }
  });

  it('ca đã huỷ → readonly nếu từng được duyệt', () => {
    expect(chatAccess({ status: 'Approved', approvedAt: BEFORE }, { ...shift, status: 'Cancelled' }, BEFORE)).toBe('readonly');
  });
});

describe('validateChatMessage', () => {
  it('cắt khoảng trắng hai đầu, giữ xuống dòng bên trong', () => {
    expect(validateChatMessage('  chào anh\nem tới rồi  ')).toEqual({ ok: true, value: 'chào anh\nem tới rồi' });
  });

  it('rỗng / chỉ khoảng trắng → EMPTY', () => {
    expect(validateChatMessage('')).toEqual({ ok: false, error: 'EMPTY' });
    expect(validateChatMessage(' \n\t ')).toEqual({ ok: false, error: 'EMPTY' });
  });

  it('cắt ký tự vô hình hai đầu như server (U+200B–U+200D, U+FEFF)', () => {
    expect(validateChatMessage('​﻿ \n')).toEqual({ ok: false, error: 'EMPTY' });
    expect(validateChatMessage('​chào‍')).toEqual({ ok: true, value: 'chào' });
  });

  it(`quá ${CHAT_MAX_LENGTH} ký tự → TOO_LONG`, () => {
    expect(CHAT_MAX_LENGTH).toBe(1000);
    expect(validateChatMessage('a'.repeat(1000)).ok).toBe(true);
    expect(validateChatMessage('a'.repeat(1001))).toEqual({ ok: false, error: 'TOO_LONG' });
  });

  it('property: tin hợp lệ luôn đã trim, không rỗng, ≤ giới hạn', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 1200 }), (s) => {
        const r = validateChatMessage(s);
        if (r.ok) {
          expect(r.value).toBe(r.value.trim());
          expect(r.value.length).toBeGreaterThan(0);
          expect(r.value.length).toBeLessThanOrEqual(CHAT_MAX_LENGTH);
        }
      }),
    );
  });
});

describe('detectOffPlatformHint', () => {
  it.each([
    'Kết bạn zalo em nhé',
    'ZALO 0912 345 678',
    'nhắn tele cho anh',
    'liên hệ telegram @abc',
    'em chuyển khoản trước được không',
    'chuyen khoan nhe',
    'stk 1903 4567 8901 2345',
    'số tài khoản của anh là',
    'gửi momo cũng được',
    'gọi 0912345678',
    'gọi +84 912 345 678',
  ])('có gợi ý giao dịch ngoài app: %s', (s) => {
    expect(detectOffPlatformHint(s)).toBe(true);
  });

  it.each([
    'Em tới lúc 8 giờ kém 15 nhé',
    'Ca này cần mặc áo trắng',
    'Cảm ơn anh, hẹn gặp ở cổng số 2',
    'Mã đơn 12345',
    'Lương 30.000 đ/giờ đúng không ạ',
  ])('không có gợi ý: %s', (s) => {
    expect(detectOffPlatformHint(s)).toBe(false);
  });
});
