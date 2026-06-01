# Implementation Plan: Checkpoint Readiness Phase 1

## Overview

Kế hoạch này chuyển Thiết kế thành các bước code nhỏ, tăng dần theo độ rủi ro: **i18n/nhãn → điều hướng/footer → nội dung tĩnh About/Đối tác → phân tách vai trò landing → cam kết đăng ký → khảo sát mock → BMC/mô hình kinh doanh**, kết thúc bằng một bước xác minh chạy lại toàn bộ baseline.

Nguyên tắc xuyên suốt (BẮT BUỘC):

- **Baseline_Xanh phải giữ nguyên**: `eslint` pass, `tsc` pass, `vitest` 544 test pass, `next build` 28 route pass (mốc d10dff8). Mỗi task có mục "Kiểm tra sau" để chạy lại phần liên quan trước khi sang task kế.
- **Không tự commit**: kế hoạch chỉ tạo/sửa file trong workspace; việc commit do người dùng chủ động thực hiện sau khi review.
- **Chỉ MOCK/STATIC**: không backend, không thanh toán/định danh thật, không sửa cơ chế auth thật (R12.6).
- **Dữ liệu mới tách biệt khỏi `Snapshot`**: không thêm khóa vào `STORAGE_KEYS`, **không** bump `SCHEMA_VERSION`, không sửa `seedSnapshot`/`loadAll`/`persistAll`/`exportSnapshot`/`importSnapshot`.
- **Next.js 16 + React 19**: theo `AGENTS.md`, trước khi viết code route mới phải đọc tài liệu trong `node_modules/next/dist/docs/` (ranh giới Server/Client, `useSearchParams` cần bọc `Suspense`, `metadata` cho route tĩnh). Không suy đoán API.

### ⚠️ Danh sách file TUYỆT ĐỐI KHÔNG được sửa (nhắc lại để thực thi — R12.1/R12.2/R12.5)

- Domain lõi: `src/domain/escrow.ts`, `deposit.ts`, `reputation.ts`, `shiftLifecycleState.ts`, `lifecycleSync.ts`, `timeGates.ts`.
- Logic store lõi: `src/stores/applicationStore.ts`, `shiftStore.ts`, `walletStore.ts`, `adminStore.ts` (kể cả thay đổi chất lượng mã: đổi tên, tách hàm, thêm chú thích).
- Hạ tầng lưu trữ: `src/data/persistence.ts` (không đụng `STORAGE_KEYS`/`SCHEMA_VERSION`), `src/data/seed/*` (không reseed).
- Toàn bộ test hiện có: `src/__tests__/*` và `e2e/*` (không sửa). Chỉ **thêm** file test mới `checkpointReadinessPhase1*`.
- `src/stores/index.ts` chỉ được **thêm dòng `export`** (bổ sung), không sửa export hiện có.

## Tasks

