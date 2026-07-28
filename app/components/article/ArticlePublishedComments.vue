<script setup lang="ts">
type ArticleComment = { id: number, name: string, message: string, createdAt: string | Date }

const props = defineProps<{ slug: string }>()
const { locale } = useI18n()
const isFrench = computed(() => locale.value === 'fr')
const visibleCount = ref(6)
const pageSize = 6

const { data: response, pending } = await useFetch<{ success: boolean, data: ArticleComment[] }>('/api/articles/comments', {
  key: () => `article-published-comments-${props.slug}`,
  query: { slug: props.slug },
})

const comments = computed(() => response.value?.data ?? [])
const visibleComments = computed(() => comments.value.slice(0, visibleCount.value))
const hasMoreComments = computed(() => visibleCount.value < comments.value.length)
const formatDate = (date: string | Date) => new Intl.DateTimeFormat(isFrench.value ? 'fr-FR' : 'ar-DZ', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date))
const loadMore = () => {
  visibleCount.value += pageSize
}
</script>

<template>
  <section class="published-comments">
    <div class="comments-title mb-4">
      <div>
        <p class="section-kicker mb-1">
          {{ isFrench ? 'Discussion' : 'النقاش' }}
        </p>
        <h2 class="text-headline-small font-weight-bold mb-0">
          {{ isFrench ? 'Commentaires publiés' : 'التعليقات المنشورة' }}
        </h2>
      </div>
      <v-chip
        color="primary"
        variant="tonal"
      >
        {{ comments.length }}
      </v-chip>
    </div>

    <v-skeleton-loader
      v-if="pending"
      type="list-item-avatar-three-line, list-item-avatar-three-line"
      class="rounded-xl"
    />

    <template v-else>
      <div
        v-if="comments.length"
        class="comment-window"
      >
        <div class="comment-list">
          <article
            v-for="comment in visibleComments"
            :key="comment.id"
            class="comment-item"
          >
            <v-avatar
              color="primary"
              variant="tonal"
              size="42"
            >
              {{ comment.name.charAt(0).toUpperCase() }}
            </v-avatar>
            <div>
              <div class="comment-meta">
                <strong>{{ comment.name }}</strong><span>{{ formatDate(comment.createdAt) }}</span>
              </div>
              <p class="comment-message mb-0">
                {{ comment.message }}
              </p>
            </div>
          </article>
        </div>
      </div>

      <v-empty-state
        v-else
        icon="mdi-comment-outline"
        :title="isFrench ? 'Aucun commentaire pour le moment' : 'لا توجد تعليقات بعد'"
        :text="isFrench ? 'Soyez le premier à enrichir la discussion.' : 'كن أول من يثري النقاش.'"
      />

      <div
        v-if="hasMoreComments"
        class="text-center mt-4"
      >
        <v-btn
          color="primary"
          variant="tonal"
          class="rounded-lg font-weight-bold"
          @click="loadMore"
        >
          <v-icon
            icon="mdi-chevron-down"
            start
          />
          {{ isFrench ? 'Charger plus de commentaires' : 'تحميل المزيد من التعليقات' }}
        </v-btn>
      </div>
    </template>
  </section>
</template>

<style scoped>
.published-comments { padding: clamp(1rem, 3vw, 1.35rem); border-radius: 24px; background: rgba(var(--v-theme-surface), 0.5); }
.comments-title, .comment-item, .comment-meta { display: flex; }
.comments-title { align-items: center; justify-content: space-between; gap: 1rem; }
.section-kicker { color: rgb(var(--v-theme-primary)); font-size: 0.78rem; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; }
.comment-window { max-height: 460px; overflow-y: auto; padding-right: 0.35rem; scrollbar-width: thin; }
.comment-list { display: grid; gap: 0.8rem; }
.comment-item { gap: 0.9rem; padding: 1rem; border-radius: 18px; background: rgba(var(--v-theme-surface), 0.72); }
.comment-meta { align-items: center; flex-wrap: wrap; gap: 0.5rem; color: rgba(var(--v-theme-on-surface), 0.68); font-size: 0.88rem; }
.comment-meta strong { color: rgb(var(--v-theme-on-surface)); }
.comment-message { margin-top: 0.3rem; color: rgba(var(--v-theme-on-surface), 0.84); line-height: 1.7; }
</style>
