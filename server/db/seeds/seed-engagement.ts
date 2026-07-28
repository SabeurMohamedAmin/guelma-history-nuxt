import { articles, categories, db, eq, seedClient } from './_client'

/**
 * Seeder for the dynamic category feature.
 *
 * The base `seed.ts` predates the `categories.icon` / `cover_image` and
 * `articles.view_count` / `comment_count` columns, so this seeder backfills
 * them:
 *   - category icon + banner image (so the category header has visuals)
 *   - per-article view & comment counts (so popular/hot/commented sorts and
 *     the card counters show meaningful, varied data)
 *
 * It is idempotent: it only updates existing rows by slug / id and can be run
 * repeatedly without creating duplicates.
 *
 * Run after migrations + the base seed:
 *   pnpm db:migrate && pnpm db:seed && pnpm db:seed:engagement
 */

console.log('\u{1F331} Seeding category media & article engagement...')

// --- Category icon + banner image, keyed by slug ---
// Icons mirror app/composables/useCategoryIcon.ts; images are illustrative.
const categoryMedia: Record<string, { icon: string, coverImage: string }> = {
  'sites-historiques': {
    icon: 'mdi-castle',
    coverImage: 'https://picsum.photos/seed/cat-sites-historiques/1280/720',
  },
  'histoire-militaire': {
    icon: 'mdi-shield-sword',
    coverImage: 'https://picsum.photos/seed/cat-histoire-militaire/1280/720',
  },
  'culture-patrimoine': {
    icon: 'mdi-palette',
    coverImage: 'https://picsum.photos/seed/cat-culture-patrimoine/1280/720',
  },
  'personnalites': {
    icon: 'mdi-account-group',
    coverImage: 'https://picsum.photos/seed/cat-personnalites/1280/720',
  },
  'evenements': {
    icon: 'mdi-calendar-star',
    coverImage: 'https://picsum.photos/seed/cat-evenements/1280/720',
  },
}

// --- Article cover images, keyed by slug ---
// Backfills/repairs every article's cover_image with a deterministic
// picsum.photos URL. This fixes existing rows that still hold the old, broken
// Wikipedia URLs without requiring a full DB reset.
const articleCovers: Record<string, string> = {
  // base seed (seed.ts)
  'hammam-debagh-hippolis': 'https://picsum.photos/seed/hammam-debagh-hippolis/1280/720',
  'theatre-romain-guelma': 'https://picsum.photos/seed/theatre-romain-guelma/1280/720',
  'massacres-8-mai-1945-guelma': 'https://picsum.photos/seed/massacres-8-mai-1945-guelma/1280/720',
  'banque-algerie-19e-siecle-guelma': 'https://picsum.photos/seed/banque-algerie-19e-siecle-guelma/1280/720',
  'place-guelma-a-travers-ages': 'https://picsum.photos/seed/place-guelma-a-travers-ages/1280/720',
  'fete-locale-guelma-1900': 'https://picsum.photos/seed/fete-locale-guelma-1900/1280/720',
  'mokrani-ouled-saiha-resistance': 'https://picsum.photos/seed/mokrani-ouled-saiha-resistance/1280/720',
  'evolution-poste-guelma': 'https://picsum.photos/seed/evolution-poste-guelma/1280/720',
  'enseignement-coranique-guelma-19e': 'https://picsum.photos/seed/enseignement-coranique-guelma-19e/1280/720',
  'nomination-bougimonini-guelma': 'https://picsum.photos/seed/nomination-bougimonini-guelma/1280/720',
  // additional articles (seed-articles.ts)
  'calama-thagaste-saint-augustin': 'https://picsum.photos/seed/calama-thagaste-saint-augustin/1280/720',
  'barrage-hammam-debagh': 'https://picsum.photos/seed/barrage-hammam-debagh/1280/720',
  'cascade-chaude-guelma': 'https://picsum.photos/seed/cascade-chaude-guelma/1280/720',
  'moudjahidine-guelma-guerre-liberation': 'https://picsum.photos/seed/moudjahidine-guelma-guerre-liberation/1280/720',
  'artisanat-traditionnel-guelma': 'https://picsum.photos/seed/artisanat-traditionnel-guelma/1280/720',
  'cuisine-guelma': 'https://picsum.photos/seed/cuisine-guelma/1280/720',
  'gare-guelma': 'https://picsum.photos/seed/gare-guelma/1280/720',
  'independance-1962-guelma': 'https://picsum.photos/seed/independance-1962-guelma/1280/720',
}

console.log('  \u2192 Updating category icons & cover images...')
let categoriesUpdated = 0
for (const [slug, media] of Object.entries(categoryMedia)) {
  const result = await db
    .update(categories)
    .set({ icon: media.icon, coverImage: media.coverImage, updatedAt: new Date() })
    .where(eq(categories.slug, slug))
    .returning({ id: categories.id })
  categoriesUpdated += result.length
}

// --- Per-article engagement counts ---
// Deterministic but varied so every sort produces a different order.
console.log('  \u2192 Updating article view & comment counts...')
const allArticles = await db.select({ id: articles.id }).from(articles)

function pseudoRandom(seed: number, max: number): number {
  // Simple deterministic hash so reruns yield the same, stable numbers.
  const x = Math.sin(seed * 9999) * 10000
  return Math.floor((x - Math.floor(x)) * max)
}

let articlesUpdated = 0
for (const article of allArticles) {
  const viewCount = 50 + pseudoRandom(article.id, 4950) // 50 .. ~5000
  const commentCount = pseudoRandom(article.id + 7, 80) // 0 .. ~80

  const result = await db
    .update(articles)
    .set({ viewCount, commentCount, updatedAt: new Date() })
    .where(eq(articles.id, article.id))
    .returning({ id: articles.id })
  articlesUpdated += result.length
}

// --- Repair article cover images on existing rows (keyed by slug) ---
console.log('  \u2192 Updating article cover images...')
let coversUpdated = 0
for (const [slug, coverImage] of Object.entries(articleCovers)) {
  const result = await db
    .update(articles)
    .set({ coverImage, updatedAt: new Date() })
    .where(eq(articles.slug, slug))
    .returning({ id: articles.id })
  coversUpdated += result.length
}

console.log('\u2705 Engagement seed complete! Updated:')
console.log(`   - ${categoriesUpdated} categories (icon + cover image)`)
console.log(`   - ${articlesUpdated} articles (view + comment counts)`)
console.log(`   - ${coversUpdated} articles (cover image)`)

await seedClient.end()
