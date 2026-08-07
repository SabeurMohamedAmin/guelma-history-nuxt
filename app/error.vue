<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{
  error: NuxtError
}>()

const route = useRoute()

// `prefix_except_default`: Arabic is default (/), French lives under /fr.
const isFrench = computed(() => route.path === '/fr' || route.path.startsWith('/fr/'))
const isArabic = computed(() => !isFrench.value)

const statusCode = computed(() => props.error?.statusCode || 500)
const isNotFound = computed(() => statusCode.value === 404)

const copy = computed(() => {
  if (isFrench.value) {
    return isNotFound.value
      ? {
          eyebrow: 'Page introuvable',
          title: 'Cette page semble avoir disparu.',
          description:
          'Elle a peut-être été déplacée, supprimée ou l’adresse saisie ne correspond à aucune page.',
          home: 'Retour à l’accueil',
          retry: 'Réessayer',
          label: 'Erreur',
        }
      : {
          eyebrow: 'Une erreur est survenue',
          title: 'Nous n’avons pas pu afficher cette page.',
          description:
          'Un problème temporaire est peut-être survenu. Vous pouvez revenir à l’accueil ou réessayer.',
          home: 'Retour à l’accueil',
          retry: 'Réessayer',
          label: 'Erreur',
        }
  }

  return isNotFound.value
    ? {
        eyebrow: 'الصفحة غير موجودة',
        title: 'يبدو أن هذه الصفحة قد اختفت.',
        description:
        'ربما تم نقل الصفحة أو حذفها، أو أن الرابط الذي أدخلته لا يؤدي إلى أي صفحة.',
        home: 'العودة إلى الرئيسية',
        retry: 'إعادة المحاولة',
        label: 'خطأ',
      }
    : {
        eyebrow: 'حدث خطأ ما',
        title: 'تعذّر علينا عرض هذه الصفحة.',
        description:
        'قد تكون المشكلة مؤقتة. يمكنك العودة إلى الرئيسية أو محاولة إعادة تحميل الصفحة.',
        home: 'العودة إلى الرئيسية',
        retry: 'إعادة المحاولة',
        label: 'خطأ',
      }
})

useHead({
  title: () => `${statusCode.value} | Histoire de Guelma`,
  htmlAttrs: {
    lang: () => (isFrench.value ? 'fr' : 'ar'),
    dir: () => (isFrench.value ? 'ltr' : 'rtl'),
  },
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
})

function goHome() {
  clearError({ redirect: isFrench.value ? '/fr' : '/' })
}

function retry() {
  clearError()
  window.location.reload()
}
</script>

<template>
  <main
    class="error-page"
    :class="{ 'error-page--rtl': isArabic }"
    :dir="isArabic ? 'rtl' : 'ltr'"
  >
    <div
      class="error-page__noise"
      aria-hidden="true"
    ></div>

    <header class="error-header">
      <NuxtLink
        :to="isFrench ? '/fr' : '/'"
        class="error-brand"
        :aria-label="isFrench ? 'Accueil — Histoire de Guelma' : 'الرئيسية — تاريخ قالمة'"
      >
        <span
          class="error-brand__mark"
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 48 48"
            fill="none"
          >
            <path
              d="M24 4.5 40.5 14v20L24 43.5 7.5 34V14L24 4.5Z"
              stroke="currentColor"
              stroke-width="2.25"
            />
            <path
              d="M14 16.5 24 22l10-5.5M24 22v12.5M12.5 30l11.5 6.5L35.5 30"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>

        <span class="error-brand__text">
          <span class="error-brand__name">
            {{ isFrench ? 'Histoire de Guelma' : 'تاريخ قالمة' }}
          </span>
          <span class="error-brand__tagline">
            {{ isFrench ? 'Histoire & patrimoine' : 'التاريخ والتراث' }}
          </span>
        </span>
      </NuxtLink>

      <span class="error-status">
        <span class="error-status__dot"></span>
        {{ copy.label }} {{ statusCode }}
      </span>
    </header>

    <section
      class="error-content"
      aria-labelledby="error-title"
    >
      <div class="error-card">
        <div
          class="error-card__ornament error-card__ornament--top"
          aria-hidden="true"
        ></div>
        <div
          class="error-card__ornament error-card__ornament--bottom"
          aria-hidden="true"
        ></div>

        <p class="error-eyebrow">
          <span class="error-eyebrow__line"></span>
          {{ copy.eyebrow }}
          <span class="error-eyebrow__line"></span>
        </p>

        <div
          class="error-code"
          aria-hidden="true"
        >
          <span>{{ String(statusCode).charAt(0) }}</span>
          <span class="error-code__zero">0</span>
          <span>{{ String(statusCode).charAt(2) }}</span>
        </div>

        <div class="error-card__content">
          <h1
            id="error-title"
            class="error-title"
          >
            {{ copy.title }}
          </h1>

          <p class="error-description">
            {{ copy.description }}
          </p>

          <div class="error-actions">
            <button
              class="error-button error-button--primary"
              type="button"
              @click="goHome"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="m10 17-5-5 5-5M5 12h14"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              {{ copy.home }}
            </button>

            <button
              v-if="!isNotFound"
              class="error-button error-button--secondary"
              type="button"
              @click="retry"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M20 11a8 8 0 1 0 2 5.3M20 4v7h-7"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              {{ copy.retry }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <footer class="error-footer">
      <span>© {{ new Date().getFullYear() }}</span>
      <span
        class="error-footer__separator"
        aria-hidden="true"
      >•</span>
      <span>{{ isFrench ? 'Histoire de Guelma' : 'تاريخ قالمة' }}</span>
    </footer>
  </main>
