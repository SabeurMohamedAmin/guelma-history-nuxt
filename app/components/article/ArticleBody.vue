<script setup lang="ts">
import type { MediaItem } from '~/components/article/ArticleMediaGallery.vue'

const props = withDefaults(defineProps<{
  body: string
  title: string
  coverImage: string
  /**
   * Media items (images + videos) provided by the page. When omitted, the
   * gallery falls back to the cover image plus any video URLs found in the body.
   */
  media?: MediaItem[]
}>(), {
  media: () => [],
})

// Pull bare video URLs out of the body so they can be shown in the gallery
// instead of as raw links inside the text.
const videoUrlPattern = /(https?:\/\/[^\s)]+(?:youtube\.com\/watch\?v=|youtu\.be\/|vimeo\.com\/|\.mp4|\.webm|\.ogg)[^\s)]*)/gi

const extractedVideoUrls = computed(() => {
  const matches = props.body.match(videoUrlPattern) ?? []
  return [...new Set(matches.map(url => url.trim()))]
})

const cleanBody = computed(() => props.body.replace(videoUrlPattern, '').trim())

// Matches Arabic / Persian script. Used to decide a paragraph's text
// direction from its own content, so an Arabic article reads right-to-left
// even when viewed under the French (LTR) URL, and vice-versa.
const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/

function detectDirection(text: string): 'rtl' | 'ltr' {
  return arabicPattern.test(text) ? 'rtl' : 'ltr'
}

const paragraphs = computed(() => cleanBody.value
  .split(/\n{2,}/)
  .map(text => text.trim())
  .filter(Boolean)
  .map(text => ({ text, dir: detectDirection(text) })))

// Final list of slides for the gallery: explicit media from the page first,
// then any video URLs detected in the body, then the cover image as a fallback
// so there is always at least one slide.
const gallerySlides = computed<MediaItem[]>(() => {
  const slides: MediaItem[] = [...props.media]

  extractedVideoUrls.value.forEach((url, index) => {
    slides.push({
      type: 'video',
      src: url,
      poster: getVideoThumbnail(url) || props.coverImage,
      alt: `${props.title} - ${index + 1}`,
    })
  })

  if (!slides.length && props.coverImage) {
    slides.push({ type: 'image', src: props.coverImage, alt: props.title })
  }

  return slides
})

function getYouTubeId(url: string) {
  const watchMatch = url.match(/[?&]v=([^&]+)/)
  if (watchMatch?.[1]) return watchMatch[1]

  const shortMatch = url.match(/youtu\.be\/([^?&]+)/)
  return shortMatch?.[1] ?? null
}

function getVideoThumbnail(url: string) {
  const youtubeId = getYouTubeId(url)
  if (youtubeId) return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`

  return null
}
</script>

<template>
  <article class="pa-1 pa-md-2 text-body-large text-md-heading-small">
    <div class="article-lead">
      <p
        v-for="paragraph in paragraphs"
        :key="paragraph.text"
        :dir="paragraph.dir"
        class="article-lead__paragraph mt-1"
        :class="`article-lead__paragraph--${paragraph.dir}`"
      >
        {{ paragraph.text }}
      </p>
    </div>

    <section
      v-if="gallerySlides.length"
      class="article-body__gallery"
      aria-label="Article media gallery"
    >
      <ArticleMediaGallery
        :items="gallerySlides"
        :alt="title"
      />
    </section>
  </article>
</template>

<style scoped>
.article-lead {
  color: rgba(var(--v-theme-on-surface), 0.82);
  line-height: 2;
}

.article-lead__paragraph {
  margin-bottom: 1.35rem;
}

/* Align each paragraph to its own reading side so the text starts on the
   correct edge regardless of the active UI language. */
.article-lead__paragraph--rtl {
  text-align: right;
}

.article-lead__paragraph--ltr {
  text-align: left;
}

.article-lead__paragraph:first-child::first-letter {
  float: inline-start;
  margin-inline-end: 0.55rem;
  color: rgb(var(--v-theme-primary));
  font-size: 3.6rem;
  font-weight: 900;
  line-height: 0.95;
}

.article-body__gallery {
  margin-top: 2.5rem;
}

@media (max-width: 600px) {

  .article-lead {
    line-height: 1.85;
  }

  .article-lead__paragraph {
    margin-bottom: 1.1rem;
  }

  /* Smaller drop cap so it doesn't dominate narrow text columns. */
  .article-lead__paragraph:first-child::first-letter {
    font-size: 2.8rem;
    margin-inline-end: 0.4rem;
  }

  .article-body__gallery {
    margin-top: 1.75rem;
  }
}
</style>
