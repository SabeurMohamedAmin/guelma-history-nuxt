<script setup lang="ts">
import type { CreateAuthorDto } from '~/composables/useAuthors'

definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
})

const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const { fetchOne, updateAuthor, error } = useAuthors()

const slug = computed(() => String(route.params.slug))

const loading = ref(true)
const saving = ref(false)
const notFound = ref(false)
const form = ref<CreateAuthorDto>({
  nameFr: '',
  nameAr: '',
  bioFr: '',
  bioAr: '',
  avatar: '',
})

async function load() {
  loading.value = true
  notFound.value = false
  try {
    const author = await fetchOne(slug.value)
    form.value = {
      nameFr: author.nameFr,
      nameAr: author.nameAr,
      bioFr: author.bioFr ?? '',
      bioAr: author.bioAr ?? '',
      avatar: author.avatar ?? '',
    }
  }
  catch (err: unknown) {
    const status = (err as { statusCode?: number, response?: { status?: number } })?.statusCode
      ?? (err as { response?: { status?: number } })?.response?.status
    if (status === 404) {
      notFound.value = true
    }
  }
  finally {
    loading.value = false
  }
}

function goToList() {
  return navigateTo(localePath('/admin/authors'))
}

async function save() {
  saving.value = true
  try {
    await updateAuthor(slug.value, {
      nameFr: form.value.nameFr.trim(),
      nameAr: form.value.nameAr.trim(),
      bioFr: form.value.bioFr?.trim() || null,
      bioAr: form.value.bioAr?.trim() || null,
      avatar: form.value.avatar?.trim() || null,
    })
    await goToList()
  }
  catch {
    // error ref is populated by the composable and shown in the alert below.
  }
  finally {
    saving.value = false
  }
}

// Load on mount and whenever the slug changes.
watch(slug, load, { immediate: true })
</script>

<template>
  <div class="pa-2">
    <div class="d-flex align-center ga-3 mb-6">
      <v-btn
        icon="mdi-arrow-left"
        variant="text"
        :aria-label="t('common.back')"
        :to="localePath('/admin/authors')"
      />
      <div>
        <h1 class="text-headline-small font-weight-bold">
          {{ t('admin.authors.editTitle') }}
        </h1>
        <p class="text-body-2 text-medium-emphasis mb-0">
          {{ t('admin.authors.subtitle') }}
        </p>
      </div>
    </div>

    <!-- Loading -->
    <v-card
      v-if="loading"
      rounded="lg"
      class="pa-5"
      max-width="720"
    >
      <v-skeleton-loader
        type="avatar"
        class="mx-auto mb-4"
      />
      <v-skeleton-loader
        type="text@2"
        class="mb-2"
      />
      <v-skeleton-loader type="text@2" />
    </v-card>

    <!-- Not found -->
    <v-card
      v-else-if="notFound"
      variant="outlined"
      class="pa-8 text-center mx-auto"
      max-width="480"
      rounded="lg"
    >
      <v-icon
        icon="mdi-account-search-outline"
        size="56"
        color="medium-emphasis"
        class="mb-4"
      />
      <h2 class="text-headline-small font-weight-medium mb-2">
        {{ t('admin.authors.notFoundTitle') }}
      </h2>
      <p class="text-body-2 text-medium-emphasis mb-6">
        {{ t('admin.authors.notFoundText', { slug }) }}
      </p>
      <v-btn
        color="primary"
        variant="flat"
        prepend-icon="mdi-arrow-left"
        :to="localePath('/admin/authors')"
      >
        {{ t('admin.authors.backToList') }}
      </v-btn>
    </v-card>

    <!-- Edit form -->
    <template v-else>
      <v-alert
        v-if="error"
        type="error"
        variant="tonal"
        class="mb-4"
        rounded="lg"
      >
        {{ error }}
      </v-alert>

      <v-card
        rounded="lg"
        class="pa-5"
        max-width="720"
      >
        <AdminAuthorForm
          v-model="form"
          :saving="saving"
          @submit="save"
          @cancel="goToList"
        />
      </v-card>
    </template>
  </div>
</template>
