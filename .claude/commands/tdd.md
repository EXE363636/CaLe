---
description: Làm một thay đổi theo TDD (viết test trước) bằng Vitest/fast-check theo quy ước CaLẻ.
argument-hint: "<mô tả hàm/bug cần làm>"
---

# /tdd — viết test trước

Adapted from affaan-m/everything-claude-code (MIT), viết lại cho CaLẻ.

Yêu cầu: $ARGUMENTS

Làm theo `.claude/agents/tdd-guide.md` (đọc file đó trước), trực tiếp trong phiên
này:

1. **Xác định giao diện**: hàm/kiểu nào, đặt ở đâu (`src/domain/` nếu là logic thuần).
2. **RED**: viết test ở `src/__tests__/` (hoặc cạnh component), chạy
   `npx vitest run <file>` và cho thấy nó FAIL đúng lý do.
3. **GREEN**: code tối thiểu để qua; chạy lại.
4. **REFACTOR**: dọn code, test vẫn xanh.
5. **Kiểm cả bộ**: `npm run test:run` (+ `npm run test:time` nếu đụng thời gian/lifecycle),
   `npx tsc --noEmit`.
6. Báo cáo: test đã thêm, kết quả RED → GREEN, lệnh đã chạy.

Không bỏ bước RED. Bug fix phải có test tái hiện bug trước khi sửa.
Tôn trọng dòng ⛔ CHẶN trong `CLAUDE.md` nếu còn.
