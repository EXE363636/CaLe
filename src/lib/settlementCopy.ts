/**
 * Copy về thời hạn xác nhận / tự trả công khác nhau theo chế độ dữ liệu:
 *  - local/demo: quy tắc mô phỏng "nhà tuyển dụng có 12 giờ sau check-out";
 *  - supabase/production: server tự xác nhận + trả công sau 24 giờ kể từ giờ
 *    KẾT THÚC ca (migration 0019 `sync_overdue_settlements`).
 * Mỗi key có bản `<key>.real` cho production; UI không được hứa quy tắc 12 giờ
 * mà server không thực thi.
 */

import { isSupabaseEnv } from '@/data/supabaseClient';
import { t } from '@/i18n/vi';

export function tSettlement(key: string): string {
  return isSupabaseEnv() ? t(`${key}.real`) : t(key);
}
