/**
 * Trang pháp lý — câu riêng cho bản thật (03/10, chủ dự án duyệt). Bản thật lưu dữ liệu
 * trên máy chủ (Supabase) và có giao dịch thật → không được nói "localStorage", "dữ liệu
 * lưu cục bộ", "phiên bản dùng thử" hay "tính điểm uy tín"; phải nói Google Analytics,
 * PayOS, SpeedSMS. Bản demo giữ câu cũ.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

vi.mock('@/i18n/server', async () => {
  const { makeT, makeTx } = await import('@/i18n/locale');
  return { getLocale: async () => 'vi', getT: async () => makeT('vi'), getTx: async () => makeTx('vi') };
});

import PrivacyPage from '@/app/privacy/page';
import TermsPage from '@/app/terms/page';

const text = (c: HTMLElement) => (c.textContent ?? '').normalize('NFC');

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe('Trang pháp lý — bản thật', () => {
  it('/privacy: nói đúng nơi lưu dữ liệu, không còn câu của bản demo', async () => {
    vi.stubEnv('NEXT_PUBLIC_DATA_MODE', 'supabase');
    const { container } = render(await PrivacyPage());
    const t = text(container);
    expect(t).not.toMatch(/localStorage|lưu cục bộ|phiên bản dùng thử|tính điểm uy tín/);
    for (const s of ['Lưu trữ và bảo vệ dữ liệu', 'Supabase', 'PayOS', 'SpeedSMS', 'Google Analytics', 'Thông tin giao dịch', 'chỉ đọc được dữ liệu của mình']) {
      expect(t).toContain(s);
    }
    expect(t).toContain('giai đoạn thử nghiệm giới hạn (Beta)');
  });

  it('/terms: đoạn dẫn nói giai đoạn Beta, giao dịch thật', async () => {
    vi.stubEnv('NEXT_PUBLIC_DATA_MODE', 'supabase');
    const { container } = render(await TermsPage());
    const t = text(container);
    expect(t).toContain('giai đoạn thử nghiệm giới hạn (Beta) của CaLẻ, trong đó nạp tiền, giữ cọc, trả công và rút tiền là giao dịch thật');
    expect(t).not.toContain('phiên bản dùng thử của sản phẩm');
  });
});

describe('Trang pháp lý — bản demo giữ câu cũ', () => {
  it('/privacy demo: vẫn nói lưu trong trình duyệt (mô phỏng)', async () => {
    const { container } = render(await PrivacyPage());
    const t = text(container);
    expect(t).toContain('Lưu trữ trong phiên bản dùng thử');
    expect(t).toContain('localStorage');
    expect(t).not.toContain('Google Analytics');
  });
});
