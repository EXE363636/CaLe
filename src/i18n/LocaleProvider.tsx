'use client';

import { createContext, useContext, useMemo } from 'react';

import { DEFAULT_LOCALE, makeT, makeTx, type Locale, type TFunction } from './locale';

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

/** Root layout đọc cookie `cale.lang` rồi truyền xuống đây (an toàn theo từng request). */
export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

/** `const t = useT();` — thay cho `import { t } from '@/i18n/vi'` ở màn đã có bản dịch. */
export function useT(): TFunction {
  const locale = useLocale();
  return useMemo(() => makeT(locale), [locale]);
}

/** `const tx = useTx();` — dịch chữ tiếng Việt còn viết cứng (xem `translateText`). */
export function useTx(): TFunction {
  const locale = useLocale();
  return useMemo(() => makeTx(locale), [locale]);
}
