<script setup lang="ts">
import type { Category } from '~~/shared/types/category'

definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
})

const { t, locale } = useI18n()
const {
  categories,
  pending,
  error,
  fetchAll,
  createCategory,
  updateCategory,
  deleteCategory,
} = useCategories()

// ── Local UI state ────────────────────────────────────────────────────────────
const search = ref('')
const dialog = ref(false)
const deleteDialog = ref(false)
const saving = ref(false)
const deleting = ref(false)
const editing = ref<Category | null>(null)
const toDelete = ref<Category | null>(null)
const formValid = ref(false)
const formRef = ref()
const snackbar = ref<{ show: boolean, text: string, color: string }>({ show: false, text: '', color: 'success' })

const form = reactive({
  nameAr: '',
  nameFr: '',
  slug: '',
  descriptionAr: '',
  descriptionFr: '',
  icon: '',
  coverImage: '',
  parentId: null as number | null,
})

// Track whether the user edited the slug manually so we stop auto-generating it.
const slugTouched = ref(false)

// ── Helpers ───────────────────────────────────────────────────────────────────
const categoryName = (item: Category) => (locale.value === 'fr' ? item.nameFr : item.nameAr) || item.nameAr || item.nameFr

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function notify(text: string, color: 'success' | 'error' = 'success') {
  snackbar.value = { show: true, text, color }
}

// ── Validation rules ──────────────────────────────────────────────────────────
const required = (v: string) => !!v?.trim() || t('admin.categories.required')

// ── Derived data ──────────────────────────────────────────────────────────────
const parentOptions = computed(() =>
  categories.value
    // A category cannot be its own parent.
    .filter(c => !editing.value || c.id !== editing.value.id)
    .map(c => ({ title: categoryName(c), value: c.id })),
)

const childrenCount = (id: number) => categories.value.filter(c => c.parentId === id).length

const stats = computed(() => {
  const total = categories.value.length
  const parents = categories.value.filter(c => !c.parentId).length
  return { total, parents, children: total - parents }
})

const headers = computed(() => [
  { title: t('admin.categories.colName'), key: 'name' },
  { title: t('admin.categories.colSlug'), key: 'slug' },
  { title: t('admin.categories.colParent'), key: 'parent', sortable: false },
  { title: t('admin.categories.colChildren'), key: 'children', align: 'center' as const, sortable: false },
  { title: '', key: 'actions', align: 'end' as const, sortable: false, width: 110 },
])

const parentName = (parentId: number | null) => {
  if (!parentId) return null
  const parent = categories.value.find(c => c.id === parentId)
  return parent ? categoryName(parent) : null
}

// Auto-generate slug from the French name while it has not been edited manually.
watch(() => form.nameFr, (value) => {
  if (!slugTouched.value) form.slug = slugify(value)
})

// ── Dialog handlers ───────────────────────────────────────────────────────────
function resetForm() {
  Object.assign(form, {
    nameAr: '',
    nameFr: '',
    slug: '',
    descriptionAr: '',
    descriptionFr: '',
    icon: '',
    coverImage: '',
    parentId: null,
  })
  slugTouched.value = false
  formRef.value?.resetValidation?.()
}

function openCreate() {
  editing.value = null
  resetForm()
  dialog.value = true
}

function openEdit(item: Category) {
  editing.value = item
  Object.assign(form, {
    nameAr: item.nameAr,
    nameFr: item.nameFr,
    slug: item.slug,
    descriptionAr: item.descriptionAr ?? '',
    descriptionFr: item.descriptionFr ?? '',
    icon: item.icon ?? '',
    coverImage: item.coverImage ?? '',
    parentId: item.parentId,
  })
  slugTouched.value = true
  dialog.value = true
}

function askDelete(item: Category) {
  toDelete.value = item
  deleteDialog.value = true
}

async function submit() {
  const { valid } = await formRef.value.validate()
  if (!valid) return

  const payload = {
    nameAr: form.nameAr.trim(),
    nameFr: form.nameFr.trim(),
    slug: (form.slug.trim() || slugify(form.nameFr)),
    descriptionAr: form.descriptionAr.trim() || null,
    descriptionFr: form.descriptionFr.trim() || null,
    icon: form.icon.trim() || null,
    coverImage: form.coverImage.trim() || null,
    parentId: form.parentId,
  }

  saving.value = true
  try {
    if (editing.value) {
      await updateCategory(editing.value.id, payload)
      notify(t('admin.categories.updated'))
    }
    else {
      await createCategory(payload)
      notify(t('admin.categories.created'))
    }
    dialog.value = false
    await fetchAll()
  }
  catch {
    notify(t('admin.categories.saveFailed'), 'error')
  }
  finally {
    saving.value = false
  }
}

async function confirmDelete() {
  if (!toDelete.value) return
  deleting.value = true
  try {
    await deleteCategory(toDelete.value.id)
    notify(t('admin.categories.deleted'))
    await fetchAll()
  }
  catch {
    notify(t('admin.categories.deleteFailed'), 'error')
  }
  finally {
    deleting.value = false
    deleteDialog.value = false
    toDelete.value = null
  }
}

