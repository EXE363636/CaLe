'use client';

import { useEffect, useState } from 'react';
import { isSupabaseEnv } from '@/data/supabaseClient';
import { getFeeSettings, type FeeSettings } from '@/data/repos/feeRepo';

const NONE: FeeSettings = { feeFreeUntil: null };

/**
 * P2-3 (F12) — đọc đợt miễn phí dịch vụ một lần khi mount (không polling).
 * Local/demo không có phí nên luôn trả "không có đợt". Lỗi mạng → coi như
 * không có đợt: UI hiện phí 10% (an toàn — số tiền thật do server quyết khi
 * tạo phiên cọc và hiện ở bước xác nhận).
 */
export function useFeeSettings(): FeeSettings {
  const [s, setS] = useState<FeeSettings>(NONE);
  useEffect(() => {
    if (!isSupabaseEnv()) return;
    let alive = true;
    getFeeSettings()
      .then((v) => {
        if (alive) setS(v);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return s;
}
