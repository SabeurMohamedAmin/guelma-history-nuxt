<script setup lang="ts">
/**
 * A small mute / unmute toggle for ONE target: an article thread or a comment
 * thread. Drop it into an article page or a comment menu and pass the id.
 *
 *   <notification-mute-button :article-id="article.id" />
 *   <notification-mute-button :comment-id="comment.id" />
 *
 * It reflects whether the current user already has a matching mute, and flips
 * between mute and unmute. State lives in the notifications store.
 */
import type { MuteScope } from '~~/shared/types/notification'

const props = defineProps<{
  articleId?: number
  commentId?: string
}>()

const { t } = useI18n()
const notifications = useNotificationsStore()

// Whether this button targets an article or a comment thread.
const scope = computed<MuteScope>(() => (props.commentId !== undefined ? 'comment' : 'article'))

// Load the user's mutes once so we can show the right state.
onMounted(() => void notifications.loadMutes())

// The matching mute for this exact target, if the user has one.
const existingMute = computed(() =>
  notifications.mutes.find((m) => {
    if (scope.value === 'comment') return m.scope === 'comment' && m.commentId === props.commentId
    return m.scope === 'article' && m.articleId === props.articleId
  }),
)
const isMuted = computed(() => existingMute.value !== undefined)

async function toggle() {
  if (existingMute.value) {
    await notifications.unmute(existingMute.value.id)
    return
  }
  await notifications.mute(scope.value, { articleId: props.articleId, commentId: props.commentId })
}
</script>

<template>
  <v-btn
    variant="text"
    size="small"
    :prepend-icon="isMuted ? 'mdi-bell-off-outline' : 'mdi-bell-outline'"
    class="text-none"
    @click="toggle"
  >
    {{ isMuted ? t('notifications.mute.unmute') : t(`notifications.mute.${scope}`) }}
  </v-btn>
</template>
