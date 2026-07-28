<script setup lang="ts">
import type { CommentNode } from '~~/shared/types/comment'

const props = withDefaults(defineProps<{
  comment: CommentNode
  repliesOf: (parentId: string) => CommentNode[]
  isTopLevel?: boolean
  /**
   * Depth of the thread's visual root. 0 for the normal list; in the re-root
   * focus view it's the focused comment's own depth, so the indent cap is
   * measured from the re-rooted node instead of from the original root (which
   * would otherwise be over the cap immediately and never expand).
   */
  indentBase?: number
}>(), {
  isTopLevel: false,
  indentBase: 0,
})

const emit = defineEmits<{
  reply: [parentId: string, body: string]
  edit: [commentId: string, body: string]
  remove: [commentId: string]
  vote: [commentId: string, value: -1 | 1]
  flag: [commentId: string]
  focus: [commentId: string]
}>()

const { t, locale } = useI18n()
const isFrench = computed(() => locale.value === 'fr')
const { user, loggedIn } = useUserSession()

// How many levels replies indent before the "continue this thread" re-root
// link appears. Configurable via NUXT_PUBLIC_COMMENTS_MAX_INDENT (see
// nuxt.config runtimeConfig.public.commentsMaxIndent).
const maxIndent = Number(useRuntimeConfig().public.commentsMaxIndent) || 2

const replies = computed(() => props.repliesOf(props.comment.id))
const hasReplies = computed(() => replies.value.length > 0)
// Depth relative to the thread's visual root, so re-rooting resets the cap.
const relativeDepth = computed(() => props.comment.depth - props.indentBase)
const atIndentCap = computed(() => relativeDepth.value >= maxIndent && hasReplies.value)

const isOwner = computed(() => loggedIn.value && user.value?.id === props.comment.author?.id)
const isAdmin = computed(() => user.value?.role === 'admin')
const canModify = computed(() => !props.comment.isDeleted && (isOwner.value || isAdmin.value))
const canReply = computed(() => loggedIn.value && !props.comment.isDeleted)
const canFlag = computed(() => loggedIn.value && !isOwner.value && !props.comment.isDeleted)

// Start collapsed so a thread opens one level at a time: clicking (+) reveals
// only this node's direct replies, each of which is itself collapsed until the
// reader expands it. (Previously every level rendered expanded, so opening one
// node showed the whole subtree at once.)
const collapsed = ref(true)
const replying = ref(false)
const editing = ref(false)
const replyText = ref('')
const editText = ref('')
const busy = ref(false)

const authorName = computed(() =>
  props.comment.author?.displayName
  || props.comment.author?.username
  || (isFrench.value ? 'Utilisateur' : 'مستخدم'),
)

function formatDate(date: string) {
  return new Intl.DateTimeFormat(isFrench.value ? 'fr-FR' : 'ar-DZ', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(date))
}

function startReply() {
  replyText.value = ''
  replying.value = true
  editing.value = false
}

function startEdit() {
  editText.value = props.comment.body
  editing.value = true
  replying.value = false
}

async function submitReply(body: string) {
  busy.value = true
  try {
    emit('reply', props.comment.id, body)
    replying.value = false
  }
  finally {
    busy.value = false
  }
}

