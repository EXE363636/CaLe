import { test, expect } from './fixtures/test';
import { buildSnapshot, buildEmployer } from './fixtures/seed';
import { ACCOUNTS } from './fixtures/constants';

/**
 * HEADER-NAV-LAYOUT-3 — adaptive desktop/laptop/tablet header.
 *
 * Product decision: the hamburger is for TABLET/MOBILE only. On every
 * desktop/laptop width (>= 1280px) the horizontal nav MUST be visible
 * and must NOT overlap the logo or the notification/profile zone — it
 * is never collapsed to a hamburger just because labels are long.
 *
 * The employer nav fits one row at 1280px via shortened desktop labels
 * (Đăng ca / Lịch tuyển / Ca công khai / Hồ sơ — full labels live in
 * `title` tooltips + the mobile drawer + the UserMenu, routes
 * unchanged), a widened `max-w-[1600px]` header, and compact link
 * gap/padding at `xl`.
 *
 * These tests assert REAL BOUNDING BOXES (no overlap), not center
 * drift. Below 1280px (tablet) the hamburger is the nav.
 */

// Desktop/laptop widths — horizontal nav required.
const DESKTOP: Array<[number, number]> = [
  [3840, 2160],
  [2560, 1440],
  [1920, 1080],
  [1680, 1050],
  [1600, 900],
  [1536, 864],
  [1440, 900],
  [1366, 768],
  [1280, 800],
  [1280, 720],
];

// Tablet widths — hamburger acceptable.
const TABLET: Array<[number, number]> = [
  [1024, 768],
  [768, 1024],
  [820, 1180],
  [1024, 1366],
  [800, 1280],
];

const GAP_MIN = 8; // minimum clear space between zones (px)

async function measure(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const box = (el: Element | null) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        left: r.left,
        right: r.right,
        width: r.width,
        height: r.height,
        visible: (el as HTMLElement).offsetParent !== null && r.width > 0,
      };
    };
    const header = document.querySelector('header');
    const nav = document.querySelector('nav[aria-label="Main navigation"]');
    const logo = header ? header.querySelector('a[href="/"]') : null;
    const userMenu = document.querySelector('[data-user-menu="true"]');
    const bell = header
      ? header.querySelector('button[aria-label="Thông báo"]')
      : null;
    const ham = header
      ? header.querySelector('button[aria-controls="mobile-nav-drawer"]')
      : null;
    const nb = box(nav);
    const lb = box(logo);
    const um = box(userMenu);
    const bb = box(bell);
    const hb = box(ham);
    const rightEls = [bb, um].filter(
      (b): b is NonNullable<typeof b> => !!b && b.visible,
    );
    const rightLeft = rightEls.length
      ? Math.min(...rightEls.map((b) => b.left))
      : null;
    let visibleNavLinks = 0;
    const navLinkTexts: string[] = [];
    if (nav && (nav as HTMLElement).offsetParent !== null) {
      for (const a of Array.from(nav.querySelectorAll('a'))) {
        const r = a.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          visibleNavLinks += 1;
          navLinkTexts.push((a.textContent || '').trim());
        }
      }
    }
    return {
      overflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      headerHeight: header
        ? Math.round(header.getBoundingClientRect().height)
        : null,
      navVisible: nb ? nb.visible : false,
      hamburgerVisible: hb ? hb.visible : false,
      logoNavGap: nb && nb.visible && lb ? nb.left - lb.right : null,
      navRightGap:
        nb && nb.visible && rightLeft !== null ? rightLeft - nb.right : null,
      visibleNavLinks,
      navLinkTexts,
    };
  });
}

