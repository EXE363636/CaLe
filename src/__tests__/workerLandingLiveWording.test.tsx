/**
 * /for-workers — bản thật (03/10, chủ dự án duyệt): trang landing không hứa "khiếu nại"
 * (tranh chấp chưa bật ở production); vắng mặt bị tính sai thì "liên hệ đội hỗ trợ CaLẻ".
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

vi.mock('@/i18n/server', async () => {
  const { makeT, makeTx } = await import('@/i18n/locale');
  return { getLocale: async () => 'vi', getT: async () => makeT('vi'), getTx: async () => makeTx('vi') };
});

// RoleSwitch là server component async — jsdom không vẽ được, thay bằng khối rỗng.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/for-workers',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/components/landing/RoleSwitch', () => ({ RoleSwitch: () => null }));

import ForWorkersPage from '@/app/for-workers/page';

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe('/for-workers — bản thật', () => {
  it('không hứa khiếu nại; vắng mặt sai thì liên hệ đội hỗ trợ CaLẻ', async () => {
    vi.stubEnv('NEXT_PUBLIC_DATA_MODE', 'supabase');
    const { container } = render(await ForWorkersPage());
    const t = (container.textContent ?? '').normalize('NFC');
    expect(t).not.toMatch(/khiếu nại/i);
    expect(t).toContain('Nếu thấy ghi nhận chưa đúng, bạn liên hệ đội hỗ trợ CaLẻ.');
  });
});
