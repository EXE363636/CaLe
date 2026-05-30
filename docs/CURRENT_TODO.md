# CaLẻ / Now — Việc cần làm hiện tại

**Ngày:** 31/05/2026
**Bối cảnh:** Vừa hoàn thành CORE-STABILITY-10 (lifecycle ca làm hợp
nhất một nguồn sự thật, badge nhất quán). Tất cả test tự động đang xanh
(unit 544, build 28 route, E2E 112, time-travel 22). Bước tiếp theo là
QA thủ công rồi mới đến backend.

---

## 1. QA thủ công ngay (sau CORE-STABILITY-10)

Mở app bằng `npm run dev` và kiểm tra trên giao diện thật:

- [ ] **Tính nhất quán lifecycle ca làm** — cùng một ca hiện CÙNG nhãn +
      CÙNG màu badge trên: worker dashboard (card), worker detail,
      employer dashboard (card), employer detail, employer calendar,
      public list, admin.
- [ ] **Check-in sớm** — trong cửa sổ 15 phút trước giờ bắt đầu hiện nút
      "Check-in"; sau khi check-in hiện "Đã check-in" + "Bạn đã check-in.
      Vui lòng chờ đến giờ bắt đầu ca."; KHÔNG hiện check-out; ca chưa
      chuyển "Đang diễn ra".
- [ ] **Employer mark-present** — không làm ca chuyển "Đang diễn ra" sớm;
      worker chưa tự check-in thì employer thấy "Bạn đã xác nhận người
      làm có mặt. Đang chờ người làm tự check-in."
- [ ] **Check-out chỉ sau khi ca kết thúc** — trước/giữa ca không có nút
      check-out; sau giờ kết thúc (trong 60 phút) mới hiện.
- [ ] **Nút có mặt / vắng mặt của employer** — hiện cả hai khi hợp lệ;
      khi worker đã check-in thì "Đánh dấu vắng mặt" hiện nhưng bị mờ +
      lý do; nút có mặt vẫn còn.
- [ ] **Màu badge nhất quán** — "Đang diễn ra" luôn xanh dương (info), không
      tím / không xanh lá ở chỗ khác.
- [ ] **Layout trang hồ sơ worker** — gọn gàng, không vỡ.
- [ ] **Layout modal điểm uy tín** — hiển thị đúng, không tràn.
- [ ] **Phần kỹ năng hiển thị** — worker mới (chưa có XP) vẫn thấy thẻ kỹ
      năng mặc định nghề phổ thông ở Cấp 1 / 0 XP; không có kỹ năng lập
      trình.
- [ ] **Copy nút lịch** — nút là "Thêm lịch trình"; modal có cả "Lịch
      rảnh" và "Lịch bận" + câu hướng dẫn.

> Nếu phát hiện lỗi Critical/High: ghi vào một báo cáo mới trong
> `qa-exploration/` và sửa trước khi sang backend.

---

## 2. Giai đoạn phát triển tiếp theo

**BACKEND-MIGRATION-1** (Supabase) — CHỈ bắt đầu sau khi:
- QA thủ công ở phần 1 xong, không còn lỗi Critical/High; VÀ
- được chấp thuận rõ ràng.

Đọc trước: `docs/BACKEND_MIGRATION_PLAN.md`,
`docs/SUPABASE_SECURITY_NOTE.md`,
`qa-exploration/backend-migration-plan.md`.

---

## 3. Thứ tự migration backend (bảng an toàn trước)

1. `users` / profiles (worker_profiles, employer_profiles)
2. `shifts` / `shift_drafts`
3. `applications`
4. `attendance_events`
5. `notifications`
6. `wallet` / ledger / escrow ← **KHÔNG làm trước; làm sau cùng các bảng
   nghiệp vụ vì là phần tiền, rủi ro nhất**
7. `disputes` / `reviews`
8. `schedule_blocks`
9. `worker_skill_scores`

Mỗi phase ship sau interface của store hiện tại để UI tiếp tục chạy
trong khi lớp lưu trữ được thay bên dưới.

---

## 4. Hoãn (không làm bây giờ)

- **Chat đầy đủ** (chỉ thêm khi core ổn định + hoàn chỉnh — xem
  `qa-exploration/chat-readiness-decision.md`).
- **Staff supply / agency mode** (xem
  `qa-exploration/staff-supply-proposal.md`).
- **AI matching nâng cao** (gợi ý ca hiện tại là rule-based, không phải
  AI — giữ nguyên).
- **Tích hợp thanh toán production** (hiện ví/escrow là mô phỏng; chỉ
  làm thật sau khi backend + auth + RLS sẵn sàng).
