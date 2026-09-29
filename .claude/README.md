# .claude/ — cấu hình Claude Code dùng chung cho repo CaLẻ

| Loại | Tên | Dùng khi |
|---|---|---|
| Agent | `security-reviewer` | Rà diff đụng migration/RPC, RLS, auth, CCCD, ví/cọc/PayOS, Edge Function. Chỉ đọc + báo cáo. |
| Agent | `e2e-runner` | Viết/sửa/chạy Playwright trong `e2e/` (seed localStorage, `page.clock`, cổng 3100). |
| Agent | `tdd-guide` | Làm thay đổi theo kiểu viết test trước (Vitest + fast-check). |
| Agent | `build-error-resolver` | `tsc` / `lint` / `build` đỏ → sửa với diff nhỏ nhất. |
| Lệnh | `/verify [quick\|full\|pre-pr]` | Cổng kiểm tra trước commit/PR. |
| Lệnh | `/tdd <mô tả>` | Làm một thay đổi theo chu trình RED → GREEN → REFACTOR. |
| Lệnh | `/checkpoint create\|verify\|list` | Ghi/so mốc tiến độ vào `.claude/checkpoints.log` (không commit). |
| Skill | `graphify` | Tra knowledge graph (`graphify-out/`). |

Các agent/lệnh trên chỉ là file Markdown (prompt), **không có hook hay script tự chạy**.
Viết lại từ [affaan-m/everything-claude-code](https://github.com/affaan-m/everything-claude-code)
(MIT, xem `THIRD_PARTY_NOTICES.md`) cho khớp CaLẻ. Cố ý KHÔNG lấy hooks (chặn tạo
`.md`, tự chạy prettier/tsc mỗi lần sửa), rules (bắt dùng zod, tự gọi agent) và mẫu
MCP của repo đó.

`settings.json` giữ hook `graphify hook-guard` sẵn có. `settings.local.json` là cá
nhân, không commit.
