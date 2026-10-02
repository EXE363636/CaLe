import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    // Thư mục build của dev server thứ hai (NEXT_DIST_DIR, xem next.config.ts).
    ".next-local/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Supabase Edge Functions chạy trên Deno (global Deno, import từ URL) —
    // không thuộc đồ thị Next/Node nên bỏ qua ESLint của app.
    "supabase/functions/**",
    // Báo cáo / kết quả Playwright sinh ra khi chạy e2e (gitignored) và script
    // vendor của skill impeccable — không phải mã nguồn của app.
    "playwright-report/**",
    "test-results/**",
    ".claude/skills/**",
    "graphify-out/**",
  ]),
]);

export default eslintConfig;