- [x] 1. i18n — Audit chuỗi rủi ro, ngôn từ thanh toán mềm và nhãn điều hướng
  - [x] 1.1 Audit các test/e2e đang assert chuỗi "đặt cọc" trước khi đổi value
    - **Mục tiêu:** Lập danh sách chuỗi nội bộ KHÔNG được đổi value để tránh gãy baseline.
    - **File chạm:** chỉ đọc — `e2e/20-core-stability-6.spec.ts`, `e2e/21-core-stability-7.spec.ts`, quét `src/__tests__/*` và `e2e/*` tìm "đặt cọc"/"cọc"/"VNĐ"/"₫".
    - **Phát hiện đã biết:** e2e 20/21 assert chuỗi ví/lỗi `"Số dư ví không đủ để đặt cọc"` (và biến thể "...Vui lòng nạp thêm tiền."). Đây là **thông điệp lỗi ví nội bộ**, NẰM NGOÀI phạm vi "nhãn marketing" của R4 → **không được đổi value**.
    - **Rủi ro:** Đổi nhầm value của chuỗi mà e2e/unit đang assert → vỡ baseline. Kết quả audit phải tạo whitelist các key/chuỗi cấm-đổi để task 1.2 tránh.
    - **Kiểm tra sau:** không cần build; xác nhận danh sách whitelist đầy đủ (rg "đặt cọc|cọc|VNĐ|₫" trên `e2e/` và `src/__tests__/`).
    - _Requirements: 4.2, 4.3, 12.5_

  - [x] 1.2 Đổi VALUE ngôn từ thanh toán mềm trong `vi.ts` (giữ nguyên mọi KEY)
    - **Mục tiêu:** Áp nhóm Đảm_Bảo_Thanh_Toán cho các nhãn "cọc/đặt cọc" hiển thị cho người dùng theo bảng ánh xạ R4 trong design.
    - **File chạm:** `src/i18n/vi.ts` (chỉ đổi value các key như `btn.deposit`, `escrow.*`, `shift.lifecycle.PendingDeposit`, `shifts.deposit.*`, `shifts.detail.depositStatus`, `employer.dashboard.stats.totalDeposited`, `employer.payments.*`, `landing.trust.*`, `landing.howItWorks.employer.step2`, `landing.safety.deposit.*`, `landing.finalCta.subtitle`, `auth.side.benefit*`).
    - **Rủi ro:** (1) Đổi nhầm KEY (chỉ được đổi value); (2) đổi value trùng chuỗi trong whitelist 1.1; (3) còn sót "VNĐ"/"₫" → vi phạm R4.4. Giữ nguyên định danh nội bộ `deposit`/`escrow`.
    - **Kiểm tra sau:** `npx tsc --noEmit`, `npx eslint src/i18n/vi.ts`, `npx vitest run` (toàn bộ — bảo đảm không unit test nào assert value cũ), và rg đảm bảo không còn "VNĐ"/"₫" ngoài whitelist.
    - _Requirements: 4.1, 4.2, 4.4, 4.5, 4.6_

  - [x] 1.3 Thêm key nhãn điều hướng mới `nav.label.safety` và `nav.label.userGuide`
    - **Mục tiêu:** Tạo nguồn nhãn dùng chung cho `/safety` ("An toàn & bảo vệ") và `/user-guide` ("Hướng dẫn sử dụng") để NavBar/MobileNav/Footer đọc cùng key (R3.6).
    - **File chạm:** `src/i18n/vi.ts` (chỉ THÊM key mới, không xoá key cũ).
    - **Rủi ro:** Trùng key sẵn có; chưa xoá nhãn cũ nhưng không ảnh hưởng vì task 2 sẽ trỏ component sang key mới. Không đổi `href`.
    - **Kiểm tra sau:** `npx tsc --noEmit`, `npx eslint src/i18n/vi.ts`.
    - _Requirements: 3.3, 3.4, 3.6_

  - [ ]* 1.4 Viết unit test i18n lint cho ngôn từ thanh toán và nhãn nav
    - **File chạm:** `src/__tests__/checkpointReadinessPhase1I18n.test.ts` (mới).
    - **Mục tiêu:** (a) các nhãn marketing không chứa cụm cấm "tiền cọc/đặt cọc/cọc ca" (whitelist cho thông điệp nội bộ từ task 1.1); (b) không value nào dùng "VNĐ"/"₫"; (c) `nav.label.safety`/`nav.label.userGuide` trả nhãn mới.
    - **Rủi ro:** Test quá chặt làm gãy baseline → phải dùng whitelist key nội bộ.
    - **Kiểm tra sau:** `npx vitest run checkpointReadinessPhase1I18n`.
    - _Requirements: 4.1, 4.4, 3.3, 3.4_

- [ ] 2. Điều hướng & Footer — sắp xếp lại nhãn (chỉ hiển thị)
  - [x] 2.1 Bỏ mục "Hỗ trợ" khỏi NavBar và trỏ nhãn safety/user-guide sang i18n key
    - **Mục tiêu:** Gỡ "Hỗ trợ" khỏi mọi biến thể nav (Public/Worker/Employer/Admin) và đọc `nav.label.safety`/`nav.label.userGuide` thay vì hardcode (R3.1/R3.3/R3.4/R3.6).
    - **File chạm:** `src/components/layout/NavBar.tsx`.
    - **Rủi ro:** Đổi/xoá `href` (cấm — R3.5); e2e điều hướng (vd `e2e/16`, `e2e/18`) có thể phụ thuộc cấu trúc nav → giữ nguyên route, chỉ gỡ mục Hỗ trợ và đổi văn bản nhãn.
    - **Kiểm tra sau:** `npx tsc --noEmit`, `npx eslint src/components/layout/NavBar.tsx`, `npx vitest run`.
    - _Requirements: 3.1, 3.3, 3.4, 3.5, 3.6_

  - [x] 2.2 Đồng bộ nhãn safety/user-guide trong MobileNav
    - **Mục tiêu:** MobileNav đọc cùng `nav.label.*`; "Liên hệ hỗ trợ" vẫn nằm ở footer của drawer (không phải NavBar).
    - **File chạm:** `src/components/layout/MobileNav.tsx`.
    - **Rủi ro:** Không đổi `href`; giữ "Liên hệ hỗ trợ" ở drawer footer (nếu gỡ nhầm sẽ lệch R3.2 tinh thần). Đồng nhất nhãn với NavBar (R3.6).
    - **Kiểm tra sau:** `npx tsc --noEmit`, `npx eslint src/components/layout/MobileNav.tsx`, `npx vitest run`.
    - _Requirements: 3.5, 3.6_

  - [ ] 2.3 Giữ "Hỗ trợ" ở Footer, thêm "Góp ý / Khảo sát" và đồng bộ nhãn
    - **⚠️ PARTIAL (chưa tick):** Đã xong phần Footer giữ "Hỗ trợ" (`/support` — R3.2), có "Giới thiệu" (`/about`), và đồng bộ nhãn `/safety`/`/user-guide` qua `nav.label.*`. **CÒN THIẾU:** liên kết "Góp ý / Khảo sát" trỏ `/khao-sat` chưa được thêm (route `/khao-sat` cũng chưa tồn tại — phụ thuộc Task 8). Hoàn tất khi thêm link này.
    - **Mục tiêu:** Footer giữ liên kết "Hỗ trợ" (`/support` — R3.2), thêm liên kết "Góp ý / Khảo sát" trỏ `/khao-sat`, bảo đảm "Giới thiệu" (`/about`) hiện diện, đổi nhãn `/safety`,`/user-guide` qua cùng key.
    - **File chạm:** `src/components/layout/Footer.tsx`.
    - **Rủi ro:** Link `/khao-sat` chưa tồn tại tới task 6 → tạm chấp nhận link tới route sẽ có; bảo đảm không đổi `href` hiện có. Lưu ý `next build` của bước này không phụ thuộc route khảo sát (link tĩnh).
    - **Kiểm tra sau:** `npx tsc --noEmit`, `npx eslint src/components/layout/Footer.tsx`, `npx vitest run`.
    - _Requirements: 3.2, 3.5, 3.6_

  - [ ]* 2.4 Viết unit test render NavBar/Footer
    - **File chạm:** `src/__tests__/checkpointReadinessPhase1Nav.test.tsx` (mới).
    - **Mục tiêu:** NavBar khách không có "Hỗ trợ" (R3.1); Footer có "Hỗ trợ" (R3.2) và link `/khao-sat`; ba nơi dùng cùng nhãn cho `/safety`,`/user-guide` (R3.6).
    - **Rủi ro:** Render phụ thuộc provider/store → mock tối thiểu, tái dùng pattern test hiện có.
    - **Kiểm tra sau:** `npx vitest run checkpointReadinessPhase1Nav`.
    - _Requirements: 3.1, 3.2, 3.6_

