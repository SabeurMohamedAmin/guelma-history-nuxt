<script setup lang="ts">
/**
 * Article media gallery.
 *
 * Displays a slider of images and videos for an article instead of a single
 * cover image. Features:
 *  - Main stage with a v-carousel (smooth slide transitions, arrows, dots).
 *  - A horizontal thumbnail strip to jump between items.
 *  - A large lightbox (v-dialog) opened from a button on each slide. It shows
 *    images and videos, supports zoom in/out, copy and download, plus keyboard
 *    arrow navigation and Escape to close.
 *
 * Built almost entirely with Vuetify 4 components and utility classes so it
 * stays consistent with the rest of the design system and is easy to maintain.
 */
import { useDisplay } from 'vuetify'
import type { ImageVariants } from '~~/shared/types/article'

export interface MediaItem {
  /** 'image', uploaded 'video', or a 'youtube' link. */
  type: 'image' | 'video' | 'youtube'
  /** Source URL of the image / video file, or the YouTube watch URL. */
  src: string
  /**
   * Cloudinary public id. When present, the item is delivered with
   * @nuxtjs/cloudinary (CldImage / CldVideoPlayer) instead of a raw URL.
   */
  publicId?: string
  /** Optional poster image shown for videos before playback. */
  poster?: string
  imageVariants?: ImageVariants
  /** Accessible label / caption. */
  alt?: string
}

/** Whether an item should be delivered through Cloudinary components. */
function usesCloudinary(item: MediaItem | undefined): item is MediaItem & { publicId: string } {
  return !!item?.publicId
}

/** Extract the video id from any common YouTube URL form (or a bare id). */
function parseYouTubeId(url: string): string | null {
  if (/^[\w-]{11}$/.test(url)) return url
  const watch = url.match(/[?&]v=([\w-]{11})/)
  if (watch?.[1]) return watch[1]
  const short = url.match(/youtu\.be\/([\w-]{11})/)
  if (short?.[1]) return short[1]
  const embed = url.match(/youtube\.com\/embed\/([\w-]{11})/)
  return embed?.[1] ?? null
}

/** Privacy-friendly embed URL for a YouTube item. */
function youTubeEmbedUrl(url: string): string {
  const id = parseYouTubeId(url)
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : url
}

/** Best-effort thumbnail for a YouTube item. */
function youTubeThumbnail(url: string): string | null {
  const id = parseYouTubeId(url)
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null
}

const props = withDefaults(defineProps<{
  items: MediaItem[]
  alt?: string
}>(), {
  alt: '',
})

const { mobile } = useDisplay()
const { t } = useI18n()

// Index of the slide currently shown in the main stage.
const current = ref(0)
// Lightbox state, with its own index so it can open on any item.
const lightbox = ref(false)
const lightboxIndex = ref(0)

// Lightbox video element + play state, driving the center play/pause overlay.
const lightboxVideo = ref<HTMLVideoElement | null>(null)
const videoPlaying = ref(false)

function toggleVideoPlay() {
  const el = lightboxVideo.value
  if (!el)
    return
  if (el.paused)
    el.play()
  else
    el.pause()
}

// Zoom level applied to the lightbox media (1 = 100%).
const ZOOM_MIN = 1
const ZOOM_MAX = 4
const ZOOM_STEP = 0.5
const zoom = ref(1)

// Pan offset (in pixels) used to drag a zoomed image around the stage.
const pan = reactive({ x: 0, y: 0 })
// Drag bookkeeping: whether a drag is active and where it started.
const drag = reactive({ active: false, startX: 0, startY: 0, originX: 0, originY: 0 })

const isZoomed = computed(() => zoom.value > 1)

const hasMultiple = computed(() => props.items.length > 1)
const activeItem = computed(() => props.items[lightboxIndex.value])

