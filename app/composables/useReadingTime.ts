export function useReadingTime(text: string) {
  // TODO: Implement reading time calculation
  const wordsPerMinute = 200
  const words = text.trim().split(/\s+/).length
  const minutes = Math.ceil(words / wordsPerMinute)

  return { minutes }
}
