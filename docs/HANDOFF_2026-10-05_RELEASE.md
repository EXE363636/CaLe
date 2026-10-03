# BÀN GIAO 05/10/2026 — nhánh gộp `release/2026-10-05`

Một nhánh duy nhất chứa toàn bộ việc đã xong (03–04/10), tách từ `main` = `fdae0ff`.
Chi tiết từng phần: `docs/HANDOFF_SESSION_2026-10-04_STABILITY_CHAT.md` (vá backend + chat) và
`docs/HANDOFF_SESSION_2026-10-04_SUPPORT_BUBBLE.md` (bong bóng hỗ trợ, trợ lý, tối ưu, hiệu ứng).

## 1. Lấy về

```bash
git fetch origin
git checkout release/2026-10-05
npm install
```

Không thêm dependency / biến môi trường / Edge Function mới.

## 2. Trong nhánh có gì

| Phần | Nội dung | DB |
|---|---|---|
| Vá tự chốt cọc | Một ca lỗi không còn chặn cả lượt quét; hoàn cọc sớm đóng đơn treo; đơn Chờ duyệt hết hạn khi ca bắt đầu; banner admin "ca kẹt cọc" | **0033** |
| Chặn trùng giờ | Server không cho duyệt / dời giờ khiến một người giữ hai ca trùng giờ | **0034** |
| Chat theo đơn ứng tuyển | Người lao động ↔ nhà tuyển dụng, Realtime, báo cáo tin, giới hạn tốc độ | **0035** |
| Danh sách ca công khai | Chỉ tải ca từ hôm qua; ca cũ đã ứng tuyển nạp theo lô | — |
| Chuông thông báo production | Hiện chuông (chỉ thông báo server) | — |
| Bong bóng hỗ trợ + trợ lý CaLẻ | Hỏi đáp nội bộ (không AI ngoài), Liên hệ, Hộp thư; trả lời lễ phép; minh hoạ ở 4 trang | — |
| Tối ưu + hiệu ứng | Trợ lý tải khi mở; logo nhỏ; hiệu ứng chạy lại khi kéo lên / xuống | — |
| Test | Sửa 4 test e2e chập chờn; spec mới 47, 48 | — |

Các nhánh lẻ (`fix/settlement-sweep`, `fix/approve-overlap-guard`, `feat/chat`,
`fix/public-shifts-date-filter`, `fix/prod-notification-bell`, `test/e2e-flaky-fixes`,
`feat/support-bubble`) đã gộp hết vào đây — **chỉ cần làm việc trên nhánh này**.

## 3. Đã kiểm
- tsc 0 lỗi · lint 0 lỗi · unit 2109/2109 · time 22/22 · build OK · e2e 387/387 (xem mục 6).
- Chạy thử migration trên DB thật (transaction + rollback, không ghi gì):
  0033 → 21/21 ok, **0034 → 13/13 ok (05/10)**, 0035 → 48/48 ok.
- Rà bảo mật (agent security-reviewer): không có lỗi Nghiêm trọng / Cao — việc nên sửa ở mục 6.

## 4. Việc tiếp theo (theo thứ tự)
1. **Chạy thử ở máy** (chế độ demo, dữ liệu trong trình duyệt):
   `set NEXT_PUBLIC_DATA_MODE=local&& set NEXT_DIST_DIR=.next-local&& npx next dev -p 3200`
   → mở http://localhost:3200, xem bong bóng hỗ trợ, trợ lý, chat, hiệu ứng khi cuộn, điện
   thoại 375px, giao diện tối.
2. **Chủ dự án `db push` đúng thứ tự 0033 → 0034 → 0035** (chưa ai push). Không tự `db push`.
3. Sau khi `db push` xong: thử bản production (`NEXT_PUBLIC_DATA_MODE=supabase`) — chat,
   chuông, duyệt trùng giờ bị chặn, trợ lý nói đúng luồng tiền thật PayOS.
4. Mở PR `release/2026-10-05` → `main`. Chủ dự án duyệt rồi mới merge.
5. Trước khi bật chat cho người dùng thật: chủ dự án duyệt `docs/CHAT_LEGAL_COPY_PROPOSAL.md`.
6. Xác nhận kênh liên hệ trong `src/lib/contact.ts` (hotline, Zalo, Facebook, email).
7. Còn mở: màn admin xem chat bị báo cáo; thời hạn lưu tin chat; `/terms` còn câu cọc 72 giờ;
   tối ưu tiếp (chỉ tải từ điển ngôn ngữ đang dùng ~550KB, ảnh cẩm nang 60MB → WebP).

## 5. Quy tắc (giữ nguyên, xem `CLAUDE.md`)
Chỉ commit / push khi chủ dự án bảo rõ · không push `main` · không tự `db push` / deploy Edge
Function · mỗi việc một nhánh · đụng migration / tiền / auth → `/verify pre-pr` + agent
security-reviewer.

## 6. Kết quả kiểm cuối (05/10)
- e2e trên nhánh gộp: **384/387 lượt chạy đầy đủ; 3 bài còn lại chạy lại riêng → qua** (chập
  chờn khi máy bận, lặp lại ở 2 lần chạy: `29:402` nút đăng ký header, `31:345` vòng thẻ tiếng
  Anh, `36:87` header khách). Nên làm cho 3 bài này ổn định (việc nhỏ, nhánh `test/…`).
- **Rà bảo mật (security-reviewer, 05/10): không có lỗi Nghiêm trọng / Cao.** Nên sửa trước
  khi mở PR vào `main` (mỗi việc một commit, có test):
  1. *(Trung bình)* 0034: nhà tuyển dụng có thể dò giờ làm của người lao động ở nơi khác bằng
     cách sửa giờ ca liên tục / duyệt rồi xem lỗi `WORKER_SCHEDULE_CONFLICT` /
     `EDIT_WORKER_SCHEDULE_CONFLICT`. Đề xuất: chặn đổi giờ ca khi đã có người giữ chỗ
     (Approved / CancellationRequested / CheckedIn / CheckedOut) — viết migration **0036** mới,
     không sửa 0034 (chưa push nhưng giữ nguyên số để dễ theo dõi; nếu chủ dự án muốn thì gộp).
  2. *(Thấp)* 0034: `edit_shift` chưa lấy khoá tư vấn `approve_worker:<worker>` → hai thao tác
     song song có thể lọt kiểm trùng. Thêm khoá theo thứ tự worker_id trong wrapper.
  3. *(Thấp)* 0033: `refund_deposit_for_shift` đóng đơn treo cả khi ca không còn cọc HELD →
     chỉ gọi `_close_overdue_applications` khi còn `payment_sessions` HELD.
  4. *(Thấp)* 0033: lượt quét có `limit` — nếu số ca lỗi vĩnh viễn ≥ limit thì ca khác không
     tới lượt; thêm `settle_attempted_at` để xoay vòng.
  5. *(Thấp)* `src/components/support/SupportAssistant.tsx` (`safeLinks`): regex
     `/^\/(?!\/)/` cho qua `/\evil.com` → đổi thành `/^\/(?![\/\\])/` (chặn cả `/` lẫn `\` ở ký tự thứ hai).
  6. Kiểm trên production (chỉ đọc): `select * from pg_policies where schemaname='realtime'`
     — không được có policy SELECT dễ dãi nào khác ngoài `chat_participants_receive`.
