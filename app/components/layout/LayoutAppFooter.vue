<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const { categories } = useNavCategories()

const year = new Date().getFullYear()

const quickLinks = computed(() => [
  { title: t('nav.home'), to: localePath('/') },
  { title: t('nav.articles'), to: localePath('/articles') },
  { title: t('nav.categories'), to: localePath('/categories') },
  { title: t('nav.authors'), to: localePath('/authors') },
  { title: t('nav.timeline'), to: localePath('/timeline') },
  { title: t('nav.about'), to: localePath('/about') },
])

const socialLinks = [
  { icon: 'mdi-facebook', href: '#', label: 'Facebook' },
  { icon: 'mdi-twitter', href: '#', label: 'X (Twitter)' },
  { icon: 'mdi-youtube', href: '#', label: 'YouTube' },
  { icon: 'mdi-instagram', href: '#', label: 'Instagram' },
]

// ── Compact newsletter ──────────────────────────────────────────────
const email = ref('')
const loading = ref(false)
const feedback = ref <{ type: 'success' | 'error', text: string } | null> (null)

async function subscribe() {
  if (!email.value.trim()) return
  loading.value = true
  feedback.value = null

  try {
    await $fetch('/api/newsletter/subscribe', {
      method: 'POST',
      body: { email: email.value.trim() },
    })
    feedback.value = { type: 'success', text: t('newsletter.successDetailed') }
    email.value = ''
  }
  catch {
    feedback.value = { type: 'error', text: t('newsletter.error') }
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <v-footer class="app-footer pa-0 mt-16">
    <div class="app-footer__accent"></div>
    <v-row class="gy-8 py-4 py-md-6 px-2 px-md-6">
      <!-- Brand + social -->
      <v-col
        cols="12"
        md="4"
      >
        <div class="d-flex align-center ga-3 mb-4">
          <layout-brand-logo />
          <span class="text-headline-small font-weight-bold text-primary">{{ t('common.siteName') }}</span>
        </div>
        <p
          class="text-body-2 text-medium-emphasis mb-5"
          style="max-width: 36ch;"
        >
          {{ t('footer.description') }}
        </p>

        <div class="text-overline text-medium-emphasis mb-2">
          {{ t('footer.followUs') }}
        </div>
        <div class="d-flex ga-2">
          <v-btn
            v-for="social in socialLinks"
            :key="social.label"
            :href="social.href"
            :aria-label="social.label"
            icon
            variant="tonal"
            size="small"
            target="_blank"
            rel="noopener"
            class="app-footer__social"
          >
            <v-icon
              :icon="social.icon"
              size="20"
            />
          </v-btn>
        </div>
      </v-col>

      <!-- Quick links -->
      <v-col
        cols="6"
        md="2"
      >
        <h4 class="text-subtitle-2 font-weight-bold mb-4">
          {{ t('footer.quickLinks') }}
        </h4>
        <ul class="app-footer__list">
          <li
            v-for="link in quickLinks"
            :key="link.to"
          >
            <NuxtLink
              :to="link.to"
              class="app-footer__link"
            >{{ link.title }}</NuxtLink>
          </li>
        </ul>
      </v-col>

      <!-- Explore categories -->
      <v-col
        cols="6"
        md="2"
      >
        <h4 class="text-subtitle-2 font-weight-bold mb-4">
          {{ t('footer.explore') }}
        </h4>
        <ul class="app-footer__list">
          <li
            v-for="cat in categories"
            :key="cat.key"
          >
            <NuxtLink
              :to="cat.to"
              class="app-footer__link"
            >{{ cat.title }}</NuxtLink>
          </li>
        </ul>
      </v-col>

      <!-- Compact newsletter -->
      <v-col
        cols="12"
        md="4"
      >
        <h4 class="text-subtitle-2 font-weight-bold mb-2">
          {{ t('newsletter.title') }}
        </h4>
        <p class="text-body-2 text-medium-emphasis mb-4">
          {{ t('footer.newsletterPrompt') }}
        </p>

        <v-form
          class="d-flex ga-2"
          @submit.prevent="subscribe"
        >
          <v-text-field
            id="footer-newsletter-email"
            v-model="email"
            type="email"
            :placeholder="t('newsletter.placeholder')"
            variant="solo-filled"
            density="comfortable"
            flat
            hide-details
            rounded="lg"
            prepend-inner-icon="mdi-email-outline"
          />
          <v-btn
            type="submit"
            color="primary"
            height="48"
            rounded="lg"
            :loading="loading"
            class="flex-shrink-0 px-5 font-weight-bold"
          >
            {{ t('newsletter.subscribe') }}
          </v-btn>
        </v-form>

        <p
          v-if="feedback"
          class="text-body-2 mt-3 mb-0"
          :class="feedback.type === 'success' ? 'text-success' : 'text-error'"
        >
          {{ feedback.text }}
        </p>
      </v-col>
    </v-row>

    <v-divider class="mt-10 mb-6" />

    <!-- Bottom bar -->
    <div class="d-flex flex-column flex-sm-row align-center justify-space-between ga-3">
      <span class="text-caption text-medium-emphasis text-center mb-5">
        © {{ year }} {{ t('common.siteName') }}. {{ t('footer.copyright') }}.
      </span>
    </div>
  </v-footer>
</template>

<style scoped>
.app-footer {
  position: relative;
  flex-direction: column;
  background: rgb(var(--v-theme-surface));
  border-top: 1px solid rgba(var(--v-border-color), 0.12);
}

/* Thin brand-colored accent line across the top */
.app-footer__accent {
  height: 3px;
  width: 100%;
  background: linear-gradient(
    90deg,
    rgb(var(--v-theme-primary)),
    rgba(var(--v-theme-primary), 0.35)
  );
}

/* Link lists */
.app-footer__list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.app-footer__link {
  position: relative;
  display: inline-block;
  color: rgba(var(--v-theme-on-surface), 0.7);
  text-decoration: none;
  font-size: 0.9rem;
  transition: color 0.2s ease;
}

/* Animated underline that grows from the inline-start edge (RTL-safe) */
.app-footer__link::after {
  content: '';
  position: absolute;
  inset-inline-start: 0;
  bottom: -2px;
  height: 1.5px;
  width: 0;
  background: rgb(var(--v-theme-primary));
  transition: width 0.25s ease;
}

.app-footer__link:hover {
  color: rgb(var(--v-theme-primary));
}

.app-footer__link:hover::after {
  width: 100%;
}

/* Social buttons lift smoothly on hover */
.app-footer__social {
  transition: transform 0.2s ease, color 0.2s ease;
}

.app-footer__social:hover {
  transform: translateY(-3px);
  color: rgb(var(--v-theme-primary));
}

@media (prefers-reduced-motion: reduce) {
  .app-footer__link::after,
  .app-footer__social {
    transition: none;
  }

  .app-footer__social:hover {
    transform: none;
  }
}
</style>
