<script setup lang="ts">
const uiStore = useUiStore()
</script>

<template>
  <v-app>
    <layout-app-header show-user-menu />

    <LazyLayoutAppSearch :hydrate-when="uiStore.searchOpen" />
    <LazyLayoutBackToTop hydrate-on-idle />
    <user-complete-profile-notice />

    <v-main>
      <v-container
        fluid
        class="pa-0 px-1"
      >
        <slot></slot>
      </v-container>
    </v-main>

    <LazyLayoutAppFooter hydrate-on-visible />
  </v-app>
</template>
