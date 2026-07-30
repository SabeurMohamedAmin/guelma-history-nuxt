<script setup lang="ts">
/**
 * Container for the realtime threaded comments of one article.
 *
 * Wires the useComments composable to the UI: the new-comment composer (or a
 * sign-in prompt for guests), the sorted root list with recursive replies, and
 * the load-more button. Sorting controls and the re-root focus view are layered
 * on in Step 8.
 */
// The article's public slug — the stable identifier used across the API.
const props = defineProps<{ articleSlug: string }>()

const { t } = useI18n()
const localePath = useLocalePath()
const { loggedIn } = useUserSession()

const {
  sort,
  order,
  roots,
  pending,
  error,
  isFocused,
  focusComment,
  focusAncestors,
  focus,
  clearFocus,
  repliesOf,
  loadMore,
  create,
  edit,
  remove,
  vote,
  flag,
} = useComments(() => props.articleSlug)

const newComment = ref('')
const posting = ref(false)

// Root element of the section, used to anchor the viewport on focus changes.
const sectionEl = ref<HTMLElement | null>(null)

/**
 * Scroll to the focused comment section after Vue has rendered the loaded
 * focus view. This covers both cases:
 * - user clicks a comment already on the same article page,
 * - user opens a notification from another page and the article + comment load
 *   asynchronously before the target exists in the DOM.
 */
async function scrollToFocusedComment() {
  if (!isFocused.value || pending.value || !focusComment.value) return

  await nextTick()
  sectionEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

watch(isFocused, () => void scrollToFocusedComment())
watch(focusComment, () => void scrollToFocusedComment())
watch(pending, () => void scrollToFocusedComment())

async function postRoot(body: string) {
  posting.value = true
  try {
    await create(body, null)
    newComment.value = ''
  }
  finally {
    posting.value = false
  }
}
</script>

<template>
  <section
    ref="sectionEl"
    class="comment-section mt-lg-6 pa-2 pa-lg-4 rounded-xl"
  >
    <h3 class="text-headline-small font-weight-bold py-2 ma-0 mb-3">
      {{ t('comments.title') }}
    </h3>

    <CommentComposerForm
      v-if="loggedIn"
      v-model="newComment"
      :loading="posting"
      class="mb-4"
      @submit="postRoot"
    />
    <v-alert
      v-else
      type="info"
      variant="tonal"
      density="comfortable"
      class="mb-4"
    >
      {{ t('comments.loginPrompt') }}
      <template #append>
        <v-btn
          :to="localePath('/login')"
          color="primary"
          size="small"
          variant="flat"
        >
          {{ t('comments.login') }}
        </v-btn>
      </template>
    </v-alert>

    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      density="compact"
      class="mb-4"
    >
      {{ error }}
    </v-alert>

    <div
      v-if="isFocused"
      class="comment-section__focus mb-3"
    >
      <v-btn
        variant="text"
        size="small"
        prepend-icon="mdi-arrow-up-left"
        @click="focusAncestors.length ? focus(focusAncestors[focusAncestors.length - 1]!.id) : clearFocus()"
      >
        {{ t('comments.upOneLevel') }}
      </v-btn>
      <v-btn
        variant="text"
        size="small"
        prepend-icon="mdi-format-list-bulleted"
        @click="clearFocus"
      >
        {{ t('comments.allComments') }}
      </v-btn>
    </div>

    <CommentSortToolbar
      v-else
      v-model:sort="sort"
      v-model:order="order"
      class="mb-3"
    />

    <v-skeleton-loader
      v-if="pending && roots.length === 0"
      type="list-item-three-line, list-item-three-line"
      class="rounded-xl"
    />

    <v-empty-state
      v-else-if="roots.length === 0"
      icon="mdi-comment-outline"
      :title="t('comments.empty')"
      :text="t('comments.emptyHint')"
    />

    <div class="comment-section__list">
      <CommentItem
        v-for="root in roots"
        :key="root.id"
        :comment="root"
        :replies-of="repliesOf"
        :indent-base="isFocused ? (focusComment?.depth ?? 0) : 0"
        @reply="(pid, body) => create(body, pid)"
        @edit="edit"
        @remove="remove"
        @vote="vote"
        @flag="cid => flag(cid)"
        @focus="focus"
      />
    </div>

    <div class="text-center mt-4">
      <v-btn
        variant="tonal"
        color="primary"
        class="rounded-lg font-weight-bold"
        :disabled="roots.length === 0 || pending"
        :loading="pending"
        @click="loadMore"
      >
        <v-icon
          icon="mdi-chevron-down"
          start
        />
        {{ t('comments.loadMore') }}
      </v-btn>
    </div>
  </section>
</template>

<style scoped>
.comment-section { background: rgba(var(--v-theme-surface), 0.48); }
.comment-section__list {
   display: flex;
   flex-direction: column;
  }
</style>
