import { cache } from 'react';
import { cookies } from 'next/headers';

import { LOCALE_COOKIE, makeT, makeTx, normalizeLocale, type Locale, type TFunction } from './locale';

/** Ngôn ngữ của request hiện tại (server component / layout). */
export const getLocale = cache(async (): Promise<Locale> => {
  const store = await cookies();
  return normalizeLocale(store.get(LOCALE_COOKIE)?.value);
});

/** `const t = await getT();` trong server component đã có bản dịch. */
export async function getT(): Promise<TFunction> {
  return makeT(await getLocale());
}

/** `const tx = await getTx();` — dịch chữ tiếng Việt còn viết cứng. */
export async function getTx(): Promise<TFunction> {
  return makeTx(await getLocale());
}
