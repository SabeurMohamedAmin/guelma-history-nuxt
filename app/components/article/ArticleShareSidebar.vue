<script setup lang="ts">
type ShareNetwork = {
  key: 'facebook' | 'x' | 'share'
  label: string
  icon: string
  color?: string
  url?: string
  usesNativeShare?: boolean
}

const props = defineProps<{ title: string, excerpt?: string }>()
const route = useRoute()
const { locale } = useI18n()

const isFrench = computed(() => locale.value === 'fr')
const articleUrl = computed(() =>
  import.meta.client ? `${window.location.origin}${route.fullPath}` : route.fullPath,
)
const encodedUrl = computed(() => encodeURIComponent(articleUrl.value))
const encodedTitle = computed(() => encodeURIComponent(props.title))
const copied = ref(false)
const sharing = ref<string | null>(null)

const networks = computed<ShareNetwork[]>(() => [
  {
    key: 'facebook',
    label: 'Facebook',
    icon: 'mdi-facebook',
    color: '#1877F2',
    url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl.value}`,
  },
  {
    key: 'x',
    label: 'X',
    icon: 'mdi-twitter',
    url: `https://twitter.com/intent/tweet?url=${encodedUrl.value}&text=${encodedTitle.value}`,
  },
  {
    key: 'share',
    label: isFrench.value ? 'Partager' : 'مشاركة',
    icon: 'mdi-share-variant',
    usesNativeShare: true,
  },
])

const copyLink = async () => {
  if (!import.meta.client) return
  await navigator.clipboard.writeText(articleUrl.value)
  copied.value = true
  window.setTimeout(() => {
    copied.value = false
  }, 2200)
}

const sharePayload = computed(() => ({
  title: props.title,
  text: props.excerpt || props.title,
  url: articleUrl.value,
}))

const shareNatively = async () => {
  if (!navigator.share) return false

  await navigator.share(sharePayload.value)
  return true
}

const openShare = async (network: ShareNetwork) => {
  if (!import.meta.client) return
  sharing.value = network.key
  await nextTick()

  if (network.usesNativeShare && await shareNatively()) {
    sharing.value = null
    return
  }

  if (network.usesNativeShare) {
    await copyLink()
  }
  else if (network.url) {
    window.open(network.url, '_blank', 'noopener,noreferrer,width=720,height=560')
  }

  window.setTimeout(() => {
    sharing.value = null
  }, 600)
}

const copiedBtnTooltipTxt = computed(() => {
  return copied.value ? isFrench.value ? 'تم النسخ' : 'تم النسخ' : isFrench.value ? 'نسخ الرابط' : 'نسخ الرابط'
})
</script>

<template>
  <v-card
    variant="flat"
    class="pa-1 py-2 share-card"
    rounded="xl"
    border
  >
    <v-row class="mb-5 align-end justify-space-between">
      <v-col cols="12">
        <p class="share-kicker text-primary text-uppercase font-weight-bold mb-0">
          {{ isFrench ? 'Partager' : 'مشاركة' }}
        </p>
      </v-col>
      <v-col>
        <h2 class="text-headline-small font-weight-bold text-on-surface ma-0">
          {{ isFrench ? 'Diffuser cet article' : 'شارك هذا المقال' }}
        </h2>
      </v-col>
      <v-col
        cols="auto"
        class="d-flex justify-end align-end pe-1"
      >
        <v-btn
          v-tooltip="{ text: copiedBtnTooltipTxt, color: 'success' }"
          :color="copied ? 'success' : 'default'"
          icon="mdi-link-variant"
          variant="plain"
          size="small"
          rounded="lg"
          class="justify-self-end ms-auto"
          :class="{ 'is-copied': copied }"
          @click="copyLink"
        />
      </v-col>
    </v-row>

    <v-row
      density="comfortable"
      class="pa-1"
    >
      <v-col
        v-for="network in networks"
        :key="network.key"
        cols="12"
        sm="4"
      >
        <v-btn
          class="share-button text-none font-weight-semibold"
          :class="{ 'is-sharing': sharing === network.key }"
          variant="plain"
          rounded="xl"
          :color="network.color"
          block
          @click="openShare(network)"
        >
          <template #prepend>
            <v-icon
              :icon="network.icon"
              size="18"
            />
          </template>
          <span class="text-truncate">{{ network.label }}</span>
        </v-btn>
      </v-col>
    </v-row>
  </v-card>
</template>

<style scoped>
/* Card shell — shadow & border not expressible via Vuetify utilities */
.share-card {
  border-color: rgba(var(--v-theme-on-surface), 0.07) !important;
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.04),
    0 8px 24px rgba(0, 0, 0, 0.05) !important;
}

/* Kicker accent bar */
.share-kicker {
  font-size: 0.68rem;
  letter-spacing: 0.14em;
  line-height: 1;
  padding-inline-start: 10px;
  border-inline-start: 3px solid currentColor;
}

/* Social buttons — height, radius & transition */
.share-button {
  height: 44px !important;
  font-size: 0.8rem;
  transition:
    transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1),
    box-shadow 0.22s ease,
    opacity 0.2s ease;
  will-change: transform;
  background-color: #64646466;
}
</style>
