<script setup lang="ts">
/**
 * Catch-all route for unmatched paths.
 *
 * Prevents Vue Router from throwing [VUE_ROUTER_R0004] "No match found for location"
 * errors in stderr when bots, crawlers, or users visit non-existent paths.
 * Triggers Nuxt's custom error page (app/error.vue) with HTTP 404 status.
 */
throw createError({
  statusCode: 404,
  statusMessage: 'Page Not Found',
  fatal: true,
})
</script>
