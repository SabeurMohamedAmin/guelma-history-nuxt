/**
 * Single source of truth for the application's role hierarchy.
 *
 * Roles are NOT a flat list: they are ordered and higher roles inherit every
 * ability of the roles below them.
 *
 *   user  <  author  <  admin
 *
 * - user   : can comment and reply on articles.
 * - author : everything a user can do, plus create articles.
 * - admin  : everything an author can do, plus full control.
 *
 * "guest" is intentionally NOT in this list. A guest is the absence of a
 * session (what getUserSession() returns when nobody is logged in), so it is
 * represented as `null` everywhere rather than a stored role.
 *
 * This module is pure and dependency-free so it can be imported from both the
 * server (`server/`) and the client (`app/`).
 */

/** Every role that can be stored in the database, lowest privilege first. */
export const ROLES = ['user', 'author', 'admin'] as const

export type Role = (typeof ROLES)[number]

/**
 * Rank of each role within the hierarchy. A higher number means more
 * privileges. Used to answer "does role X satisfy requirement Y?".
 */
const ROLE_RANK: Record<Role, number> = {
  user: 0,
  author: 1,
  admin: 2,
}

/** Type guard: is the given value one of the known roles? */
export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value)
}

/**
 * Does `actual` satisfy the `required` role, taking inheritance into account?
 *
 * Because higher roles inherit lower abilities, an admin satisfies an `author`
 * or `user` requirement, and an author satisfies a `user` requirement.
 *
 *   hasRole('admin', 'user')   // true  (admin inherits user)
 *   hasRole('author', 'admin') // false (author is below admin)
 *   hasRole('user', 'user')    // true  (same role)
 *
 * Pass `null` for `actual` to represent a guest (no session); a guest never
 * satisfies any role requirement.
 */
export function hasRole(actual: Role | null | undefined, required: Role): boolean {
  if (!isRole(actual)) return false
  return ROLE_RANK[actual] >= ROLE_RANK[required]
}
