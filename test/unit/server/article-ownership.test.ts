import type { H3Event } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findUser: vi.fn(),
  findArticle: vi.fn(),
  getSession: vi.fn(),
  clearSession: vi.fn(),
}))

vi.mock('~~/server/db', () => ({
  db: {
    query: {
      users: { findFirst: mocks.findUser },
      articles: { findFirst: mocks.findArticle },
    },
  },
}))

vi.mock('~~/server/db/schema/users', () => ({
  users: { id: 'users.id' },
}))

vi.mock('~~/server/db/schema/articles', () => ({
  articles: { id: 'articles.id', createdByUserId: 'articles.createdByUserId' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((column, value) => ({ column, value })),
  or: vi.fn((...conditions) => conditions),
  sql: vi.fn(),
}))

vi.mock('~~/server/utils/password', () => ({
  DUMMY_PASSWORD_HASH: 'test-dummy-hash',
  verifyPasswordHash: vi.fn(),
}))

Object.assign(globalThis, {
  getUserSession: mocks.getSession,
  clearUserSession: mocks.clearSession,
  createError: (input: { statusCode: number, statusMessage?: string, message?: string }) => {
    const error = new Error(input.message ?? input.statusMessage ?? 'Error') as Error & { statusCode: number }
    error.statusCode = input.statusCode
    return error
  },
})

const { requireArticleOwner } = await import('~~/server/utils/auth')

function account(role: 'user' | 'author' | 'admin' = 'author') {
  return {
    id: `${role}-1`,
    username: `${role}-test`,
    email: `${role}@example.test`,
    displayName: null,
    avatarData: null,
    avatarMimeType: null,
    avatarUpdatedAt: null,
    role,
    profileCompleted: true,
    passwordChangedAt: null,
  }
}

describe('requireArticleOwner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getSession.mockResolvedValue({
      user: { id: 'author-1', role: 'author' },
      loggedInAt: new Date().toISOString(),
    })
    mocks.findUser.mockResolvedValue(account('author'))
    mocks.findArticle.mockResolvedValue({ createdByUserId: 'author-1' })
  })

  it('allows an author to manage an article they created', async () => {
    await expect(requireArticleOwner({} as H3Event, 'article-1'))
      .resolves.toMatchObject({ id: 'author-1', role: 'author' })
    expect(mocks.findArticle).toHaveBeenCalledOnce()
  })

  it('rejects an author who does not own the article', async () => {
    mocks.findArticle.mockResolvedValue({ createdByUserId: 'another-author' })

    await expect(requireArticleOwner({} as H3Event, 'article-1'))
      .rejects.toMatchObject({ statusCode: 403 })
  })

  it('returns not found when the article does not exist', async () => {
    mocks.findArticle.mockResolvedValue(undefined)

    await expect(requireArticleOwner({} as H3Event, 'missing-article'))
      .rejects.toMatchObject({ statusCode: 404 })
  })

  it('allows an admin to manage an article without checking ownership', async () => {
    mocks.getSession.mockResolvedValue({
      user: { id: 'admin-1', role: 'admin' },
      loggedInAt: new Date().toISOString(),
    })
    mocks.findUser.mockResolvedValue(account('admin'))

    await expect(requireArticleOwner({} as H3Event, 'article-1'))
      .resolves.toMatchObject({ id: 'admin-1', role: 'admin' })
    expect(mocks.findArticle).not.toHaveBeenCalled()
  })

  it('rejects a regular user before looking up article ownership', async () => {
    mocks.getSession.mockResolvedValue({
      user: { id: 'user-1', role: 'user' },
      loggedInAt: new Date().toISOString(),
    })
    mocks.findUser.mockResolvedValue(account('user'))

    await expect(requireArticleOwner({} as H3Event, 'article-1'))
      .rejects.toMatchObject({ statusCode: 403 })
    expect(mocks.findArticle).not.toHaveBeenCalled()
  })
})
