<script setup lang="ts">
/**
 * Admin layout shell. All navigation (sidebar + top app bar) lives in the
 * self-contained <AdminNavigation> component; this layout only provides the
 * v-app frame and the main content container.
 */
</script>

<template>
  <v-app>
    <layout-back-to-top />

    <admin-navigation
      :pending-subscribers="0"
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