// Resolve the best available image for the thumbnail strip.
function thumbnailFor(item: MediaItem): string {
  if (item.type === 'image') return item.imageVariants?.thumbnail || item.src
  if (item.type === 'youtube') return item.poster || youTubeThumbnail(item.src) || item.src
  return item.poster || item.src
}

function labelFor(item: MediaItem, index: number) {
  return item.alt || props.alt || `${t('media.item')} ${index + 1}`
}

function openLightbox(index: number) {
  lightboxIndex.value = index
  resetView()
  lightbox.value = true
}

function goToLightbox(index: number) {
  lightboxIndex.value = (index + props.items.length) % props.items.length
  resetView()
}

function nextLightbox() {
  goToLightbox(lightboxIndex.value + 1)
}

function prevLightbox() {
  goToLightbox(lightboxIndex.value - 1)
}

// Reset both zoom and pan to the default view.
function resetView() {
  zoom.value = 1
  pan.x = 0
  pan.y = 0
}

function zoomIn() {
  zoom.value = Math.min(ZOOM_MAX, zoom.value + ZOOM_STEP)
}

function zoomOut() {
  zoom.value = Math.max(ZOOM_MIN, zoom.value - ZOOM_STEP)
  // When fully zoomed out there is nothing to pan, so recenter the image.
  if (zoom.value === 1) {
    pan.x = 0
    pan.y = 0
  }
}

// --- Pan / drag with mouse and touch ---------------------------------------
// We use Pointer Events so a single set of handlers covers mouse, touch and
// pen. Dragging only pans when the image is zoomed in.
function onPointerDown(event: PointerEvent) {
  if (!isZoomed.value)
    return
  drag.active = true
  drag.startX = event.clientX
  drag.startY = event.clientY
  drag.originX = pan.x
  drag.originY = pan.y
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function onPointerMove(event: PointerEvent) {
  if (!drag.active)
    return
  pan.x = drag.originX + (event.clientX - drag.startX)
  pan.y = drag.originY + (event.clientY - drag.startY)
}

function onPointerUp() {
  drag.active = false
}

// Zoom with the mouse wheel: scroll up to zoom in, down to zoom out.
function onWheel(event: WheelEvent) {
  if (event.deltaY < 0)
    zoomIn()
  else
    zoomOut()
}

function onLightboxKey(event: KeyboardEvent) {
  if (hasMultiple.value && event.key === 'ArrowRight')
    nextLightbox()
  else if (hasMultiple.value && event.key === 'ArrowLeft')
    prevLightbox()
  else if (event.key === '+' || event.key === '=')
    zoomIn()
  else if (event.key === '-')
    zoomOut()
}

// Focus mode always uses the untouched original image. Other media types keep
// their normal source because they do not have generated image variants.
function focusSource(item: MediaItem): string {
  return item.type === 'image' ? item.imageVariants?.original || item.src : item.src
}

// Derive a sensible file name from the media URL for downloads.
function fileNameFor(item: MediaItem) {
  const fromUrl = focusSource(item).split('/').pop()?.split('?')[0]
  return fromUrl || (item.type === 'video' ? 'video' : 'image')
}

// Download the current media file. For images this downloads the untouched
// original, matching what the user sees in focus mode.
async function downloadCurrent() {
  const item = activeItem.value
  if (!item)
    return
  const source = focusSource(item)
  try {
    const response = await fetch(source)
    const blob = await response.blob()
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = fileNameFor(item)
    link.click()
    URL.revokeObjectURL(objectUrl)
  }
  catch {
    // Fallback: open the file in a new tab if the fetch is blocked (e.g. CORS).
    window.open(source, '_blank')
  }
}

// Copy the focused original image to the clipboard when supported; otherwise
// copy its absolute URL. Videos always copy their URL.
async function copyCurrent() {
  const item = activeItem.value
  if (!item)
    return

  const source = focusSource(item)
  const absoluteUrl = new URL(source, window.location.origin).href

  try {
    const canCopyImage = item.type === 'image'
      && typeof ClipboardItem !== 'undefined'
      && !!navigator.clipboard?.write

    if (canCopyImage) {
      const response = await fetch(source)
      const blob = await response.blob()
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })])
      return
    }

    await navigator.clipboard.writeText(absoluteUrl)
  }
  catch {
    // Last resort: copy the URL as text.
    await navigator.clipboard?.writeText(absoluteUrl).catch(() => {})
  }
}
</script>

