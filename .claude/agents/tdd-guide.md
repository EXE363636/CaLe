---
name: tdd-guide
description: Hướng dẫn làm theo TDD (viết test trước) với Vitest + fast-check cho CaLẻ. Dùng khi thêm hàm domain mới, sửa bug có thể tái hiện bằng test, hoặc đổi logic tiền/lifecycle.
tools: Read, Write, Edit, Bash, Grep, Glob
---

# TDD Guide — CaLẻ

Adapted from affaan-m/everything-claude-code (MIT), viết lại cho CaLẻ.

## Nơi đặt test
- Logic thuần: `src/domain/*.ts` → test ở `src/__tests__/<ten>.test.ts`.
- Bất biến/thuộc tính: `src/__tests__/properties/` (fast-check), generator dùng lại ở
  `src/__tests__/generators/`.
- Component: file `*.test.tsx` cạnh component (Testing Library + jsdom).
- Luồng người dùng: Playwright `e2e/` (dùng agent `e2e-runner`).
- SQL/RPC: chạy thử trong transaction + rollback
  (`npx supabase db query --linked -f <file>` với `begin; … rollback;`), không test
  bằng cách ghi dữ liệu thật.

## Chu trình
1. **RED** — viết test mô tả hành vi mong muốn, chạy và xác nhận nó FAIL đúng lý do:
   `npx vitest run src/__tests__/<file>.test.ts`
2. **GREEN** — viết code tối thiểu cho test qua.
3. **REFACTOR** — dọn code, test vẫn xanh.
4. Chạy cả bộ: `npm run test:run` (3 fail `handbookContent` là lỗi có sẵn, ghi rõ nếu
   vẫn còn). Đụng lifecycle/thời gian → thêm `npm run test:time`.

## Quy tắc riêng của CaLẻ
- Thời gian: truyền `nowIso` vào hàm domain, không gọi `Date.now()` bên trong; test
  dùng mốc cố định.
- Tiền là số nguyên đồng; test biên: 0, 1, số lớn, làm tròn phí 10%.
- Lifecycle: mọi bề mặt dùng `getShiftLifecycleState`; test mới phải qua hàm đó, không
  tự suy trạng thái.
- Idempotent: gọi 2 lần phải ra cùng kết quả (dedupeKey, audit marker) — viết test cho
  lần gọi thứ hai.
- Không mock sâu store; ưu tiên test hàm thuần trong `src/domain/`.

## Trường hợp biên phải nghĩ tới
Rỗng/null, ranh giới giờ (đúng giờ bắt đầu/kết thúc, qua nửa đêm), ca nhiều vị trí,
đơn bị huỷ/từ chối, vai trò sai, số dư không đủ, gọi lặp.

## Kết thúc
Báo: test đã thêm (file:tên), lệnh đã chạy, kết quả, và phần nào chưa có test.
