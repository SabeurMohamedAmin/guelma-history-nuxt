<script setup lang="ts">
/**
 * User layout.
 *
 * Self-contained shell for signed-in users, independent of the default layout
 * (same pattern as the admin and author layouts). It renders its own
 * <UserNavigation> navbar, which mirrors the default header but shows the
 * user's profile avatar instead of the login icon.
 */
</script>

<template>
  <v-app>
    <user-navigation />
    <layout-app-search />
    <layout-back-to-top />
    <user-complete-profile-notice />
    <v-main>
      <v-container
        fluid
        class="pa-0 px-1"
      >
        <slot></slot>
      </v-container>
    </v-main>
    <layout-app-footer />
  </v-app>
</template>
