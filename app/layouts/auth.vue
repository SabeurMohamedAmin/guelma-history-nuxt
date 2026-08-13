<script setup lang="ts">
// Auth layout: full-screen split design for admin login
</script>

<template>
  <v-app>
    <v-main class="auth-layout__main">
      <div
        class="auth-layout__backdrop"
        aria-hidden="true"
      >
        <img
          :src="$localePath('/img/login/backimage-faded.jpg')"
          alt=""
          class="auth-layout__backdrop-img"
          loading="eager"
          fetchpriority="high"
        />
        <div class="auth-layout__backdrop-overlay"></div>
      </div>

      <div class="auth-layout__content">
        <v-card
          class="auth-layout__card rounded-xl pa-3"
          elevation="8"
          max-width="440"
          width="100%"
        >
          <slot></slot>
        </v-card>
      </div>
    </v-main>
  </v-app>
</template>

<style scoped>
.auth-layout__main {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.auth-layout__backdrop {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.auth-layout__backdrop-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

.auth-layout__backdrop-overlay {
  position: absolute;
  inset: 0;
  background: rgba(var(--v-theme-surface-variant), 0.72);
  backdrop-filter: blur(2px);
}

.auth-layout__content {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 1rem;
}

.auth-layout__card {
  background: rgba(var(--v-theme-surface), 0.8) !important;
  border: 1px solid rgba(var(--v-theme-outline), 0.18);
}
</style>
