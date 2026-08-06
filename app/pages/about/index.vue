<script setup lang="ts">
const { t, tm, rt } = useI18n()
const localePath = useLocalePath()

definePageMeta({
  layout: 'default',
})

useHead({
  title: () => t('about.title'),
  meta: [
    { name: 'description', content: () => t('about.intro.lead') },
  ],
})

interface TimelineEvent {
  year: string
  title: string
  text: string
  icon: string
}

interface Highlight {
  icon: string
  title: string
  text: string
}

// Pull structured content from i18n message arrays so both locales stay in sync.
// tm() returns compiled message nodes, so each field must be resolved with rt()
// to get a plain string before it is bound to a component (e.g. <v-icon>).
const timeline = computed<TimelineEvent[]>(() =>
  ((tm('about.timeline.events') as Record<string, unknown>[]) ?? []).map(event => ({
    year: rt(event.year as string),
    title: rt(event.title as string),
    text: rt(event.text as string),
    icon: rt(event.icon as string),
  })),
)
const highlights = computed<Highlight[]>(() =>
  ((tm('about.highlights.items') as Record<string, unknown>[]) ?? []).map(item => ({
    icon: rt(item.icon as string),
    title: rt(item.title as string),
    text: rt(item.text as string),
  })),
)

const stats = computed(() => [
  { value: '+2000', label: t('about.stats.years'), icon: 'mdi-clock-outline' },
  { value: 'FR / AR', label: t('about.stats.languages'), icon: 'mdi-translate' },
  { value: t('about.stats.heritageValue'), label: t('about.stats.heritage'), icon: 'mdi-bank-outline' },
])
</script>