- [ ] 3. Checkpoint — Bảo đảm baseline còn xanh sau thay đổi nhãn
  - Chạy lại `npx tsc --noEmit`, `npx eslint .`, `npx vitest run`. Ensure all tests pass, ask the user if questions arise.

- [x] 4. Nội dung tĩnh — About (tầm nhìn/sứ mệnh/giá trị/đội ngũ) + Đối tác
    - **Ghi chú:** Các subtask lõi (4.1, 4.2, 4.4) đã xong; 4.3* (P7) đã viết. Chỉ còn 4.5* (render test) chưa làm — task `*` là tùy chọn, không chặn parent (theo Notes). Tick parent.
  - [x] 4.1 Thêm key nội dung About và Đối tác vào i18n
    - **✅ Đã làm:** Đưa toàn bộ copy About + Partners vào `src/i18n/vi.ts` (nhóm key `about.*` và `about.partners.*`): vision/mission/values/trust/team/version + partner intro/badge/empty/group names. `/about` và `PartnersSection` đọc qua `t()`, không còn hardcode copy. Wording mềm ("hướng tới/được xây dựng để/mong muốn"), không claim mạnh (R5.2/R5.3); partner intro nêu rõ chưa có đối tác chính thức, mọi nhóm gắn badge định hướng (R6.2). `labelForPartner` giữ thuần, trả về i18n KEY badge (resolve bằng `t()` ở component).
    - **Mục tiêu:** Khai báo `about.vision.*`, `about.mission.*`, `about.values.*`, `about.team.*` (ngôn từ mềm — R5.2/R5.3) và `about.partners.*` kèm nhãn "tiềm năng / định hướng" (R6).
    - **File chạm:** `src/i18n/vi.ts` (thêm key mới).
    - **Rủi ro:** Tuyên bố mạnh chưa kiểm chứng (R5.3); thiếu nhãn "tiềm năng/định hướng" cho đối tác (R6.2). Dùng "hướng tới/mong muốn/được xây dựng để".
    - **Kiểm tra sau:** `npx tsc --noEmit`, `npx eslint src/i18n/vi.ts`.
    - _Requirements: 5.1, 5.2, 5.3, 6.1, 6.2_

  - [x] 4.2 Tạo hàm thuần và dữ liệu nhãn đối tác (`labelForPartner`)
    - **✅ Đã làm:** Tạo `src/components/about/partners.ts` (đặt cạnh About thay vì `components/landing/` — design cho phép "hoặc module nhỏ cạnh About"). Export `Partner`, `PartnerStatus`, `PARTNER_GROUPS` (7 nhóm R6.1, tất cả `potential`), `DIRECTIONAL_PARTNER_LABEL`, và hàm thuần `labelForPartner`.
    - **Mục tiêu:** Hàm thuần gắn nhãn "tiềm năng / định hướng" cho `status: 'potential'` và KHÔNG gắn cho `'established'`; kèm danh sách nhóm đối tác R6.1.
    - **File chạm:** `src/components/landing/PartnersSection.tsx` (mới — chứa data + `labelForPartner` export) hoặc module nhỏ cạnh About.
    - **Rủi ro:** Logic nhãn sai (gắn nhầm cho established) vi phạm R6.3. Tách hàm thuần để test P7.
    - **Kiểm tra sau:** `npx tsc --noEmit`, `npx eslint <file>`.
    - _Requirements: 6.2, 6.3, 6.4_

  - [x]* 4.3 Viết property test P7 — gắn nhãn đối tác
    - **✅ Đã làm:** `src/__tests__/checkpointReadinessPhase1Partners.test.ts` — 3 test (P7 single + list, ≥100 vòng, + structural check `PARTNER_GROUPS` toàn `potential`). Pass.
    - **File chạm:** `src/__tests__/checkpointReadinessPhase1Partners.test.ts` (mới).
    - **Property 7: Mọi đối tác tiềm năng đều được gắn nhãn định hướng**
    - **Validates: Requirements 6.2, 6.3, 6.4**
    - fast-check ≥100 vòng, tag `// Feature: checkpoint-readiness-phase-1, Property 7`. Generator danh sách `{name, status}`.
    - **Kiểm tra sau:** `npx vitest run checkpointReadinessPhase1Partners`.
    - _Requirements: 6.2, 6.3, 6.4_

  - [x] 4.4 Mở rộng trang About với các InfoSection + PartnersSection
    - **✅ Đã làm:** `src/app/about/page.tsx` thêm các InfoSection "Tầm nhìn", "Sứ mệnh", "Giá trị cốt lõi", "Đội ngũ sáng lập" + `<PartnersSection />`; giữ nguyên các section cũ. Tạo `src/components/about/PartnersSection.tsx` (đặt ở `components/about/` thay vì `components/landing/`), map từng đối tác độc lập + fallback "Nội dung đang được cập nhật.". Tái dùng `InfoPage`/`InfoSection`/`InfoList`, không redesign.
    - **Mục tiêu:** Render Tầm nhìn/Sứ mệnh/Giá trị/Đội ngũ + section Đối tác, mỗi phần độc lập (render một phần khi lỗi — R5.5). Tái dùng `InfoPage`/`InfoSection`/`InfoList`.
    - **File chạm:** `src/app/about/page.tsx`, `src/components/landing/PartnersSection.tsx`.
    - **Rủi ro:** Một section lỗi kéo đổ trang (tránh `throw` ở nhánh render tĩnh — R5.5); thiết kế lại UI (cấm — R12.9, phải tái dùng primitive).
    - **Kiểm tra sau:** `npx tsc --noEmit`, `npx eslint src/app/about/page.tsx`, `npx vitest run`, `npx next build` (route `/about` vẫn build).
    - _Requirements: 5.1, 5.4, 5.5, 6.1, 6.2_

  - [ ]* 4.5 Viết unit test render About
    - **File chạm:** `src/__tests__/checkpointReadinessPhase1About.test.tsx` (mới).
    - **Mục tiêu:** Có đủ 4 phần + section đối tác có nhãn "tiềm năng/định hướng" (R5.1/R6.1). Test ví dụ/render, KHÔNG phải PBT.
    - **Kiểm tra sau:** `npx vitest run checkpointReadinessPhase1About`.
    - _Requirements: 5.1, 6.1_