onMounted(fetchAll)
</script>

<template>
  <div>
    <!-- Header -->
    <div class="d-flex flex-wrap align-center justify-space-between ga-4 mb-6">
      <div>
        <h1 class="text-headline-medium font-weight-bold">
          {{ t('nav.categories') }}
        </h1>
        <p class="text-body-2 text-medium-emphasis mt-1 mb-0">
          {{ t('admin.categories.subtitle') }}
        </p>
      </div>
      <v-btn
        color="primary"
        rounded="lg"
        prepend-icon="mdi-plus"
        class="text-none"
        @click="openCreate"
      >
        {{ t('admin.categories.new') }}
      </v-btn>
    </div>

    <!-- Stats -->
    <v-row class="mb-2">
      <v-col
        cols="12"
        sm="4"
      >
        <v-card
          rounded="lg"
          variant="tonal"
          color="primary"
          class="pa-4 d-flex align-center ga-4"
        >
          <v-avatar
            color="primary"
            variant="flat"
            size="44"
          >
            <v-icon icon="mdi-folder-multiple-outline" />
          </v-avatar>
          <div>
            <div class="text-headline-small font-weight-bold">
              {{ stats.total }}
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ t('admin.categories.statTotal') }}
            </div>
          </div>
        </v-card>
      </v-col>
      <v-col
        cols="12"
        sm="4"
      >
        <v-card
          rounded="lg"
          variant="tonal"
          class="pa-4 d-flex align-center ga-4"
        >
          <v-avatar
            color="secondary"
            variant="flat"
            size="44"
          >
            <v-icon icon="mdi-folder-outline" />
          </v-avatar>
          <div>
            <div class="text-headline-small font-weight-bold">
              {{ stats.parents }}
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ t('admin.categories.statParents') }}
            </div>
          </div>
        </v-card>
      </v-col>
      <v-col
        cols="12"
        sm="4"
      >
        <v-card
          rounded="lg"
          variant="tonal"
          class="pa-4 d-flex align-center ga-4"
        >
          <v-avatar
            color="info"
            variant="flat"
            size="44"
          >
            <v-icon icon="mdi-file-tree-outline" />
          </v-avatar>
          <div>
            <div class="text-headline-small font-weight-bold">
              {{ stats.children }}
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ t('admin.categories.statChildren') }}
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      density="compact"
      class="mb-4"
      rounded="lg"
    >
      {{ error }}
    </v-alert>

    <!-- Table -->
    <v-card rounded="lg">
      <div class="pa-4">
        <v-text-field
          v-model="search"
          :placeholder="t('admin.categories.searchPlaceholder')"
          prepend-inner-icon="mdi-magnify"
          variant="solo-filled"
          flat
          density="comfortable"
          hide-details
          clearable
          rounded="lg"
        />
      </div>

      <v-divider />

      <v-data-table
        :headers="headers"
        :items="categories"
        :search="search"
        :loading="pending"
        :no-data-text="t('admin.categories.empty')"
        :items-per-page="10"
        :custom-filter="undefined"
      >
        <template #[`item.name`]="{ item }">
          <div class="d-flex align-center ga-3 py-1">
            <v-avatar
              size="36"
              rounded="lg"
              color="primary"
              variant="tonal"
            >
              <v-icon
                :icon="item.icon || 'mdi-folder-outline'"
                size="20"
              />
            </v-avatar>
            <div>
              <div class="font-weight-medium">
                {{ categoryName(item) }}
              </div>
              <div class="text-caption text-medium-emphasis">
                {{ locale === 'fr' ? item.nameAr : item.nameFr }}
              </div>
            </div>
          </div>
        </template>

        <template #[`item.slug`]="{ item }">
          <code class="text-caption text-medium-emphasis">{{ item.slug }}</code>
        </template>

        <template #[`item.parent`]="{ item }">
          <v-chip
            v-if="parentName(item.parentId)"
            size="small"
            variant="tonal"
            color="primary"
          >
            {{ parentName(item.parentId) }}
          </v-chip>
          <span
            v-else
            class="text-medium-emphasis"
          >&mdash;</span>
        </template>

        <template #[`item.children`]="{ item }">
          <v-chip
            v-if="childrenCount(item.id)"
            size="small"
            variant="flat"
            color="info"
          >
            {{ childrenCount(item.id) }}
          </v-chip>
          <span
            v-else
            class="text-medium-emphasis"
          >&mdash;</span>
        </template>

        <template #[`item.actions`]="{ item }">
          <v-btn
            icon="mdi-pencil"
            variant="text"
            size="small"
            :aria-label="t('common.edit')"
            @click="openEdit(item)"
          />
          <v-btn
            icon="mdi-delete"
            variant="text"
            size="small"
            color="error"
            :aria-label="t('common.delete')"
            @click="askDelete(item)"
          />
        </template>

        <template #no-data>
          <div class="py-12 text-center">
            <v-icon
              icon="mdi-folder-off-outline"
              size="48"
              class="text-medium-emphasis mb-3"
            />
            <div class="text-subtitle-1 font-weight-medium">
              {{ t('admin.categories.empty') }}
            </div>
            <div class="text-body-2 text-medium-emphasis mb-4">
              {{ t('admin.categories.emptySubtitle') }}
            </div>
            <v-btn
              color="primary"
              variant="tonal"
              prepend-icon="mdi-plus"
              class="text-none"
              @click="openCreate"
            >
              {{ t('admin.categories.new') }}
            </v-btn>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Create / edit dialog -->
    <v-dialog
      v-model="dialog"
      max-width="760"
      scrollable
    >
      <v-card rounded="lg">
        <v-card-title class="d-flex align-center ga-3 pa-5">
          <v-avatar
            color="primary"
            variant="tonal"
            rounded="lg"
          >
            <v-icon :icon="editing ? 'mdi-pencil' : 'mdi-folder-plus-outline'" />
          </v-avatar>
          <span class="text-headline-small">
            {{ editing ? t('admin.categories.editTitle') : t('admin.categories.createTitle') }}
          </span>
        </v-card-title>

        <v-divider />

        <v-card-text class="pa-5">
          <v-form
            ref="formRef"
            v-model="formValid"
            @submit.prevent="submit"
          >
            <v-row density="compact">
              <v-col
                cols="12"
                md="6"
              >
                <v-text-field
                  v-model="form.nameFr"
                  :label="t('admin.categories.nameFr')"
                  :rules="[required]"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col
                cols="12"
                md="6"
              >
                <v-text-field
                  v-model="form.nameAr"
                  :label="t('admin.categories.nameAr')"
                  :rules="[required]"
                  variant="outlined"
                  density="comfortable"
                  dir="rtl"
                />
              </v-col>

              <v-col
                cols="12"
                md="6"
              >
                <v-text-field
                  v-model="form.slug"
                  :label="t('admin.categories.slug')"
                  :hint="t('admin.categories.slugHint')"
                  :rules="[required]"
                  persistent-hint
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-link-variant"
                  @update:model-value="slugTouched = true"
                />
              </v-col>
              <v-col
                cols="12"
                md="6"
              >
                <v-select
                  v-model="form.parentId"
                  :items="parentOptions"
                  :label="t('admin.categories.parent')"
                  :hint="t('admin.categories.parentHint')"
                  persistent-hint
                  clearable
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-file-tree-outline"
                />
              </v-col>

              <v-col
                cols="12"
                md="6"
              >
                <v-text-field
                  v-model="form.icon"
                  :label="t('admin.categories.icon')"
                  :hint="t('admin.categories.iconHint')"
                  persistent-hint
                  variant="outlined"
                  density="comfortable"
                  :prepend-inner-icon="form.icon || 'mdi-shape-outline'"
                />
              </v-col>
              <v-col
                cols="12"
                md="6"
              >
                <v-text-field
                  v-model="form.coverImage"
                  :label="t('admin.categories.coverImage')"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-image-outline"
                />
              </v-col>

              <v-col
                cols="12"
                md="6"
              >
                <v-textarea
                  v-model="form.descriptionFr"
                  :label="t('admin.categories.descriptionFr')"
                  rows="3"
                  auto-grow
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col
                cols="12"
                md="6"
              >
                <v-textarea
                  v-model="form.descriptionAr"
                  :label="t('admin.categories.descriptionAr')"
                  rows="3"
                  auto-grow
                  variant="outlined"
                  density="comfortable"
                  dir="rtl"
                />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn
            variant="text"
            class="text-none"
            @click="dialog = false"
          >
            {{ t('common.cancel') }}
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            class="text-none"
            :loading="saving"
            @click="submit"
          >
            {{ t('common.save') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete confirmation -->
    <v-dialog
      v-model="deleteDialog"
      max-width="440"
    >
      <v-card rounded="lg">
        <v-card-title class="text-headline-small pt-5 px-5">
          {{ t('admin.confirmDelete') }}
        </v-card-title>
        <v-card-text class="px-5">
          <i18n-t
            keypath="admin.categories.confirmDeleteText"
            tag="span"
          >
            <template #name>
              <strong>{{ toDelete ? categoryName(toDelete) : '' }}</strong>
            </template>
          </i18n-t>
          <v-alert
            v-if="toDelete && childrenCount(toDelete.id)"
            type="warning"
            variant="tonal"
            density="compact"
            class="mt-3"
            rounded="lg"
          >
            {{ t('admin.categories.hasChildrenWarning', { count: childrenCount(toDelete.id) }) }}
          </v-alert>
        </v-card-text>
        <v-card-actions class="pb-4 px-4">
          <v-spacer />
          <v-btn
            variant="text"
            class="text-none"
            @click="deleteDialog = false"
          >
            {{ t('common.cancel') }}
          </v-btn>
          <v-btn
            color="error"
            variant="flat"
            class="text-none"
            :loading="deleting"
            @click="confirmDelete"
          >
            {{ t('common.delete') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      location="bottom"
      timeout="3000"
    >
      {{ snackbar.text }}
    </v-snackbar>
  </div>
</template>
