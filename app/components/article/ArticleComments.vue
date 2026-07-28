<script setup lang="ts">
// The article's public slug — the stable identifier used across the API.
const props = defineProps<{ slug: string }>()
const emit = defineEmits<{ submitted: [] }>()
const { locale } = useI18n()
const isFrench = computed(() => locale.value === 'fr')
const form = reactive({ name: '', email: '', message: '' })
const loading = ref(false)
const sent = ref(false)
const errorMessage = ref('')
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const isValid = computed(() => form.name.trim().length >= 2 && form.message.trim().length >= 3 && (!form.email.trim() || emailRe.test(form.email.trim())))

const submit = async () => {
  if (!isValid.value || loading.value) return
  loading.value = true
  errorMessage.value = ''
  try {
    await $fetch('/api/articles/comments', { method: 'POST', body: { articleSlug: props.slug, name: form.name.trim(), email: form.email.trim().toLowerCase(), message: form.message.trim() } })
    sent.value = true
    form.name = ''
    form.email = ''
    form.message = ''
    emit('submitted')
  }
  catch (error: unknown) {
    const e = error as { data?: { message?: string, statusMessage?: string }, message?: string }
    errorMessage.value = e?.data?.message || e?.data?.statusMessage || e?.message || (isFrench.value ? 'Impossible d’ajouter le commentaire.' : 'تعذر إضافة التعليق.')
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="article-comments">
    <div class="comments-header mb-5">
      <div>
        <p class="section-kicker mb-1">
          {{ isFrench ? 'Commenter' : 'تعليق' }}
        </p>
        <h3 class="text-headline-small font-weight-bold">
          {{ isFrench ? 'Ajouter un commentaire' : 'إضافة تعليق' }}
        </h3>
      </div>
    </div>

    <v-alert
      v-if="sent"
      type="success"
      variant="tonal"
      density="comfortable"
      class="mb-5"
      closable
      @click:close="sent = false"
    >
      {{ isFrench ? 'Merci, votre commentaire a été publié.' : 'شكرا، تم نشر تعليقك.' }}
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
            :label="isFrench ? 'Email (optionnel)' : 'البريد الإلكتروني (اختياري)'"
            type="email"
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-email-outline"
          />
        </v-col>
      </v-row>
      <v-textarea
        v-model="form.message"
        :label="isFrench ? 'Votre commentaire' : 'تعليقك'"
        variant="outlined"
        rows="4"
        auto-grow
        prepend-inner-icon="mdi-comment-text-outline"
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
        color="primary"
        class="rounded-lg font-weight-bold"
        :loading="loading"
        :disabled="!isValid"
      >
        {{ isFrench ? 'Publier le commentaire' : 'نشر التعليق' }}
      </v-btn>
    </v-form>
  </section>
</template>

<style scoped>
.article-comments { padding: clamp(1rem, 3vw, 1.35rem); border-radius: 22px; background: rgba(var(--v-theme-surface), 0.48); }
.comments-header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.section-kicker { color: rgb(var(--v-theme-primary)); font-size: 0.78rem; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; }
</style>
