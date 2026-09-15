# CaLẻ / Now — Việc cần làm hiện tại

**Ngày:** 31/05/2026
**Bối cảnh:** Vừa hoàn thành CORE-STABILITY-10 (lifecycle ca làm hợp
nhất một nguồn sự thật, badge nhất quán). Tất cả test tự động đang xanh
(unit 544, build 28 route, E2E 112, time-travel 22). Bước tiếp theo là
QA thủ công rồi mới đến backend.

---

## 1. QA thủ công ngay (sau CORE-STABILITY-10) — ✅ ĐÃ CHẠY 2026-09-15

> Kết quả đầy đủ: **`docs/QA_MANUAL_RESULTS_2026-09-15.md`**. Chạy trên giao diện
> thật, 3 vai, có tạo một ca mới hôm nay để kiểm trọn vòng đời. **Không lỗi
> Critical/High.** Một phát hiện Low (nhất quán copy "người làm" vs "người lao
> động", ~55 chuỗi hardcode) — không chặn backend.

- [x] **Tính nhất quán lifecycle ca làm** — cùng nhãn+badge trên employer
      dashboard, list công khai, detail công khai, worker detail, worker
      dashboard. ✅
- [x] **Check-in sớm** — nút "Check-in" hiện trong cửa sổ; sau check-in hiện
      "Đã check-in" + "Bạn đã check-in. Vui lòng chờ đến giờ bắt đầu ca.";
      KHÔNG check-out; ca vẫn "Sắp bắt đầu" (không nhảy "Đang diễn ra"). ✅
- [x] **Employer mark-present** — không đẩy ca "Đang diễn ra" sớm; hiện
      "Người lao động đã check-in. Vui lòng xác nhận có mặt nếu đúng." ✅
- [x] **Check-out chỉ sau khi ca kết thúc** — pre-start không có check-out
      (live). Phần sau giờ kết thúc phủ bởi test time-travel/E2E (đang xanh). ✅
- [x] **Nút có mặt / vắng mặt của employer** — hiện cả hai + lý do "chỉ đánh
      dấu vắng mặt nếu có tranh chấp" khi worker đã check-in. ✅
- [x] **Màu badge nhất quán** — nguồn duy nhất: InProgress→info(xanh),
      StartingSoon→warning(amber, kiểm live). "Đang diễn ra" luôn xanh. ✅
- [x] **Layout trang hồ sơ worker** — gọn gàng, không vỡ. ✅
- [x] **Layout modal điểm uy tín** — không tràn, list cuộn được. ✅
- [x] **Phần kỹ năng hiển thị** — thẻ nghề phổ thông Cấp 1 / 0 XP, không có
      kỹ năng lập trình. ✅
- [x] **Copy nút lịch** — "Thêm lịch trình" + modal "Lịch rảnh"/"Lịch bận"
      + câu hướng dẫn. ✅

> Đã kiểm: không lỗi Critical/High. Phát hiện Low ghi trong báo cáo kết quả.

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
