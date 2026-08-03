type AuthorRow = {
  id: string
  nameAr: string
  nameFr: string
  slug: string
  bioAr?: string | null
  bioFr?: string | null
  avatar?: string | null
  createdAt?: Date
  updatedAt?: Date
  articleCount?: number
  publishedCount?: number
}

export function serializeMobileAuthor(author: AuthorRow) {
  return {
    ...author,
    createdAt: author.createdAt?.toISOString() ?? null,
    updatedAt: author.updatedAt?.toISOString() ?? null,
  }
}
