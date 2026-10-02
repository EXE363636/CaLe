/**
 * Kịch bản "gõ thông tin ví dụ" của các minh hoạ form ở trang vai trò (03/10):
 * từ thời gian đã trôi, suy ra ô nào đang gõ, mỗi ô đã gõ được bao nhiêu ký tự và
 * đã qua những mốc nào (bấm nút, hiện kết quả). Hàm thuần → test theo mốc giờ.
 */

import { describe, expect, it } from 'vitest';

import { CHAR_MS, FIELD_GAP_MS, scriptDuration, scriptState, type ScriptItem } from './typingScript';

const script: ScriptItem[] = [
  { kind: 'type', field: 'name', text: 'An' },
  { kind: 'type', field: 'phone', text: '091' },
  { kind: 'mark', mark: 'sent', ms: 500 },
  { kind: 'type', field: 'otp', text: '12' },
  { kind: 'mark', mark: 'done', ms: 800 },
];

describe('scriptState', () => {
  it('lúc 0: chưa gõ gì, ô đầu đang chờ', () => {
    expect(scriptState(script, 0)).toEqual({ values: {}, active: 'name', marks: [], done: false });
  });

  it('gõ từng ký tự theo CHAR_MS', () => {
    expect(scriptState(script, CHAR_MS).values).toEqual({ name: 'A' });
    expect(scriptState(script, 2 * CHAR_MS).values).toEqual({ name: 'An' });
  });

  it('xong ô này nghỉ FIELD_GAP_MS rồi sang ô sau', () => {
    const t = 2 * CHAR_MS + FIELD_GAP_MS + CHAR_MS;
    const s = scriptState(script, t);
    expect(s.values).toEqual({ name: 'An', phone: '0' });
    expect(s.active).toBe('phone');
  });

  it('mốc được ghi khi tới lượt, và giữ nguyên về sau', () => {
    const afterPhone = 2 * CHAR_MS + FIELD_GAP_MS + 3 * CHAR_MS + FIELD_GAP_MS;
    expect(scriptState(script, afterPhone).marks).toEqual(['sent']);
    expect(scriptState(script, afterPhone).active).toBeNull();
    expect(scriptState(script, afterPhone + 500 + CHAR_MS).values.otp).toBe('1');
  });

  it('hết kịch bản: đủ chữ, đủ mốc, done', () => {
    const s = scriptState(script, scriptDuration(script));
    expect(s).toEqual({ values: { name: 'An', phone: '091', otp: '12' }, active: null, marks: ['sent', 'done'], done: true });
    expect(scriptState(script, 1e9)).toEqual(s);
  });

  it('ô có tốc độ riêng (charMs) — ô dài gõ nhanh hơn', () => {
    const s: ScriptItem[] = [
      { kind: 'type', field: 'a', text: 'abcd', charMs: 20 },
      { kind: 'type', field: 'b', text: 'x' },
    ];
    expect(scriptState(s, 40).values.a).toBe('ab');
    expect(scriptDuration(s)).toBe(4 * 20 + FIELD_GAP_MS + CHAR_MS + FIELD_GAP_MS);
  });

  it('chữ có dấu tiếng Việt gõ theo ký tự hiển thị (NFC)', () => {
    const s: ScriptItem[] = [{ kind: 'type', field: 'n', text: 'Hà' }];
    expect(scriptState(s, 2 * CHAR_MS).values.n).toBe('Hà');
    expect(scriptState(s, CHAR_MS).values.n).toBe('H');
  });
});
