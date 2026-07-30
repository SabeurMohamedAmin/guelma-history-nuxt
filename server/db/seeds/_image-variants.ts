import type { ImageVariants } from '../../../shared/types/article'

const PLACEHOLDER_BASE_URL = 'https://placehold.co'

/** Creates predictable image URLs for development and seeded content. */
export function createSeedImageVariants(name: string): ImageVariants {
  return {
    thumbnail: `${PLACEHOLDER_BASE_URL}/320x200?text=${name}-thumbnail`,
    slider: `${PLACEHOLDER_BASE_URL}/960x540?text=${name}-slider`,
    main: `${PLACEHOLDER_BASE_URL}/1280x800?text=${name}-main`,
    original: `${PLACEHOLDER_BASE_URL}/1920x1080?text=${name}-original`,
  }
}
