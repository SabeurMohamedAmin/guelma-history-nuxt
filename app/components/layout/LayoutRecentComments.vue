<script setup lang="ts">
import { formatDate } from '~/utils/date'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RecentComment {
  id: number | string
  author: string
  articleTitle: string
  articleSlug?: string
  createdAt: Date | string
}

// ─── Props ────────────────────────────────────────────────────────────────────

const props = withDefaults(defineProps<{
  comments?: RecentComment[]
  loading?: boolean
}>(), {
  loading: false,
  comments: () => [
    { id: 1, author: 'amin', articleTitle: 'نهج زدادرة حسين سان بوسيديوس في قالمة خلال الحقبة الاستعمارية عام 1906', createdAt: '2025-10-31' },
    { id: 2, author: 'Elliot Alderson', articleTitle: 'فيلم دعائي فرنسي من عام 1959 حول مدينة قالمة', createdAt: '2024-10-09' },
    { id: 3, author: 'Elliot Alderson', articleTitle: 'سوق قالمة القديم نبض الحياة اليومية في قلب المدينة', createdAt: '2024-10-09' },
    { id: 4, author: 'Elliot Alderson', articleTitle: 'بنك الجزائر في قالمة: من صرح مالي استعماري إلى خزينة عمومية', createdAt: '2024-10-09' },
    { id: 5, author: 'Elliot Alderson', articleTitle: 'فنتازيا قالمة 1904: عندما يمتزج غبار البارود بعبق التاريخ', createdAt: '2024-10-09' },
  ],
})

// ─── Composables ──────────────────────────────────────────────────────────────

const { t, locale } = useI18n()
const localePath = useLocalePath()

// ─── Computed ─────────────────────────────────────────────────────────────────

/** Show at most 5 comments */
const items = computed(() => props.comments.slice(0, 5))

const hasComments = computed(() => items.value.length > 0)

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getFormattedDate(comment: RecentComment): string {
  return comment.createdAt
    ? formatDate(comment.createdAt, locale.value as 'ar' | 'fr')
    : ''
}

function getCommentLink(comment: RecentComment): string | undefined {
  return comment.articleSlug
    ? localePath(`/articles/${comment.articleSlug}`)
    : undefined
}
</script>

<template>
  <v-card
    color="surface"
    variant="flat"
    class="rounded-xl pa-4 mb-6 sidebar-card"
  >
    <!-- ── Heading ─────────────────────────────────────────────────────────── -->
    <h2
      id="recent-comments-heading"
      class="text-headline-small font-weight-bold ma-0 mb-4 pa-2"
    >
      {{ t('sidebar.recentComments') }}
    </h2>

    <!-- ── Loading state ──────────────────────────────────────────────────── -->
    <div
      v-if="loading"
      class="d-flex flex-column ga-2"
    >
      <v-skeleton-loader
        v-for="n in 3"
        :key="n"
        type="list-item-avatar-two-line"
        class="rounded-lg"
      />
    </div>

    <!-- ── Comments list ──────────────────────────────────────────────────── -->
    <nav
      v-else-if="hasComments"
      aria-labelledby="recent-comments-heading"
      class="d-flex flex-column"
    >
      <component
        :is="getCommentLink(comment) ? 'NuxtLink' : 'div'"
        v-for="comment in items"
        :key="comment.id"
        :to="getCommentLink(comment)"
        class="comment-item rounded-lg px-3 py-2 text-decoration-none text-inherit"
      >
        <!-- Avatar -->
        <v-avatar
          size="40"
          color="primary"
          variant="tonal"
          class="align-self-center flex-shrink-0"
        >
          <v-icon
            icon="mdi-comment-text-outline"
            size="18"
          />
        </v-avatar>

        <!-- Text body -->
        <div class="comment-item__body flex-grow-1 text-truncate-block">
          <!-- Author + article -->
          <p class="comment-item__text text-medium-emphasis mb-1">
            <span class="font-weight-bold text-high-emphasis">{{ comment.author }}</span>
            <span class="mx-1 text-disabled">{{ t('sidebar.commentedOn') }}</span>
            <span class="font-weight-semibold text-high-emphasis comment-item__target">
              {{ comment.articleTitle }}
            </span>
          </p>

          <!-- Date -->
          <time
            v-if="getFormattedDate(comment)"
            class="d-inline-flex align-center ga-1 text-caption text-primary"
          >
            <v-icon
              icon="mdi-calendar-blank-outline"
              size="12"
            />
            {{ getFormattedDate(comment) }}
          </time>
        </div>
      </component>
    </nav>

    <!-- ── Empty state ────────────────────────────────────────────────────── -->
    <div
      v-else
      class="d-flex flex-column align-center justify-center py-6 text-medium-emphasis"
    >
      <v-icon
        icon="mdi-comment-outline"
        size="32"
        class="mb-2"
      />
      <p class="text-body-2 mb-0">
        {{ t('common.noResults') }}
      </p>
    </div>
  </v-card>
</template>

<style scoped>
/* Card border — Vuetify doesn't expose a single utility for rgba border */
.sidebar-card {
  border: 1px solid rgb(var(--v-border-color) / 0.12);
}

/* ── Comment row ─────────────────────────────────────────────────────────── */
.comment-item {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  transition: background-color 0.18s ease;

  /* Thin accent bar — pure CSS trick, no Vuetify equivalent */
  &::before {
    content: '';
    position: absolute;
    inset-inline-start: 0;
    top: 50%;
    width: 3px;
    height: 60%;
    border-radius: 3px;
    background-color: rgb(var(--v-theme-primary));
    transform: translateY(-50%) scaleY(0);
    transform-origin: center;
    transition: transform 0.18s ease;
  }

  & + & { margin-top: 2px; }

  &:hover {
    background-color: rgb(var(--v-theme-primary) / 0.05);

    &::before { transform: translateY(-50%) scaleY(1); }

    .comment-item__target { color: rgb(var(--v-theme-primary)); }
  }

  &:focus-visible {
    outline: 2px solid rgb(var(--v-theme-primary));
    outline-offset: 2px;
  }
}

/* ── Text body ───────────────────────────────────────────────────────────── */
.comment-item__text {
  font-size: 0.8125rem;   /* 13px — between Vuetify's text-body-2 (12px) and text-body-1 (14px) */
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 0 0 4px;
}

.comment-item__target {
  transition: color 0.18s ease;
}

/* ── Accessibility ───────────────────────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .comment-item,
  .comment-item::before,
  .comment-item__target {
    transition: none;
  }
}
</style>
