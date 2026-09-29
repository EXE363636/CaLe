---
description: Chạy cổng kiểm tra của CaLẻ (tsc, lint, test, build, rà diff) và báo cáo ngắn. Tham số quick | full (mặc định) | pre-pr.
argument-hint: "[quick|full|pre-pr]"
---

# /verify — cổng kiểm tra CaLẻ

Adapted from affaan-m/everything-claude-code (MIT), viết lại cho CaLẻ.
Chế độ: `$ARGUMENTS` (trống = `full`). Chỉ kiểm tra và báo cáo — KHÔNG tự sửa,
KHÔNG commit/push. Log ghi ra file `.tmp-*.log` (đã gitignore), xoá khi xong.

## quick
1. `npx tsc --noEmit --pretty false > .tmp-tsc.log 2>&1` → số lỗi + 10 dòng đầu.
2. `npm run lint > .tmp-lint.log 2>&1` → số lỗi/cảnh báo.

## full (mặc định) = quick +
3. `npm run test:run > .tmp-test.log 2>&1` → số test qua/hỏng. 3 fail
   `handbookContent` là lỗi có sẵn: ghi riêng, không tính là hỏng mới.
4. Nếu diff đụng `src/domain/`, lifecycle hoặc thời gian: `npm run test:time`.
5. `npm run build > .tmp-build.log 2>&1` → OK/HỎNG + số trang.
6. Rà diff (`git status --short`, `git diff --stat`, `git diff`):
   - `console.log` mới trong `src/`;
   - key/token/`.env*` bị thêm;
   - `VNĐ` hoặc `₫` trong chuỗi mới;
   - sửa file migration đã apply (so với `npx supabase migration list` nếu có);
   - chuỗi hiển thị hard-code thay vì `src/i18n/vi.ts`.

## pre-pr = full +
7. `npm run test:e2e` (cần cài Playwright; tự mở dev server cổng 3100).
8. Nếu diff đụng `supabase/` hoặc tiền/auth: gọi agent `security-reviewer` cho diff.

## Báo cáo
```
VERIFY (<chế độ>): ĐẠT / KHÔNG ĐẠT
tsc:    OK / X lỗi
lint:   OK / X lỗi, Y cảnh báo
test:   X/Y qua (+ 3 fail handbookContent có sẵn)
build:  OK (N trang) / HỎNG
e2e:    X/Y qua / bỏ qua
diff:   OK / <vấn đề>
```
Nếu KHÔNG ĐẠT: liệt kê lỗi với `file:dòng` và gợi ý sửa.
