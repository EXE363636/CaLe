# HANDOFF 2026-10-02: việc đang định làm

> Bàn giao cho người làm tiếp. Đọc trước: `CLAUDE.md`, `HANDOFF.md`,
> `docs/HANDOFF_SESSION_2026-10-01_FOLLOWUPS.md` (mục A–E: chi tiết migration 0030–0032).
> Tài liệu này nói **đang ở đâu** và **việc tiếp theo làm thế nào**.

## 0. Quy tắc làm việc (giữ nguyên)
- Chỉ commit / push khi người phụ trách bảo rõ. **Không push `main`** khi chủ dự án chưa đồng ý.
- **Không tự `db push` / deploy Edge Function.** Người có quyền làm. AI agent chỉ chạy thử
  trong transaction rồi rollback (`supabase/dryrun/run-00NN.sh`).
- Việc mới: trình kế hoạch để duyệt trước khi code, mỗi việc một nhánh riêng.
- Theo `CLAUDE.md` §0:
  - `/tdd` cho `src/domain`;
  - `/verify` trước commit;
  - đụng migration / ví / PayOS / auth → `/verify pre-pr` + agent **security-reviewer** TRƯỚC push.
- **Production là tiền thật:** UI production không ghi "mô phỏng" cho nạp / rút / cọc.
  **Không dùng `VNĐ` hay `₫`**, chỉ `đ` / `đồng`.
- Merge vào `main` chỉ khi chủ dự án đồng ý, và chỉ SAU khi đã `db push` migration của nhánh đó.

---

## 1. Trạng thái nhánh

`main` = `966dd7e` (đã có 0029). Các nhánh dưới **xếp chồng thẳng hàng**: mỗi nhánh tách từ
nhánh trước, nên nhánh cuối `feat/i18n-phase2d` chứa toàn bộ.

| # | Nhánh | Nội dung | DB |
|---|---|---|---|
| 1 | `feat/payos-hardening` | Gia cố webhook PayOS, chặn xoá người có lịch sử tiền | **0030** |
| 2 | `feat/payment-review-notify` | Thông báo cho người nạp khi admin xử giao dịch | **0031** |
| 3 | `feat/i18n-phase2` | VI/EN đợt 2a (lỗi, danh sách ca, thẻ ca, chi tiết ca, chuông, ví) | — |
| 4 | `feat/i18n-phase2b` | VI/EN đợt 2b (2 dashboard + trang quản trị) | — |
| 5 | `feat/integration-scripts-cleanup` | Script kiểm tích hợp dọn tiền test an toàn | — |
| 6 | `feat/bank-bigint` | Két `system_bank.balance` sang `bigint` | **0032** |
| 7 | `feat/handbook-by-role` | Cẩm nang tách người lao động / nhà tuyển dụng + bản tiếng Anh | — |
| 8 | `feat/i18n-phase2c` | VI/EN đợt 2c: 11 trang thông tin (about, faq, terms…) | — |
| 9 | `feat/i18n-phase2d` | VI/EN đợt 2d **phần 1**: chuyển hook, CHƯA có bản tiếng Anh (mục 3.1) | — |

Kiểm tra ở nhánh 9 (02/10):
- tsc 0;
- lint 0 lỗi (6 cảnh báo có sẵn);
- `test:run` 952/952;
- build OK (33 trang);
- e2e 143/143.

### 1.1 Việc của người có quyền (chưa làm)
1. Chạy thử từng migration: `bash supabase/dryrun/run-0030.sh`, `run-0031.sh`, `run-0032.sh`
   (mọi dòng "ok"; đã đạt 24/24, 13/13, 6/6).
2. Chủ dự án duyệt.
3. Push theo thứ tự (0032 nên làm lúc ít giao dịch):
   ```bash
   npx supabase db push
   ```
4. Sau khi push 0030, deploy 2 Edge Function. `payos-webhook` không đổi.
   ```bash
   npx supabase functions deploy admin-users
   npx supabase functions deploy create-payment
   ```
5. Kiểm sau push (chỉ đọc), xem FOLLOWUPS mục A.5, B.5, E.2.
6. Merge vào `main` theo thứ tự bảng trên. Vì thẳng hàng, có thể merge một lần tới nhánh cần
   lấy, miễn là migration của các nhánh trong đó đã push.

---

## 2. Thứ tự việc đề xuất
1. **VI/EN đợt 2d phần 2:** thêm bản tiếng Anh (mục 3.1). Không đụng DB. Làm trước để
   chat có sẵn tiếng Anh.
