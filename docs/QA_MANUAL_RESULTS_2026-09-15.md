# Kết quả QA thủ công — 2026-09-15

> Chạy checklist `docs/CURRENT_TODO.md` mục 1 trên giao diện thật (`npm run dev`,
> port 3000), lái qua trình duyệt với 3 vai. Ngày/giờ môi trường: 2026-09-15.
>
> **Kết luận: KHÔNG có lỗi Critical/High. Đủ điều kiện QA để sang backend.**
> Một phát hiện Low về nhất quán copy (xem §Phát hiện).

## Cách kiểm
- Đăng nhập seed: worker `an.nguyen@gmail.com`, employer `lien@quanphoha.vn`,
  mật khẩu `demo` (mọi tài khoản seed).
- Seed data neo quanh giữa 2026 → lifecycle-sync tự kết thúc mọi ca seed khi boot
  (đúng: ca quá khứ → Hết hạn/Hoàn thành). Để kiểm các cửa sổ thời gian, đã **tạo
  một ca mới hôm nay 13:45–14:45** và chạy trọn vòng đời:
  đăng ca → mô phỏng đặt cọc (nạp ví demo) → công khai → worker ứng tuyển →
  employer duyệt → worker check-in → employer thấy trạng thái.

## Checklist mục 1 — kết quả

| # | Mục | Kết quả | Bằng chứng |
|---|---|---|---|
| 1 | Nhất quán nhãn+badge lifecycle | ✅ | Cùng ca hiện **cùng nhãn** ("Đang tuyển", rồi "Sắp bắt đầu") trên employer dashboard, list công khai, detail công khai, worker detail, worker dashboard. |
| 2 | Check-in sớm (cửa sổ trước giờ) | ✅ | Trong cửa sổ trước 13:45: nút **"Check-in"** hiện, **không** có check-out. Sau check-in: dashboard worker hiện "Đã check-in" + "**Bạn đã check-in. Vui lòng chờ đến giờ bắt đầu ca.**". Badge **vẫn "Sắp bắt đầu"** (không nhảy "Đang diễn ra") — đúng bất biến #2. |
| 3 | Employer mark-present / trạng thái | ✅ | Sau khi worker check-in, employer thấy "**Người lao động đã check-in. Vui lòng xác nhận có mặt nếu đúng.**"; ca **chưa** chuyển "Đang diễn ra". |
| 4 | Check-out chỉ sau khi ca kết thúc | ✅ (một nửa live) | Trước/tại pre-start: **không** có nút check-out (xác nhận live). Phần hiện sau giờ kết thúc (14:45) không chờ live được — phủ bởi test time-travel + E2E (đang xanh). |
| 5 | Nút có mặt/vắng mặt employer | ✅ | Cả "Xác nhận có mặt" + "Đánh dấu vắng mặt" hiện; kèm lý do "Người lao động đã check-in. Chỉ đánh dấu vắng mặt nếu có tranh chấp." |
| 6 | "Đang diễn ra" luôn xanh dương (info) | ✅ (tại nguồn) | Nguồn duy nhất `shiftLifecycleState.ts`: `InProgress → tone:'info'`, `StartingSoon → 'warning'`. Hệ tông kiểm live đúng (badge "Sắp bắt đầu" render **amber/warning**). Không chờ tới 13:45 để thấy live flip. |
| 7 | Layout hồ sơ worker | ✅ | Render gọn: thông tin, kỹ năng, loại việc/khu vực, đánh giá 4.8/5, xác minh (đều nhãn "mô phỏng"), thống kê, kỹ năng. |
| 8 | Modal điểm uy tín | ✅ | Modal "Điểm uy tín" gọn, **không tràn**; vòng điểm + "Cách cải thiện" + list cộng/trừ (+5/−10) cuộn được + "Đã hiểu". Nhãn "Dữ liệu mô phỏng trong MVP". |
| 9 | Kỹ năng worker (nghề phổ thông, không lập trình) | ✅ | Thẻ kỹ năng ở Cấp 1 / 0/50 XP: Phục vụ, Pha chế, Thu ngân, Bốc xếp, Kho vận, Sự kiện, Đóng gói, Giao tiếp... **Không có** kỹ năng lập trình. |
| 10 | Copy nút lịch | ✅ | Nút "**Thêm lịch trình**"; modal "Thêm lịch trình của bạn" có "**Lịch rảnh**" + "**Lịch bận**" + câu hướng dẫn. |

