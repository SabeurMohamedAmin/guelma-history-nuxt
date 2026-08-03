type CategoryRow = {
  id: string
  nameAr: string
  nameFr: string
  slug: string
  descriptionAr: string | null
  descriptionFr: string | null
  icon: string | null
  coverImage: string | null
  parentId: string | null
  createdAt: Date
  updatedAt: Date
}

export function serializeMobileCategory(category: CategoryRow) {
  return {
    ...category,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  }
}
