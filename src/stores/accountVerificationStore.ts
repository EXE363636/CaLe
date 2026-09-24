/**
 * Trạng thái xác thực SĐT / CCCD của CHÍNH người dùng (supabase mode, 0022).
 * Nạp khi cần (trang hồ sơ, trang đăng ca, trang ca) — không polling.
 * Server vẫn là nơi chặn thật (apply / create_deposit_session); store này chỉ
 * để UI báo trước cho người dùng.
 */

import { create } from 'zustand';

import { isSupabaseEnv } from '@/data/supabaseClient';
import { getMyVerification, type MyVerification } from '@/data/repos/verificationRepo';

interface AccountVerificationStore {
  status: MyVerification | null;
  loading: boolean;
  refresh(): Promise<MyVerification | null>;
  reset(): void;
}

export const useAccountVerificationStore = create<AccountVerificationStore>((set) => ({
  status: null,
  loading: false,

  async refresh() {
    if (!isSupabaseEnv()) return null;
    set({ loading: true });
    try {
      const status = await getMyVerification();
      set({ status, loading: false });
      return status;
    } catch {
      set({ loading: false });
      return null;
    }
  },

  reset() {
    set({ status: null, loading: false });
  },
}));
