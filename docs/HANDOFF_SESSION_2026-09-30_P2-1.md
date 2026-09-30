# HANDOFF — Session 2026-09-30 (P2-1 cọc người lao động)

> Đọc kèm `CLAUDE.md`, `docs/HANDOFF_SESSION_2026-09-30_WEB.md` (phần trước cùng
> ngày) và `docs/HANDOFF_SESSION_2026-09-28_FEEDBACK.md` (mục 3 P2-1 + mục 5 câu 4).

## 0. Trạng thái
- Nhánh `feat/p2-1-worker-deposit` (tách từ `main` = `b9d11f4`). Chưa merge.
- Migration **`20260930000028_worker_deposit.sql` CHƯA `db push`**. Cờ
  `require_worker_deposit` mặc định **TẮT** → push xong mọi luồng cũ chạy y hệt.
- `npx supabase migration list` (30/09): 0001–0027 đủ cả 2 cột; 0028 chỉ có local.
- Gate: tsc 0 · lint 0 lỗi (7 cảnh báo có sẵn) · `test:run` 876/876 · `test:time`
  22/22 · build OK (33 trang) · e2e 136/136 (chạy trên bản sao, xem mục 5).
- **Chạy thử trên DB thật (transaction + rollback): 54/54 đạt.** Kiểm sau đó: không
  bảng / cột / hàm / tài khoản `dryrun-` nào còn lại.
- **security-reviewer 3 lượt:**
  - Lượt 1: 3 mục Trung bình (T1–T3) + 8 mục Thấp (L1–L8) → đã sửa hết.
  - Lượt 2: 2 mục Trung bình + 5 mục Thấp → đã sửa; mục nghiệp vụ "tự đánh vắng" do
    chủ dự án chốt (mục 1).
  - Lượt 3: không có mục Nghiêm trọng / Cao / Trung bình.

## 1. Quy tắc (chủ dự án chốt 29–30/09)
- **Mức cọc:** `min(round(tiền công ca × 50%), 100.000 đ)`. Giữ lúc **ứng tuyển**,
  trừ tiền mặt trong ví worker (túi thưởng không liên quan).
- **Miễn cọc:** đã duyệt CCCD, **hoặc** ≥5 đơn hoàn thành có giờ kết thúc ca trong 30
  ngày gần nhất.
- **Mất quyền miễn:** vắng mặt trong 30 ngày → **luôn** phải cọc, kể cả đã có CCCD /
  đủ ca. Lần vắng được admin xử có lợi cho worker thì không tính.
- **Hoàn đủ khi:** hoàn thành, bị từ chối, worker tự huỷ, NTD huỷ ca, hết hạn, hoặc
  ca đã bắt đầu mà đơn vẫn chờ duyệt. Dự phòng: sau hết ca + 7 ngày mà đơn chưa kết
  thúc → hoàn.
- **Vắng mặt:**
  - Hạn khiếu nại = `max(hết ca, lúc bị đánh vắng) + 72 giờ`.
  - Khiếu nại trong hạn → admin quyết (hoàn worker / chuyển NTD).
  - **NTD tự bấm "vắng mặt"** + hết hạn không khiếu nại → 100% vào ví **tiền mặt**
    NTD (rút được). CaLẻ không giữ phần nào.
  - **Hệ thống tự đánh vắng** (0019 lúc hết ca + 24h vì NTD không xác nhận gì) →
    **chờ admin**, không tự chuyển (`review_reason = 'AUTO_NO_SHOW'`).
- **Chống thông đồng (T2):**
  - Mỗi worker tối đa **3** khoản đang giữ / khiếu nại cùng lúc.
  - Mỗi NTD **tự** nhận tối đa **300.000 đ** cọc vắng mặt / 24 giờ; vượt → khoản chờ
    admin (`EMPLOYER_DAILY_CAP`).
  - Admin chỉnh cả hai ở tab Thống kê.
- **Worker được miễn cọc** bị đánh vắng oan vẫn khiếu nại được (không kèm tiền,
  bảng `no_show_contests`); admin chấp nhận → lần vắng đó không tính.

## 2. Server (0028)
- **Bảng mới:**
  - `worker_holds`:
    - trạng thái `Held → Refunded | Forfeited | Contested`;
    - các cột `review_reason`, `resolution`;
    - FK `on delete restrict`.
  - `no_show_contests`.
  - Cả hai bật RLS; worker chỉ đọc dòng của mình và các cột được cấp quyền (không
    `resolved_by`, không `employer_id`).
- **Cột mới trong `platform_settings`:** `require_worker_deposit`,
  `worker_deposit_ratio_pct`, `_max`, `_exempt_after`, `_window_days`, `_max_open`,
  `_forfeit_daily_cap`.
- **Tiền:** ví worker −X (`WorkerDepositHeld`); hoàn +X (`WorkerDepositRefund`);
  chuyển NTD +X (`EmployerNoShowCompensation`). Két không đổi. Unique index chặn ghi
  sổ trùng theo đơn.
- **`apply(shift)` KHÔNG BAO GIỜ trừ ví.** Cần cọc thì báo `WORKER_DEPOSIT_REQUIRED`.
- **Trừ ví chỉ qua `apply_with_deposit(shift, số worker đã đồng ý)`.** Các lỗi:
  - số thật lớn hơn số đã đồng ý → `WORKER_DEPOSIT_CHANGED`;
  - ví không đủ → `WORKER_DEPOSIT_INSUFFICIENT`;
  - đã đủ số khoản tối đa → `WORKER_DEPOSIT_LIMIT`.
