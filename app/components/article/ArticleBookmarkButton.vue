<script setup lang="ts">
/**
 * Save / unsave an article to the reading list.
 *
 * Renders ONLY when logged in (guests never see save controls, per spec). The
 * toggle is optimistic via the bookmarks store and accessible: it exposes
 * `aria-pressed` and a localized `aria-label`, and the icon is purely
 * decorative. RTL is inherited from the document direction.
 */
const props = withDefaults(defineProps<{
  // The article's public slug — the stable identifier used across the API.
  articleSlug: string
  // Visual style: 'icon' (compact, e.g. on a card) or 'button' (labelled).
  variant?: 'icon' | 'button'
  size?: string
}>(), {
  variant: 'icon',
  size: 'small',
})

const { t } = useI18n()
const auth = useAuthStore()
const bookmarks = useBookmarksStore()

const saved = computed(() => bookmarks.isBookmarked(props.articleSlug))
const busy = ref(false)

const label = computed(() => (saved.value ? t('bookmarks.saved') : t('bookmarks.save')))

async function onToggle() {
  if (busy.value) return
  busy.value = true
  try {
    await bookmarks.toggle(props.articleSlug)
  }
  catch {
    // The store already rolled back the optimistic flip, so the icon visibly
    // reverts to its previous state — no extra error UI needed here.
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <!-- Guests never see the save control. -->
  <template v-if="auth.loggedIn">
    <v-btn
      v-if="variant === 'icon'"
      :icon="saved ? 'mdi-bookmark' : 'mdi-bookmark-outline'"
      :color="saved ? 'primary' : undefined"
      :size="size"
      variant="text"
      :loading="busy"
      :aria-pressed="saved"
      :aria-label="label"
      :title="label"
      @click.prevent.stop="onToggle"
    />
    <v-btn
      v-else
      :prepend-icon="saved ? 'mdi-bookmark' : 'mdi-bookmark-outline'"
      :color="saved ? 'primary' : undefined"
      :variant="saved ? 'flat' : 'tonal'"
      :size="size"
      class="text-none rounded-xl text-body-medium"
      :loading="busy"
      :aria-pressed="saved"
      :aria-label="label"
      @click.prevent.stop="onToggle"
    >
      {{ label }}
    </v-btn>
  </template>
</template>
