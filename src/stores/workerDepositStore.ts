/**
 * P2-1 (0028) — trạng thái cọc của người lao động đang đăng nhập (chỉ supabase).
 * Chỉ để HIỂN THỊ; server quyết định thật khi ứng tuyển. Không lưu localStorage.
 */

import { create } from 'zustand';

import { isSupabaseEnv } from '@/data/supabaseClient';
import {
  getMyWorkerDepositStatus,
  type WorkerDepositStatus,
} from '@/data/repos/workerDepositRepo';

interface WorkerDepositStore {
  status: WorkerDepositStatus | null;
  refresh(): Promise<void>;
}

export const useWorkerDepositStore = create<WorkerDepositStore>((set) => ({
  status: null,
  async refresh() {
    if (!isSupabaseEnv()) return;
    try {
      set({ status: await getMyWorkerDepositStatus() });
    } catch {
      // Không tải được → không hiện gì; server vẫn chặn đúng khi ứng tuyển.
      set({ status: null });
    }
  },
}));
