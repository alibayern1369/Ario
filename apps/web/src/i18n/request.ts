import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

export default getRequestConfig(async () => {
  const jar = await cookies();
  const locale = jar.get('ario-locale')?.value === 'en' ? 'en' : 'fa';
  const messages = (await import(`../messages/${locale}.json`)).default;
  return { locale, messages };
});
