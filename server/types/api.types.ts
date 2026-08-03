export interface ApiSuccess<T> {
  data: T
}

export interface ApiPaginationMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface ApiPaginatedSuccess<T> {
  data: T[]
  meta: ApiPaginationMeta
}

export interface ApiFieldError {
  field: string
  message: string
}

export interface ApiErrorBody {
  error: {
    code: string
    message: string
    fields: ApiFieldError[] | null
    requestId: string
  }
}