async function submitEdit(body: string) {
  busy.value = true
  try {
    emit('edit', props.comment.id, body)
    editing.value = false
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="comment-node">
    <div class="comment-node__row">
      <button
        v-if="hasReplies"
        type="button"
        class="comment-node__toggle"
        :aria-label="collapsed ? t('comments.expand') : t('comments.collapse')"
        @click="collapsed = !collapsed"
      >
        {{ collapsed ? '+' : '−' }}
      </button>
      <span
        v-else
        class="comment-node__toggle comment-node__toggle--leaf"
      ></span>

      <div class="comment-node__main">
        <div class="comment-node__meta">
          <strong>{{ comment.isDeleted ? t('comments.deletedAuthor') : authorName }}</strong>
          <span class="comment-node__date">{{ formatDate(comment.createdAt) }}</span>
          <span
            v-if="comment.editedAt && !comment.isDeleted"
            class="comment-node__edited"
          >
            {{ t('comments.edited') }}
          </span>
        </div>

        <CommentComposerForm
          v-if="editing"
          v-model="editText"
          dense
          cancelable
          :loading="busy"
          :submit-label="t('comments.save')"
          @submit="submitEdit"
          @cancel="editing = false"
        />
        <p
          v-else
          class="comment-node__body"
          :class="{ 'comment-node__body--deleted': comment.isDeleted }"
        >
          {{ comment.isDeleted ? t('comments.deletedBody') : comment.body }}
        </p>

        <div class="comment-node__actions">
          <CommentVoteControl
            :score="comment.score"
            :viewer-vote="comment.viewerVote"
            :disabled="!loggedIn || comment.isDeleted"
            @vote="value => emit('vote', comment.id, value)"
          />
          <v-btn
            v-if="canReply"
            variant="text"
            size="x-small"
            prepend-icon="mdi-reply"
            @click="startReply"
          >
            {{ t('comments.reply') }}
          </v-btn>
          <v-btn
            v-if="canModify"
            variant="text"
            size="x-small"
            prepend-icon="mdi-pencil"
            @click="startEdit"
          >
            {{ t('comments.edit') }}
          </v-btn>
          <v-btn
            v-if="canModify"
            variant="text"
            size="x-small"
            color="error"
            prepend-icon="mdi-delete-outline"
            @click="emit('remove', comment.id)"
          >
            {{ t('comments.delete') }}
          </v-btn>
          <v-btn
            v-if="canFlag"
            variant="text"
            size="x-small"
            prepend-icon="mdi-flag-outline"
            @click="emit('flag', comment.id)"
          >
            {{ t('comments.flag') }}
          </v-btn>
        </div>

        <CommentComposerForm
          v-if="replying"
          v-model="replyText"
          dense
          cancelable
          :loading="busy"
          :submit-label="t('comments.reply')"
          class="comment-node__reply"
          @submit="submitReply"
          @cancel="replying = false"
        />
      </div>
    </div>

    <button
      v-if="atIndentCap && !collapsed"
      type="button"
      class="comment-node__continue"
      @click="emit('focus', comment.id)"
    >
      {{ t('comments.continueThread') }}
    </button>

    <div
      v-if="hasReplies && !collapsed && !atIndentCap"
      class="comment-node__children"
      :class="{ 'comment-node__children--root': isTopLevel }"
    >
      <CommentItem
        v-for="child in replies"
        :key="child.id"
        :comment="child"
        :replies-of="repliesOf"
        :max-indent="maxIndent"
        :indent-base="indentBase"
        :is-top-level="false"
        @reply="(pid, body) => emit('reply', pid, body)"
        @edit="(cid, body) => emit('edit', cid, body)"
        @remove="cid => emit('remove', cid)"
        @vote="(cid, value) => emit('vote', cid, value)"
        @flag="cid => emit('flag', cid)"
        @focus="cid => emit('focus', cid)"
      />
    </div>
  </div>
</template>

<style scoped>
.comment-node { margin-top: 0.85rem;  }
.comment-node__row { display: flex; gap: 0.5rem; }
.comment-node__toggle { flex: 0 0 auto; width: 1.4rem; height: 1.4rem; line-height: 1; border-radius: 6px; border: 1px solid rgba(var(--v-theme-on-surface), 0.18); background: transparent; color: rgba(var(--v-theme-on-surface), 0.7); font-weight: 800; cursor: pointer; }
.comment-node__toggle--leaf { border: none; cursor: default; }
.comment-node__main { flex: 1 1 auto; min-width: 0; }
.comment-node__meta { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: rgba(var(--v-theme-on-surface), 0.62); }
.comment-node__meta strong { color: rgb(var(--v-theme-on-surface)); }
.comment-node__edited { font-style: italic; font-size: 0.78rem; }
.comment-node__body {
  border-radius: 6px;
  background-color: #e8ffff0d;
  box-shadow: inset 1px 1px 3px rgba(var(--v-theme-on-surface), 0.12);
  margin: 0.3rem 0 0.4rem;
  text-align: start;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
  color: rgba(var(--v-theme-on-surface), 0.9);
  min-width: 30dvw;
  width: fit-content;
  padding: 2px 4px;
}
.comment-node__body--deleted { color: rgba(var(--v-theme-on-surface), 0.5); font-style: italic; }
.comment-node__actions { display: flex; flex-wrap: wrap; align-items: center; gap: 0.1rem; }
.comment-node__reply { margin-top: 0.5rem; }

.comment-node__children {
  position: relative;
  margin-inline-start: 0.7rem;
  padding-inline-start: 1rem;

}

@media (max-width: 720px) {
  .comment-node__children {
    position: relative;
    margin-inline-start: 0.5rem;
    padding-inline-start: .5rem;
  }
}

.comment-node__children::before {
  content: '';
  position: absolute;
  top: -9dvh !important;
  inset-block: 0;
  inset-inline-start: 0;
  width: 1px;
  border-radius: 2px;
  background: rgba(var(--v-theme-on-surface), 0.12);
}

/* No thread line on the first level of replies */
.comment-node__children--root::before {
  display: none;
}

/* Highlight only the innermost hovered thread line */
.comment-node__children:hover:not(:has(.comment-node__children:hover))::before {
  background: rgba(var(--v-theme-on-surface), 0.22);
}

.comment-node__continue { margin-inline-start: 1.9rem; margin-top: 0.4rem; background: none; border: none; padding: 0.2rem 0; color: rgb(var(--v-theme-primary)); font-weight: 700; font-size: 0.85rem; cursor: pointer; }
</style>
