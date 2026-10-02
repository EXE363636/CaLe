/**
 * Các loại việc ở trang chủ ("Ca làm cho nhiều loại việc") — vòng thẻ xoay liên
 * tục, ấn thẻ mở khung chi tiết 3 ý (`JobRing`). Danh sách theo các loại việc của form đăng
 * ca (`ShiftForm` JOB_TYPES) + phụ bếp, dọn dẹp (đăng dưới loại "Khác").
 *
 * Nội dung là mô tả CHUNG do nhóm viết (nháp 02/10 — chờ chủ dự án duyệt): không
 * ghi mức lương tham khảo hay số liệu thị trường; giờ và yêu cầu cụ thể nằm trên
 * từng ca. Ảnh: `docs/IMAGE_CREDITS.md`.
 *
 * Gọi từ trang server với `tx` / `t` của trang, nên câu dịch nằm ngay trong file này
 * (file có trong danh sách quét của `i18nEnglish.test.ts`).
 */

import type { TFunction } from '@/i18n/locale';

export interface HomeJob {
  id: string;
  label: string;
  /** Một dòng dưới tên việc trên thẻ. */
  desc: string;
  img: string;
  alt: string;
  /** Slug lọc `/shifts?viec=…` (`lib/jobTypeSlug`); không có → mở `/shifts` không lọc
   *  (phụ bếp, dọn dẹp đăng dưới loại "Khác"). */
  filter?: string;
  /** 3 ý chi tiết: việc gồm gì → một ca thường thế nào → cần gì để làm. */
  frames: [string, string, string];
}