2. **Chat** (mục 3.2). Kế hoạch đã duyệt ngày 02/10, chủ dự án đã đồng ý bỏ quyết định "hoãn chat".
3. **Tìm nguồn ca từ hội nhóm** (mục 3.3). Là việc vận hành, không phải code.
4. Việc nhỏ còn mở (mục 3.4).

---

## 3. Chi tiết

### 3.1 VI/EN đợt 2d phần 2: thêm bản tiếng Anh
**Đã làm (phần 1, nhánh `feat/i18n-phase2d`):** 36 màn / component chuyển từ `t` của `vi.ts`
sang `useT()` / `useTx()`, chữ viết cứng bọc `tx('…')`. Gồm:
- **Trang:**
  - đăng ca `/employer/shifts/new` + `ShiftForm`;
  - quản lý ca `/employer/shifts/[id]`;
  - `/employer/{schedule,payments,reviews,profile}`;
  - `/worker/{profile,schedule}`.
- **Component:**
  - `UserMenu`, `MobileNav` (chip vai trò);
  - lịch (`calendar/*`);
  - hộp thoại `ApplicationActions`, `DisputeDialog`, `DisputeResponseDialog`, `RatingForm`, `RejectApplicationDialog`;
  - `DepositWalletConfirm`, `PayosTopUpQr`;
  - `user/*` (hồ sơ, đánh giá, huy hiệu);
  - `verification/*`, `workerDeposit/*`.

Khoá chưa có bản tiếng Anh tự rơi về tiếng Việt (`translate` / `translateText` trong
`src/i18n/locale.ts`), nên giao diện hiện **không đổi gì** khi chưa dịch.

**Còn lại:**
- Khoảng **574 khoá `t('…')` + 137 câu `tx('…')`** chưa có trong `en` / `enText`.
- Còn 2 file vẫn import `t` cố định từ `vi.ts`, cần chuyển: `EmployerConfirmationPanel`,
  `PaymentEvidenceCard`.

**Cách làm:**
1. Tạo `src/i18n/en-roles.ts` xuất `enRoles` (theo khoá) và `enRolesText` (theo câu Việt).
   Gộp vào `src/i18n/en.ts` **sau** `enPages` / `enPagesText`.
