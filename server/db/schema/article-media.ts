import { pgTable, serial, integer, text, timestamp, jsonb } from 'drizzle-orm/pg-core'
import { articles } from './articles'

/**
 * Article media gallery.
 *
 * A one-to-many companion to `articles`: each row is a single gallery item
 * (image, uploaded video or YouTube link) shown on the public article page,
 * separate from the article's single `coverImage`.
 *
 * `position` controls the display order; `posterUrl` is an optional poster /
 * thumbnail (handy for videos). Rows cascade-delete with their article.
 */
export const articleMedia = pgTable('article_media', {
  id: serial('id').primaryKey(),
  articleId: integer('article_id')
    .notNull()
    .references(() => articles.id, { onDelete: 'cascade' }),
  // How the item is displayed. Declared as a union so the rows match
  // ArticleMediaResponse; `text` + enum stays a plain text column in Postgres.
  type: text('type', { enum: ['image', 'video', 'youtube'] }).notNull().default('image'),
  url: text('url').notNull(),
  // Cloudinary public id for assets uploaded to Cloudinary. Null for YouTube
  // links and legacy/manual URL items. When present, the gallery renders the
  // item with @nuxtjs/cloudinary (CldImage / CldVideoPlayer).
  publicId: text('public_id'),
  // Cloudinary resource_type ('image' | 'video') captured at upload time. Used
  // to delete the asset with the right type when the gallery is replaced or the
  // article is removed. Null for YouTube/legacy rows (deletion falls back to
  // inferring the type from `type`).
  resourceType: text('resource_type', { enum: ['image', 'video'] }),
  posterUrl: text('poster_url'),
  // Pre-generated display variants plus the untouched focus-mode source.
  imageVariants: jsonb('image_variants').$type<{
    thumbnail: string
    slider: string
    main: string
    original: string
  }>(),
  captionAr: text('caption_ar'),
  captionFr: text('caption_fr'),
  position: integer('position').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .$defaultFn(() => new Date()),
})
