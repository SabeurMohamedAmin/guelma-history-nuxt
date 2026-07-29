// stores/articleFormStore.ts
import { defineStore } from 'pinia'
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { useFetch, useRouter } from '#app'
import type { ArticleResponse } from '~~/server/types/article.types'

interface SelectOption {
  id: number
  name: string
}

/** A single editable gallery item in the admin form. */
export interface MediaFormItem {
  type: 'image' | 'video' | 'youtube'
  url: string
  /** Cloudinary public id (empty for YouTube/manual URL items). */
  publicId: string
  /**
   * Cloudinary resource_type captured at upload time, so a later delete targets
   * the right asset kind. Null for YouTube links and manual URLs.
   */
  resourceType: 'image' | 'video' | null
  posterUrl: string
  captionAr: string
  captionFr: string
}

interface ArticleFormFields {
  titleAr: string
  titleFr: string
  slug: string
  excerptAr: string
  excerptFr: string
  bodyAr: string
  bodyFr: string
  coverImage: string
  categoryId: number | null
  authorId: number | null
  publishedAt: string | null
  readingTime: number | null
  media: MediaFormItem[]
}

interface FormValidationResult {
  valid: boolean
}

interface FormInstance {
  validate: () => Promise<FormValidationResult>
  resetValidation?: () => void
}

interface ApiError {
  statusCode?: number
  response?: {
    status?: number
  }
  data?: {
    message?: string
  }
}

const createEmptyFields = (): ArticleFormFields => ({
  titleAr: '',
  titleFr: '',
  slug: '',
  excerptAr: '',
  excerptFr: '',
  bodyAr: '',
  bodyFr: '',
  coverImage: '',
  categoryId: null,
  authorId: null,
  publishedAt: null,
  readingTime: null,
  media: [],
})