<template>
  <!-- Main stage -->
  <v-carousel
    v-model="current"
    class="article-gallery__stage rounded-lg"
    hide-delimiters
    :show-arrows="hasMultiple ? 'hover' : false"
    :continuous="hasMultiple"
    progress="primary"
    height="auto"
  >
    <v-carousel-item
      v-for="(item, index) in items"
      :key="index"
    >
      <div class="article-gallery__frame">
        <NuxtImg
          v-if="item.type === 'image'"
          :src="item.imageVariants?.slider || item.src"
          :alt="labelFor(item, index)"
          class="article-gallery__media"
          sizes="xs:100vw sm:100vw md:900px lg:640px"
          format="webp"
          :loading="index === 0 ? 'eager' : 'lazy'"
        />

        <iframe
          v-else-if="item.type === 'youtube'"
          :src="youTubeEmbedUrl(item.src)"
          :title="labelFor(item, index)"
          class="article-gallery__media"
          frameborder="0"
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
        ></iframe>

        <video
          v-else
          :src="item.src"
          :poster="item.poster"
          class="article-gallery__media"
          controls
          playsinline
          preload="metadata"
        ></video>

        <!-- Expand to lightbox (images and videos) -->
        <v-btn
          icon="mdi-fullscreen"
          variant="flat"
          size="small"
          class="article-gallery__expand"
          :aria-label="t('media.viewFullscreen')"
          @click="openLightbox(index)"
        />

        <!-- Counter badge -->
        <v-chip
          v-if="hasMultiple"
          size="small"
          class="article-gallery__counter  text-caption px-2 py-1"
          variant="tonal"
        >
          {{ current + 1 }} / {{ items.length }}
        </v-chip>
      </div>
    </v-carousel-item>
  </v-carousel>

  <!-- Thumbnail strip -->
  <div
    v-if="hasMultiple"
    class="article-gallery__thumbs d-flex ga-2 mt-3 pb-1"
    role="tablist"
  >
    <button
      v-for="(item, index) in items"
      :key="index"
      type="button"
      role="tab"
      :aria-selected="current === index"
      :aria-label="labelFor(item, index)"
      class="article-gallery__thumb rounded-lg position-relative overflow-hidden border-md opacity-70"
      :class="{ 'article-gallery__thumb--active': current === index }"
      @click="current = index"
    >
      <NuxtImg
        :src="thumbnailFor(item)"
        :alt="labelFor(item, index)"
        class="article-gallery__thumb-img"
        width="96"
        height="64"
        format="webp"
        loading="lazy"
      />
      <v-icon
        v-if="item.type === 'video' || item.type === 'youtube'"
        icon="mdi-play-circle"
        size="22"
        class="article-gallery__thumb-play"
      />
    </button>
  </div>

  <!-- Lightbox: 90% of the screen, blurred backdrop, zoom / copy / download -->
  <v-dialog
    v-model="lightbox"
    :fullscreen="mobile"
    width="90vw"
    max-width="1400"
    scrim="#000000"
    :opacity="0.7"
    content-class="article-lightbox__dialog"
    class="article-lightbox__overlay"
    transition="dialog-bottom-transition"
    @keydown="onLightboxKey"
    @after-leave="resetView"
  >
    <v-card
      class="article-lightbox overflow-hidden rounded-lg pa-2"
      color="rgba(var(--v-theme-surface), 0.85)"
    >
      <v-toolbar
        color="transparent"
        density="comfortable"
        class="z-index-99"
      >
        <span
          v-if="hasMultiple"
          class="text-body-2 text-medium-emphasis ms-3"
        >
          {{ lightboxIndex + 1 }} / {{ items.length }}
        </span>

        <v-spacer />

        <!-- Zoom controls (images only) -->
        <template v-if="activeItem?.type === 'image'">
          <v-btn
            icon="mdi-magnify-minus-outline"
            variant="text"
            :disabled="zoom <= ZOOM_MIN"
            :aria-label="t('media.zoomOut')"
            @click="zoomOut"
          />
          <span
            class="text-body-2 text-medium-emphasis"
            style="min-width: 48px; text-align: center;"
          >
            {{ Math.round(zoom * 100) }}%
          </span>
          <v-btn
            icon="mdi-magnify-plus-outline"
            variant="text"
            :disabled="zoom >= ZOOM_MAX"
            :aria-label="t('media.zoomIn')"
            @click="zoomIn"
          />
        </template>

        <v-btn
          icon="mdi-content-copy"
          variant="text"
          :aria-label="t('media.copy')"
          @click="copyCurrent"
        />
        <v-btn
          icon="mdi-download"
          variant="text"
          :aria-label="t('media.download')"
          @click="downloadCurrent"
        />
        <v-spacer />
        <v-btn
          icon="mdi-close"
          class="rounded-lg"
          variant="tonal"
          :aria-label="t('media.close')"
          @click="lightbox = false"
        />
      </v-toolbar>

      <div class="article-lightbox__body d-flex align-center justify-center">
        <!-- Navigation arrows prev -->
        <v-btn
          v-if="hasMultiple"
          icon="mdi-chevron-left"
          variant="tonal"
          class="article-lightbox__nav article-lightbox__nav-left align-self-center rounded-lg"
          :aria-label="t('media.previous')"
          @click="prevLightbox"
        />

        <div
          class="article-lightbox__stage d-flex align-center justify-center overflow-hidden rounded-lg"
          :class="{ 'article-lightbox__stage--grab': isZoomed, 'article-lightbox__stage--grabbing': drag.active }"
          @wheel.prevent="activeItem?.type === 'image' ? onWheel($event) : null"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointerleave="onPointerUp"
        >
          <NuxtImg
            v-if="activeItem?.type === 'image'"
            :src="focusSource(activeItem)"
            :alt="labelFor(activeItem, lightboxIndex)"
            class="article-lightbox__img rounded-lg"
            :style="{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }"
            :draggable="false"
            format="webp"
            loading="eager"
          />

          <iframe
            v-else-if="activeItem?.type === 'youtube'"
            :src="youTubeEmbedUrl(activeItem.src)"
            :title="activeItem.alt || t('media.item')"
            class="article-lightbox__video rounded-lg"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
          ></iframe>

          <CldVideoPlayer
            v-else-if="activeItem?.type === 'video' && usesCloudinary(activeItem)"
            :key="activeItem.publicId"
            :src="activeItem.publicId"
            :width="1600"
            :height="900"
            :controls="true"
            :show-logo="false"
            picture-in-picture-toogle
            class="article-lightbox__video rounded-lg"
          />

          <div
            v-else-if="activeItem?.type === 'video'"
            class="article-lightbox__video-wrap position-relative"
          >
            <video
              ref="lightboxVideo"
              :src="activeItem.src"
              :poster="activeItem.poster"
              class="article-lightbox__video rounded-lg"
              controls
              playsinline
              preload="metadata"
              @play="videoPlaying = true"
              @pause="videoPlaying = false"
              @ended="videoPlaying = false"
              @click="toggleVideoPlay"
            ></video>

            <v-btn
              v-show="!videoPlaying"
              icon="mdi-play"
              size="x-large"
              variant="flat"
              class="article-lightbox__playpause"
              :aria-label="t('media.play')"
              @click="toggleVideoPlay"
            />
          </div>
        </div>

        <!-- Navigation arrows next -->
        <v-btn
          v-if="hasMultiple"
          icon="mdi-chevron-right"
          variant="tonal"
          class="article-lightbox__nav article-lightbox__nav-right align-self-center rounded-lg"
          :aria-label="t('media.next')"
          @click="nextLightbox"
        />
      </div>

      <p
        v-if="activeItem?.alt"
        class="article-lightbox__caption text-center text-body-2 text-medium-emphasis pa-3 ma-0"
      >
        {{ activeItem.alt }}
      </p>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.z-index-99 {
  z-index: 999;
}

