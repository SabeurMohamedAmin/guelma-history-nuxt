<script setup lang="ts">
/**
 * Presentational author form, shared by the create and edit pages.
 *
 * It owns no data fetching: the parent passes the current values via
 * v-model and the bilingual fields, and listens for `submit` / `cancel`.
 * Validation lives here so both pages behave identically.
 */
import type { CreateAuthorDto } from '~/composables/useAuthors'

const props = defineProps<{
  modelValue: CreateAuthorDto
  saving?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: CreateAuthorDto]
  'submit': []
  'cancel': []
}>()

const { t } = useI18n()

const formRef = ref()
const valid = ref(false)

// Local editable copy kept in sync with the parent through v-model.
const form = reactive<CreateAuthorDto>({ ...props.modelValue })

watch(
  () => props.modelValue,
  value => Object.assign(form, value),
  { deep: true },
)

watch(
  form,
  value => emit('update:modelValue', { ...value }),
  { deep: true },
)

const required = (v: string) => !!v?.trim() || t('admin.authors.required')

async function onSubmit() {
  const { valid: isValid } = await formRef.value.validate()
  if (isValid) emit('submit')
}

// Exposed so parents can reset validation after a successful save.
defineExpose({
  validate: () => formRef.value?.validate(),
  resetValidation: () => formRef.value?.resetValidation(),
})
</script>

<template>
  <v-form
    ref="formRef"
    v-model="valid"
    @submit.prevent="onSubmit"
  >
    <div class="d-flex justify-center mb-5">
      <v-avatar
        size="88"
        color="primary"
        variant="tonal"
      >
        <v-img
          v-if="form.avatar"
          :src="form.avatar"
          alt=""
          cover
        />
        <v-icon
          v-else
          icon="mdi-account"
          size="40"
        />
      </v-avatar>
    </div>

    <v-row density="compact">
      <v-col
        cols="12"
        md="6"
      >
        <v-text-field
          v-model="form.nameFr"
          :label="t('admin.authors.nameFr')"
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
          :label="t('admin.authors.nameAr')"
          :rules="[required]"
          variant="outlined"
          density="comfortable"
          dir="rtl"
        />
      </v-col>

      <v-col cols="12">
        <v-text-field
          v-model="form.avatar"
          :label="t('admin.authors.avatar')"
          :hint="t('admin.authors.avatarHint')"
          persistent-hint
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
          v-model="form.bioFr"
          :label="t('admin.authors.bioFr')"
          rows="4"
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
          v-model="form.bioAr"
          :label="t('admin.authors.bioAr')"
          rows="4"
          auto-grow
          variant="outlined"
          density="comfortable"
          dir="rtl"
        />
      </v-col>
    </v-row>

    <div class="d-flex justify-end ga-2 mt-4">
      <v-btn
        variant="text"
        class="text-none"
        @click="emit('cancel')"
      >
        {{ t('common.cancel') }}
      </v-btn>
      <v-btn
        type="submit"
        color="primary"
        variant="flat"
        class="text-none"
        :loading="saving"
      >
        {{ t('common.save') }}
      </v-btn>
    </div>
  </v-form>
</template>