function toDatetimeLocal(value: string | Date | null | undefined): string | null {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function toIsoFromDatetimeLocal(value: string | null): string | null {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return date.toISOString()
}

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Largest value a `serial` (int4) primary key can hold. Categories, authors and
 * articles all use serial ids, so anything above this is not a real id.
 */
const MAX_SERIAL_ID = 2_147_483_647

/**
 * Normalize a relation id coming from a <v-select> into a number.
 *
 * The options carry numeric ids, but the component can hand the value back as a
 * digit string, while the API expects a number. Values outside 1..MAX_SERIAL_ID
 * (null, '', 0, NaN, a generated key) mean "no relation".
 */
function toId(value: unknown): number | null {
  const id = Number(value)
  if (Number.isSafeInteger(id) && id > 0 && id <= MAX_SERIAL_ID) return id

  // null and '' simply mean the select was cleared. Anything else is a value the
  // select should never have produced, so make it loud while developing rather
  // than posting an id the API is bound to reject.
  if (import.meta.dev && value !== null && value !== undefined && value !== '') {
    console.warn('[articleForm] not a usable relation id:', value, `(${typeof value})`)
  }

  return null
}

function getErrorMessage(error: unknown, fallback = 'An unexpected error occurred.'): string {
  const err = error as ApiError
  return err?.data?.message || fallback
}

function isNotFoundError(error: unknown): boolean {
  const err = error as ApiError
  return err?.statusCode === 404 || err?.response?.status === 404
}

export const useArticleFormStore = defineStore('articleForm', () => {
  const router = useRouter()

  /**
   * Flow configuration. The same store/form powers both the admin and author
   * article editors; only the API base, the option sources and the list path
   * differ. Defaults to the admin flow so existing admin pages are unchanged;
   * the author pages call `configureFlow('author')` on setup.
   */
  type ArticleFormFlow = 'admin' | 'author'

  const FLOW_CONFIG: Record<ArticleFormFlow, {
    apiBase: string
    listPath: string
    categoriesUrl: string
    authorsUrl: string
  }> = {
    admin: {
      apiBase: '/api/admin/articles',
      listPath: '/admin/articles',
      categoriesUrl: '/api/admin/categories',
      authorsUrl: '/api/admin/authors',
    },
    author: {
      apiBase: '/api/author/articles',
      listPath: '/author/articles',
      categoriesUrl: '/api/author/categories',
      authorsUrl: '/api/author/authors',
    },
  }

  const flow = ref<ArticleFormFlow>('admin')
  const config = computed(() => FLOW_CONFIG[flow.value])
  const listPath = computed(() => config.value.listPath)

  const formRef = ref<FormInstance | null>(null)
  const fields = reactive<ArticleFormFields>(createEmptyFields())

  /**
   * Bind the page's <v-form> from a template function ref. Vue types those
   * callbacks as `Element | ComponentPublicInstance | null`, so the narrowing
   * lives here once and the pages stay declarative: `:ref="store.setFormRef"`.
   */
  function setFormRef(el: unknown) {
    formRef.value = (el as FormInstance | null) ?? null
  }

  const slugManuallyEdited = ref(false)
  const loading = ref(false)
  const fetching = ref(false)
  // Number of media uploads currently in flight. Publishing is blocked while
  // this is > 0 so an article is never saved with an unresolved media URL.
  const uploadingMediaCount = ref(0)
  const notFound = ref(false)
  const serverError = ref<string | null>(null)
  const editingSlug = ref<string | null>(null)

  const isEditing = computed(() => editingSlug.value !== null)
  const isUploadingMedia = computed(() => uploadingMediaCount.value > 0)

  function beginMediaUpload() {
    uploadingMediaCount.value++
  }

  function endMediaUpload() {
    if (uploadingMediaCount.value > 0) uploadingMediaCount.value--
  }

  /**
   * Publish state, backed by `publishedAt`:
   * - published  → `publishedAt` holds a date
   * - pending    → `publishedAt` is null
   * Toggling on sets the date to "now" only when none is set yet, so an
   * existing/scheduled publish date is preserved.
   */
  const isPublished = computed<boolean>({
    get: () => fields.publishedAt !== null && fields.publishedAt !== '',
    set: (value) => {
      if (value) {
        if (!fields.publishedAt) fields.publishedAt = toDatetimeLocal(new Date())
      }
      else {
        fields.publishedAt = null
      }
    },
  })

  const { data: rawCategories } = useFetch<SelectOption[]>(() => config.value.categoriesUrl, {
    default: () => [],
  })

  const { data: rawAuthors } = useFetch<SelectOption[]>(() => config.value.authorsUrl, {
    default: () => [],
  })

  const categories = computed<SelectOption[]>(() =>
    Array.isArray(rawCategories.value) ? rawCategories.value : [],
  )

  const authors = computed<SelectOption[]>(() =>
    Array.isArray(rawAuthors.value) ? rawAuthors.value : [],
  )

  const rules = {
    required: (value: unknown) => !!value || 'This field is required',
    slug: (value: string) =>
      !value || /^[a-z0-9-]+$/.test(value) || 'Only lowercase letters, numbers and hyphens',
  }

  watch(
    () => fields.titleFr,
    (value) => {
      if (!slugManuallyEdited.value) {
        fields.slug = value ? toSlug(value) : ''
      }
    },
  )

  function clearStatus() {
    serverError.value = null
    notFound.value = false
  }

  function resetFields() {
    Object.assign(fields, createEmptyFields())
  }

  function resetForm() {
    resetFields()
    clearStatus()
    editingSlug.value = null
    slugManuallyEdited.value = false
    formRef.value?.resetValidation?.()
  }

  function hydrateForm(article: ArticleResponse) {
    fields.titleAr = article.titleAr ?? ''
    fields.titleFr = article.titleFr ?? ''
    fields.slug = article.slug ?? ''
    fields.excerptAr = article.excerptAr ?? ''
    fields.excerptFr = article.excerptFr ?? ''
    fields.bodyAr = article.bodyAr ?? ''
    fields.bodyFr = article.bodyFr ?? ''
    fields.coverImage = article.coverImage ?? ''
    // The response has no flat categoryId/authorId: the selects are bound to the
    // ids carried by the relation objects. Saving still sends categoryId /
    // authorId, see buildPayload().
    fields.categoryId = toId(article.category?.id)
    fields.authorId = toId(article.author?.id)
    fields.publishedAt = toDatetimeLocal(article.publishedAt)
    fields.readingTime = article.readingTime ?? null
    fields.media = (article.media ?? []).map(item => ({
      type: item.type,
      url: item.url ?? '',
      publicId: item.publicId ?? '',
      resourceType: item.resourceType ?? null,
      posterUrl: item.posterUrl ?? '',
      captionAr: item.captionAr ?? '',
      captionFr: item.captionFr ?? '',
    }))
  }

  function buildPayload() {
    return {
      titleAr: fields.titleAr.trim(),
      titleFr: fields.titleFr.trim(),
      slug: fields.slug.trim() || undefined,
      bodyAr: fields.bodyAr,
      bodyFr: fields.bodyFr,
      excerptAr: fields.excerptAr.trim() || null,
      excerptFr: fields.excerptFr.trim() || null,
      coverImage: fields.coverImage.trim() || null,
      categoryId: toId(fields.categoryId),
      authorId: toId(fields.authorId),
      readingTime: fields.readingTime && fields.readingTime > 0 ? fields.readingTime : undefined,
      publishedAt: toIsoFromDatetimeLocal(fields.publishedAt),
      // Keep only rows that actually have a URL, and persist their order.
      media: fields.media
        .filter(item => item.url.trim())
        .map((item, index) => ({
          type: item.type,
          url: item.url.trim(),
          publicId: item.publicId.trim() || null,
          resourceType: item.resourceType,
          posterUrl: item.posterUrl.trim() || null,
          captionAr: item.captionAr.trim() || null,
          captionFr: item.captionFr.trim() || null,
          position: index,
        })),
    }
  }

  /**
   * First required locale whose title or body is still empty, or null when
   * both locales are complete. The API requires the title AND the body in
   * both FR and AR, so a one-locale article can never be saved. FR is checked
   * first because it seeds the slug.
   */
  const incompleteTitleLocale = computed<'fr' | 'ar' | null>(() => {
    if (!fields.titleFr.trim() || !fields.bodyFr.trim()) return 'fr'
    if (!fields.titleAr.trim() || !fields.bodyAr.trim()) return 'ar'
    return null
  })

  /**
   * Point the store at a given flow (admin/author). Call once on page setup
   * before loading/submitting so the right endpoints and redirect are used.
   */
  function configureFlow(next: ArticleFormFlow) {
    flow.value = next
  }

  async function loadArticle(slug: string) {
    resetForm()
    editingSlug.value = slug
    fetching.value = true

    try {
      const article = await $fetch<ArticleResponse>(`${config.value.apiBase}/${slug}`)
      hydrateForm(article)
      slugManuallyEdited.value = true
    }
    catch (error: unknown) {
      if (isNotFoundError(error)) {
        notFound.value = true
      }
      else {
        serverError.value = getErrorMessage(error)
      }
    }
    finally {
      fetching.value = false
    }
  }

  async function submit() {
    if (!formRef.value) return

    clearStatus()

    // Don't publish while a media file is still uploading: its URL/publicId
    // would not yet be set on the item. The submit buttons are disabled in
    // this state, so this is just a safety net.
    if (isUploadingMedia.value) return

    // Only the open tab is rendered, so the form can validate a single title.
    // Switch to the locale that is still empty and validate again: its own
    // "required" rule then shows the error inline, instead of sending a payload
    // the server rejects with a 400.
    const incomplete = incompleteTitleLocale.value
    if (incomplete) {
      setLocale(incomplete)
      // The title input adopts the newly active locale's value on re-render, so
      // wait one tick before validating.
      await nextTick()
      await formRef.value.validate()
      return
    }

    const { valid } = await formRef.value.validate()
    if (!valid) return

    loading.value = true

    try {
      const payload = buildPayload()

      if (isEditing.value && editingSlug.value) {
        await $fetch(`${config.value.apiBase}/${editingSlug.value}`, {
          method: 'PATCH',
          body: payload,
        })

        editingSlug.value = fields.slug.trim() || editingSlug.value
      }
      else {
        await $fetch(config.value.apiBase, {
          method: 'POST',
          body: payload,
        })
      }

      await router.push(config.value.listPath)
    }
    catch (error: unknown) {
      serverError.value = getErrorMessage(error)
      // The console only shows "400 (Validation Error)": the useful part is the
      // list of failing fields in the response body, so print it while developing.
      if (import.meta.dev) console.error('[articleForm] save failed:', serverError.value)
    }
    finally {
      loading.value = false
    }
  }

  function markSlugEdited() {
    slugManuallyEdited.value = true
  }

  // ─── Locale-aware editing (Phase 1, UI layer) ───────────────────────────
  // The data model is bilingual + flat (titleFr/titleAr, bodyFr/bodyAr).
  // This layer lets the editor present FR | EN | AR tabs and per-locale
  // completion. English is read-only for now (`enabled: false`) until a
  // dedicated translations table lands.

  type EditableLocale = 'fr' | 'ar' | 'en'

  interface LocaleMeta {
    code: EditableLocale
    label: string
    dir: 'ltr' | 'rtl'
    enabled: boolean
  }

  const LOCALES: LocaleMeta[] = [
    { code: 'fr', label: 'FR', dir: 'ltr', enabled: true },
    { code: 'ar', label: 'AR', dir: 'rtl', enabled: true },
    { code: 'en', label: 'EN', dir: 'ltr', enabled: false },
  ]

  const activeLocale = ref<EditableLocale>('fr')

  function setLocale(code: EditableLocale) {
    const meta = LOCALES.find(l => l.code === code)
    if (meta?.enabled) activeLocale.value = code
  }

  /** Writing direction of the currently active locale (drives RTL inputs). */
  const activeDir = computed<'ltr' | 'rtl'>(
    () => LOCALES.find(l => l.code === activeLocale.value)?.dir ?? 'ltr',
  )

  /** Localized title bound to the active tab (maps onto the flat fields). */
  const activeTitle = computed<string>({
    get: () => (activeLocale.value === 'ar' ? fields.titleAr : fields.titleFr),
    set: (value) => {
      if (activeLocale.value === 'ar') fields.titleAr = value
      else fields.titleFr = value
    },
  })

  /** Localized excerpt bound to the active tab (maps onto the flat fields). */
  const activeExcerpt = computed<string>({
    get: () => (activeLocale.value === 'ar' ? fields.excerptAr : fields.excerptFr),
    set: (value) => {
      if (activeLocale.value === 'ar') fields.excerptAr = value
      else fields.excerptFr = value
    },
  })

  /** Localized body bound to the active tab (maps onto the flat fields). */
  const activeBody = computed<string>({
    get: () => (activeLocale.value === 'ar' ? fields.bodyAr : fields.bodyFr),
    set: (value) => {
      if (activeLocale.value === 'ar') fields.bodyAr = value
      else fields.bodyFr = value
    },
  })

  /**
   * Per-locale completion, used for the tab badges. Title, excerpt and body
   * are all localized, so each locale is scored on its own three fields.
   * English is always "missing".
   */
  function localeCompletion(code: EditableLocale) {
    if (code === 'en') return { filled: 0, total: 3, percent: 0, complete: false }

    const title = code === 'ar' ? fields.titleAr : fields.titleFr
    const excerpt = code === 'ar' ? fields.excerptAr : fields.excerptFr
    const body = code === 'ar' ? fields.bodyAr : fields.bodyFr
    const checks = [title.trim().length > 0, excerpt.trim().length > 0, body.trim().length > 0]
    const filled = checks.filter(Boolean).length
    const total = checks.length
    return { filled, total, percent: Math.round((filled / total) * 100), complete: filled === total }
  }

  const locales = computed(() =>
    LOCALES.map(meta => ({ ...meta, completion: localeCompletion(meta.code) })),
  )

  /** Copy the French title/excerpt/body into the active (non-FR) locale as a head start. */
  function copyFromFr() {
    if (activeLocale.value === 'fr') return
    if (activeLocale.value === 'ar') {
      fields.titleAr = fields.titleFr
      fields.excerptAr = fields.excerptFr
      fields.bodyAr = fields.bodyFr
    }
  }

  // ─── Media gallery helpers ──────────────────────────────────────────────
  function addMedia(type: MediaFormItem['type'] = 'image') {
    fields.media.push({ type, url: '', publicId: '', resourceType: null, posterUrl: '', captionAr: '', captionFr: '' })
  }

  function removeMedia(index: number) {
    fields.media.splice(index, 1)
  }

  function moveMedia(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= fields.media.length) return
    const [item] = fields.media.splice(index, 1)
    fields.media.splice(target, 0, item!)
  }

  return {
    formRef,
    setFormRef,
    fields,
    loading,
    fetching,
    notFound,
    isEditing,
    isUploadingMedia,
    beginMediaUpload,
    endMediaUpload,
    isPublished,
    editingSlug,
    serverError,
    listPath,
    categories,
    authors,
    rules,
    configureFlow,
    submit,
    loadArticle,
    resetForm,
    markSlugEdited,
    addMedia,
    removeMedia,
    moveMedia,
    // Locale-aware editing (Phase 1)
    activeLocale,
    activeDir,
    activeTitle,
    activeExcerpt,
    activeBody,
    locales,
    setLocale,
    copyFromFr,
  }
})
