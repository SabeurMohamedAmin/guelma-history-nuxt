<script setup lang="ts">
import type { CategoryMeta } from '~~/shared/types/category'

/**
 * CategoryHeader — pure presentation.
 *
 * Shows the category's identity at the top of its page: a banner image (or a
 * tinted icon fallback), the localized name and a short multilingual
 * description (clamped to 4 lines). No data fetching here.
 */
const props = defineProps<{
  category: CategoryMeta
  total?: number
}>()

const { locale, t } = useI18n()
const { getCategoryIcon } = useCategoryIcon()

const name = computed(() =>
  locale.value === 'ar' ? props.category.nameAr : props.category.nameFr,
)

const description = computed(() =>
  locale.value === 'ar'
    ? (props.category.descriptionAr ?? '')
    : (props.category.descriptionFr ?? ''),
)

// Prefer an explicit icon from the DB, otherwise fall back to the slug map.
const icon = computed(() =>
  props.category.icon || getCategoryIcon(props.category.slug),
)

const hasImage = computed(() => Boolean(props.category.coverImage))

// Drive text direction from locale — Arabic is RTL.
const dir = computed(() => (locale.value === 'ar' ? 'rtl' : 'ltr'))
</script>

<template>
  <header
    class="category-header rounded-xl rounded-sm-lg mt-5 m-8 mb-sm-6 position-relative overflow-hidden"
    :class="{ 'category-header--image': hasImage }"
  >
    <!-- Background cover image -->
    <NuxtImg
      v-if="hasImage"
      :src="category.coverImage as string"
      :alt="name"
      width="1200"
      height="400"
      fit="cover"
      loading="eager"
      class="category-header__bg"
    />

    <!-- Content overlay -->
    <div
      class="category-header__overlay position-relative pa-4 pa-sm-6 pa-md-8 py-8 align-content-end"
      :class="{ 'category-header__overlay--image': hasImage }"
    >
      <section
        class="category-header__content d-flex align-start ga-4 ga-sm-5"
        :dir="dir"
      >
        <!-- Icon wrapper -->
        <div
          class="category-header__icon-wrap d-flex align-center justify-center rounded-xl flex-shrink-0"
          :class="
            hasImage
              ? 'category-header__icon-wrap--image'
              : 'category-header__icon-wrap--default'
          "
        >
          <v-icon
            :icon="icon"
            :color="hasImage ? 'white' : 'primary'"
            size="48"
          />
        </div>

        <!-- Text block -->
        <div
          class="d-flex flex-column ga-2 min-width-0 w-100"
          :dir="dir"
        >
          <h1
            class="category-header__title font-weight-bold ma-0"
            :class="hasImage ? 'text-white' : 'text-on-surface'"
          >
            {{ name }}
          </h1>

          <p
            v-if="description"
            class="category-header__description ma-0 text-body-1"
            :class="hasImage ? 'text-white' : 'text-medium-emphasis'"
          >
            {{ description }}
          </p>

          <v-chip
            v-if="total !== undefined"
            size="small"
            color="primary"
            variant="flat"
            class="align-self-start mt-1 font-weight-medium"
          >
            {{ total }}&nbsp;{{ t('category.articleCount') }}
          </v-chip>
        </div>
      </section>
    </div>
  </header>
</template>

<style scoped>
/* ─── Only what Vuetify classes cannot express ───────────────────── */

/* Gradient background + hover border/shadow */
.category-header {
  background:
    radial-gradient(circle at 15% 25%, rgba(var(--v-theme-primary), 0.12) 0%, transparent 50%),
    linear-gradient(135deg, rgba(var(--v-theme-surface), 0.95) 0%, rgba(var(--v-theme-primary), 0.05) 100%);
  border: 1px solid rgba(var(--v-theme-primary), 0.12);
  transition: box-shadow 0.35s ease, border-color 0.35s ease;
}

.category-header:hover {
  box-shadow: 0 8px 32px rgba(var(--v-theme-primary), 0.1);
  border-color: rgba(var(--v-theme-primary), 0.25);
}

/* Absolute-fill cover image */
.category-header__bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Min-height + z-index on overlay */
.category-header__overlay {
  min-height: 320px;
  z-index: 1;
}

/* Dark gradient over cover image */
.category-header__overlay--image {
  background: linear-gradient(
    160deg,
    rgba(0, 0, 0, 0.2) 0%,
    rgba(0, 0, 0, 0.5) 50%,
    rgba(0, 0, 0, 0.75) 100%
  );
}

/* Content max-width */
.category-header__content {
  max-width: 900px;
}

/* Icon wrapper: fixed size + hover scale + optical nudge */
.category-header__icon-wrap {
  width: 72px;
  height: 72px;
  margin-top: 0.25rem;
  transition: transform 0.3s ease, background 0.3s ease;
}

.category-header:hover .category-header__icon-wrap {
  transform: scale(1.05);
}

.category-header__icon-wrap--default {
  background: rgba(var(--v-theme-primary), 0.1);
  border: 1.5px solid rgba(var(--v-theme-primary), 0.2);
}

.category-header__icon-wrap--image {
  background: rgba(255, 255, 255, 0.15);
  border: 1.5px solid rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

/* Fluid title size + letter-spacing */
.category-header__title {
  font-size: clamp(1.6rem, 3.5vw, 2.25rem);
  line-height: 1.2;
  letter-spacing: -0.015em;
}

/* Text shadow on image variant */
.category-header--image .category-header__title {
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

/* 4-line clamp + text shadow on image variant */
.category-header__description {
  max-width: 650px;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.category-header--image .category-header__description {
  opacity: 0.85;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}

/* Mobile: stack icon + text vertically */
@media (max-width: 600px) {
  .category-header__content {
    flex-direction: column;
  }

  .category-header__icon-wrap {
    width: 56px;
    height: 56px;
  }
}
</style>
