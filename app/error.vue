<script setup lang="ts">
import type { NuxtError } from '#app'

/**
 * Global error page.
 *
 * It must render under ANY condition. When it throws, Nitro can no longer
 * produce a page and answers 500 instead, which is how a simple missing URL
 * ends up reported as a "5XX page" in Search Console. That is why this page
 * calls no plugin-dependent composable (no useI18n()): if the failure happened
 * before i18n was installed, useI18n() itself throws.
 */
const props = defineProps<{
  error: NuxtError
}>()

const route = useRoute()

// The /fr prefix is the only locale signal available here (see i18n strategy
// 'prefix_except_default': Arabic has no prefix).
const isFrench = computed(() => route.path === '/fr' || route.path.startsWith('/fr/'))

const statusCode = computed(() => props.error?.statusCode || 500)
const isNotFound = computed(() => statusCode.value === 404)

const message = computed(() => {
  if (isNotFound.value) {
    return isFrench.value
      ? 'Cette page n’existe pas ou a été déplacée.'
      : 'هذه الصفحة غير موجودة أو تم نقلها.'
  }

  return isFrench.value
    ? 'Une erreur est survenue. Veuillez réessayer.'
    : 'حدث خطأ ما. يُرجى المحاولة مرة أخرى.'
})

const backLabel = computed(() => (isFrench.value ? 'Retour à l’accueil' : 'العودة إلى الرئيسية'))

// Error pages carry no content worth indexing, and a crawled 404 that returns
// an indexable page is reported as a soft 404.
useHead({
  title: () => `${statusCode.value}`,
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
})

function handleClearError() {
  clearError({ redirect: isFrench.value ? '/fr' : '/' })
}
</script>

<template>
  <v-app>
    <v-main
      class="d-flex align-center justify-center"
      style="min-height: 100vh;"
    >
      <v-card
        width="500"
        class="text-center pa-8"
      >
        <v-card-title class="headline-medium">
          {{ statusCode }}
        </v-card-title>
        <v-card-text class="text-body-1">
          {{ message }}
        </v-card-text>
        <v-card-actions class="justify-center">
          <v-btn
            color="primary"
            @click="handleClearError"
          >
            {{ backLabel }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-main>
  </v-app>
</template>