<template>
  <div class="about-page">
    <!-- Hero -->
    <section class="about-hero">
      <div class="about-hero__glow about-hero__glow--primary"></div>
      <div class="about-hero__glow about-hero__glow--accent"></div>

      <div class="about-hero__content">
        <v-chip
          color="primary"
          variant="elevated"
          size="small"
          class="mb-4"
        >
          <v-icon
            start
            size="x-small"
            icon="mdi-map-marker"
          />
          {{ t('about.hero.location') }}
        </v-chip>

        <h1 class="about-hero__title">
          {{ t('about.hero.title') }}
        </h1>
        <p class="about-hero__subtitle">
          {{ t('about.hero.subtitle') }}
        </p>

        <div class="d-flex flex-wrap ga-3 justify-center mt-6">
          <v-btn
            :to="localePath('/timeline')"
            color="primary"
            size="large"
            rounded="lg"
          >
            <v-icon
              start
              icon="mdi-timeline-clock-outline"
            />
            {{ t('about.hero.ctaTimeline') }}
          </v-btn>
          <v-btn
            :to="localePath('/articles')"
            variant="outlined"
            color="primary"
            size="large"
            rounded="lg"
          >
            {{ t('about.hero.ctaArticles') }}
          </v-btn>
        </div>
      </div>
    </section>

    <!-- Stats -->
    <section class="mb-12">
      <v-row density="comfortable">
        <v-col
          v-for="stat in stats"
          :key="stat.label"
          cols="12"
          sm="4"
        >
          <v-card
            flat
            rounded="lg"
            class="stat-card pa-4 text-center h-100"
          >
            <v-icon
              :icon="stat.icon"
              size="32"
              color="primary"
              class="mb-2"
            />
            <div class="text-headline-small font-weight-bold">
              {{ stat.value }}
            </div>
            <div class="text-body-2 text-medium-emphasis">
              {{ stat.label }}
            </div>
          </v-card>
        </v-col>
      </v-row>
    </section>

    <!-- Intro -->
    <section class="mb-12">
      <v-row align="center">
        <v-col
          cols="12"
          md="6"
        >
          <h2 class="section-title mb-4">
            {{ t('about.intro.title') }}
          </h2>
          <p class="text-body-1 text-medium-emphasis mb-4">
            {{ t('about.intro.lead') }}
          </p>
          <p class="text-body-1 text-medium-emphasis">
            {{ t('about.intro.body') }}
          </p>
        </v-col>
        <v-col
          cols="12"
          md="6"
        >
          <v-card
            flat
            rounded="xl"
            class="intro-image-card overflow-hidden"
          >
            <NuxtImg
              src="/img/logo/dz_logo.png"
              :alt="t('about.hero.title')"
              class="intro-image"
              height="320"
              fit="contain"
            />
          </v-card>
        </v-col>
      </v-row>
    </section>

    <!-- Timeline -->
    <section class="mb-12">
      <div class="text-center mb-8">
        <h2 class="section-title">
          {{ t('about.timeline.title') }}
        </h2>
        <p class="text-body-1 text-medium-emphasis mt-2">
          {{ t('about.timeline.subtitle') }}
        </p>
      </div>

      <div class="about-timeline">
        <div
          v-for="(event, i) in timeline"
          :key="i"
          class="about-timeline__item"
        >
          <div class="about-timeline__marker">
            <v-icon
              :icon="event.icon"
              size="20"
              color="primary"
            />
          </div>
          <v-card
            flat
            rounded="lg"
            class="about-timeline__card pa-5"
          >
            <div class="about-timeline__year">
              {{ event.year }}
            </div>
            <h3 class="text-headline-small font-weight-bold mb-2">
              {{ event.title }}
            </h3>
            <p class="text-body-2 text-medium-emphasis mb-0">
              {{ event.text }}
            </p>
          </v-card>
        </div>
      </div>
    </section>

    <!-- Highlights -->
    <section class="mb-12">
      <div class="text-center mb-8">
        <h2 class="section-title">
          {{ t('about.highlights.title') }}
        </h2>
      </div>

      <v-row>
        <v-col
          v-for="(item, i) in highlights"
          :key="i"
          cols="12"
          sm="6"
          md="4"
        >
          <v-card
            flat
            rounded="lg"
            class="highlight-card pa-4 h-100"
          >
            <v-avatar
              color="primary"
              variant="tonal"
              size="48"
              class="mb-4"
            >
              <v-icon
                :icon="item.icon"
                size="24"
              />
            </v-avatar>
            <h3 class="text-headline-small font-weight-bold mb-2">
              {{ item.title }}
            </h3>
            <p class="text-body-2 text-medium-emphasis mb-0">
              {{ item.text }}
            </p>
          </v-card>
        </v-col>
      </v-row>
    </section>

    <!-- Newsletter CTA -->
    <section class="mb-6">
      <v-card
        flat
        rounded="lg"
        class="pa-2 py-4 text-center cta-card"
      >
        <section class="d-flex flex-row ga-2 align-center justify-center">
          <v-icon
            icon="mdi-email-outline"
            color="primary"
            class="text-title-large text-sm-headline-medium align-self-center self-sm-center"
          />
          <h2 class="text-title-medium text-sm-headline-small my-0">
            {{ t('newsletter.heading') }}
          </h2>
        </section>
        <p class="text-body-medium text-sm-body-large text-medium-emphasis mb-5 mx-auto">
          {{ t('newsletter.subheading') }}
        </p>
        <NewsletterForm />
      </v-card>
    </section>
  </div>
</template>

<style scoped>
.about-page {
  max-width: 1200px;
  margin: 0 auto;
}

/* Hero */
.about-hero {
  position: relative;
  overflow: hidden;
  margin-bottom: 3rem;
  padding: 4rem 1.5rem;
  text-align: center;
  border-radius: 28px;
  background:
    radial-gradient(circle at 18% 20%, rgba(var(--v-theme-primary), 0.12), transparent 38%),
    radial-gradient(circle at 82% 12%, rgba(139, 105, 20, 0.12), transparent 36%),
    linear-gradient(135deg, rgba(var(--v-theme-surface), 0.9) 0%, rgba(var(--v-theme-primary), 0.06) 100%);
  border: 1px solid rgba(var(--v-theme-primary), 0.15);
}

