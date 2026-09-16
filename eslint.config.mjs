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
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Supabase Edge Functions chạy trên Deno (global Deno, import từ URL) —
    // không thuộc đồ thị Next/Node nên bỏ qua ESLint của app.
    "supabase/functions/**",
  ]),
]);

export default eslintConfig;