.article-gallery__stage {
  position: relative;
  overflow: hidden;
  background: rgba(var(--v-theme-surface-variant), 0.4);
  box-shadow: 0 1px 20px rgba(0, 0, 0, 0.15);
}

.article-gallery__frame {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  min-height: clamp(280px, 42vw, 560px);
  overflow: hidden;
}

.article-gallery__media {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.article-gallery__expand {
  position: absolute;
  top: 12px;
  inset-inline-end: 12px;
  background: rgba(0, 0, 0, 0.45) !important;
  color: #fff !important;
  backdrop-filter: blur(6px);
  transition: transform 0.2s ease, background 0.2s ease;
}

.article-gallery__expand:hover {
  transform: scale(1.08);
  background: rgba(0, 0, 0, 0.65) !important;
}

.article-gallery__counter {
  position: absolute;
  top: 5px;
  inset-inline-start: 12px;
  background: rgba(0, 0, 0, 0.4);
  color: #fff;
  backdrop-filter: blur(6px);
}

.article-gallery__thumbs {
  overflow-x: auto;
  scrollbar-width: thin;
  scroll-snap-type: x proximity;
}
.article-gallery__thumb {
  flex: 0 0 auto;
  width: 96px;
  height: 64px;
  padding: 0;
  background: rgba(var(--v-theme-surface-variant), 0.4);
  cursor: pointer;
  scroll-snap-align: start;
  transition:
    border-color 0.25s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.25s ease,
    transform 0.25s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.25s ease;
}

.article-gallery__thumb:hover {
  opacity: 1;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.18);
}

