import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'
import { DEFAULT_LOCALE, LOCALE_COOKIE, isSupportedLocale } from '@core/lib/i18n-config'

const context = (require as any).context('../messages', true, /^\.\/[a-z]+\/[^/]+\.json$/)

function loadMessages(locale: string) {
  const messages: Record<string, unknown> = {}
  for (const key of context.keys() as string[]) {
    const [, fileLocale, file] = key.split('/')
    if (fileLocale !== locale) continue
    messages[file.replace(/\.json$/, '')] = context(key)
  }
  return messages
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const requested = cookieStore.get(LOCALE_COOKIE)?.value
  const locale = isSupportedLocale(requested) ? requested : DEFAULT_LOCALE
  return { locale, messages: loadMessages(locale) }
})
