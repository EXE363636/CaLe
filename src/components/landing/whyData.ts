/**
 * Trang chủ — khối "Vì sao CaLẻ ra đời?" (02/10): số liệu chính thức + bảng so
 * sánh tuyển qua hội nhóm với trên CaLẻ (lý do ra đời = vấn đề CaLẻ giải quyết).
 *
 * SỐ LIỆU: chỉ dùng số đã mở trang nguồn và đối chiếu câu gốc (tra 02/10/2026).
 * Mỗi số ghi kỳ số liệu, không viết "hiện nay". Khi có kỳ mới (Cục Thống kê công
 * bố đầu mỗi quý), sửa số + kỳ + đường dẫn ở đây và bản tiếng Anh trong
 * `en-landing.ts`. Không thêm số chỉ thấy ở dạng trích lại mà chưa có bản gốc.
 *
 * BẢNG SO SÁNH: cột CaLẻ chỉ ghi tính năng đang chạy ở CẢ demo lẫn production
 * (`data/capabilities.ts`); câu về tiền ghi "(mô phỏng)" ở bản demo. Không nêu tên
 * mạng xã hội cụ thể.
 *
 * Gọi từ trang server với `tx` của trang; file nằm trong danh sách quét của
 * `i18nEnglish.test.ts`.
 */

import type { TFunction } from '@/i18n/locale';

export interface WhyStat {
  /** Con số hiển thị lớn (đã dịch). */
  value: string;
  /** Con số này là gì. */
  label: string;
  /** Tên nguồn + kỳ số liệu. */
  source: string;
  url: string;
}

export function whyStats(tx: TFunction): WhyStat[] {
  return [
    {
      // "hiện các cơ sở giáo dục đại học có 2,78 triệu người học. Trong đó, 2,53 triệu sinh viên bậc đại học…"
      value: tx('2,53 triệu'),
      label: tx('sinh viên đại học trên cả nước'),
      source: tx('Bộ GD&ĐT, năm học 2025–2026 (qua báo Giáo dục & Thời đại)'),
      url: 'https://giaoducthoidai.vn/toan-canh-giao-duc-dai-hoc-viet-nam-qua-nhung-con-so-post794653.html',
    },
    {
      // "toàn ngành hiện có khoảng 329.500 cửa hàng" — báo cáo ngành, không phải số nhà nước.
      value: tx('329.500'),
      label: tx('cửa hàng ăn uống trên cả nước'),
      source: tx('iPOS.vn và Nestlé Professional, báo cáo năm 2025'),
      url: 'https://ipos.vn/thong-cao-bao-chi-ipos-vn-va-nestle-professional-cong-bo-bao-cao-thi-truong-kinh-doanh-am-thuc-tai-viet-nam-nam-2025/',
    },
    {
      // "tỷ lệ lao động có việc làm phi chính thức là 61,7%…"
      value: tx('61,7%'),
      label: tx('người đang đi làm ở Việt Nam làm việc phi chính thức'),
      source: tx('Cục Thống kê, quý II/2026'),
      url: 'https://www.nso.gov.vn/tin-tuc-thong-ke/2026/07/thong-cao-bao-chi-ve-tinh-hinh-lao-dong-viec-lam-quy-ii-va-6-thang-dau-nam-2026/',
    },
    {
      // "cả nước có khoảng 1,4 triệu thanh niên (từ 15-24 tuổi) không có việc làm và không tham gia học tập, đào tạo, chiếm 10,0%…"
      value: tx('1,4 triệu'),
      label: tx('thanh niên 15–24 tuổi không có việc làm, không đi học hay đào tạo'),
      source: tx('Cục Thống kê, quý II/2026'),
      url: 'https://www.nso.gov.vn/tin-tuc-thong-ke/2026/07/thong-cao-bao-chi-ve-tinh-hinh-lao-dong-viec-lam-quy-ii-va-6-thang-dau-nam-2026/',
    },
  ];
}

export interface WhyRow {
  topic: string;
  /** Tuyển qua hội nhóm. */
  before: string;
  /** Trên CaLẻ. */
  after: string;
}

export function whyRows(tx: TFunction, supabase: boolean): WhyRow[] {
  return [
    {
      topic: tx('Tiền công'),
      before: tx('Hứa trả miệng, không ai giữ tiền.'),
      after: supabase
        ? tx('Tiền công được giữ trước khi ca hiện ra.')
        : tx('Tiền công được giữ trước khi ca hiện ra (mô phỏng).'),
    },
    {
      topic: tx('Thông tin ca'),
      before: tx('Bài đăng hay thiếu giờ làm, địa chỉ hoặc tổng tiền.'),
      after: tx('Mỗi ca ghi rõ giờ, địa điểm, tổng tiền và yêu cầu.'),
    },
    {
      topic: tx('Người không đến'),
      before: tx('Nhận lời rồi không đến, quán thiếu người giờ cao điểm.'),
      after: supabase
        ? tx('Đánh dấu vắng mặt, phần tiền của vị trí đó hoàn về ví nhà tuyển dụng.')
        : tx('Đánh dấu vắng mặt, phần tiền của vị trí đó hoàn về ví nhà tuyển dụng (mô phỏng).'),
    },
    {
      topic: tx('Ai đã đến'),
      before: tx('Chủ quán khó biết ai đã đến, đến lúc nào.'),
      after: tx('Check-in, check-out ngay trên điện thoại.'),
    },
    {
      // Không ghi "khiếu nại có quản trị viên xử lý": production chưa bật tranh chấp
      // (`capabilities.disputes = false`).
      topic: tx('Đánh giá'),
      before: tx('Khó biết quán hay người làm có đáng tin không.'),
      after: tx('Hai bên đánh giá nhau sau mỗi ca; đánh giá hiện trên trang ca.'),
    },
  ];
}

/** Chú thích dưới bảng: cảnh báo của công an về tin tuyển "việc làm thêm" lừa đảo. */
export const WHY_SCAM_SOURCE_URL =
  'https://vtv.vn/cong-an-canh-bao-hang-loat-chieu-lua-nham-vao-tan-sinh-vien-mua-nhap-hoc-10026080111470764.htm';
