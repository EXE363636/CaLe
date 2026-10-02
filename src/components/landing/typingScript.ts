/**
 * Kịch bản "gõ thông tin ví dụ" cho các minh hoạ form ở trang vai trò (03/10):
 * form đăng ca (`ShiftPostPlayground`), thẻ xác thực SĐT / CCCD (`VerifyPreview`).
 *
 * Kịch bản là danh sách bước: gõ một ô (`type`) hoặc một mốc (`mark`: bấm nút, hiện
 * kết quả) kèm thời gian dừng. `scriptState(script, elapsed)` là hàm THUẦN: từ số
 * mili-giây đã trôi suy ra chữ trong từng ô, ô đang gõ và các mốc đã qua → hook chỉ
 * việc chạy đồng hồ (requestAnimationFrame), test được theo mốc giờ.
 */

export type ScriptItem =
  | { kind: 'type'; field: string; text: string; /** ms mỗi ký tự (mặc định CHAR_MS) — ô dài gõ nhanh hơn. */ charMs?: number }
  | { kind: 'mark'; mark: string; ms: number };

export interface ScriptState {
  /** Chữ đã gõ trong từng ô (ô chưa tới lượt không có mặt). */
  values: Record<string, string>;
  /** Ô đang gõ (con trỏ nhấp nháy); null khi đang ở một mốc / đã xong. */
  active: string | null;
  /** Các mốc đã qua, theo thứ tự. */
  marks: string[];
  done: boolean;
}

/** Mỗi ký tự ~55ms: đủ nhanh để không phải chờ, đủ chậm để thấy là đang gõ. */
export const CHAR_MS = 55;
/** Gõ xong một ô dừng chừng này rồi mới sang ô sau. */
export const FIELD_GAP_MS = 260;

const chars = (text: string) => Array.from(text.normalize('NFC'));

function itemDuration(item: ScriptItem): number {
  return item.kind === 'type' ? chars(item.text).length * (item.charMs ?? CHAR_MS) + FIELD_GAP_MS : item.ms;
}

export function scriptDuration(script: ScriptItem[]): number {
  return script.reduce((sum, item) => sum + itemDuration(item), 0);
}

export function scriptState(script: ScriptItem[], elapsed: number): ScriptState {
  const values: Record<string, string> = {};
  const marks: string[] = [];
  let active: string | null = null;
  let t = 0;
  for (const item of script) {
    if (elapsed < t) break;
    const local = elapsed - t;
    if (item.kind === 'type') {
      const list = chars(item.text);
      const n = Math.min(list.length, Math.floor(local / (item.charMs ?? CHAR_MS)));
      if (n > 0) values[item.field] = list.slice(0, n).join('');
      active = local < itemDuration(item) ? item.field : null;
    } else {
      marks.push(item.mark);
      active = null;
    }
    t += itemDuration(item);
  }
  const done = elapsed >= t;
  return { values, active: done ? null : active, marks, done };
}