</template>

<style scoped>
.error-page {
  --bg: #11110f;
  --surface: #1d1d1b;
  --surface-light: #252523;
  --text: #f5f3eb;
  --muted: #aaa89f;
  --muted-dark: #74736d;
  --gold: #d4aa24;
  --gold-bright: #e2ba36;
  --gold-soft: rgb(212 170 36 / 16%);
  --border: rgb(255 255 255 / 8%);

  position: relative;
  isolation: isolate;
  display: grid;
  grid-template-rows: auto 1fr auto;
  min-height: 100svh;
  overflow: hidden;
  color: var(--text);
  background:
    radial-gradient(circle at 50% 42%, rgb(212 170 36 / 10%), transparent 27rem),
    radial-gradient(circle at 8% 8%, rgb(212 170 36 / 5%), transparent 23rem),
    var(--bg);
  font-family:
    Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.error-page--rtl {
  font-family:
    "Cairo", "Noto Kufi Arabic", "Noto Sans Arabic", Tahoma, Arial, sans-serif;
}

.error-page__noise {
  position: absolute;
  z-index: -1;
  inset: 0;
  pointer-events: none;
  opacity: 0.26;
  background-image:
    linear-gradient(rgb(255 255 255 / 1%) 1px, transparent 1px),
    linear-gradient(90deg, rgb(255 255 255 / 1%) 1px, transparent 1px);
  background-size: 4px 4px;
  mask-image: linear-gradient(to bottom, black, transparent 80%);
}

.error-header,
.error-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: min(100% - 3rem, 1180px);
  margin-inline: auto;
}

.error-header {
  min-height: 96px;
  border-bottom: 1px solid var(--border);
}

.error-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  color: inherit;
  text-decoration: none;
}

.error-brand__mark {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  color: var(--gold);
}

.error-brand__mark svg {
  width: 100%;
  height: 100%;
}

.error-brand__text {
  display: grid;
  gap: 0.1rem;
}

.error-brand__name {
  color: var(--gold);
  font-size: 0.96rem;
  font-weight: 750;
  letter-spacing: -0.02em;
}

.error-brand__tagline {
  color: var(--muted);
  font-size: 0.68rem;
}

.error-status {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--muted);
  font-size: 0.78rem;
}

.error-status__dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--gold);
  box-shadow: 0 0 0 4px var(--gold-soft);
}

.error-content {
  display: grid;
  width: min(100% - 3rem, 840px);
  padding-block: 4rem;
  place-items: center;
  margin-inline: auto;
}

.error-card {
  position: relative;
  width: 100%;
  overflow: hidden;
  border: 1px solid rgb(212 170 36 / 24%);
  border-radius: 22px;
  background:
    linear-gradient(145deg, rgb(255 255 255 / 3%), transparent 40%),
    var(--surface);
  box-shadow:
    0 30px 80px rgb(0 0 0 / 38%),
    inset 0 1px 0 rgb(255 255 255 / 5%);
}

.error-card::before {
  position: absolute;
  top: 0;
  right: 8%;
  left: 8%;
  height: 1px;
  content: "";
  background: linear-gradient(90deg, transparent, var(--gold), transparent);
}

