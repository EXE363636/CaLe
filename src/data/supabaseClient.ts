/**
 * Supabase client + data-mode selector (BACKEND-MIGRATION-1 · Phase 1).
 *
 * Xem docs/PHASE_1_PLAN.md (v4). Điểm cốt lõi:
 *  - Data mode do BIẾN TƯỜNG MINH `NEXT_PUBLIC_DATA_MODE` quyết định, KHÔNG suy
 *    từ việc có URL/key hay không.
 *  - Production bắt buộc `supabase`; thiếu URL/anon key → throw (không fallback).
 *  - Truy cập `process.env.NEXT_PUBLIC_*` TRỰC TIẾP (không index động) để Next.js
 *    inline được biến public vào client bundle.
 *  - `getDataMode()` / `getSupabaseClient()` là LAZY — không chạy ở top-level
 *    module. Lý do: `next build` đặt NODE_ENV=production; nếu đánh giá ở import
 *    time, build sẽ throw. Chỉ gọi trong runtime client (AppHydrator, store).
 *  - Client chỉ dùng URL + publishable/anon key. Tuyệt đối KHÔNG service_role /
 *    database password ở phía client (xem docs/SUPABASE_SECURITY_NOTE.md).
 */

import {
  createClient,
  type AuthChangeEvent,
  type Session,
  type Subscription,
  type SupabaseClient,
} from '@supabase/supabase-js';

export type DataMode = 'local' | 'supabase';

/**
 * Quyết định nguồn dữ liệu theo biến môi trường tường minh.
 *
 * | NEXT_PUBLIC_DATA_MODE | NODE_ENV        | Kết quả                         |
 * |-----------------------|-----------------|---------------------------------|
 * | 'supabase'            | bất kỳ          | 'supabase' (thiếu URL/key→throw)|
 * | 'local'               | ≠ production     | 'local'                         |
 * | unset                 | ≠ production     | 'local'                         |
 * | ≠ 'supabase'          | production       | throw (prod bắt buộc supabase)  |
 */
export function getDataMode(): DataMode {
  const raw = process.env.NEXT_PUBLIC_DATA_MODE;
  const isProd = process.env.NODE_ENV === 'production';

  if (raw === 'supabase') {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      throw new Error(
        '[dataMode] NEXT_PUBLIC_DATA_MODE=supabase nhưng thiếu ' +
          'NEXT_PUBLIC_SUPABASE_URL hoặc NEXT_PUBLIC_SUPABASE_ANON_KEY.',
      );
    }
    return 'supabase';
  }

  if (isProd) {
    throw new Error(
      `[dataMode] Production bắt buộc NEXT_PUBLIC_DATA_MODE=supabase (nhận "${raw ?? 'unset'}").`,
    );
  }

  return 'local';
}

/** Tiện ích: true nếu đang ở chế độ Supabase. */
export function isSupabaseMode(): boolean {
  return getDataMode() === 'supabase';
}

/**
 * Build-safe: đọc THẲNG `NEXT_PUBLIC_DATA_MODE` (không throw như getDataMode) — dùng
 * cho điều kiện RENDER (chạy cả lúc `next build`) để ẩn công cụ dev/demo/mock ở
 * chế độ supabase/production. KHÔNG dùng cho quyết định bảo mật.
 */
export function isSupabaseEnv(): boolean {
  return process.env.NEXT_PUBLIC_DATA_MODE === 'supabase';
}

// ---------------------------------------------------------------------------
// Lazy singleton — chỉ khởi tạo khi thực sự ở chế độ supabase.
// ---------------------------------------------------------------------------

let cached: SupabaseClient | null = null;

/**
 * Trả về Supabase client (khởi tạo 1 lần). Throw nếu gọi khi không ở chế độ
 * supabase — caller phải kiểm `getDataMode()` trước, hoặc dùng chế độ local.
 */
export function getSupabaseClient(): SupabaseClient {
  if (getDataMode() !== 'supabase') {
    throw new Error(
      '[supabaseClient] getSupabaseClient() gọi khi không ở chế độ supabase.',
    );
  }
  if (cached) return cached;

  cached = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    },
  );
  return cached;
}

/**
 * Đăng ký lắng nghe thay đổi phiên đăng nhập (đăng nhập/đăng xuất/refresh token,
 * đồng bộ đa tab). Trả về `Subscription` — nhớ `.unsubscribe()` khi unmount.
 *
 * Đây là helper mức client. Việc GẮN nó vào vòng đời app (AppHydrator refresh
 * cache users theo sự kiện) thuộc **bước authStore/AppHydrator tiếp theo**, chưa
 * làm ở Bước 0.
 */
export function onAuthChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void,
): Subscription {
  return getSupabaseClient().auth.onAuthStateChange(callback).data.subscription;
}
