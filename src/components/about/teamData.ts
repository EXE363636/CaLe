/**
 * Thành viên nhóm CaLẻ — thanh trượt "Đội ngũ" trong khối "Về CaLẻ" của trang chủ (03/10).
 *
 * ĐIỀN THÔNG TIN THẬT VÀO ĐÂY (không bịa tên / vai trò / ảnh):
 *   - `name`: họ tên hiển thị. Để trống → thẻ hiện "Thành viên {n}".
 *   - `role`: vai trò trong nhóm (vd "Phát triển sản phẩm"). Để trống → "Đang cập nhật".
 *     Thêm bản tiếng Anh của vai trò vào `src/i18n/en-roles.ts` nếu muốn trang EN dịch.
 *   - `bio`: một câu ngắn (tuỳ chọn).
 *   - `photo`: đường dẫn ảnh trong `public/`. Ảnh hiện trong vòng tròn 96px → dùng ảnh VUÔNG,
 *     mặt ở giữa. `public/images/team/<tên>.jpg` là ảnh gốc; `<tên>-avatar.jpg` là bản cắt
 *     vuông 400×400 quanh mặt (03/10). Để trống → hai chữ cái đầu của tên.
 * Thứ tự trong mảng = thứ tự trên thanh trượt.
 */

export interface TeamMember {
  name: string;
  role: string;
  bio?: string;
  photo?: string;
}

export const TEAM_MEMBERS: TeamMember[] = [
  { name: 'Nguyễn Phương Anh', role: 'Team Leader / CEO & Strategy', photo: '/images/team/phuong-anh-avatar.jpg' },
  { name: 'Phạm Ngọc Hưng', role: 'CPO / Product & Operations Lead', photo: '/images/team/ngoc-hung-avatar.jpg' },
  { name: 'Nguyễn Vũ Anh', role: 'CTO / Tech & Development Lead', photo: '/images/team/vu-anh-avatar.jpg' },
  { name: 'Nguyễn Thị Ngọc Mai', role: 'Design & Business Development Lead (CMO/CBO)', photo: '/images/team/ngoc-mai-avatar.jpg' },
];
