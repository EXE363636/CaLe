/**
 * Trang chủ — khối "CaLẻ làm được gì?" (03/10, danh sách đã duyệt): chức năng ĐÃ CÓ
 * và chức năng SẮP CÓ.
 *
 * QUY TẮC:
 *   - "Đã có" chỉ ghi chức năng chạy ở CẢ demo lẫn production (`data/capabilities.ts`);
 *     câu về tiền / xác thực ghi "(mô phỏng)" ở bản demo, bản production nói đúng luồng
 *     server (CLAUDE.md §5 — trung thực về mô phỏng).
 *   - "Sắp có" chỉ ghi việc chủ dự án đã duyệt làm (docs/HANDOFF_2026-10-02_VIEC_DINH_LAM.md,
 *     capabilities còn `false` ở production) VÀ là phần "có thì tốt hơn". Không đưa lên
 *     các lưới an toàn còn thiếu (vd khiếu nại / tranh chấp) — công khai chúng là tự chỉ
 *     vào điểm yếu nhạy cảm nhất (quyết định 03/10). Ra mắt thì chuyển sang "Đã có" và
 *     đổi `FEATURES_UPDATED`.
 *
 * Gọi từ trang server với `tx` của trang; file nằm trong danh sách quét của
 * `i18nEnglish.test.ts`.
 */

import type { TFunction } from '@/i18n/locale';

/** Tháng cập nhật danh sách (hiện dưới khối). */
export const FEATURES_UPDATED = '10/2026';

export function featuresDone(tx: TFunction, supabase: boolean): string[] {
  return [
    supabase
      ? tx('Đăng ca theo giờ; ca chỉ hiện khi tiền công đã được giữ đủ (nạp qua PayOS).')
      : tx('Đăng ca theo giờ; ca chỉ hiện khi tiền công đã được giữ đủ (mô phỏng).'),
    tx('Tìm ca, lọc theo loại việc, khu vực, ngày và mức lương; cảnh báo khi trùng lịch.'),
    supabase
      ? tx('Xác thực số điện thoại trước khi ứng tuyển.')
      : tx('Xác thực số điện thoại trước khi ứng tuyển (mô phỏng).'),
    tx('Nhà tuyển dụng duyệt từng người ứng tuyển.'),
    tx('Check-in, check-out ngay trên điện thoại; nhà tuyển dụng xác nhận có mặt.'),
    supabase
      ? tx('Tiền công tự vào ví khi ca được xác nhận; không ai bấm thì tự chốt sau 24 giờ.')
      : tx('Tiền công tự vào ví khi ca được xác nhận; không ai bấm thì tự chốt sau 12 giờ (mô phỏng).'),
    supabase
      ? tx('Ví: nạp tiền và rút về tài khoản ngân hàng.')
      : tx('Ví: nạp tiền và rút về tài khoản ngân hàng (mô phỏng).'),
    tx('Hai bên đánh giá nhau sau mỗi ca.'),
    tx('Song ngữ Việt – Anh, giao diện sáng và tối.'),
  ];
}

export function featuresPlanned(tx: TFunction): string[] {
  return [
    tx('Nhắn tin giữa người lao động và nhà tuyển dụng sau khi đơn được duyệt.'),
    tx('Thông báo trong ứng dụng cho từng bước của ca.'),
    tx('Điểm uy tín và lịch cá nhân để nhận ca hợp giờ.'),
  ];
}