test.describe('HEADER-NAV-LAYOUT-3: desktop/laptop shows horizontal nav, no overlap', () => {
  for (const [width, height] of DESKTOP) {
    test(`worker desktop nav @${width}x${height}`, async ({
      page,
      seedState,
      loginAs,
      gotoApp,
    }) => {
      await page.setViewportSize({ width, height });
      await seedState(buildSnapshot());
      await loginAs(ACCOUNTS.worker.id);
      await gotoApp('/worker/dashboard');
      await page.waitForTimeout(200);
      const m = await measure(page);
      expect(m.navVisible, `nav visible @${width}`).toBe(true);
      expect(m.hamburgerVisible, `hamburger hidden @${width}`).toBe(false);
      expect(m.overflow, `overflow @${width}`).toBeLessThanOrEqual(1);
      expect(m.logoNavGap, `logo↔nav gap @${width}`).toBeGreaterThanOrEqual(GAP_MIN);
      expect(m.navRightGap, `nav↔right gap @${width}`).toBeGreaterThanOrEqual(GAP_MIN);
      expect(m.visibleNavLinks, `nav links @${width}`).toBeGreaterThan(0);
      expect(m.headerHeight, `header height @${width}`).toBeGreaterThan(40);
      expect(m.headerHeight, `header height @${width}`).toBeLessThan(120);
    });

    test(`employer (long name) desktop nav @${width}x${height}`, async ({
      page,
      seedState,
      loginAs,
      gotoApp,
    }) => {
      await page.setViewportSize({ width, height });
      await seedState(
        buildSnapshot({
          users: [
            buildEmployer({
              companyName: 'Quán Phở Hà Nội Truyền Thống Lâu Đời',
            }),
          ],
        }),
      );
      await loginAs(ACCOUNTS.employer.id);
      await gotoApp('/employer/dashboard');
      await page.waitForTimeout(200);
      const m = await measure(page);

      // Horizontal nav present, no hamburger, no overlap, no overflow.
      expect(m.navVisible, `nav visible @${width}`).toBe(true);
      expect(m.hamburgerVisible, `hamburger hidden @${width}`).toBe(false);
      expect(m.overflow, `overflow @${width}`).toBeLessThanOrEqual(1);
      expect(m.logoNavGap, `logo↔nav gap @${width}`).toBeGreaterThanOrEqual(GAP_MIN);
      expect(m.navRightGap, `nav↔right gap @${width}`).toBeGreaterThanOrEqual(GAP_MIN);

      // All 7 employer links present with the SHORTENED desktop labels.
      // "Hỗ trợ" was moved to the footer (7→6), then "Cẩm nang làm việc"
      // (handbook) was added to the top nav (6→7). Per NavBar's own note
      // the 7-item employer nav is designed to fit one row at >= 1280px
      // without a hamburger.
      expect(m.visibleNavLinks, `nav links @${width}`).toBe(7);
      for (const label of ['Đăng ca', 'Lịch tuyển', 'Ca công khai', 'Hồ sơ']) {
        expect(
          m.navLinkTexts,
          `employer short label "${label}" @${width}`,
        ).toContain(label);
      }

      // Long profile name truncates within its container.
      const nameOk = await page.evaluate(() => {
        const menu = document.querySelector('[data-user-menu="true"]');
        if (!menu) return true;
        const span = menu.querySelector('span.truncate');
        if (!span) return true;
        return (span as HTMLElement).clientWidth <= 180;
      });
      expect(nameOk, `employer name truncates @${width}`).toBe(true);
    });

    test(`admin desktop nav @${width}x${height}`, async ({
      page,
      seedState,
      loginAs,
      gotoApp,
    }) => {
      await page.setViewportSize({ width, height });
      await seedState(buildSnapshot());
      await loginAs(ACCOUNTS.admin.id);
      await gotoApp('/admin/dashboard');
      await page.waitForTimeout(200);
      const m = await measure(page);
      expect(m.navVisible, `nav visible @${width}`).toBe(true);
      expect(m.hamburgerVisible, `hamburger hidden @${width}`).toBe(false);
      expect(m.overflow, `overflow @${width}`).toBeLessThanOrEqual(1);
      expect(m.logoNavGap, `logo↔nav gap @${width}`).toBeGreaterThanOrEqual(GAP_MIN);
      expect(m.navRightGap, `nav↔right gap @${width}`).toBeGreaterThanOrEqual(GAP_MIN);
      // Admin nav link present + clickable.
      await expect(
        page.getByRole('link', { name: 'Tổng quan admin' }),
      ).toBeVisible();
    });
  }
});

test.describe('HEADER-NAV-LAYOUT-3: tablet shows hamburger, no overflow', () => {
  for (const [width, height] of TABLET) {
    test(`employer tablet header @${width}x${height}`, async ({
      page,
      seedState,
      loginAs,
      gotoApp,
    }) => {
      await page.setViewportSize({ width, height });
      await seedState(
        buildSnapshot({
          users: [
            buildEmployer({
              companyName: 'Quán Phở Hà Nội Truyền Thống Lâu Đời',
            }),
          ],
        }),
      );
      await loginAs(ACCOUNTS.employer.id);
      await gotoApp('/employer/dashboard');
      await page.waitForTimeout(200);
      const m = await measure(page);
      // Hamburger is the nav; desktop nav hidden; no overflow.
      expect(m.hamburgerVisible, `hamburger visible @${width}`).toBe(true);
      expect(m.navVisible, `desktop nav hidden @${width}`).toBe(false);
      expect(m.overflow, `overflow @${width}`).toBeLessThanOrEqual(1);

      // All employer routes reachable via the drawer.
      await page.locator('button[aria-controls="mobile-nav-drawer"]').click();
      const drawer = page.locator('#mobile-nav-drawer');
      await expect(drawer).toBeVisible();
      await expect(drawer.getByRole('link', { name: 'Đăng ca tuyển' })).toBeVisible();
      await expect(
        drawer.getByRole('link', { name: 'Hồ sơ doanh nghiệp' }),
      ).toBeVisible();
      await expect(drawer.getByRole('link', { name: 'Tổng quan' })).toBeVisible();
    });
  }
});