export function homeJobs(tx: TFunction, t: TFunction): HomeJob[] {
  return [
    {
      id: 'phuc-vu',
      filter: 'phuc-vu',
      label: tx('Phục vụ'),
      desc: tx('Quán ăn, quán cà phê, nhà hàng'),
      img: '/images/landing/job-phuc-vu.webp',
      alt: t('workerHome.benefit.fast.alt'),
      frames: [
        tx('Đón khách, ghi món, bưng bê và dọn bàn. Bạn là người khách gặp nhiều nhất trong ca.'),
        tx('Ca hay vào giờ cao điểm trưa hoặc tối, mỗi ca vài giờ. Giờ cụ thể ghi trên từng ca.'),
        tx('Nhanh nhẹn, lịch sự, đứng lâu được. Nhiều quán không yêu cầu kinh nghiệm.'),
      ],
    },
    {
      id: 'phu-bep',
      label: tx('Phụ bếp'),
      desc: tx('Sơ chế, rửa dọn, hỗ trợ bếp chính'),
      img: '/images/landing/worker-phu-bep.webp',
      alt: t('workerHome.benefit.noExp.alt'),
      frames: [
        tx('Sơ chế rau thịt, rửa dụng cụ, dọn bếp và chuyển món ra quầy theo lời bếp chính.'),
        tx('Ca hay bắt đầu trước giờ mở bán để kịp sơ chế, rồi kéo qua giờ cao điểm.'),
        tx('Sạch sẽ, cẩn thận với dao và đồ nóng, làm theo hướng dẫn nhanh.'),
      ],
    },
    {
      id: 'pha-che',
      filter: 'pha-che',
      label: tx('Pha chế'),
      desc: tx('Quán cà phê, trà sữa, quầy bar'),
      img: '/images/landing/job-pha-che.webp',
      alt: tx('Nhân viên đeo tạp dề đang pha cà phê bằng phin giấy'),
      frames: [
        tx('Pha đồ uống theo công thức của quán, giữ quầy gọn gàng và hỗ trợ ghi món khi đông.'),
        tx('Ca sáng sớm ở quán cà phê, ca chiều tối ở quán trà sữa và quầy bar.'),
        tx('Nhớ công thức nhanh, tay chắc. Ca ghi rõ nếu cần kinh nghiệm pha chế.'),
      ],
    },
    {
      id: 'thu-ngan',
      filter: 'thu-ngan',
      label: tx('Thu ngân'),
      desc: tx('Siêu thị mini, cửa hàng, quầy dịch vụ'),
      img: '/images/landing/job-thu-ngan.webp',
      alt: tx('Nhân viên đứng quầy tính tiền có máy tính bảng'),
      frames: [
        tx('Tính tiền, nhận thanh toán tiền mặt hoặc chuyển khoản, đóng gói hàng cho khách.'),
        tx('Ca hay vào cuối ngày và cuối tuần, lúc cửa hàng đông khách.'),
        tx('Cẩn thận với tiền, biết dùng máy tính tiền cơ bản. Việc có tiền mặt cần bàn giao kèm ảnh cuối ca.'),
      ],
    },
    {
      id: 'kho-van',
      filter: 'kho-van',
      label: tx('Kho vận'),
      desc: tx('Kiểm hàng, đóng gói, sắp xếp kho'),
      img: '/images/landing/employer-kiem-tra.webp',
      alt: t('employerHome.benefit.refund.alt'),
      frames: [
        tx('Kiểm đếm hàng nhập, đóng gói đơn, dán nhãn và xếp hàng lên kệ.'),
        tx('Ca hay vào mùa nhiều đơn hoặc ngày nhập hàng, có cả ca sáng sớm.'),
        tx('Sức khoẻ tốt, cẩn thận khi đếm. Một số ca cần bàn giao kèm ảnh và ghi chú.'),
      ],
    },
    {
      id: 'su-kien',
      filter: 'su-kien',
      label: tx('Hỗ trợ sự kiện'),
      desc: tx('Tiệc cưới, hội nghị, sự kiện cuối tuần'),
      img: '/images/landing/employer-su-kien.webp',
      alt: t('employerHome.benefit.attendance.alt'),
      frames: [
        tx('Đón khách, hướng dẫn chỗ ngồi, phục vụ tiệc, dựng và dọn khu vực sự kiện.'),
        tx('Ca theo lịch sự kiện, hay vào cuối tuần, thường tập trung trước giờ khai mạc.'),
        tx('Đúng giờ, gọn gàng, mặc đồng phục theo yêu cầu ghi trên ca.'),
      ],
    },
    {
      id: 'phat-to-roi',
      filter: 'phat-to-roi',
      label: tx('Phát tờ rơi'),
      desc: tx('Khai trương, khuyến mãi, sự kiện'),
      img: '/images/landing/job-phat-to-roi.webp',
      alt: tx('Bàn tay trao một tờ giấy cho người khác'),
      frames: [
        tx('Phát tờ rơi, giới thiệu chương trình và mời khách ghé cửa hàng.'),
        tx('Ca thường ngắn, hay vào dịp khai trương hoặc khuyến mãi cuối tuần.'),
        tx('Tự tin, nói chuyện lịch sự, đứng ngoài trời được.'),
      ],
    },
    {
      id: 'bao-ve',
      filter: 'bao-ve',
      label: tx('Bảo vệ'),
      desc: tx('Cửa hàng, sự kiện, bãi giữ xe'),
      img: '/images/landing/job-bao-ve.webp',
      alt: tx('Nhân viên bảo vệ mặc áo phản quang đứng trước dãy cửa hàng'),
      frames: [
        tx('Giữ trật tự, hướng dẫn khách, trông xe và báo ngay khi có sự cố.'),
        tx('Ca theo giờ mở cửa hoặc giờ diễn ra sự kiện, có cả ca tối.'),
        tx('Đúng giờ, bình tĩnh, có trách nhiệm. Ca ghi rõ nếu cần chứng chỉ.'),
      ],
    },
    {
      id: 'don-dep',
      label: tx('Dọn dẹp'),
      desc: tx('Nhà hàng, văn phòng, sau sự kiện'),
      img: '/images/landing/job-don-dep.webp',
      alt: tx('Người đội nón lá đang quét sân'),
      frames: [
        tx('Lau dọn, thu gom rác, sắp xếp lại khu vực sau giờ hoạt động hoặc sau sự kiện.'),
        tx('Ca hay vào sáng sớm trước giờ mở cửa hoặc tối muộn sau khi đóng cửa.'),
        tx('Cẩn thận, chịu khó, làm đúng danh sách việc nhà tuyển dụng ghi trên ca.'),
      ],
    },
  ];
}
