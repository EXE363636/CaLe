---
description: Ghi mốc tiến độ (commit hiện tại + kết quả test) vào .claude/checkpoints.log để so sánh về sau. Không tạo commit hay stash.
argument-hint: "create <tên> | verify <tên> | list"
---

# /checkpoint — mốc tiến độ

Adapted from affaan-m/everything-claude-code (MIT), viết lại cho CaLẻ.
Tham số: `$ARGUMENTS`. File log: `.claude/checkpoints.log` (đã gitignore, chỉ trên
máy này). **Không** commit, stash, tag hay đổi nhánh.

## create <tên>
1. Chạy `/verify quick` (tsc + lint) và `npm run test:run`, lấy số qua/hỏng.
2. Thêm 1 dòng vào log:
   `<YYYY-MM-DD HH:mm> | <tên> | <nhánh>@<git rev-parse --short HEAD> | dirty=<số file trong git status --short> | test <qua>/<tổng> | tsc <số lỗi>`
3. Báo đã ghi mốc.

## verify <tên>
1. Đọc dòng mốc trong log (không có → báo và dừng).
2. So với hiện tại:
   - `git diff --stat <sha mốc>` và file chưa commit;
   - test qua/hỏng bây giờ so với lúc đó;
   - tsc lỗi bây giờ so với lúc đó.
3. Báo:
```
SO VỚI MỐC <tên> (<sha>)
File đổi: X  |  Test: +A qua / -B hỏng  |  tsc: trước N → nay M
```

## list
In các mốc (mới nhất trước): tên, thời gian, sha, commit hiện tại đang trước/sau mốc.
