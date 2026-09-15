# Hướng dẫn triển khai tiếp — cho Partner (dev)

> Đọc SAU `PARTNER_HANDOFF_CHECKLIST.md`. File này chỉ bạn **làm gì tiếp và làm
> thế nào**. Phần "cái gì" (bảng/jobs/API/thứ tự) đã có ở
> `docs/BACKEND_MIGRATION_PLAN.md` — guide này KHÔNG lặp lại, chỉ bổ sung
> **cách bắt đầu + kỹ thuật + cổng kiểm tra**. Cập nhật: 2026-09-15.

## 0. Trạng thái để bạn bắt đầu
Frontend demo đã hoàn chỉnh, lưới an toàn xanh (unit 672/675, E2E 112/0, build
28 route, tsc sạch). Việc tiếp theo đã được quyết: **BACKEND-MIGRATION-1** —
thay `localStorage` bằng **Supabase (Postgres)**, làm theo phase.

> ⚠️ **Chỉ bắt đầu code backend sau khi chủ dự án chấp thuận rõ ràng.** Trước đó,
> có thể setup môi trường local (Bước 1) mà không đụng gì.

---

## 1. Nguyên tắc chủ đạo — KHÔNG viết lại app
Toàn bộ truy cập dữ liệu đã gom vào **một lớp duy nhất**: các Zustand store
(`src/stores/`). Logic nghiệp vụ nằm ở **`src/domain/` (hàm thuần, không React)**.

**Kỹ thuật migration = thay phần lưu trữ BÊN DƯỚI interface store, giữ nguyên
chữ ký public của store.** Component không đổi. Cụ thể:

- Hôm nay: mỗi mutation của store ghi `localStorage` qua `persist(...)`
  (xem `src/data/persistence.ts`).
- Sau này: cùng mutation đó gọi Supabase; **tên hàm + kiểu trả về giữ nguyên**.
- `src/domain/` là TypeScript thuần → **tái dùng nguyên vẹn ở server** (Supabase
  Edge Functions chạy Deno/TS, hoặc port sang SQL/RPC cho phần tiền). Đừng viết
  lại logic escrow/lifecycle — mirror lại.

→ Mỗi phase **ship sau interface store hiện tại**, UI tiếp tục chạy trong khi
lớp lưu trữ được thay dần.

## 2. Bước 1 — Chuẩn bị môi trường (an toàn, chưa đụng app)
- [ ] Tạo project Supabase **local** (free) hoặc `supabase start` (Docker).
- [ ] Đọc `docs/SUPABASE_SECURITY_NOTE.md` **trước khi** cấu hình.
- [ ] Đưa mọi bí mật vào **env var** (`.env.local`, KHÔNG commit). App phải đọc
      DB URL + key từ env, không hard-code → deploy chỉ đổi config.
- [ ] **TUYỆT ĐỐI không lộ `service_role` key** ra frontend/log/chat. Frontend
      chỉ dùng `anon` key + RLS.
- [ ] Tạo file `src/data/supabaseClient.ts` (chưa dùng) để sẵn.

## 3. Phase 1 — Users / Auth / Roles (bắt đầu ở đây)
Mục tiêu: đăng nhập thật + phân quyền server, **chưa đụng tiền**.

- [ ] **Schema:** `users` (id, role, email, phone, created_at, suspended…),
      `worker_profiles`, `employer_profiles` (tách theo vai trò). Khớp
      `src/types/index.ts` (nguồn sự thật mô hình). Timestamp ISO, tiền = số
      nguyên đồng.
- [ ] **Auth:** dùng Supabase Auth (email/password). Map `auth.uid()` ↔ `users.id`.
- [ ] **RLS (bắt buộc, đây là điểm mấu chốt bảo mật):**
      - Worker chỉ đọc/sửa hồ sơ của chính mình.
      - Employer chỉ hồ sơ doanh nghiệp của mình.
      - Admin (dùng role/claim) mới tới được endpoint admin.
      - Role **không** được để client tự set — set/verify ở server.
- [ ] **Thay store:** `userStore` + `authStore` gọi Supabase thay vì đọc seed/
      localStorage. Giữ nguyên chữ ký `findById`, `login`, `hydrate`…
