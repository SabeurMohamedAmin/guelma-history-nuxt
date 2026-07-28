<script setup lang="ts">
import type { FlaggedComment } from '~~/server/utils/comments'

/**
 * Admin moderation queue for reported comments.
 *
 * Lists every comment with open reports, with the aggregated reasons and a
 * report count. Admins can resolve a report (dismiss it) or delete the comment
 * outright — deletion reuses the regular comment endpoint, which already grants
 * admins full access, and auto-resolves the open reports afterwards.
 */
definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
})

const { t, locale } = useI18n()
const isFrench = computed(() => locale.value === 'fr')

interface QueueResponse { success: boolean, data: FlaggedComment[] }

const items = ref<FlaggedComment[]>([])
const pending = ref(false)
const busyId = ref<string | null>(null)
const snackbar = ref<{ show: boolean, text: string, color: string }>({ show: false, text: '', color: 'success' })

function notify(text: string, color: 'success' | 'error' = 'success') {
  snackbar.value = { show: true, text, color }
}

async function fetchQueue() {
  pending.value = true
  try {
    const res = await $fetch<QueueResponse>('/api/admin/comments/flags')
    items.value = res.data
  }
  catch {
    notify(t('comments.moderation.empty'), 'error')
  }
  finally {
    pending.value = false
  }
}

async function resolve(item: FlaggedComment) {
  busyId.value = item.commentId
  try {
    await $fetch(`/api/admin/comments/flags/${item.commentId}/resolve`, { method: 'POST' })
    notify(t('comments.moderation.resolved'))
    await fetchQueue()
  }
  catch {
    notify(t('comments.moderation.empty'), 'error')
  }
  finally {
    busyId.value = null
  }
}

async function removeComment(item: FlaggedComment) {
  busyId.value = item.commentId
  try {
    await $fetch(`/api/comments/${item.commentId}`, { method: 'DELETE' })
    // Deleting handles the content; clear the now-moot reports too.
    await $fetch(`/api/admin/comments/flags/${item.commentId}/resolve`, { method: 'POST' })
    notify(t('comments.moderation.deleted'))
    await fetchQueue()
  }
  catch {
    notify(t('comments.delete'), 'error')
  }
  finally {
    busyId.value = null
  }
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat(isFrench.value ? 'fr-FR' : 'ar-DZ', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(date))
}

onMounted(fetchQueue)
</script>

<template>
  <div>
    <div class="mb-6">
      <h1 class="text-headline-medium font-weight-bold">
        {{ t('comments.moderation.title') }}
      </h1>
      <p class="text-body-2 text-medium-emphasis mt-1 mb-0">
        {{ t('comments.moderation.subtitle') }}
      </p>
    </div>

    <v-skeleton-loader
      v-if="pending && items.length === 0"
      type="list-item-three-line, list-item-three-line"
      class="rounded-lg"
    />

    <v-empty-state
      v-else-if="items.length === 0"
      icon="mdi-shield-check-outline"
      :title="t('comments.moderation.empty')"
      :text="t('comments.moderation.emptyHint')"
    />

    <div
      v-else
      class="d-flex flex-column ga-3"
    >
      <v-card
        v-for="item in items"
        :key="item.commentId"
        rounded="lg"
        variant="outlined"
        class="pa-4"
      >
        <div class="d-flex align-center justify-space-between ga-3 mb-2">
          <div class="d-flex align-center ga-2">
            <v-chip
              color="error"
              size="small"
              variant="flat"
            >
              {{ item.reportCount }}
              {{ t('comments.moderation.reports') }}
            </v-chip>
            <span class="text-body-2 text-medium-emphasis">
              {{ item.author?.displayName || item.author?.username || (isFrench ? 'Utilisateur' : 'مستخدم') }}
              <!-- author fallback stays locale-derived -->
            </span>
            <span class="text-caption text-medium-emphasis">{{ formatDate(item.firstReportedAt) }}</span>
          </div>
        </div>

        <p
          dir="auto"
          class="comment-body mb-2"
          :class="{ 'text-medium-emphasis font-italic': item.isDeleted }"
        >
          {{ item.body }}
        </p>

        <div
          v-if="item.reasons.length"
          class="mb-3"
        >
          <v-chip
            v-for="(reason, i) in item.reasons"
            :key="i"
            size="x-small"
            variant="tonal"
            class="me-1 mb-1"
          >
            {{ reason }}
          </v-chip>
        </div>

        <div class="d-flex ga-2">
          <v-btn
            color="success"
            variant="tonal"
            size="small"
            prepend-icon="mdi-check"
            :loading="busyId === item.commentId"
            @click="resolve(item)"
          >
            {{ t('comments.moderation.resolve') }}
          </v-btn>
          <v-btn
            v-if="!item.isDeleted"
            color="error"
            variant="tonal"
            size="small"
            prepend-icon="mdi-delete-outline"
            :loading="busyId === item.commentId"
            @click="removeComment(item)"
          >
            {{ t('comments.delete') }}
          </v-btn>
        </div>
      </v-card>
    </div>

    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      location="bottom"
      timeout="3000"
    >
      {{ snackbar.text }}
    </v-snackbar>
  </div>
</template>

<style scoped>
.comment-body { text-align: start; white-space: pre-wrap; word-break: break-word; line-height: 1.7; }
</style>
