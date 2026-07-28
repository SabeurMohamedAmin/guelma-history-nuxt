<script setup lang="ts">
const { t } = useI18n()

definePageMeta({
  layout: 'default',
})

useSeoMeta({
  title: () => t('contact.title'),
  description: () => t('contact.subtitle'),
})
</script>

<template>
  <v-container>
    <v-row justify="center">
      <v-col
        cols="12"
        md="8"
        lg="6"
      >
        <div class="mb-2 d-flex justify-start gap-2">
          <v-icon
            icon="mdi-email-fast-outline align-self-end"
            size="x-large"
            color="primary"
            class="mb-2 me-4"
          />
          <h1 class="text-headline-medium font-weight-bold ma-0">
            {{ t('contact.title') }}
          </h1>
        </div>
        <p class="text-body-1 text-medium-emphasis ma-0 mb-4">
          {{ t('contact.subtitle') }}
        </p>

        <ContactForm />
      </v-col>
    </v-row>
  </v-container>
</template>
