export interface Author {
  id: number
  nameAr: string
  nameFr: string
  slug: string
  bioAr: string | null
  bioFr: string | null
  avatar: string | null
  createdAt: Date
  updatedAt: Date
}