- [ ] **AppHydrator:** thay `loadAll()` bằng nạp từ Supabase (hoặc giữ hydrate
      pattern, đổi nguồn). Bỏ dần seed localStorage.

**Cổng nghiệm thu Phase 1:** đăng nhập/đăng ký thật chạy; RLS chặn đúng khi thử
truy cập chéo (worker A không đọc được dữ liệu worker B qua API); unit test cũ
vẫn xanh (interface store không đổi); thêm vài test tích hợp RLS.

## 4. Các phase sau (thứ tự an toàn — tiền CUỐI CÙNG)
Chi tiết scope ở `BACKEND_MIGRATION_PLAN.md` §5–8. Tóm tắt thứ tự:

2. **Shifts + drafts + applications** — nhớ: `shifts` KHÔNG chứa Draft; draft ở
   `shift_drafts` (bất biến #5).
3. **Wallet / escrow — ⚠️ RỦI RO NHẤT.** Cọc/nạp/rút/hoàn/escrow phải **quyết
   định + ghi ở server** trong transaction; mirror `src/domain/` (escrow, wage).
4. **Server jobs (schedule)** — start/end ca, auto-release 12h, hoàn cọc. Chạy
   bằng Supabase scheduled functions, **KHÔNG** phụ thuộc trình duyệt mở.
5. **Disputes / reviews / notifications.**
6. **Schedule (busy/available) + skill scores** — XP **server-computed**, client
   không gửi.

## 5. Ràng buộc BẮT BUỘC khi làm backend
- [ ] **Tiền không được ở client.** Mọi job tiền **idempotent** — chạy 2 lần cho
      cùng kết quả, **tuyệt đối không double-pay/double-refund**. App đã có sẵn
      marker idempotency (`shiftStartedNotifiedAt`, notification `dedupeKey`) để
      server mirror.
- [ ] **Phân quyền bằng RLS server, không dựa frontend** (user sửa được
      localStorage/role qua devtools).
- [ ] **Lifecycle chỉ theo đồng hồ**, chạy server schedule; không polling client.
- [ ] Đổi shape dữ liệu → bump `SCHEMA_VERSION` (`src/data/persistence.ts`, hiện
      **19**) chừng nào còn dùng localStorage; đồng bộ `e2e/fixtures/constants.ts`.
- [ ] Giữ **trung thực UI** khi tiền đã thật: bỏ nhãn "mô phỏng" đúng lúc, không
      để lẫn lộn thật/mô phỏng.
- [ ] Không thêm feature mới (chat/agency/AI) trước khi core+backend ổn.

## 6. Cách làm việc để không vỡ (workflow đề xuất)
1. Làm **từng phase một**, mỗi phase một nhánh/PR (nếu bật workflow git).
2. Sau mỗi thay đổi: `npx tsc --noEmit` → `npm run build` (28 route) →
   `npm run test:run` → `npm run test:e2e`. **Giữ test xanh** là hợp đồng.
3. Với mỗi store chuyển sang Supabase: giữ interface, thêm test tích hợp cho
   nhánh dữ liệu mới (nhất là RLS + tiền).
4. Cập nhật `HANDOFF.md` sau mỗi phase để người sau biết đang ở đâu.

## 7. "Done" của migration
Backend MVP coi là xong khi: auth+RLS thật; shifts/applications/attendance chạy
server; ví/escrow quyết định ở server với job idempotent; lifecycle + auto-
release 12h chạy bằng schedule; UI không đổi hành vi với người dùng; test xanh +
có test tích hợp cho tiền & phân quyền. Ước lượng ~3–5 tuần MVP (HANDOFF §6).

## 8. Lưu ý tài liệu
- `docs/BACKEND_MIGRATION_PLAN.md` = bảng/jobs/API/thứ tự/rủi ro đầy đủ (đọc kèm).
- CLAUDE.md §7 + plan §10 nhắc `qa-exploration/backend-migration-plan.md` (chi
  tiết per-table cột/index) nhưng **file này hiện KHÔNG tồn tại trong repo**.
  → Khi làm schema, tự dựng lại tài liệu per-table từ `src/types/index.ts`
  (nguồn sự thật) và ghi vào `docs/` cho người sau.
- Câu hỏi nghiệp vụ/nhập nhằng → hỏi chủ dự án; đừng tự quyết các lựa chọn ảnh
  hưởng tiền/quyền.