.error-card__ornament {
  position: absolute;
  width: 220px;
  height: 220px;
  border: 1px solid rgb(212 170 36 / 12%);
  border-radius: 50%;
  pointer-events: none;
}

.error-card__ornament::before,
.error-card__ornament::after {
  position: absolute;
  border: 1px solid rgb(212 170 36 / 8%);
  border-radius: inherit;
  content: "";
  inset: 18px;
}

.error-card__ornament::after {
  inset: 38px;
}

.error-card__ornament--top {
  top: -130px;
  right: -90px;
}

.error-card__ornament--bottom {
  bottom: -150px;
  left: -85px;
}

.error-eyebrow {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin: 0;
  padding-top: 3.6rem;
  color: var(--gold);
  font-size: 0.73rem;
  font-weight: 700;
  letter-spacing: 0.11em;
  text-transform: uppercase;
}

.error-page--rtl .error-eyebrow {
  letter-spacing: 0;
  text-transform: none;
}

.error-eyebrow__line {
  width: 30px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--gold));
}

.error-eyebrow__line:last-child {
  transform: scaleX(-1);
}

.error-code {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 0.65rem;
  color: transparent;
  font-size: clamp(7rem, 21vw, 12rem);
  font-weight: 850;
  line-height: 0.92;
  letter-spacing: -0.09em;
  -webkit-text-stroke: 1px rgb(212 170 36 / 72%);
  text-shadow: 0 10px 36px rgb(212 170 36 / 16%);
  user-select: none;
}

.error-code__zero {
  position: relative;
  display: inline-grid;
  width: 0.84em;
  place-items: center;
}

.error-card__content {
  position: relative;
  z-index: 1;
  max-width: 580px;
  padding: 1.6rem 2rem 3.7rem;
  margin-inline: auto;
  text-align: center;
}

.error-title {
  margin: 0;
  font-size: clamp(1.55rem, 4vw, 2.2rem);
  font-weight: 760;
  letter-spacing: -0.04em;
  line-height: 1.2;
}

.error-page--rtl .error-title {
  font-weight: 700;
  letter-spacing: 0;
}

.error-description {
  max-width: 500px;
  margin: 1rem auto 0;
  color: var(--muted);
  font-size: 0.95rem;
  line-height: 1.75;
}

.error-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.75rem;
  margin-top: 2rem;
}

.error-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  min-height: 44px;
  padding: 0.7rem 1rem;
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  font: inherit;
  font-size: 0.86rem;
  font-weight: 700;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    background-color 160ms ease,
    box-shadow 160ms ease;
}

.error-button svg {
  width: 18px;
  height: 18px;
}

.error-page--rtl .error-button--primary svg {
  transform: scaleX(-1);
}

.error-button:hover {
  transform: translateY(-2px);
}

.error-button:focus-visible,
.error-brand:focus-visible {
  outline: 2px solid var(--gold-bright);
  outline-offset: 4px;
}

.error-button--primary {
  color: #17150d;
  background: var(--gold);
  box-shadow: 0 7px 18px rgb(212 170 36 / 17%);
}

.error-button--primary:hover {
  background: var(--gold-bright);
  box-shadow: 0 10px 24px rgb(212 170 36 / 25%);
}

.error-button--secondary {
  border-color: rgb(255 255 255 / 12%);
  color: var(--text);
  background: rgb(255 255 255 / 4%);
}

.error-button--secondary:hover {
  border-color: rgb(212 170 36 / 44%);
  background: rgb(212 170 36 / 9%);
}

.error-footer {
  min-height: 76px;
  border-top: 1px solid var(--border);
  color: var(--muted-dark);
  font-size: 0.73rem;
}

.error-footer__separator {
  margin-inline: auto;
  color: var(--gold);
}

@media (max-width: 640px) {

  .error-header,
  .error-footer,
  .error-content {
    width: min(100% - 2rem, 840px);
  }

  .error-header {
    min-height: 78px;
  }

  .error-brand__tagline,
  .error-status {
    display: none;
  }

  .error-content {
    padding-block: 2rem;
  }

  .error-eyebrow {
    padding-top: 2.8rem;
  }

  .error-card__content {
    padding: 1.3rem 1.25rem 2.8rem;
  }

  .error-actions {
    flex-direction: column;
  }

  .error-button {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .error-button {
    transition: none;
  }
}
</style>
