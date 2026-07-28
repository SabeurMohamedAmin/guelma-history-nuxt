<script setup lang="ts">
// The article's public slug — the stable identifier used across the API.
const props = defineProps<{ articleSlug: string }>()
const { locale } = useI18n()
const isFrench = computed(() => locale.value === 'fr')
const form = reactive({ name: '', email: '', section: '', message: '' })
const loading = ref(false)
const sent = ref(false)
const errorMessage = ref('')
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const isValid = computed(() => form.name.trim().length >= 2 && emailRe.test(form.email.trim()) && form.message.trim().length >= 10)

const submit = async () => {
  if (!isValid.value || loading.value) return
  loading.value = true
  errorMessage.value = ''
  try {
    await $fetch('/api/articles/correction-requests', { method: 'POST', body: { articleSlug: props.articleSlug, name: form.name.trim(), email: form.email.trim().toLowerCase(), section: form.section.trim(), message: form.message.trim() } })
    sent.value = true
    form.name = ''
    form.email = ''
    form.section = ''
    form.message = ''
  }
  catch (error: unknown) {
    const e = error as { data?: { message?: string, statusMessage?: string }, message?: string }
    errorMessage.value = e?.data?.message || e?.data?.statusMessage || e?.message || (isFrench.value ? 'Impossible d’envoyer la demande.' : 'تعذر إرسال الطلب.')
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <v-card
    class="correction-card rounded-xl"
    variant="flat"
  >
    <div class="d-flex align-center ga-3 mb-4">
      <v-avatar
        color="warning"
        variant="tonal"
      >
        <v-icon icon="mdi-file-document-edit-outline" />
      </v-avatar>
      <div>
        <p class="section-kicker mb-1">
          {{ isFrench ? 'Contribution' : 'مساهمة' }}
        </p><h2 class="text-headline-small font-weight-bold">
          {{ isFrench ? 'Demander une correction' : 'طلب تصحيح المقال' }}
        </h2>
      </div>
    </div>
    <p class="text-body-2 text-medium-emphasis mb-5">
      {{ isFrench ? 'Signalez une date, un nom, une source ou un passage à améliorer.' : 'أبلغنا عن تاريخ أو اسم أو مصدر أو فقرة تحتاج إلى تحسين.' }}
    </p>
    <v-alert
      v-if="sent"
      type="success"
      variant="tonal"
      density="comfortable"
      class="mb-5"
      closable
      @click:close="sent = false"
    >
      {{ isFrench ? 'Votre demande a été envoyée. Merci pour votre aide.' : 'تم إرسال طلبك. شكرا لمساعدتك.' }}
    </v-alert>
    <v-form @submit.prevent="submit">
      <v-row>
        <v-col
          cols="12"
          md="6"
        >
          <v-text-field
            v-model="form.name"
            :label="isFrench ? 'Nom' : 'الاسم'"
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-account-outline"
          />
        </v-col>
        <v-col
          cols="12"
          md="6"
        >
          <v-text-field
            v-model="form.email"
            :label="isFrench ? 'Email' : 'البريد الإلكتروني'"
            type="email"
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-email-outline"
          />
        </v-col>
      </v-row>
      <v-text-field
        v-model="form.section"
        :label="isFrench ? 'Passage concerné (optionnel)' : 'المقطع المعني (اختياري)'"
        variant="outlined"
        density="comfortable"
        prepend-inner-icon="mdi-format-quote-open-outline"
      />
      <v-textarea
        v-model="form.message"
        :label="isFrench ? 'Correction proposée' : 'التصحيح المقترح'"
        variant="outlined"
        rows="4"
        auto-grow
        prepend-inner-icon="mdi-pencil-outline"
      />
      <v-alert
        v-if="errorMessage"
        type="error"
        variant="tonal"
        density="compact"
        class="mb-4"
      >
        {{ errorMessage }}
      </v-alert>
      <v-btn
        type="submit"
        color="warning"
        variant="flat"
        class="rounded-lg font-weight-bold"
        :loading="loading"
        :disabled="!isValid"
      >
        {{ isFrench ? 'Envoyer la demande' : 'إرسال الطلب' }}
      </v-btn>
    </v-form>
  </v-card>
</template>

<style scoped>
.correction-card { padding: clamp(1rem, 3vw, 1.35rem); background: radial-gradient(circle at top right, rgba(var(--v-theme-warning), 0.09), transparent 18rem), rgba(var(--v-theme-surface), 0.48); }
.section-kicker { color: rgb(var(--v-theme-warning)); font-size: 0.78rem; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; }
</style>