.about-hero__glow {
  position: absolute;
  width: 26rem;
  height: 26rem;
  border-radius: 999px;
  filter: blur(20px);
  opacity: 0.4;
  pointer-events: none;
}

.about-hero__glow--primary {
  top: -10rem;
  inset-inline-start: -8rem;
  background: rgba(var(--v-theme-primary), 0.25);
}

.about-hero__glow--accent {
  right: -10rem;
  bottom: -12rem;
  background: rgba(139, 105, 20, 0.22);
}

.about-hero__content {
  position: relative;
  z-index: 1;
  max-width: 720px;
  margin: 0 auto;
}

.about-hero__title {
  font-size: clamp(2rem, 6vw, 3.25rem);
  font-weight: 800;
  line-height: 1.1;
  margin-bottom: 1rem;
}

.about-hero__subtitle {
  font-size: clamp(1rem, 2.4vw, 1.25rem);
  color: rgba(var(--v-theme-on-surface), 0.7);
  margin: 0 auto;
  max-width: 600px;
}

/* Section titles */
.section-title {
  position: relative;
  font-size: clamp(1.5rem, 4vw, 2rem);
  font-weight: 800;
  display: inline-block;
}

.section-title::after {
  content: '';
  display: block;
  width: 56px;
  height: 3px;
  margin-top: 0.5rem;
  border-radius: 999px;
  background: rgb(var(--v-theme-primary));
}

.text-center .section-title::after {
  margin-inline: auto;
}

/* Stat cards */
.stat-card {
  background: rgba(var(--v-theme-primary), 0.05);
  border: 1px solid rgba(var(--v-theme-primary), 0.15);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.stat-card:hover {
  border-color: rgba(var(--v-theme-primary), 0.3);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

/* Intro image */
.intro-image-card {
  background: rgba(var(--v-theme-primary), 0.05);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  display: grid;
  place-items: center;
}

.intro-image {
  width: 100%;
  object-fit: contain;
  padding: 1.5rem;
}

/* Timeline */
.about-timeline {
  position: relative;
  max-width: 760px;
  margin: 0 auto;
  padding-inline-start: 2.5rem;
}

.about-timeline::before {
  content: '';
  position: absolute;
  inset-block: 0.5rem;
  inset-inline-start: 0.85rem;
  width: 2px;
  background: linear-gradient(
    to bottom,
    rgba(var(--v-theme-primary), 0.4),
    rgba(var(--v-theme-primary), 0.08)
  );
}

.about-timeline__item {
  position: relative;
  margin-bottom: 1.75rem;
}

.about-timeline__item:last-child {
  margin-bottom: 0;
}

.about-timeline__marker {
  position: absolute;
  inset-inline-start: -2.5rem;
  top: 0.25rem;
  display: grid;
  place-items: center;
  width: 2.1rem;
  height: 2.1rem;
  border-radius: 999px;
  background: rgb(var(--v-theme-surface));
  border: 2px solid rgba(var(--v-theme-primary), 0.4);
}

.about-timeline__card {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.about-timeline__card:hover {
  border-color: rgba(var(--v-theme-primary), 0.3);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.about-timeline__year {
  display: inline-block;
  font-weight: 700;
  font-size: 0.8rem;
  letter-spacing: 0.04em;
  color: rgb(var(--v-theme-primary));
  margin-bottom: 0.35rem;
}

/* Highlights */
.highlight-card {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.highlight-card:hover {
  border-color: rgba(var(--v-theme-primary), 0.3);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  transform: translateY(-2px);
}

/* CTA */
.cta-card {
  background: rgba(var(--v-theme-primary), 0.05);
  border: 1px solid rgba(var(--v-theme-primary), 0.15);
}
</style>