- [ ] 5. Phân tách vai trò trên Trang chủ (landing)
  - [ ] 5.1 Tạo adapter `clientStorage` với chuỗi dự phòng
    - **Mục tiêu:** Adapter `get/set` với scope `session|local`, chọn backend localStorage → sessionStorage → in-memory qua thử-ghi-xoá trong `try/catch`; định nghĩa `CALE_PHASE1_KEYS`. Không gửi dữ liệu ra ngoài.
    - **File chạm:** `src/lib/clientStorage.ts` (mới).
    - **Rủi ro:** Đụng `persistence.ts`/`STORAGE_KEYS` (CẤM) — phải hoàn toàn tách biệt; import `fetch`/network (cấm — R12.7). An toàn SSR (chỉ truy cập storage khi ở client).
    - **Kiểm tra sau:** `npx tsc --noEmit`, `npx eslint src/lib/clientStorage.ts`.
    - _Requirements: 12.7, 12.8_

  - [ ]* 5.2 Viết property test P8 — round-trip `clientStorage` qua mọi backend
    - **File chạm:** `src/__tests__/checkpointReadinessPhase1ClientStorage.test.ts` (mới).
    - **Property 8: Round-trip lưu trữ phía trình duyệt bền với mọi backend dự phòng**
    - **Validates: Requirements 12.8**
    - fast-check ≥100 vòng, tag `// Feature: checkpoint-readiness-phase-1, Property 8`. Mô phỏng localStorage ném lỗi để ép fallback; assert không có lời gọi mạng.
    - **Kiểm tra sau:** `npx vitest run checkpointReadinessPhase1ClientStorage`.
    - _Requirements: 12.8_

  - [ ] 5.3 Tạo `roleSelectionStore` (persist scope session)
    - **Mục tiêu:** Zustand store `selectedRole`, `select`, `clear`, `hydrate`; persist qua `clientStorage` scope `session`; export bổ sung trong `src/stores/index.ts`.
    - **File chạm:** `src/stores/roleSelectionStore.ts` (mới), `src/stores/index.ts` (CHỈ thêm dòng export).
    - **Rủi ro:** Sửa export hiện có của `index.ts` (chỉ được thêm); mirror đúng pattern store hiện có.
    - **Kiểm tra sau:** `npx tsc --noEmit`, `npx eslint src/stores/roleSelectionStore.ts src/stores/index.ts`, `npx vitest run`.
    - _Requirements: 1.4, 1.5, 1.9_

  - [ ]* 5.4 Viết property test P1 — round-trip lựa chọn vai trò
    - **File chạm:** `src/__tests__/checkpointReadinessPhase1Role.test.ts` (mới).
    - **Property 1: Round-trip lựa chọn vai trò**
    - **Validates: Requirements 1.4, 1.5, 1.9**
    - fast-check ≥100 vòng, tag `// Feature: checkpoint-readiness-phase-1, Property 1`. Generator `fc.constantFrom('worker','employer')`.
    - **Kiểm tra sau:** `npx vitest run checkpointReadinessPhase1Role`.
    - _Requirements: 1.4, 1.5, 1.9_

  - [ ] 5.5 Tạo hàm thuần `contentForRole` + key nội dung vai trò/industry
    - **Mục tiêu:** `contentForRole(role)` trả lợi ích + 3 bước + CTA chỉ của `role`, disjoint với vai trò kia, `null` → trung lập (R1.6/R1.8). Thêm key `landing.role.*`, `landing.roleSwitcher.*`, `landing.industry.*` (worker xưng "bạn"; employer gọi "người làm", không "bạn").
    - **File chạm:** `src/i18n/vi.ts` (thêm key), `src/components/landing/roleContent.ts` (mới — hàm thuần).
    - **Rủi ro:** Nội dung hai vai trò không disjoint (R1.8/R2); sai xưng hô (R2.3–R2.6). Bước employer step2 dùng "Đảm bảo thanh toán" (đồng bộ R4).
    - **Kiểm tra sau:** `npx tsc --noEmit`, `npx eslint <files>`.
    - _Requirements: 1.2, 1.3, 1.6, 1.8, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ]* 5.6 Viết property test P2 — nội dung khớp đúng vai trò
    - **File chạm:** `src/__tests__/checkpointReadinessPhase1RoleContent.test.ts` (mới).
    - **Property 2: Nội dung hiển thị khớp đúng vai trò đang chọn**
    - **Validates: Requirements 1.2, 1.3, 1.6, 1.8**
    - fast-check ≥100 vòng, tag `// Feature: checkpoint-readiness-phase-1, Property 2`. Generator role + `null`; assert giao rỗng giữa hai vai trò.
    - **Kiểm tra sau:** `npx vitest run checkpointReadinessPhase1RoleContent`.
    - _Requirements: 1.2, 1.3, 1.6, 1.8_

  - [ ] 5.7 Tạo `RoleSwitcher` và `RoleContent` (component theo vai trò)
    - **Mục tiêu:** `RoleSwitcher` hai lựa chọn (R1.1) gọi `select(role)`; `RoleContent` render khối lợi ích + 3 bước + CTA `/khao-sat?role=...` dựa trên `contentForRole`. Tái dùng `Card`/`InfoStep` (R2.7).
    - **File chạm:** `src/components/landing/RoleSwitcher.tsx`, `src/components/landing/RoleContent.tsx` (mới).
    - **Rủi ro:** Thiết kế lại UI (cấm); render đồng thời cả hai vai trò (vi phạm R1.8).
    - **Kiểm tra sau:** `npx tsc --noEmit`, `npx eslint <files>`, `npx vitest run`.
    - _Requirements: 1.1, 1.2, 1.3, 1.7, 2.7_

  - [ ] 5.8 Tạo `IndustryFocus` (định hướng ngành)
    - **Mục tiêu:** Khối liệt kê 6 ngành trọng tâm (R11.1), thể hiện sự tập trung (R11.2), map từng mục độc lập (render một phần — R11.3).
    - **File chạm:** `src/components/landing/IndustryFocus.tsx` (mới); dùng key `landing.industry.*` (từ 5.5).
    - **Rủi ro:** Trình bày như "phục vụ mọi ngành" (vi phạm R11.2); một mục lỗi kéo đổ khối (R11.3).
    - **Kiểm tra sau:** `npx tsc --noEmit`, `npx eslint src/components/landing/IndustryFocus.tsx`, `npx vitest run`.
    - _Requirements: 11.1, 11.2, 11.3_

  - [ ] 5.9 Tạo client island `LandingRoleExperience` và ghép vào trang chủ
    - **Mục tiêu:** Island điều phối vai trò (đọc `roleSelectionStore`, hydrate trong `useEffect`, trạng thái trung lập khi `null`, đổi vai trò không tải lại — R1.6/R1.7/R1.9); ghép vào `page.tsx` cùng `IndustryFocus`, giữ Hero. An toàn hydration (render đầu trung lập).
    - **File chạm:** `src/components/landing/LandingRoleExperience.tsx` (mới), `src/app/page.tsx` (sửa).
    - **Rủi ro:** Hydration mismatch SSR; bỏ/đổi route `/`; hiển thị đồng thời cả hai vai trò. Không sửa `AppHydrator`/`persistence`.
    - **Kiểm tra sau:** `npx tsc --noEmit`, `npx eslint <files>`, `npx vitest run`, `npx next build` (route `/` build xanh).
    - _Requirements: 1.1, 1.5, 1.6, 1.7, 1.8, 1.9, 2.1, 2.2, 11.1_

