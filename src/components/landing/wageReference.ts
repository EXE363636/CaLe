/**
 * Mức lương tham khảo theo loại việc (03/10) — từ các ca ĐANG TUYỂN thật mà trang
 * đã lọc sẵn (`isShiftAvailableForRecruiting`, cùng điều kiện với `/shifts`). Không
 * có ca của loại đó → không có số (thẻ không ghi gì), không bao giờ tự đặt số.
 */

export interface WageRange {
  min: number;
  max: number;
  count: number;
}

export function wageRanges(shifts: ReadonlyArray<{ jobType: string; hourlyWage: number }>): Map<string, WageRange> {
  const out = new Map<string, WageRange>();
  for (const { jobType, hourlyWage } of shifts) {
    if (!Number.isFinite(hourlyWage) || hourlyWage <= 0) continue;
    const r = out.get(jobType);
    if (!r) out.set(jobType, { min: hourlyWage, max: hourlyWage, count: 1 });
    else {
      r.min = Math.min(r.min, hourlyWage);
      r.max = Math.max(r.max, hourlyWage);
      r.count += 1;
    }
  }
  return out;
}
