/**
 * Defense-in-depth sanitization for user-submitted comment text.
 *
 * XSS strategy (the most important thing in this feature):
 * comment bodies are NEVER rendered as HTML. The client interpolates them as
 * text (`{{ body }}`), which Vue auto-escapes, and they are never passed to
 * `v-html`. So the primary XSS defense is "render as text".
 *
 * This function is the SECOND layer, applied on every write (create + edit)
 * before persisting/broadcasting. It does not try to parse HTML; it normalizes
 * the text and strips characters that have no business in a comment and are
 * commonly used to obfuscate payloads or spoof content:
 *
 * - Control characters (except tab/newline) and the DEL char.
 * - Zero-width and bidi-override characters (U+200B-200F, U+202A-202E, U+2060,
 *   U+FEFF), which can hide text or visually reverse it to spoof mentions/urls.
 * - Windows/Mac newlines are normalized to \n.
 * - Runs of 3+ blank lines are collapsed to a maximum of 2.
 *
 * It intentionally does NOT HTML-escape here: escaping is the renderer's job,
 * and double-escaping stored text would corrupt round-tripping in the edit box.
 */

// Control chars C0/C1 and DEL, but keep \t (\x09) and \n (\x0A). Matching
// control characters here is intentional: this regex exists precisely to strip
// them from untrusted input.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g
// Zero-width, word-joiner, BOM, and bidi embedding/override characters.
const INVISIBLE_AND_BIDI = /[\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/g

/**
 * Normalize and strip dangerous/invisible characters from a comment body.
 * Returns the cleaned string (may be empty; callers validate non-empty).
 */
export function sanitizeCommentBody(input: string): string {
  return input
    .replace(/\r\n?/g, '\n') // CRLF / CR -> LF
    .replace(CONTROL_CHARS, '')
    .replace(INVISIBLE_AND_BIDI, '')
    .replace(/[ \t]+\n/g, '\n') // trim trailing spaces on each line
    .replace(/\n{3,}/g, '\n\n') // collapse 3+ blank lines to one blank line
    .trim()
}
