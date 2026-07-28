<script setup lang="ts">
// Auth layout: centered card for login page
</script>

<template>
  <v-app>
    <v-main
      class="d-flex align-center justify-center pa-2"
      style="min-height: 100vh;"
    >
      <v-card
        class="pa-4 rounded-lg"
        width="400"
      >
        <slot></slot>
      </v-card>
    </v-main>
  </v-app>
</template>