.article-gallery__thumb:focus-visible {
  outline: none;
  opacity: 1;
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 3px rgba(var(--v-theme-primary), 0.35);
}

.article-gallery__thumb--active {
  border-color: rgb(var(--v-theme-primary));
  opacity: 1;
}

.article-gallery__thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

.article-gallery__thumb:hover .article-gallery__thumb-img {
  transform: scale(1.06);
}

@media (prefers-reduced-motion: reduce) {
  .article-gallery__thumb,
  .article-gallery__thumb-img {
    transition: none;
  }

  .article-gallery__thumb:hover {
    transform: none;
  }

  .article-gallery__thumb:hover .article-gallery__thumb-img {
    transform: none;
  }
}

.article-gallery__thumb-play {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #fff;
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.6));
}

.article-lightbox__body {
  position: relative;
  gap: 0.5rem;
  padding: 0 0.5rem;
  min-height: 0;
}

/* Card reads as a distinct, focused panel above the page. */
.article-lightbox {
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

/* Stage takes ~85% of the viewport height and clips the zoomed media. */
.article-lightbox__stage {
  flex: 1 1 auto;
  min-height: 80vh;
  max-height: 90vh;
  /* Disable native touch gestures so dragging pans the image instead. */
  touch-action: none;
  user-select: none;
}

/* Cursor hints: grab when zoomed, grabbing while dragging. */
.article-lightbox__stage--grab {
  cursor: grab;
}

.article-lightbox__stage--grabbing {
  cursor: grabbing;
}

.article-lightbox__img {
  max-width: 100%;
  max-height: 85vh;
  object-fit: contain;
  transition: transform 0.2s ease;
  transform-origin: center center;
}

/* While dragging, drop the transition so panning tracks the pointer 1:1. */
.article-lightbox__stage--grabbing .article-lightbox__img {
  transition: none;
}

.article-lightbox__video {
  max-width: 100%;
  max-height: 85vh;
}

.article-lightbox__video-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  max-width: 100%;
  max-height: 85vh;
}