- [ ] 6. Checkpoint — Baseline + build sau landing
  - Chạy `npx tsc --noEmit`, `npx eslint .`, `npx vitest run`, `npx next build`. Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Cam kết điều khoản khi đăng ký (gating frontend)
  - [ ] 7.1 Thêm key cam kết và tách hàm thuần `validateRegister`
    - **Mục tiêu:** Thêm `register.commitment.label`/`register.commitment.error`; tách/định nghĩa `validateRegister(values)` (gồm `agreedToTerms`) trả map lỗi — không có lỗi ⇔ `agreedToTerms === true` và mọi trường bắt buộc hợp lệ.
    - **File chạm:** `src/i18n/vi.ts` (thêm key), `src/app/register/page.tsx` (hàm thuần trong file trang) — **không đụng `authStore`**.
    - **Rủi ro:** Đổi hành vi luồng `register(...)` hiện có (R7.5 — chỉ được THÊM bước kiểm tra cam kết); sửa `authStore` (cấm).
    - **Kiểm tra sau:** `npx tsc --noEmit`, `npx eslint src/app/register/page.tsx`.
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ]* 7.2 Viết property test P3 — gating cam kết đăng ký
    - **File chạm:** `src/__tests__/checkpointReadinessPhase1Register.test.ts` (mới).
    - **Property 3: Chặn đăng ký khi chưa cam kết điều khoản**
    - **Validates: Requirements 7.3, 7.4**
    - fast-check ≥100 vòng, tag `// Feature: checkpoint-readiness-phase-1, Property 3`. Generator form ngẫu nhiên + `agreedToTerms` boolean.
    - **Kiểm tra sau:** `npx vitest run checkpointReadinessPhase1Register`.
    - _Requirements: 7.3, 7.4_

  - [ ] 7.3 Thêm checkbox cam kết + liên kết vào RegisterForm và nối gating
    - **Mục tiêu:** Render checkbox bắt buộc + liên kết `/terms`,`/privacy`,`/safety` (R7.1/R7.2); mở rộng `FormValues`/`FormErrors` với `agreedToTerms`; chặn submit khi chưa tích (R7.3), tích hợp `validateRegister`.
    - **File chạm:** `src/app/register/page.tsx`.
    - **Rủi ro:** Phá `useSearchParams`/`Suspense` hiện có của trang; đổi thông điệp lỗi các trường khác; thay đổi luồng `register(...)` khi hợp lệ (R7.4/R7.5).
    - **Kiểm tra sau:** `npx tsc --noEmit`, `npx eslint src/app/register/page.tsx`, `npx vitest run`, `npx next build` (route `/register`).
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 8. Khảo sát mock (clientStorage → store → route → forms)
  - [ ] 8.1 Định nghĩa kiểu dữ liệu khảo sát + hàm validate thuần
    - **Mục tiêu:** Khai báo `WorkerSurveyResponse`/`EmployerSurveyResponse`/`SurveyReferral` và hàm thuần `validateWorker`/`validateEmployer` (bắt buộc ≥1 + gating consent PII `=== true`). Thêm key `survey.worker.*`/`survey.employer.*`.
    - **File chạm:** `src/stores/surveyStore.ts` (mới — kiểu + validate, hoặc tách `src/stores/surveyValidation.ts`), `src/i18n/vi.ts` (thêm key). Kiểu additive, không sửa kiểu hiện có.
    - **Rủi ro:** Consent kiểm "hiện diện ô" thay vì giá trị `=== true` (vi phạm R9.4). Lỗi trả dạng map `field → messageKey`.
    - **Kiểm tra sau:** `npx tsc --noEmit`, `npx eslint <files>`.
    - _Requirements: 8.1, 8.3, 9.1, 9.3, 9.4_

  - [ ]* 8.2 Viết property test P5 — khảo sát thiếu trường bị từ chối
    - **File chạm:** `src/__tests__/checkpointReadinessPhase1SurveyValidation.test.ts` (mới).
    - **Property 5: Khảo sát không hợp lệ bị từ chối và không được lưu**
    - **Validates: Requirements 8.3, 9.3, 9.6**
    - fast-check ≥100 vòng, tag `// Feature: checkpoint-readiness-phase-1, Property 5`. Generator phản hồi có ≥1 trường rỗng; assert có lỗi đúng trường + không tạo trạng thái thành công.
    - **Kiểm tra sau:** `npx vitest run checkpointReadinessPhase1SurveyValidation`.
    - _Requirements: 8.3, 9.3, 9.6_

  - [ ]* 8.3 Viết property test P6 — consent PII bên thứ ba
    - **File chạm:** `src/__tests__/checkpointReadinessPhase1SurveyConsent.test.ts` (mới).
    - **Property 6: PII bên thứ ba bắt buộc đồng ý thực sự**
    - **Validates: Requirements 9.4**
    - fast-check ≥100 vòng, tag `// Feature: checkpoint-readiness-phase-1, Property 6`. Generator có/không `contactName/Phone` × `consentToShare` boolean.
    - **Kiểm tra sau:** `npx vitest run checkpointReadinessPhase1SurveyConsent`.
    - _Requirements: 9.4_

  - [ ] 8.4 Tạo `surveyStore` (submit + persist scope local)
    - **Mục tiêu:** Store giữ `workerResponses`/`employerResponses`; `submitWorker`/`submitEmployer` trả `Result<Response, SurveyError>` (gọi validate thuần, sinh id `newPrefixedId`, persist qua `clientStorage` scope `local`), `hydrate`. Export bổ sung `src/stores/index.ts`.
    - **File chạm:** `src/stores/surveyStore.ts`, `src/stores/index.ts` (CHỈ thêm export).
    - **Rủi ro:** Đụng `persistence.ts`/`STORAGE_KEYS` (cấm — dùng `CALE_PHASE1_KEYS`); ghi bản ghi khi invalid (R8.3/R9.6); import network (R8.5/R9.7).
    - **Kiểm tra sau:** `npx tsc --noEmit`, `npx eslint src/stores/surveyStore.ts src/stores/index.ts`, `npx vitest run`.
    - _Requirements: 8.2, 9.2, 8.5, 9.7_

  - [ ]* 8.5 Viết property test P4 — round-trip lưu khảo sát
    - **File chạm:** `src/__tests__/checkpointReadinessPhase1SurveyStorage.test.ts` (mới).
    - **Property 4: Round-trip lưu khảo sát bảo toàn dữ liệu**
    - **Validates: Requirements 8.2, 9.2**
    - fast-check ≥100 vòng, tag `// Feature: checkpoint-readiness-phase-1, Property 4`. Generator phản hồi hợp lệ worker/employer; submit → đọc lại trùng khớp.
    - **Kiểm tra sau:** `npx vitest run checkpointReadinessPhase1SurveyStorage`.
    - _Requirements: 8.2, 9.2_

  - [ ] 8.6 Tạo form khảo sát + panel xác nhận
    - **Mục tiêu:** `WorkerSurveyForm`/`EmployerSurveyForm` dùng `Input`/`Select`/`Textarea`/`Button`+checkbox, hiển thị lỗi từng trường, gọi `submit*`; `SurveySuccess` chỉ render khi `{ ok: true }` (R8.4/R9.5/R9.6).
    - **File chạm:** `src/components/survey/WorkerSurveyForm.tsx`, `EmployerSurveyForm.tsx`, `SurveySuccess.tsx` (mới).
    - **Rủi ro:** Hiển thị xác nhận khi submit bị chặn (R9.6); thiếu câu hỏi bắt buộc (R8.1/R9.1); thiết kế lại UI (tái dùng primitive — R12.9).
    - **Kiểm tra sau:** `npx tsc --noEmit`, `npx eslint <files>`, `npx vitest run`.
    - _Requirements: 8.1, 8.4, 9.1, 9.5, 9.6_

  - [ ] 8.7 Tạo route `/khao-sat` với toggle vai trò
    - **Mục tiêu:** Route client, đọc `?role=` (mặc định theo `roleSelectionStore`), render đúng form; hydrate role trong `useEffect`. `useSearchParams` bọc `Suspense` (như `register/page.tsx`).
    - **File chạm:** `src/app/khao-sat/page.tsx` (mới).
    - **Rủi ro:** Thiếu `Suspense` quanh `useSearchParams` làm gãy `next build` (Next 16); SSR truy cập storage. Đọc `node_modules/next/dist/docs/` trước.
    - **Kiểm tra sau:** `npx tsc --noEmit`, `npx eslint src/app/khao-sat/page.tsx`, `npx vitest run`, `npx next build` (route `/khao-sat` mới).
    - _Requirements: 8.1, 9.1, 12.3, 12.4_

  - [ ]* 8.8 Viết unit test render khảo sát
    - **File chạm:** `src/__tests__/checkpointReadinessPhase1SurveyForm.test.tsx` (mới).
    - **Mục tiêu:** Render `/khao-sat` worker/employer đủ trường câu hỏi (R8.1/R9.1); submit hợp lệ → panel xác nhận (R8.4/R9.5). Test ví dụ/render, KHÔNG phải PBT.
    - **Kiểm tra sau:** `npx vitest run checkpointReadinessPhase1SurveyForm`.
    - _Requirements: 8.1, 8.4, 9.1, 9.5_

