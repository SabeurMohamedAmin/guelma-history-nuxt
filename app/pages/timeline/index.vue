<script setup lang="ts">
const { t } = useI18n()

definePageMeta({
  layout: 'default',
})

useSeoMeta({
  title: () => t('nav.timeline'),
  description: () => t('timeline.subtitle'),
})
</script>

<template>
  <div>
    <h1>{{ t('nav.timeline') }}</h1>
  </div>
</template>
