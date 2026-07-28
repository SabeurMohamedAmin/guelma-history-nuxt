<script setup lang="ts">
// Article layout: header + content with sidebar + footer
</script>

<template>
  <v-app>
    <layout-app-header />
    <v-main class="px-2">
      <v-container
        fluid
        class="pa-0 px-1"
      >
        <v-row>
          <v-col
            cols="12"
            md="8"
          >
            <slot></slot>
          </v-col>
          <v-col
            cols="12"
            md="4"
          >
            <layout-app-sidebar />
          </v-col>
        </v-row>
      </v-container>
    </v-main>
    <layout-back-to-top />
    <layout-app-footer />
  </v-app>
</template>
