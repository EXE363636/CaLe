# HANDOFF — Session 2026-10-04 (bong bóng hỗ trợ, trợ lý CaLẻ, tối ưu tốc độ, hiệu ứng)

> Đọc trước: `CLAUDE.md`, `docs/HANDOFF_SESSION_2026-10-04_STABILITY_CHAT.md` (nhánh này
> dựng trên commit chat `0b80d83`).

## Partner cần làm sau khi pull

```bash
git fetch origin
git checkout feat/support-bubble
npm install
```

- Không thêm dependency, biến môi trường, migration hay Edge Function mới.
- Nhánh `feat/support-bubble` = commit chat `0b80d83` (**migration 0035**, nhánh `feat/chat`)
  + phần việc của phiên này. **Chưa merge `main`.** Theo quy tắc: chỉ merge `main` sau khi
  chủ dự án đã `db push` 0035 (thứ tự `db push`: 0033 → 0034 → 0035, xem handoff chat).
- Chạy thử ở chế độ demo (dữ liệu trong trình duyệt), cổng 3200:
  `set NEXT_PUBLIC_DATA_MODE=local&& set NEXT_DIST_DIR=.next-local&& npx next dev -p 3200`
  (cấu hình sẵn `cale-dev-local` trong `.claude/launch.json`).

## 0. Quy tắc (giữ nguyên)
Chỉ commit / push khi chủ dự án bảo rõ; không push `main`; không tự `db push` / deploy Edge
Function. Mỗi việc một nhánh.

---

## 1. Đã làm

### 1.1 Bong bóng hỗ trợ góc phải dưới (mọi trang, trừ đăng nhập / đăng ký / quên mật khẩu)
- Khách thấy ngay 2 tab: **"Hỏi CaLẻ"** (trợ lý tự động) và **"Liên hệ"** (Hotline, Gửi phiếu
  hỗ trợ qua email, Facebook, Zalo — không Telegram).
- Đã đăng nhập có thêm tab **"Hộp thư"**: cuộc trò chuyện theo đơn ứng tuyển (chat 0035) +
  thông báo gần nhất. Số trên nút tròn = tin chưa đọc + thông báo chưa đọc (không đếm trùng).
- Mở từ nơi khác: `openSupportBubble({ tab, ask })` (`src/components/support/supportBubbleEvents.ts`);
  chân trang có nút "Nhắn với trợ lý".
- Code: `src/components/support/*`. Thông tin liên hệ: `src/lib/contact.ts`
  (hotline 0868325698, Zalo, Facebook, email — **cần chủ dự án xác nhận đúng kênh thật**).

### 1.2 Trợ lý "Hỏi CaLẻ" — bot NỘI BỘ, không gọi AI bên ngoài
- Logic thuần: `src/domain/supportBot.ts`. Kho hỏi đáp: `src/data/supportKb.ts` (152 mục,
  song ngữ, có câu trả lời riêng cho bản thật `live`).
