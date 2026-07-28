export interface Category {
  id: number
  nameAr: string
  nameFr: string
  slug: string
  descriptionAr: string | null
  descriptionFr: string | null
  icon: string | null
  coverImage: string | null
  parentId: number | null
  createdAt: Date
  updatedAt: Date
}

export type CategoryTree = Category & {
  children: CategoryTree[]
  articleCount?: number
}

/** Lightweight category metadata returned alongside a category's article list. */
export interface CategoryMeta {
  id: number
  slug: string
  nameAr: string
  nameFr: string
  descriptionAr: string | null
  descriptionFr: string | null
  icon: string | null
  coverImage: string | null
}