/* Large circular play button centered over the video while paused. */
.article-lightbox__playpause {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 84px !important;
  height: 84px !important;
  border-radius: 50% !important;
  background: rgba(0, 0, 0, 0.55) !important;
  color: #fff !important;
  backdrop-filter: blur(6px);
  transition: transform 0.2s ease, background 0.2s ease, opacity 0.2s ease;
}

.article-lightbox__playpause:hover {
  transform: translate(-50%, -50%) scale(1.08);
  background: rgba(0, 0, 0, 0.72) !important;
}

.article-lightbox__nav {
  flex: 0 0 auto;
  z-index: 20;
  opacity: 0.5;
  cursor: pointer;
  position: absolute;
  z-index:  999;
  border: solid 2px rgb(var(--v-theme-primary)/0.5);
}
.article-lightbox__nav-left {
  left: 12px;
  top:50% ;
  transform: translateY(-50%);
}
.article-lightbox__nav-right {
  right: 12px;
  top:50% ;
  transform: translateY(-50%);
}
.article-lightbox__nav-right:hover, .article-lightbox__nav-left:hover {
  opacity: .8;
  border-color: rgb(var(--v-theme-primary));
}

/* ---------------------------------------------------------------------------
 * Small devices / mobile
 * Keep the gallery comfortable on phones: shorter stage, smaller thumbnails,
 * a more touch-friendly lightbox and tighter spacing.
 * ------------------------------------------------------------------------ */
@media (max-width: 600px) {
  .article-gallery__frame {
    aspect-ratio: 4 / 3;
    min-height: clamp(200px, 56vw, 320px);
  }

  .article-gallery__expand {
    top: 8px;
    inset-inline-end: 8px;
  }

  .article-gallery__counter {
    top: 8px;
    inset-inline-start: 8px;
  }

  /* Smaller, easy-to-swipe thumbnail strip with momentum scrolling. */
  .article-gallery__thumbs {
    gap: 0.4rem;
    -webkit-overflow-scrolling: touch;
  }

  .article-gallery__thumb {
    width: 72px;
    height: 52px;
  }

  /* No hover lift on touch; keep taps clean. */
  .article-gallery__thumb:hover {
    transform: none;
    box-shadow: none;
  }

  .article-gallery__thumb:hover .article-gallery__thumb-img {
    transform: none;
  }

  /* Lightbox: use full height and remove rounded gaps for an immersive view. */
  .article-lightbox {
    border-radius: 0 !important;
  }

  .article-lightbox__body {
    padding: 0;
  }

  .article-lightbox__stage {
    min-height: 60vh;
    max-height: 74vh;
  }

  .article-lightbox__img,
  .article-lightbox__video,
  .article-lightbox__video-wrap {
    max-height: 74vh;
  }

  /* Tighter, touch-sized nav arrows pinned to the edges. */
  .article-lightbox__nav {
    opacity: 0.85;
  }

  .article-lightbox__nav-left {
    left: 6px;
  }

  .article-lightbox__nav-right {
    right: 6px;
  }

  /* Centered, smaller play button so it never overflows the frame. */
  .article-lightbox__playpause {
    width: 64px !important;
    height: 64px !important;
  }

  .article-lightbox__caption {
    padding: 0.75rem 0.5rem !important;
  }
}
</style>

<style>
/*
 * Blur the page behind the lightbox. The scrim is rendered by Vuetify outside
 * this component, so it can't be reached with scoped styles. We match it via
 * the overlay class set on the v-dialog.
 */
.article-lightbox__overlay .v-overlay__scrim {
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}
</style>