- [ ] 9. Checkpoint — Baseline + build sau đăng ký & khảo sát
  - Chạy `npx tsc --noEmit`, `npx eslint .`, `npx vitest run`, `npx next build`. Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Business Model Canvas / mô hình kinh doanh (trang tĩnh)
  - [ ] 10.1 Thêm key BMC 9 khối + điểm khác biệt vào i18n
    - **Mục tiêu:** `bmc.block.*` (9 khối: Value Propositions, Customer Segments, Customer Relationships, Channels, Key Activities, Key Resources, Key Partners, Cost Structure, Revenue Streams) và `bmc.diff.*` (khác biệt vs Facebook/Zalo/Manpower/Beetask + các yếu tố R10.3).
    - **File chạm:** `src/i18n/vi.ts` (thêm key).
    - **Rủi ro:** Thiếu/đặt sai 1 trong 9 khối (R10.1) hoặc thiếu yếu tố khác biệt (R10.3).
    - **Kiểm tra sau:** `npx tsc --noEmit`, `npx eslint src/i18n/vi.ts`.
    - _Requirements: 10.1, 10.2, 10.3_

  - [ ] 10.2 Tạo route tĩnh `/mo-hinh-kinh-doanh`
    - **Mục tiêu:** Server Component dùng `InfoPage` + 9 `InfoSection` cho 9 khối BMC + section điểm khác biệt; mỗi khối map độc lập (render một phần — R10.5). Khai báo `metadata`.
    - **File chạm:** `src/app/mo-hinh-kinh-doanh/page.tsx` (mới).
    - **Rủi ro:** Làm hỏng `next build` khi thêm route (R10.4/R12.4); một khối lỗi kéo đổ trang (R10.5 — tránh `throw`). Tái dùng primitive (R12.9).
    - **Kiểm tra sau:** `npx tsc --noEmit`, `npx eslint src/app/mo-hinh-kinh-doanh/page.tsx`, `npx vitest run`, `npx next build` (route mới build xanh).
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ]* 10.3 Viết unit test render BMC
    - **File chạm:** `src/__tests__/checkpointReadinessPhase1Bmc.test.tsx` (mới).
    - **Mục tiêu:** Trang có đủ 9 khối BMC + điểm khác biệt (R10.1/R10.2/R10.3). Test ví dụ/render, KHÔNG phải PBT.
    - **Kiểm tra sau:** `npx vitest run checkpointReadinessPhase1Bmc`.
    - _Requirements: 10.1, 10.2, 10.3_

