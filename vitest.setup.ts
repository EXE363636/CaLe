import '@testing-library/jest-dom/vitest';

// jsdom thiếu hai API mà các khối landing dùng khi chạy hiệu ứng cuộn tới
// (`TypeOnView`, `MoneyFlowDiagram`, …). Chỉ thêm khi môi trường chưa có.
if (typeof window !== 'undefined') {
  if (typeof window.matchMedia !== 'function') {
    window.matchMedia = (query: string) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
        dispatchEvent: () => false,
      }) as MediaQueryList;
  }
  if (typeof window.IntersectionObserver !== 'function') {
    window.IntersectionObserver = class {
      readonly root = null;
      readonly rootMargin = '';
      readonly thresholds: number[] = [];
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    } as unknown as typeof IntersectionObserver;
  }
}
