/**
 * Nút VI / EN — đợt 1 (trang công khai). Bảo đảm:
 *  - mọi khoá `t('...')` và câu `tx('...')` trên các màn đợt 1 đều có bản tiếng Anh;
 *  - `en.ts` không có khoá lạ (gõ nhầm → không bao giờ được dùng);
 *  - bản tiếng Anh không dùng `VNĐ` / `₫`;
 *  - `translate` / `translateText` rơi về tiếng Việt khi thiếu bản dịch.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { en, enText } from '@/i18n/en';
import { translate, translateText, unknownEnglishKeys } from '@/i18n/locale';
import { vi } from '@/i18n/vi';

const ROOT = join(__dirname, '..', '..');

/** Màn đã chuyển sang useT / getT / useTx / getTx (đợt 1). */
const PHASE1_FILES = [
  'src/app/page.tsx',
  'src/app/for-workers/page.tsx',
  'src/app/for-employers/page.tsx',
  'src/app/pricing/page.tsx',
  'src/app/login/page.tsx',
  'src/app/register/page.tsx',
  'src/app/forgot-password/page.tsx',
  'src/components/landing/RoleSwitch.tsx',
  'src/components/landing/UrgentShifts.tsx',
  'src/components/landing/LatestShifts.tsx',
  'src/components/layout/NavBar.tsx',
  'src/components/layout/MobileNav.tsx',
  'src/components/layout/Footer.tsx',
  'src/components/layout/AuthSidePanel.tsx',
  'src/components/auth/GoogleSignInButton.tsx',
];

/** Hằng tiếng Việt được hiển thị qua `tx(...)` (nhãn menu / footer). */
const CONSTANT_TEXT_FILES = [
  'src/components/layout/NavBar.tsx',
  'src/components/layout/MobileNav.tsx',
  'src/components/layout/Footer.tsx',
];

const QUOTED = String.raw`'((?:[^'\\]|\\.)*)'`;

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

function matches(source: string, pattern: string): string[] {
  return [...source.matchAll(new RegExp(pattern, 'g'))].map((m) => m[1]);
}

describe('i18n English — đợt 1', () => {
  it('mọi khoá dùng trên màn đợt 1 đều có bản tiếng Anh', () => {
    const missing = new Set<string>();
    for (const file of PHASE1_FILES) {
      const src = read(file);
      const keys = [
        ...matches(src, String.raw`\bt\(\s*` + QUOTED),
        // khoá đứng riêng trong biểu thức (vd t(supabase ? 'a.b' : 'a.c'))
        ...matches(src, String.raw`'([a-zA-Z]+\.[a-zA-Z0-9_.]+)'`),
      ].filter((k) => k in vi);
      for (const k of keys) if (!(k in en)) missing.add(`${file}: ${k}`);
    }
    expect([...missing]).toEqual([]);
  });

  it('mọi câu tx(...) và nhãn menu/footer đều có trong enText', () => {
    const missing = new Set<string>();
    for (const file of PHASE1_FILES) {
      for (const text of matches(read(file), String.raw`\btx\(\s*` + QUOTED)) {
        if (!(text in enText)) missing.add(`${file}: ${text}`);
      }
    }
    for (const file of CONSTANT_TEXT_FILES) {
      const src = read(file);
      for (const text of matches(src, String.raw`\b(?:label|description|heading):\s*\n?\s*` + QUOTED)) {
        if (!(text in enText)) missing.add(`${file}: ${text}`);
      }
      for (const key of matches(src, String.raw`label:\s*t(?:Vi)?\('([^']+)'\)`)) {
        const text = vi[key];
        if (text !== undefined && !(text in enText)) missing.add(`${file}: ${key} → ${text}`);
      }
    }
    expect([...missing]).toEqual([]);
  });

  it('en.ts không có khoá lạ', () => {
    expect(unknownEnglishKeys()).toEqual([]);
  });

  it('bản tiếng Anh không dùng VNĐ / ₫', () => {
    const all = [...Object.values(en), ...Object.values(enText)].join('\n');
    expect(all).not.toMatch(/VNĐ|₫/);
  });

  it('thiếu bản dịch thì rơi về tiếng Việt', () => {
    expect(translate('en', 'nav.home')).toBe('Home');
    expect(translate('vi', 'nav.home')).toBe(vi['nav.home']);
    const untranslated = Object.keys(vi).find((k) => !(k in en))!;
    expect(translate('en', untranslated)).toBe(vi[untranslated]);
    expect(translateText('en', 'Bảng giá')).toBe('Pricing');
    expect(translateText('en', 'Câu chưa dịch')).toBe('Câu chưa dịch');
    expect(translateText('vi', 'Bảng giá')).toBe('Bảng giá');
  });
});