- [ ] 11. Xác minh cuối — chạy lại toàn bộ baseline & xác nhận route
  - **Mục tiêu:** Bảo đảm không hồi quy: `npx eslint .` pass, `npx tsc --noEmit` pass, `npx vitest run` pass (≥544 test cũ + test Phase 1 mới đều xanh), `npx next build` pass và liệt kê **≥28 route** (28 cũ + `/khao-sat` + `/mo-hinh-kinh-doanh`).
  - **File chạm:** không sửa code ứng dụng; chỉ chạy lệnh và sửa lỗi phát sinh trong phạm vi file Phase 1 nếu có.
  - **Rủi ro:** Nếu một test cũ đỏ → KHÔNG sửa test cũ; truy nguyên thay đổi Phase 1 gây hồi quy và sửa ở phía file Phase 1.
  - **Kiểm tra sau:** `npx eslint .`, `npx tsc --noEmit`, `npx vitest run`, `npx next build` (xác nhận số route ≥ 28 cũ + 2 mới).
  - _Requirements: 12.1, 12.3, 12.4, 12.5_

## Notes

- Task gắn `*` là **tùy chọn** (test) và có thể bỏ qua khi cần MVP nhanh; task lõi không bao giờ gắn `*`.
- Thiết kế dùng TypeScript/React (Next.js 16) — không cần chọn ngôn ngữ; pseudocode không áp dụng.
- 8 property test dùng `fast-check` ≥100 vòng, mỗi test gắn `// Feature: checkpoint-readiness-phase-1, Property N`. Nội dung tĩnh (About, BMC, nhãn nav, ngôn từ thanh toán, industry) chỉ test ví dụ/render — KHÔNG dùng PBT.
- Mỗi task tham chiếu requirement cụ thể để truy vết; checkpoint bảo đảm xác minh tăng dần.
- **Không commit tự động**: review thủ công rồi mới commit.

