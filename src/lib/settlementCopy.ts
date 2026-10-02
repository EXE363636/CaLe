/**
 * Copy về thời hạn xác nhận / tự trả công khác nhau theo chế độ dữ liệu:
 *  - local/demo: quy tắc mô phỏng "nhà tuyển dụng có 12 giờ sau check-out";
 *  - supabase/production: server tự xác nhận + trả công sau 24 giờ kể từ giờ
 *    KẾT THÚC ca (migration 0019 `sync_overdue_settlements`).
 * Mỗi key có bản `<key>.real` cho production; UI không được hứa quy tắc 12 giờ
 * mà server không thực thi.
 *
 * Màn đã dịch truyền `t` của mình (`useT()` khi render, `tCurrent` trong xử lý
 * sự kiện); bỏ trống thì là tiếng Việt.
 */

import { isSupabaseEnv } from '@/data/supabaseClient';
import type { TFunction } from '@/i18n/locale';
import { t as tVi } from '@/i18n/vi';

export function tSettlement(key: string, t: TFunction = tVi): string {
  return isSupabaseEnv() ? t(`${key}.real`) : t(key);
}
