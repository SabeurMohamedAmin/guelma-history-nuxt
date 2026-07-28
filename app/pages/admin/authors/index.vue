<script setup lang="ts">
import type { AdminAuthor } from '~/composables/useAuthors'

definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
})

const { t, locale } = useI18n()
const localePath = useLocalePath()
const { authors, pending, error, fetchAll, deleteAuthor } = useAuthors()

// Local UI state
const search = ref('')
const deleteDialog = ref(false)
const deleting = ref(false)
const toDelete = ref<AdminAuthor | null>(null)
const snackbar = ref<{ show: boolean, text: string, color: string }>({ show: false, text: '', color: 'success' })

// Helpers
const authorName = (item: AdminAuthor) =>
  (locale.value === 'fr' ? item.nameFr : item.nameAr) || item.nameAr || item.nameFr

const secondaryName = (item: AdminAuthor) =>
  locale.value === 'fr' ? item.nameAr : item.nameFr

const initials = (item: AdminAuthor) => {
  const name = authorName(item).trim()
  return name ? name.charAt(0).toUpperCase() : '?'
}

function bio(item: AdminAuthor): string {
  return (locale.value === 'fr' ? item.bioFr : item.bioAr) ?? ''
}

function notify(text: string, color: 'success' | 'error' = 'success') {
  snackbar.value = { show: true, text, color }
}

// Derived data
const stats = computed(() => {
  const total = authors.value.length
  const withArticles = authors.value.filter(a => a.articleCount > 0).length
  const articles = authors.value.reduce((sum, a) => sum + a.articleCount, 0)
  return { total, withArticles, articles }
})

const headers = computed(() => [
  { title: t('admin.authors.colName'), key: 'name' },
  { title: t('admin.authors.colBio'), key: 'bio', sortable: false },
  { title: t('admin.authors.colArticles'), key: 'articleCount', align: 'center' as const },
  { title: '', key: 'actions', align: 'end' as const, sortable: false, width: 110 },
])

// Navigation: create / edit live on dedicated pages addressed by slug.
function openCreate() {
  return navigateTo(localePath('/admin/authors/new'))
}

function openEdit(item: AdminAuthor) {
  return navigateTo(localePath(`/admin/authors/${item.slug}`))
}

// Delete stays inline: it is a quick, destructive action that benefits from a
// confirmation dialog without leaving the list.
function askDelete(item: AdminAuthor) {
  toDelete.value = item
  deleteDialog.value = true
}

async function confirmDelete() {
  if (!toDelete.value) return
  deleting.value = true
  try {
    await deleteAuthor(toDelete.value.slug)
    notify(t('admin.authors.deleted'))
    await fetchAll()
    deleteDialog.value = false
    toDelete.value = null
  }
  catch {
    notify(error.value || t('admin.authors.deleteFailed'), 'error')
  }
  finally {
    deleting.value = false
  }
}

onMounted(fetchAll)
</script>

<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between ga-4 mb-6">
      <div>
        <h1 class="text-headline-medium font-weight-bold">
          {{ t('admin.authors.title') }}
        </h1>
        <p class="text-body-2 text-medium-emphasis mt-1 mb-0">
          {{ t('admin.authors.subtitle') }}
        </p>
      </div>
      <v-btn
        color="primary"
        rounded="lg"
        prepend-icon="mdi-plus"
        class="text-none"
        @click="openCreate"
      >
        {{ t('admin.authors.new') }}
      </v-btn>
    </div>

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
            <v-icon icon="mdi-account-group-outline" />
          </v-avatar>
          <div>
            <div class="text-headline-small font-weight-bold">
              {{ stats.total }}
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ t('admin.authors.statTotal') }}
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
            <v-icon icon="mdi-account-edit-outline" />
          </v-avatar>
          <div>
            <div class="text-headline-small font-weight-bold">
              {{ stats.withArticles }}
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ t('admin.authors.statActive') }}
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
          color="info"
          class="pa-4 d-flex align-center ga-4"
        >
          <v-avatar
            color="info"
            variant="flat"
            size="44"
          >
            <v-icon icon="mdi-newspaper-variant-outline" />
          </v-avatar>
          <div>
            <div class="text-headline-small font-weight-bold">
              {{ stats.articles }}
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ t('admin.authors.statArticles') }}
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

    <v-card rounded="lg">
      <div class="pa-4">
        <v-text-field
          v-model="search"
          :placeholder="t('admin.authors.searchPlaceholder')"
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
        :items="authors"
        :search="search"
        :loading="pending"
        :no-data-text="t('admin.authors.empty')"
        :items-per-page="10"
      >
        <template #[`item.name`]="{ item }">
          <div class="d-flex align-center ga-3 py-1">
            <v-avatar
              size="40"
              color="primary"
              variant="tonal"
            >
              <v-img
                v-if="item.avatar"
                :src="item.avatar"
                :alt="authorName(item)"
                cover
              />
              <span class="font-weight-bold">{{ initials(item) }}</span>
            </v-avatar>
            <div>
              <div class="font-weight-medium">
                {{ authorName(item) }}
              </div>
              <div class="text-caption text-medium-emphasis">
                {{ secondaryName(item) }}
              </div>
            </div>
          </div>
        </template>

        <template #[`item.bio`]="{ item }">
          <div class="text-body-2 text-medium-emphasis author-bio">
            {{ bio(item) || '—' }}
          </div>
        </template>

        <template #[`item.articleCount`]="{ item }">
          <v-chip
            v-if="item.articleCount"
            size="small"
            variant="tonal"
            color="info"
          >
            {{ item.articleCount }}
            <span class="text-caption ms-1">
              ({{ item.publishedCount }} {{ t('admin.authors.published') }})
            </span>
          </v-chip>
          <span
            v-else
            class="text-medium-emphasis"
          >—</span>
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
              icon="mdi-account-off-outline"
              size="48"
              class="text-medium-emphasis mb-3"
            />
            <div class="text-subtitle-1 font-weight-medium">
              {{ t('admin.authors.empty') }}
            </div>
            <div class="text-body-2 text-medium-emphasis mb-4">
              {{ t('admin.authors.emptySubtitle') }}
            </div>
            <v-btn
              color="primary"
              variant="tonal"
              prepend-icon="mdi-plus"
              class="text-none"
              @click="openCreate"
            >
              {{ t('admin.authors.new') }}
            </v-btn>
          </div>
        </template>
      </v-data-table>
    </v-card>

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
            keypath="admin.authors.confirmDeleteText"
            tag="span"
          >
            <template #name>
              <strong>{{ toDelete ? authorName(toDelete) : '' }}</strong>
            </template>
          </i18n-t>
          <v-alert
            v-if="toDelete && toDelete.articleCount"
            type="warning"
            variant="tonal"
            density="compact"
            class="mt-3"
            rounded="lg"
          >
            {{ t('admin.authors.hasArticlesWarning', { count: toDelete.articleCount }) }}
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
            :disabled="!!(toDelete && toDelete.articleCount)"
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

<style scoped>
.author-bio {
  max-width: 360px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
