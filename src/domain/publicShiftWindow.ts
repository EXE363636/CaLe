/**
 * Cửa sổ ngày của listing công khai (chế độ supabase).
 *
 * `public_shifts` giữ ca Published/FullyBooked mãi mãi (server không tự chuyển
 * Expired — lifecycle suy ra ở client theo đồng hồ), nên listing phải tự lọc
 * theo ngày để payload không phình vô hạn.
 *
 * Mốc = HÔM QUA theo giờ Việt Nam (không phải hôm nay): ca qua đêm bắt đầu hôm
 * qua, kết thúc sáng nay vẫn còn trong listing cho tới hết ngày.
 *
 * Hàm thuần — không đọc đồng hồ; nơi gọi truyền `nowIso`.
 */
import { vietnamDate } from './deposit';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Ngày `YYYY-MM-DD` nhỏ nhất (tính cả) mà listing công khai còn nạp. */
export function publicShiftsFromDate(nowIso: string): string {
  return vietnamDate(new Date(Date.parse(nowIso) - DAY_MS).toISOString());
}
