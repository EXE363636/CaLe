# HANDOFF — Session 2026-10-03/04 (test chập chờn, vá ổn định backend, chat)

> Đọc trước: `CLAUDE.md`, `docs/HANDOFF_SESSION_2026-10-03_UI_REDESIGN.md`,
> `docs/HANDOFF_SESSION_2026-10-03_FOLLOWUPS.md`.

## Partner cần làm sau khi pull
1. Các nhánh dưới **chưa push, chưa merge**. Chỉ commit ở máy chủ dự án.
2. **Thứ tự `db push` bắt buộc: 0033 → 0034 → 0035.** Merge `main` chỉ sau khi đã push
   migration của nhánh đó.
3. Trước khi bật chat cho người dùng thật: chủ dự án duyệt
   `docs/CHAT_LEGAL_COPY_PROPOSAL.md` (câu chữ Bảo mật / Điều khoản + **thời hạn lưu tin**).
4. Không thêm dependency, không thêm biến môi trường, không có Edge Function mới.

## 0. Quy tắc (giữ nguyên)
Chỉ commit / push khi được bảo rõ; không push `main`; không tự `db push` / deploy Edge
Function; chạy thử migration bằng `bash supabase/dryrun/run-00NN.sh` (transaction +
rollback). Đụng migration / tiền / auth → `/verify pre-pr` + agent security-reviewer.

---

## 1. Các nhánh

| Nhánh | Commit | Nội dung | DB |
|---|---|---|---|
| `test/e2e-flaky-fixes` | `9851052` | Sửa 4 test e2e chập chờn (34, 20, 42, 43); form tìm ca có `action="/shifts"`; footer `data-testid="site-footer"` | — |
| `fix/settlement-sweep` | `8fe5b16` | Lượt quét tự chốt cọc không còn bị một ca lỗi chặn; hoàn cọc sớm đóng đơn treo; đơn Pending hết hạn khi ca bắt đầu; banner admin "ca kẹt cọc" | **0033** |
| `fix/approve-overlap-guard` | `96ea636` | Server chặn duyệt / dời giờ khiến một người giữ chỗ hai ca trùng giờ | **0034** |
| `fix/public-shifts-date-filter` | `aa70814` | Danh sách ca công khai chỉ tải từ hôm qua; ca cũ đã ứng tuyển nạp theo lô | — |
| `fix/prod-notification-bell` | `91ccfac` | Hiện chuông trên production (chỉ thông báo server); dọn cờ `capabilities.ts` | — |
| `feat/chat` | (chưa commit) | Chat theo đơn ứng tuyển | **0035** |

Mỗi nhánh tách từ `main` = `fdae0ff`, độc lập nhau. `feat/chat` dùng `SCHEMA_VERSION` 20.

### Chạy thử DB
| Migration | Kết quả |
|---|---|
| 0033 | `run-0033.sh` → **21/21 ok** (00a / 00b tái hiện 2 lỗi trước bản vá) |
| 0034 | **CHƯA chạy được** (bị chặn quyền ở máy agent). Chủ dự án chạy: `git checkout fix/approve-overlap-guard` rồi `bash supabase/dryrun/run-0034.sh` (PowerShell: hai lệnh riêng, không dùng `&&`) |
| 0035 | `run-0035.sh` → **48/48 ok** (gồm: không có policy realtime nào khác trên prod) |

### Đã kiểm trên production (chỉ đọc, 03/10)
- `cron.job`: `cale-auto-settle` (*/15) và `cale-worker-holds` (5,20,35,50) đều `active`.
- `schema_migrations`: đã có tới `20261001000032`.

---

## 2. Chat (`feat/chat`, 0035)

Kế hoạch duyệt 02/10 (`docs/HANDOFF_2026-10-02_VIEC_DINH_LAM.md` §3.2) + chỉnh 03/10:
- Mỗi đơn ứng tuyển một cuộc trò chuyện. Có khi đơn từng được duyệt; gửi được khi đơn đang
  giữ chỗ / đã xong, ca chưa huỷ, trước hết ca + 7 ngày; còn lại chỉ đọc.
- Chữ 1–1000 ký tự (cắt khoảng trắng / xuống dòng / ký tự vô hình hai đầu); 20 tin / phút,
  300 tin / ngày.
- **Admin đọc chỉ khi** còn tin bị báo cáo chưa xử lý, hoặc cọc người lao động của đơn đang
  `Contested` (chủ dự án chọn 03/10). Đọc qua `admin_get_chat_messages` (ghi
  `chat_admin_access_log`); `admin_resolve_chat_reports` → hết quyền đọc. Kiểm admin trong
  bảng `users`, không chỉ JWT. **Chưa có màn admin** (RPC đã có).
- Chỉ người báo cáo thấy cờ "Đã báo cáo".
- Tin mới: Realtime kênh riêng tư `chat:<application_id>`, payload chỉ id → client gọi lại
  RPC. Policy `chat_participants_receive` trên `realtime.messages`. Không polling.
- Thông báo kind `ChatMessage`, một dòng mỗi cuộc (dedupe `chat:<id>`), deeplink:
  người lao động `/shifts/{shiftId}?chat=1`, NTD `/employer/shifts/{shiftId}?chat={appId}`.
- Không thêm route (vẫn 25). Khung chat: `src/components/chat/*`; store
  `src/stores/chatStore.ts` (đổi tài khoản → `clear()` huỷ kênh + bỏ kết quả về muộn);
  logic thuần `src/domain/chat.ts`. Bản demo lưu `localStorage`.

**Còn mở**
- Màn admin xem cuộc trò chuyện bị báo cáo.
- Thời hạn lưu + job dọn tin cũ (chờ chủ dự án chốt số, đề xuất 12 tháng).
- Câu chữ `/privacy`, `/terms` (đề xuất ở `docs/CHAT_LEGAL_COPY_PROPOSAL.md`).
- Chuông thông báo trên production đang ẩn ở `main`; chat dựa vào chuông sau khi merge
  `fix/prod-notification-bell`.
- Ảnh / tệp trong chat: hoãn.

---

## 3. Rủi ro / quyết định cần chủ dự án
1. **0033:** dashboard NTD tự gọi hoàn cọc ở hết ca + 60 phút → người được duyệt mà không
   đến bị đánh vắng ngay lúc đó (trước: chờ lượt tự chốt 24 giờ). Cùng kết cục; nếu bật cọc
   người lao động, khoản cọc vào "chờ admin xử" thay vì hoàn sau 7 ngày.
2. **0034:** `employer_revert_no_show` không kiểm trùng giờ (cố ý: ghi nhận người lao động
   thật sự đã làm).
3. **Danh sách ca công khai:** hộp hồ sơ NTD có thể hiện "0 ca đã đăng" với NTD chỉ có ca cũ.
4. **Chuông:** thông báo server chỉ nạp khi mở app / đăng nhập.
5. Ví vẫn `integer` (hoãn theo quyết định cũ, ~21 tỷ đồng mới chạm trần).

## 4. Kiểm tra
Mỗi nhánh đã qua `/verify` (tsc 0, lint 0 lỗi, unit qua hết, build 25 route). Worktree
không chạy được `next dev` / build Turbopack vì junction `node_modules` → build bằng
`npx next build --webpack`, e2e chạy ở cây chính.