- **Hoàn cọc bằng trigger** trên `applications.status`, phủ mọi đường đổi trạng thái.
  NTD sửa nhầm vắng mặt sau khi cọc đã chuyển → `WORKER_DEPOSIT_SETTLED`.
- **Quét quá hạn `_settle_worker_holds_overdue`:**
  - gắn vào `sync_overdue_settlements` (client gọi khi mở app) + pg_cron
    `cale-worker-holds` (phút 5/20/35/50);
  - mỗi khoản nằm trong khối exception riêng; khoá NTD bằng try-lock.
- **RPC:**
  - worker: `get_my_worker_deposit_status`, `worker_contest_no_show`;
  - admin: `admin_list_worker_holds`, `admin_resolve_worker_hold`,
    `admin_list_no_show_contests`, `admin_resolve_no_show_contest`,
    `admin_get/set_worker_deposit_settings` (ghi `platform_settings_audit`);
  - admin không xử được khoản mà mình là worker hoặc NTD.
- **Chạy thử:** `bash supabase/dryrun/run-0028.sh`.
  - `set local lock_timeout 3s` và kết thúc bằng `raise` → luôn rollback.
  - Kết quả nằm trong thông báo lỗi `DRYRUN_RESULT (54 / 54 ok)`.

## 3. Client (chỉ chế độ supabase; demo local không có cọc worker)
- **Logic thuần** `src/domain/workerDeposit.ts` (khớp SQL, có property test bảo toàn
  tiền). **Repo** `src/data/repos/workerDepositRepo.ts`. **Store**
  `src/stores/workerDepositStore.ts`.
- **Trang ca `/shifts/[id]`:**
  - hiện "Ứng tuyển ca này cần đặt cọc X đ" hoặc "được miễn cọc";
  - thiếu ví → nút nạp ví / xác thực CCCD;
  - hộp xác nhận số tiền trước khi trừ.
  - Đơn vắng mặt: bảng khiếu nại (có hoặc không kèm cọc) thay banner khiếu nại cũ
    (luồng local).
- **Dashboard worker:**
  - cảnh báo khi bị đánh vắng ở ca có cọc;
  - nút **Nạp tiền** cho worker chỉ hiện khi cờ bật.
- **Hồ sơ worker:** thẻ "Cọc khi ứng tuyển" (miễn / cách được miễn / chặn tới ngày …).
- **Admin, tab Thống kê:**
  - danh sách "Khiếu nại cọc vắng mặt" (ẩn khi trống);
  - thẻ "Cọc người lao động": bật/tắt + 6 mức, cảnh báo khoản quá hạn chưa xử lý.
- **Sổ ví:** 3 nhãn mới. **Điều khoản** mục 4 thêm đoạn cọc người lao động.
- **VI/EN:** các màn trên thuộc đợt 2 (chưa dịch).

## 4. Việc tiếp theo
1. **Chủ dự án duyệt → commit → push → `npx supabase db push`** (người viết tự
   chạy). Kiểm sau push:
   - `migration list` có 0028 cả 2 cột;
   - cờ `require_worker_deposit = false`;
   - không có dòng nào trong `worker_holds`;
   - `apply` vẫn chạy khi cờ tắt.
2. **Trước khi bật cờ trên production:**
   - Thử tay bằng 1 worker + 1 NTD thật với số nhỏ: ứng tuyển có cọc → huỷ → hoàn;
     vắng mặt → khiếu nại → admin xử.
   - Nhờ người đọc lại chữ trên trang ca / điều khoản.
3. **Còn mở (Thấp, đã chấp nhận):**
   - Khoản `AUTO_NO_SHOW` / vì trần **không có hạn xử lý**: tiền worker bị giữ tới
     khi admin xử. Nếu cần thì thêm nhắc admin hoặc tự hoàn sau N ngày.
   - Server chưa có kênh thông báo (email/SMS) khi worker bị đánh vắng; mới có cảnh
     báo trên dashboard.
   - Nhiều khoản lỗi lặp lại (≥50) có thể chặn lượt quét của client; admin thấy qua
     số "khoản quá hạn chưa xử lý".
   - Khi bỏ qua vì try-lock, khoá dòng vẫn giữ tới hết lượt quét; worker khiếu nại
     cùng lúc phải chờ ngắn.
   - Check-in vẫn là prototype (không GPS): worker không đến mà check-in từ xa vẫn
     được hoàn cọc.

## 5. Lưu ý môi trường
- `supabase migration list` / `db query --linked` từng bị timeout kết nối pooler
  (sáng 30/09), chiều lại chạy được. Có thể do Cloudflare WARP / mạng.
- e2e khi dev server :3000 đang chạy: làm theo `HANDOFF_SESSION_2026-09-30_WEB.md`
  mục 5 (bản sao + junction `node_modules`, `next dev --webpack -p 3101`,
  `E2E_PORT=3101`).
  - Làm nóng route trước khi chạy.
  - Máy bận (chạy song song agent khác) → test chuyển trang dễ timeout; chạy lại
    riêng file hỏng với `--workers=2`.
  - **Xoá junction trước** rồi mới xoá bản sao.
