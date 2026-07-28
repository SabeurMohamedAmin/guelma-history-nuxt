<script setup lang="ts">
/**
 * Author layout shell. Mirrors the admin layout: all navigation (sidebar + top
 * app bar) lives in the self-contained <AuthorNavigation> component; this
 * layout only provides the v-app frame and the main content container.
 */
</script>

<template>
  <v-app>
    <layout-back-to-top />

    <author-navigation
      :pending-articles="0"
      :notifications="0"
    />

    <v-main class="px-2">
      <v-container fluid>
        <slot></slot>
      </v-container>
    </v-main>
  </v-app>
</template>
