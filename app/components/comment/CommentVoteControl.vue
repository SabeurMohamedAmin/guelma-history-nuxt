<script setup lang="ts">
/**
 * Up/down vote arrows with the net score between them.
 *
 * Stateless: it shows the current score and which arrow the viewer has active,
 * and emits the INTENDED value (+1 or -1) when an arrow is pressed. The parent
 * resolves the toggle (pressing the active arrow again clears it) through the
 * composable, which talks to the server. Guests see a disabled, read-only
 * control.
 */
const props = withDefaults(defineProps<{
  score: number
  /** The viewer's current vote: 1, -1, or 0 (none). */
  viewerVote?: -1 | 0 | 1
  /** Disable interaction (guests, or a deleted comment). */
  disabled?: boolean
}>(), {
  viewerVote: 0,
  disabled: false,
})

const emit = defineEmits<{ vote: [value: -1 | 1] }>()

const { t } = useI18n()
</script>

<template>
  <div class="comment-vote">
    <v-btn
      :icon="props.viewerVote === 1 ? 'mdi-arrow-up-bold' : 'mdi-arrow-up-bold-outline'"
      :color="props.viewerVote === 1 ? 'primary' : undefined"
      :aria-label="t('comments.voteUp')"
      variant="text"
      density="comfortable"
      size="small"
      :disabled="props.disabled"
      @click="emit('vote', 1)"
    />
    <span
      class="comment-vote__score"
      :class="{
        'comment-vote__score--up': props.viewerVote === 1,
        'comment-vote__score--down': props.viewerVote === -1,
      }"
    >
      {{ props.score }}
    </span>
    <v-btn
      :icon="props.viewerVote === -1 ? 'mdi-arrow-down-bold' : 'mdi-arrow-down-bold-outline'"
      :color="props.viewerVote === -1 ? 'error' : undefined"
      :aria-label="t('comments.voteDown')"
      variant="text"
      density="comfortable"
      size="small"
      :disabled="props.disabled"
      @click="emit('vote', -1)"
    />
  </div>
</template>

<style scoped>
.comment-vote { display: inline-flex; align-items: center; gap: 0.15rem; }
.comment-vote__score { min-width: 1.6rem; text-align: center; font-weight: 700; font-size: 0.85rem; font-variant-numeric: tabular-nums; color: rgba(var(--v-theme-on-surface), 0.75); }
.comment-vote__score--up { color: rgb(var(--v-theme-primary)); }
.comment-vote__score--down { color: rgb(var(--v-theme-error)); }
</style>
