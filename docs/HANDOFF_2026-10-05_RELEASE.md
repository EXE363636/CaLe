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
- tsc 0 lỗi · lint 0 lỗi · unit 2109/2109 · time 22/22 · build OK · e2e (xem mục 6).
- Chạy thử migration trên DB thật (transaction + rollback, không ghi gì):
  0033 → 21/21 ok, **0034 → 13/13 ok (05/10)**, 0035 → 48/48 ok.
- Rà bảo mật (agent security-reviewer): xem mục 6.

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
- e2e: tới lúc push 237/387 đã qua, chưa bài nào hỏng (bản `feat/support-bubble` trước khi
  gộp: 387/387). Kết quả đủ + rà bảo mật sẽ được cập nhật bằng commit sau trên nhánh này —
  `git pull` lại trước khi làm.