## Task Dependency Graph

> Lưu ý lập lịch: nhiều task cùng ghi `src/i18n/vi.ts` (1.2, 1.3, 4.1, 5.5, 7.1, 8.1, 10.1) nên được xếp ở các wave KHÁC nhau để tránh xung đột ghi đồng thời. Tương tự cho `src/stores/index.ts` (5.3, 8.4), `PartnersSection.tsx` (4.2, 4.4), `src/app/register/page.tsx` (7.1, 7.3), `src/stores/surveyStore.ts` (8.1, 8.4).

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.3"] },
    { "id": 3, "tasks": ["4.1", "1.4", "2.1", "2.2", "2.3", "4.2", "5.1"] },
    { "id": 4, "tasks": ["5.5", "2.4", "4.3", "4.4", "5.2", "5.3"] },
    { "id": 5, "tasks": ["7.1", "4.5", "5.4", "5.6", "5.7", "5.8"] },
    { "id": 6, "tasks": ["8.1", "7.2", "7.3", "5.9"] },
    { "id": 7, "tasks": ["10.1", "8.2", "8.3", "8.4"] },
    { "id": 8, "tasks": ["10.2", "8.5", "8.6"] },
    { "id": 9, "tasks": ["10.3", "8.7"] },
    { "id": 10, "tasks": ["8.8"] },
    { "id": 11, "tasks": ["11"] }
  ]
}
```
