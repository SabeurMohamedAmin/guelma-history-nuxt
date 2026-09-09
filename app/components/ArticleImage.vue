<script setup lang="ts">
const props = defineProps<{
  src?: string | null
  alt: string
}>()

const placeholder = '/img/image-placeholder.svg'
const failedSource = ref<string | null>(null)
const image = useTemplateRef<{ $el: HTMLImageElement }>('image')

const source = computed(() => props.src?.trim() || '')
const showingPlaceholder = computed(() => !source.value || failedSource.value === source.value)
const imageSource = computed(() => showingPlaceholder.value ? placeholder : source.value)

function handleError() {
  // Never retry the failing URL or loop if the placeholder itself fails.
  if (!showingPlaceholder.value) failedSource.value = source.value
}

watch(source, () => {
  failedSource.value = null
})

onMounted(() => {
  // An eagerly loaded server-rendered image can fail before Vue attaches its
  // listener. Recover that case as well as errors received after hydration.
  const element = image.value?.$el
  if (element instanceof HTMLImageElement && element.currentSrc && element.complete && element.naturalWidth === 0) {
    handleError()
  }
})
</script>

<template>
  <!-- Dimensions, loading priority, optimization and CSS classes pass through
       to NuxtImg. The placeholder is decorative beside the article's title. -->
  <NuxtImg
    ref="image"
    :src="imageSource"
    :alt="showingPlaceholder ? '' : alt"
    @error="handleError"
  />
</template>