2. Lấy danh sách còn thiếu: viết script tạm (không commit) duyệt các file trên, regex
   `t('khoá')` / `tx('câu')`, đối chiếu với `en` / `enText` từ `./src/i18n/en`, chạy bằng
   `npx tsx`.
   - Trên Windows, viết script bằng editor, KHÔNG dùng heredoc: heredoc làm mất dấu `\` trong regex.
3. Thêm các file trên vào danh sách kiểm của `src/__tests__/i18nEnglish.test.ts`. Test báo
   thiếu khoá và chặn ghi đè câu của đợt trước. Nếu câu tiếng Việt trùng với đợt trước thì
   dùng lại bản dịch cũ, không định nghĩa lại.
4. e2e: thêm 1 kiểm tiếng Anh cho `/employer/shifts/new` (cookie `cale.lang=en`), giống
   `e2e/29-role-homepages.spec.ts`.

**Lưu ý đã chốt:**
- **Thông báo gửi admin** (title / body lưu vào store) **giữ tiếng Việt**: đó là dữ liệu
  lưu lại, không dịch theo người gửi.
- **Loại công việc** (`Phục vụ`, `Pha chế`…) là **giá trị lưu DB**. Chỉ dịch nhãn
  (`tx(v)`), không đổi giá trị.
- Code chạy trong xử lý sự kiện / ngoài React dùng `tCurrent` / `txCurrent`. KHÔNG dùng
  trong render vì sẽ lệch hydrate.
- Trang server component (`/employer/payments`, `/employer/reviews`, trang thông tin) dùng
  `await getTx()`. Test render chúng phải `vi.mock('@/i18n/server')` và
  `render(await Page())`, xem `src/__tests__/legalRoutesPreservation.test.tsx`.
- **Nhờ người đọc lại bản tiếng Anh**, nhất là câu về tiền / cọc / rút tiền.
- Chưa dịch: `VerificationsPanel` (chỉ dùng ở demo).

### 3.2 Chat giữa người lao động và nhà tuyển dụng
Trước đây `CLAUDE.md` §5, `HANDOFF.md`, `docs/CURRENT_TODO.md` ghi chat là "hoãn". Chủ dự án
đã đồng ý làm (02/10). **Việc đầu tiên khi làm: sửa các ghi chú đó.** Sửa luôn:
- `docs/KIRO_HANDOFF_CURRENT_STATE.md`, `docs/PARTNER_*`, `docs/NEW_KIRO_START_PROMPT.md`;
- các bài cẩm nang đang mô tả là không có chat (bài sửa ngày 01/10: 6, 8, 9, 10 trong
  `src/data/mock/handbookArticles.ts` + `handbookArticlesEn.ts`).

File `qa-exploration/chat-readiness-decision.md` mà tài liệu cũ nhắc tới **không có** trong repo.

**Quyết định đã duyệt:**

| Vấn đề | Chốt |
|---|---|
| Phạm vi | Mỗi **đơn ứng tuyển** một cuộc trò chuyện: người lao động ↔ nhà tuyển dụng của ca đó |
| Mở khi nào | **Sau khi đơn được duyệt** (Approved, CancellationRequested, CheckedIn, CheckedOut, Confirmed). Giống điều kiện hiện số người liên hệ tại chỗ trong `get_shift_detail` (migration 0004) |
| Đóng | Chỉ đọc sau **7 ngày** kể từ khi ca kết thúc |
| Nội dung | Chỉ chữ, ≤ 1000 ký tự. Chưa có ảnh / tệp |
| Tin mới | **Supabase Realtime, kênh riêng tư (private channel)** có kiểm quyền. Không polling |
| An toàn | Tin có số tài khoản / "chuyển khoản" / Zalo / Telegram → hiện cảnh báo "giữ giao dịch trên CaLẻ" (không chặn). Có nút báo cáo tin nhắn. Admin đọc được cuộc trò chuyện khi đơn có tranh chấp |
| Thông báo | Thêm kind `ChatMessage` vào `user_notifications` (0031). **Một** thông báo chưa đọc cho mỗi cuộc trò chuyện (dùng `dedupe_key`), không phải mỗi tin |
| Route | Không thêm route (giữ đúng 33). Khung chat nằm trong `/shifts/[id]` (người lao động) và `/employer/shifts/[id]` |

**Các bước (nhánh `feat/chat`, tách từ nhánh i18n mới nhất):**
1. **Domain (`/tdd`):** `src/domain/chat.ts` gồm:
   - `canChat(applicationStatus, shift, nowIso)`: mở / chỉ đọc / đóng;
   - `validateMessage(body)`: rỗng, quá dài, chỉ khoảng trắng;
   - `detectOffPlatformHint(body)`: số tài khoản, SĐT, Zalo, Telegram, "chuyển khoản".
2. **Migration 0033** (RPC-only như 0031: bật RLS, không cấp quyền bảng cho client):
   - Bảng:
     - `chat_messages(id, application_id, sender_id, body, created_at, reported_at, report_reason)`;
     - `chat_reads(application_id, user_id, last_read_at)`.
   - RPC:
     - `get_chat_threads()`;
     - `get_chat_messages(application_id, before?)`, phân trang;
     - `send_chat_message(application_id, body)`, kiểm quyền + `canChat` phía server + giới
       hạn tốc độ, ví dụ ≤ 20 tin / phút / người;
     - `mark_chat_read(application_id)`;
     - `report_chat_message(id, reason)`;
     - `admin_get_chat_messages(application_id)`: chỉ admin, chỉ khi có tranh chấp.
   - Realtime:
     - trigger sau insert gọi `realtime.send(...)` vào topic `chat:<application_id>`
       (private), payload tối thiểu (chỉ id), client nhận rồi gọi RPC lấy tin;
     - policy trên `realtime.messages` chỉ cho 2 bên của đơn (và admin) nhận.
   - Thêm `ChatMessage` vào check constraint `kind` + `SERVER_NOTIFICATION_KINDS`.
   - **Chạy thử:** `supabase/dryrun/0033_chat_scenarios.sql` + `run-0033.sh` (transaction +
     rollback). Kịch bản:
     - người ngoài đọc / gửi bị chặn;
     - đơn chưa duyệt bị chặn;
     - quá 7 ngày chỉ đọc;
     - giới hạn tốc độ;
     - admin chỉ đọc khi có tranh chấp;
     - không lộ tin qua realtime cho người ngoài.
3. **Client:**
   - `src/data/repos/chatRepo.ts`, `src/stores/chatStore.ts`; chế độ local / demo lưu
     localStorage, nhớ bump `SCHEMA_VERSION` nếu đổi shape persistence;
   - component `ChatPanel` (VI/EN ngay từ đầu);
   - số tin chưa đọc trên chuông;
   - đăng xuất / đổi tài khoản thì huỷ kênh realtime và xoá tin trong bộ nhớ, như
     `notificationStore.clearServer`.
4. **Kiểm tra:** e2e spec mới (agent e2e-runner), `/verify pre-pr`, **security-reviewer**
   (RLS, realtime authorization, rate limit, lộ dữ liệu cá nhân). Người có quyền `db push`.

### 3.3 Tìm nguồn ca từ hội nhóm Facebook (vận hành, không phải code)
Leader đề nghị copy tin tuyển dụng ở hội nhóm rồi đăng lên CaLẻ. **Không copy nguyên tin rồi
tự đứng tên đăng**, vì:
- **Phá chức năng lõi.** Ca chỉ đăng được khi nhà tuyển dụng giữ cọc 100% tiền công bằng tiền
  thật; làm xong ca, hệ thống tự trả cho người lao động.
  - Đăng hộ bằng tài khoản của nhóm thì ví nhóm phải giữ cọc thay, trong khi chủ quán thật trả
    tiền mặt ngoài app → trả hai lần hoặc mất tiền.
  - Chủ quán thật không biết CaLẻ nên không xác nhận có mặt, không đánh giá, không có ai xử
    tranh chấp.
- **"Miễn phí" chỉ miễn phí dịch vụ 10%** (migration 0025, `fee_free_until`). Cọc tiền công
  vẫn phải giữ đủ.
- **Pháp lý:** lấy tên / SĐT người đăng mà không có đồng ý là vi phạm Nghị định 13/2023/NĐ-CP
  về dữ liệu cá nhân. Cào bài tự động là vi phạm điều khoản của Facebook.

**Cách làm đúng: đăng hộ khi chủ quán đã đồng ý.**
1. Lọc tin tuyển ca ngắn trong nhóm, nhắn riêng cho người đăng.
2. Ai đồng ý thì hỗ trợ họ tạo tài khoản nhà tuyển dụng và đăng ca đầu tiên. Họ tự giữ cọc
   và tự duyệt người.

Mẫu tin nhắn (chỉ ghi "đang miễn phí dịch vụ" khi admin thật sự đã bật đợt miễn phí):

> Chào anh/chị, em thấy bên mình đang tìm người làm ca [phục vụ] trong nhóm [tên nhóm]. Bên em
> có app CaLẻ chuyên tìm người làm theo ca: anh/chị đăng ca, giữ cọc tiền công trên app,
> người lao động làm xong ca thì app tự trả, không phải chuyển khoản lẻ từng người. Hiện bên em
> đang miễn phí dịch vụ. Nếu anh/chị muốn, em hỗ trợ đăng ca đầu tiên luôn ạ.

Nếu muốn có "tin tham khảo" không cọc trên web, đó là thay đổi luồng tiền và sản phẩm: cần
chủ dự án quyết và trình kế hoạch riêng.

### 3.4 Việc nhỏ còn mở
- **Két và tổng ví lệch nhau** (kiểm chỉ đọc 01/10): két 2.001 đ, tổng ví 4.546 đ. Mới ghi
  nhận, chưa điều tra.
- Ví nhận phí 10% của admin vẫn là `integer` (FOLLOWUPS E.2). Làm khi cần.
- Chạy `npm run test:payment` / `test:attendance` thật lần đầu sau khi push 0030, lúc ít giao
  dịch (FOLLOWUPS E.1).
- Các mục "Còn mở (Thấp)" ở FOLLOWUPS A.4, E.1.

---

## 4. Mẹo môi trường (Windows)
- Terminal có thể hiện tiếng Việt lỗi font → ghi log ra file UTF-8. Python đặt
  `PYTHONIOENCODING=utf-8`.
- Heredoc trong Git Bash làm mất dấu `\` → viết script bằng editor rồi chạy.
- graphify: `PYTHONHASHSEED=0 graphify update .` sau khi sửa code (xem `CLAUDE.local.md`
  nếu có).
- Dùng worktree: **xoá junction `node_modules` TRƯỚC** khi xoá bản sao / `git worktree remove`,
  nếu không sẽ xoá luôn `node_modules` gốc.
