<script setup lang="ts">
import { useDisplay } from 'vuetify'

const { xs } = useDisplay()
type EngagementAction = 'share' | 'correction'

const props = defineProps<{
  // The article's public slug; used for every engagement API call.
  slug: string
  title: string
  excerpt?: string
}>()

const { locale } = useI18n()
const isFrench = computed(() => locale.value === 'fr')
const activeAction = ref<EngagementAction>('share')

const actions = computed(() => [
  { value: 'share' as const, icon: 'mdi-share-variant-outline', label: isFrench.value ? 'Partager l\'article' : 'مشاركة المقال' },
  { value: 'correction' as const, icon: 'mdi-file-document-edit-outline', label: isFrench.value ? 'Demander une correction' : 'طلب تصحيح' },
])
</script>

<template>
  <section class="rounded-xl overflow-hidden pa-2 engagement-panel">
    <!-- Header -->
    <div class="mb-4">
      <p class="text-primary font-weight-black text-uppercase mb-1 engagement-kicker">
        {{ isFrench ? 'Interaction' : 'تفاعل' }}
      </p>
      <h2 class="text-headline-small text-md-h4 font-weight-bold">
        {{ isFrench ? 'Participer à cet article' : 'شارك في هذا المقال' }}
      </h2>
    </div>

    <!-- Nav using Vuetify grid -->
    <nav :aria-label="isFrench ? 'Actions article' : 'إجراءات المقال'">
      <v-row
        density="compact"
        class="mb-4"
      >
        <v-col
          v-for="action in actions"
          :key="action.value"
          cols="6"
        >
          <v-btn
            block
            :rounded="xs ? 'md' : 'lg'"
            class="text-wrap pa-sm-2 py-5 text-body-small text-sm-body-large"
            :size="xs ? 'x-small' : 'large'"
            :variant="activeAction === action.value ? 'flat' : 'tonal'"
            :color="activeAction === action.value ? 'primary' : undefined"
            @click="activeAction = action.value"
          >
            <v-icon
              :icon="action.icon"
              start
            />
            {{ action.label }}
          </v-btn>
        </v-col>
      </v-row>
    </nav>

    <!-- Window -->
    <v-window
      v-model="activeAction"
      class="overflow-visible"
    >
      <v-window-item value="share">
        <ArticleShareSidebar
          :title="props.title"
          :excerpt="props.excerpt"
        />
      </v-window-item>
      <v-window-item value="correction">
        <ArticleCorrectionRequest :article-slug="props.slug" />
      </v-window-item>
    </v-window>
  </section>
</template>

<style scoped>
.engagement-panel {
  background: radial-gradient(circle at top left, rgba(var(--v-theme-primary), 0.09), transparent 22rem),
              rgba(var(--v-theme-surface), 0.64);
}

.engagement-kicker {
  font-size: 0.78rem;
  letter-spacing: 0.14em;
}

:deep(.correction-card),
:deep(.share-card) {
  border: 0;
  background: rgba(var(--v-theme-surface), 0.48);
  box-shadow: none;
}
</style>
