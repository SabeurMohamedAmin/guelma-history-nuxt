<script setup lang="ts">
/**
 * Shared shell for every section of the article editor (content, slug, body,
 * publishing, cover, reading time, media).
 *
 * It owns the card chrome — surface, rounded corners, icon badge and heading —
 * so a section only has to provide its fields. Rendering a real <section>
 * labelled by its own <h2> lets screen reader users jump from one part of the
 * form to the next instead of hearing one long list of inputs.
 */
import { useId } from 'vue'

const props = defineProps<{
  /** Material Design icon shown in the badge, e.g. 'mdi-format-title'. */
  icon: string
  /** Section heading, rendered as an <h2>. */
  title: string
  /** Short explanation displayed under the heading. */
  hint?: string
  /** Adds a discreet "optional" chip next to the heading. */
  optional?: boolean
}>()

const { t } = useI18n()

// Unique, SSR-safe id so the <section> can be labelled by its own heading.
const headingId = useId()
</script>

<template>
  <section
    class="form-card mb-4 rounded-xl"
    :aria-labelledby="headingId"
  >
    <div class="d-flex align-center ga-3 pa-3 pa-sm-4 pb-2">
      <span
        class="form-card__badge"
        aria-hidden="true"
      >
        <v-icon :icon="props.icon" />
      </span>

      <div class="form-card__heading flex-grow-1">
        <h2 class="form-card__title text-subtitle-1 font-weight-bold">
          {{ props.title }}
        </h2>
        <p
          v-if="props.hint"
          class="text-caption text-medium-emphasis mb-0"
        >
          {{ props.hint }}
        </p>
      </div>

      <v-chip
        v-if="props.optional"
        size="x-small"
        variant="tonal"
      >
        {{ t('articleForm.optional') }}
      </v-chip>

      <!-- Trailing control, e.g. the "copy from French" button. -->
      <slot name="actions"></slot>
    </div>

    <div class="pa-3 pa-sm-4 pt-2">
      <slot></slot>
    </div>
  </section>
</template>

<style scoped>
.form-card {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

/* Rounded icon badge in front of the heading. */
.form-card__badge {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  inline-size: 38px;
  block-size: 38px;
  border-radius: 12px;
  background: rgba(var(--v-theme-primary), 0.1);
  color: rgb(var(--v-theme-primary));
}

/* Long unbroken words (URLs, slugs) must wrap instead of stretching the card. */
.form-card__heading {
  min-inline-size: 0;
  overflow-wrap: anywhere;
}

.form-card__title {
  line-height: 1.3;
  margin-block-end: 0;
}
</style>