- Cách hiểu câu hỏi (mô tả đầy đủ ở đầu file): bỏ dấu + viết tắt ("ko", "dc"…), sửa gõ Telex
  chưa bật bộ gõ, từ đồng nghĩa, sửa lỗi gõ, chấm điểm theo độ hiếm của từ (IDF) cho từ đơn +
  cặp từ, so khớp bộ ba ký tự khi gõ dính / sai nặng; hiểu câu hỏi nối tiếp ("thế bao lâu có
  tiền?"), tách nhiều câu hỏi trong một tin, hỏi lại khi chỉ gõ một từ mơ hồ ("cọc"); trả lời
  dữ liệu của chính người hỏi (số dư, ca sắp tới, đơn chờ duyệt, tin chưa đọc); 2 lần liền
  không hiểu → chuyển sang người thật; mục chỉ dành cho admin không lộ cho người khác.
- **Trả lời lễ phép** (04/10): mọi câu tiếng Việt mở bằng "Dạ…", không trả lời trống không
  ("Không. …" → "Dạ không ạ. …", "Bấm …" → "Dạ, bạn bấm …") + câu kết hỏi han
  (`politeAnswer`).
- Giao diện chat như Messenger: hỏi xong, câu hỏi nằm ở đầu khung, câu trả lời đọc từ trên
  xuống (không nhảy thẳng xuống đáy); có "Đúng ý" / "Chưa đúng".
- Bộ trợ lý (~240KB) tách gói riêng, **chỉ tải khi rê / chạm / mở bong bóng**.

### 1.3 Minh hoạ chat tự chạy
- Trang chủ (`#home-assistant`), `/for-workers` (`#worker-assistant`), `/for-employers`
  (`#employer-assistant`), `/support` (`#support-assistant`). Mỗi trang hỏi đúng thắc mắc của
  đối tượng đó. Câu trả lời lấy từ chính trợ lý thật, dựng sẵn ở server
  (`src/components/landing/supportDemoScript.ts`).

### 1.4 Chat giữa người lao động và nhà tuyển dụng
- `ChatPanel`: đang kéo lên đọc tin cũ mà người kia nhắn tới → không giật xuống, hiện nút
  "Tin nhắn mới ↓"; tin của chính mình thì cuộn xuống.

### 1.5 Tối ưu tốc độ (không bớt hiệu ứng)
- Logo đầu / chân trang: ảnh 3896×2416 (192KB) → `public/images/logo-small.png` 194×120 (13KB).
- Vòng thẻ loại việc (`JobRing`): vòng vẽ tự nghỉ khi khuất màn hình / tab ẩn, không ghi lại
  style khi không đổi.
- Minh hoạ gõ chữ, số đếm: chỉ vẽ lại khi phần nhìn thấy thay đổi (trước: 60–120 lần/giây).
- Bỏ `backdrop-blur` ở header; Google Analytics `lazyOnload`; thanh tiến trình toast dùng
  `transform`; bỏ 4 animation không dùng.
- Bản thật: tải lại dữ liệu khi quay lại tab cách nhau tối thiểu 30 giây; vài lượt tải độc
  lập chạy song song (`AppHydrator`).

### 1.6 Hiệu ứng chạy lại khi kéo lên / kéo xuống (yêu cầu chủ dự án)
- Hiện dần khi cuộn (`useScrollReveal`), khối trồi lên (`MotionGroup`), số đếm (`StatValue`),
  chữ gõ (`TypeOnView`), sơ đồ dòng tiền (`MoneyFlowDiagram`), `Reveal`: khuất HẲN khỏi màn
  hình thì gài lại, cuộn tới lại là chạy lại (`src/components/landing/viewReplay.ts`).
- Minh hoạ gõ chữ (đăng ca, ứng tuyển, duyệt, xác minh, dòng tiền trả công) và minh hoạ chat:
  tự lặp sau vài giây nghỉ khi đang xem; người xem tự bấm thử thì thôi lặp; rê chuột thì chờ.
- Tiêu đề trang chủ giữ hiệu ứng hiện mờ dần như cũ.

## 2. Kiểm tra (04/10)
| | Kết quả |
|---|---|
| `npx tsc --noEmit` | 0 lỗi |
| `npm run lint` | 0 lỗi (5 cảnh báo có sẵn) |
| `npm run test:run` | 2088/2088 |
| `npm run test:time` | 22/22 |
| `npm run build` | OK |
| `npm run test:e2e` | **387/387** |

Spec mới: `e2e/47-support-bubble.spec.ts`, `e2e/48-support-demo.spec.ts`. Test mới:
`support*.test.ts(x)`, `contact.test.ts`, `personalSnapshot.test.ts`, thêm ca Messenger trong
`chatPanel.test.tsx`.

Mẹo Windows khi chạy e2e song song với dev server đang mở: đặt
`NEXT_DIST_DIR=.next/<tên>` + `E2E_PORT=<cổng trống>`; Next tự sửa `tsconfig.json` /
`next-env.d.ts` khi đổi thư mục build → sao lưu rồi trả lại sau khi chạy.

## 3. Việc tiếp theo (gợi ý thứ tự)
1. **Duyệt trên máy** (chế độ demo, cổng 3200): bong bóng, trợ lý, minh hoạ ở 4 trang, hiệu
   ứng khi cuộn, giao diện tối, điện thoại 375px.
2. **Xác nhận kênh liên hệ** trong `src/lib/contact.ts` (hotline, Zalo, Facebook, email).
3. **Chủ dự án `db push` 0033 → 0034 → 0035**, rồi mở PR `feat/support-bubble` → `main`
   (nhánh này gồm cả chat 0035). Trước khi bật chat cho người dùng thật: duyệt
   `docs/CHAT_LEGAL_COPY_PROPOSAL.md`.
4. **Thử trợ lý ở chế độ production** (`NEXT_PUBLIC_DATA_MODE=supabase`): câu trả lời `live`
   nói đúng luồng tiền thật PayOS, không ghi "mô phỏng".
5. **Cập nhật kho hỏi đáp khi đổi chính sách** (phí, cọc, rút tiền…): sửa
   `src/data/supportKb.ts`; chạy `npx vitest run src/__tests__/supportKb*.test.ts` (có bộ câu
   hỏi "mù" `supportKbHeldOut.test.ts` để biết trợ lý còn hiểu đúng không).
6. `/terms` vẫn còn câu về cọc 72 giờ — chưa sửa (ngoài phạm vi nhánh này).
7. **Tối ưu tiếp (lớn nhất còn lại):** mọi trang đang tải cả từ điển tiếng Việt + tiếng Anh
   (~550KB mã nguồn, `src/i18n/locale.ts` + `LocaleProvider`) → chỉ gửi ngôn ngữ đang dùng;
   seed JSON demo (~50KB, `src/data/persistence.ts`) chỉ nạp ở chế độ local; `Footer` thành
   server component; ảnh cẩm nang `public/images/handbook` (60MB PNG) → WebP + `next/image`.
   Làm ở nhánh riêng.
