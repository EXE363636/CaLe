/**
 * Migration 0034: approve() từ chối WORKER_SCHEDULE_CONFLICT khi người lao động đã
 * được duyệt vào ca khác trùng giờ. Toast phía nhà tuyển dụng phải nói rõ lý do
 * (giọng nhà tuyển dụng: "người lao động"), không rơi về câu lỗi chung.
 */
import { afterEach, describe, expect, it } from 'vitest';

import { toastFromStoreError } from '@/lib/errorMap';

afterEach(() => {
  document.documentElement.lang = 'vi';
});

describe('WORKER_SCHEDULE_CONFLICT (0034)', () => {
  it('tiếng Việt: câu riêng, xưng "người lao động"', () => {
    document.documentElement.lang = 'vi';
    const msg = toastFromStoreError('WORKER_SCHEDULE_CONFLICT');
    expect(msg).not.toBe(toastFromStoreError('__UNKNOWN__'));
    expect(msg.toLowerCase()).toContain('người lao động');
    expect(msg).not.toMatch(/\bbạn\b/i);
  });

  it('tiếng Anh: có bản dịch', () => {
    document.documentElement.lang = 'en';
    const msg = toastFromStoreError('WORKER_SCHEDULE_CONFLICT');
    expect(msg).not.toBe(toastFromStoreError('__UNKNOWN__'));
    expect(msg).toMatch(/worker/i);
  });
});

describe('EDIT_WORKER_SCHEDULE_CONFLICT (0034, edit_shift)', () => {
  it('có câu riêng VI / EN, giọng nhà tuyển dụng', () => {
    document.documentElement.lang = 'vi';
    const vi = toastFromStoreError('EDIT_WORKER_SCHEDULE_CONFLICT');
    expect(vi).not.toBe(toastFromStoreError('__UNKNOWN__'));
    expect(vi.toLowerCase()).toContain('người lao động');
    document.documentElement.lang = 'en';
    const en = toastFromStoreError('EDIT_WORKER_SCHEDULE_CONFLICT');
    expect(en).not.toBe(toastFromStoreError('__UNKNOWN__'));
    expect(en).toMatch(/worker/i);
  });
});
