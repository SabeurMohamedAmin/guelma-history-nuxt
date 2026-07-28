<script setup lang="ts">
import type { CreateAuthorDto } from '~/composables/useAuthors'

definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
})

const { t } = useI18n()
const localePath = useLocalePath()
const { createAuthor, error } = useAuthors()

const saving = ref(false)
const form = ref<CreateAuthorDto>({
  nameFr: '',
  nameAr: '',
  bioFr: '',
  bioAr: '',
  avatar: '',
})

function goToList() {
  return navigateTo(localePath('/admin/authors'))
}

async function save() {
  saving.value = true
  try {
    await createAuthor({
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
</script>

<template>
  <div class="pa-1">
    <div class="d-flex align-center ga-3 mb-6">
      <v-btn
        icon="mdi-arrow-left"
        variant="text"
        :aria-label="t('common.back')"
        :to="localePath('/admin/authors')"
      />
      <div>
        <h1 class="text-headline-small font-weight-bold">
          {{ t('admin.authors.createTitle') }}
        </h1>
        <p class="text-body-2 text-medium-emphasis mb-0">
          {{ t('admin.authors.subtitle') }}
        </p>
      </div>
    </div>

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
  </div>
</template>