## Kiểm tra bổ sung (ngoài checklist, đều đạt)
- **Tiền tệ:** toàn bộ dùng `đ`/`đồng` thường; không thấy `VNĐ`/`₫`.
- **Trung thực mô phỏng:** đặt cọc/ví/nạp tiền/xác minh/bằng chứng đều gắn nhãn
  "mô phỏng" / "demo" / "MVP không có giao dịch/upload thật".
- **Draft không phải ca thật (bất biến #5):** ví thiếu tiền khi đặt cọc → modal
  "Số dư ví không đủ" giữ nguyên bản nháp, không công khai.
- **Đối soát ví:** giữ cọc −40.000đ / hoàn cọc khi hết hạn +750.000đ khớp sổ.

## Phát hiện (Low) — ✅ ĐÃ XỬ LÝ (2026-09-15)
**Nhất quán thuật ngữ "người làm" vs "người lao động".** i18n dictionary +
các bề mặt mới đã chuẩn "người lao động"; nhưng còn ~55 chuỗi "người làm"
hardcode trong component/store (gồm tiêu đề thông báo employer ở
`applicationStore.ts` và nhiều trang thông tin).
→ **Đã quét chuẩn hoá toàn bộ về "người lao động"** trên 22 file `src/`
(component/store/page, không đụng i18n vì đã chuẩn sẵn; giữ nguyên chuỗi
test-input). Đồng bộ 3 E2E spec (`04-attendance`, `12-timeline`,
`13-dispute-invariant`) vốn đã stale với i18n. Sau sửa: `tsc` sạch, unit
672/675 (3 fail = §3.2 hoãn), build 28 route. Không cần bump `SCHEMA_VERSION`
(chỉ đổi chuỗi hiển thị, không đổi shape; thông báo mới sinh dùng copy mới).

## E2E (Playwright) — chạy 2026-09-15 → ✅ **112 pass / 0 fail** (toàn xanh)
Ban đầu 20 pass / 92 fail. Đã truy nguyên + sửa 3 nhóm nợ E2E CÓ SẴN (không do
sweep copy), đưa suite về xanh hoàn toàn:

1. **Fixture SCHEMA_VERSION drift (78 test):** `e2e/fixtures/constants.ts` ghi
   `SCHEMA_VERSION = 11` trong khi app đã là **19** → seed E2E bị `loadAll()`
   reseed & xoá auth → mọi test cần login bị đẩy /login. **Sửa constant → 19.**
2. **Nút deposit đổi tên (4 test — spec 15/20/21):** E2E chọn nút cũ
   "Xác nhận đã thanh toán"; sản phẩm đã đổi thành **"Mô phỏng đảm bảo thanh
   toán"** (`btn.deposit`). **Cập nhật selector.**
3. **Số nav link stale (10 test — spec 18):** test kỳ vọng employer desktop nav
   6 link, nhưng "Cẩm nang làm việc" (handbook) đã được thêm → **7 link** (đúng
   thiết kế, xem comment trong `NavBar.tsx`). Chỉ assertion count fail, không có
   overflow/overlap. **Cập nhật baseline 6 → 7.**

**Copy sweep được E2E xác nhận ✅:** `04-attendance`, `12-timeline`,
`13-dispute-invariant` (5 test) PASS — đúng các assertion "Người lao động đã
check-in...", "đã duyệt người lao động", nút "Thanh toán cho người lao động".

> Tất cả thay đổi E2E chỉ đụng file test/fixture, KHÔNG đụng code sản phẩm.

## Ghi chú kỹ thuật
- Đã thêm `.claude/launch.json` (cấu hình chạy dev server cho QA). Không ảnh hưởng
  build/app.
- Ca QA đã tạo (`Phục vụ quán phở ca chiều (QA)`) chỉ nằm trong localStorage của
  phiên trình duyệt QA — không vào seed, xoá cache là mất.
