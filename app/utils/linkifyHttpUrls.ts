export interface ArticleTextSegment {
  type: 'text' | 'link'
  text: string
  href?: string
}

const URL_PATTERN = /https?:\/\/[^\s<>"']+/gi
const TRAILING_PUNCTUATION = /[.,!?;:،؛؟)\]}]+$/u

/** Split article text into safe HTTP(S) links and ordinary text segments. */
export function linkifyHttpUrls(text: string): ArticleTextSegment[] {
  const segments: ArticleTextSegment[] = []
  let lastIndex = 0

  for (const match of text.matchAll(URL_PATTERN)) {
    const start = match.index
    if (start === undefined) continue

    const matchedUrl = match[0]
    const trailing = matchedUrl.match(TRAILING_PUNCTUATION)?.[0] ?? ''
    const urlText = trailing ? matchedUrl.slice(0, -trailing.length) : matchedUrl

    let href: string | null = null
    try {
      const parsed = new URL(urlText)
      if ((parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.hostname) {
        href = parsed.href
      }
    }
    catch {
      // Invalid URLs stay plain text.
    }

    if (!href || !urlText) continue

    if (start > lastIndex) {
      segments.push({ type: 'text', text: text.slice(lastIndex, start) })
    }

    segments.push({ type: 'link', text: urlText, href })
    lastIndex = start + urlText.length
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', text: text.slice(lastIndex) })
  }

  return segments.length ? segments : [{ type: 'text', text }]
}
