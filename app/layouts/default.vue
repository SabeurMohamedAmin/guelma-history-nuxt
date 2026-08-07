<script setup lang="ts">
// The search dialog is heavy (VDialog, VForm, VTextField) but invisible on
// first paint. Its chunk is downloaded and hydrated only when this flag
// first becomes true, keeping that JS out of the critical path.
const uiStore = useUiStore()
</script>

<template>
  <v-app>
    <layout-app-header />

    <!-- Hydrates the moment the user opens search for the first time. -->
    <LazyLayoutAppSearch :hydrate-when="uiStore.searchOpen" />

    <!-- Only useful after scrolling, so hydrating on browser idle is free. -->
    <LazyLayoutBackToTop hydrate-on-idle />

    <v-main>
      <v-container
        fluid
        class="pa-0 px-1"
      >
        <slot></slot>
      </v-container>
    </v-main>

    <!-- Below the fold: the server-rendered HTML stays in the page for
         SEO, the JS hydrates only when the footer scrolls into view. -->
    <LazyLayoutAppFooter />
  </v-app>
</template>
