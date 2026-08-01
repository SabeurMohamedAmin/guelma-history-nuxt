import { inArray } from 'drizzle-orm'
import { articles, articleMedia, authors, categories, db, eq, seedClient, users } from './_client'
import { createSeedImageVariants } from './_image-variants'

/**
 * Additional article seeder for Guelma History (تاريخ قالمة).
 *
 * Extends the base `seed.ts` with more long-form, illustrated articles that
 * stay true to the platform concept: the history, heritage, culture, military
 * past and notable figures of Guelma (قالمة) in north-eastern Algeria.
 *
 * Bilingual fields (AR primary / FR secondary) mirror the schema and the base
 * seed. Local category/author fixture references are resolved by stable slug to
 * generated UUIDs before any article is inserted.
 *
 * Run after migrations + the base seed:
 *   pnpm db:migrate && pnpm db:seed && pnpm db:seed:articles
 */

console.log('\u{1F331} Seeding additional Guelma history articles...')

const articleData = [
  {
    titleAr: 'سوق أهراس وقالمة: على خطى القديس أوغسطين',
    titleFr: 'Calama et Thagaste : sur les pas de Saint Augustin',
    slug: 'calama-thagaste-saint-augustin',
    excerptAr: 'كانت كالاما (قالمة) محطة بارزة في رحلات القديس أوغسطين، وأحد أهم المراكز المسيحية في نوميديا القديمة.',
    excerptFr: 'Calama (Guelma) fut une étape importante dans le parcours de Saint Augustin et un grand centre chrétien de l\'antique Numidie.',
    bodyAr: `# كالاما على خطى القديس أوغسطين

كانت مدينة كالاما، الاسم القديم لقالمة، واحدة من أهم المدن المسيحية في مقاطعة نوميديا خلال القرنين الرابع والخامس الميلاديين.

## مدينة أسقفية

احتضنت كالاما كرسياً أسقفياً مهماً، وكان أسقفها بوسيديوس صديقاً مقرباً للقديس أوغسطين أسقف عنابة (هيبو) ومؤلف سيرته الذاتية.

## مركز ثقافي وديني

شكّلت المدينة نقطة عبور على الطريق الرابط بين تاغاست (سوق أهراس) وهيبو (عنابة)، مما جعلها ملتقى للأفكار والقوافل التجارية.

## الآثار المسيحية

كشفت الحفريات عن بقايا كنائس ومعالم مسيحية تشهد على ازدهار المدينة الديني في تلك الحقبة، وتُعد اليوم من أثمن الشواهد الأثرية في المنطقة.`,
    coverImage: 'https://placehold.co/1280x720?text=calama-thagaste-saint-augustin',
    categoryId: 4,
    authorId: 3,
    publishedAt: new Date('2025-02-14'),
    readingTime: 6,
  },
  {
    titleAr: 'سد حمام دباغ: تطويع الطبيعة لخدمة الإنسان',
    titleFr: 'Le barrage de Hammam Debagh : dompter la nature',
    slug: 'barrage-hammam-debagh',
    excerptAr: 'يُعد سد حمام دباغ من أكبر السدود في الجزائر، ويلعب دوراً حيوياً في الري وتزويد المنطقة بالمياه.',
    excerptFr: 'Le barrage de Hammam Debagh, l\'un des plus grands d\'Algérie, joue un rôle vital dans l\'irrigation et l\'alimentation en eau de la région.',
    bodyAr: `# سد حمام دباغ

يقع سد حمام دباغ على وادي بوهمدان شمال غرب مدينة قالمة، ويُعد من أكبر السدود الترابية في الجزائر.

## الإنجاز الهندسي

أُنجز السد في ثمانينيات القرن العشرين، ويبلغ ارتفاعه أكثر من مئة متر، مما يجعله تحفة هندسية بارزة في المنطقة.

## الدور الفلاحي

يوفر السد مياه الري لآلاف الهكتارات من الأراضي الزراعية في سهول قالمة، ويساهم في تزويد السكان بالمياه الصالحة للشرب.

## البعد البيئي والسياحي

أصبحت بحيرة السد فضاءً طبيعياً يجذب الزوار، وتمتزج مياهه القريبة من الينابيع الحارة لتشكل لوحة طبيعية فريدة.`,
    coverImage: 'https://placehold.co/1280x720?text=barrage-hammam-debagh',
    categoryId: 1,
    authorId: 1,
    publishedAt: new Date('2025-04-02'),
    readingTime: 4,
  },
  {
    titleAr: 'الشلال الحار بقالمة: عجيبة طبيعية متجمدة',
    titleFr: 'La cascade chaude de Guelma : une merveille pétrifiée',
    slug: 'cascade-chaude-guelma',
    excerptAr: 'يشكّل الشلال الحار بحمام دباغ ظاهرة طبيعية نادرة، حيث ترسبت المياه المعدنية على مر القرون مكوّنة جروفاً بيضاء مبهرة.',
    excerptFr: 'La cascade chaude de Hammam Debagh est un phénomène naturel rare, où les eaux minérales ont sculpté au fil des siècles d\'éblouissantes falaises blanches.',
    bodyAr: `# الشلال الحار بقالمة

يُعد الشلال الحار في حمام دباغ من أبرز المعالم الطبيعية في ولاية قالمة، ويجذب الزوار من كل مكان.

## ظاهرة الترسبات

على مر القرون، رسّبت المياه الحارة الغنية بالكالسيوم طبقات بيضاء من الكلس، مكوّنة جروفاً وشلالات متحجرة تشبه الثلج.

## المياه العلاجية

ترتبط هذه الينابيع بالحمامات المعدنية المجاورة المعروفة منذ العهد الروماني بفوائدها الصحية.

## قيمة سياحية

يمثل الموقع وجهة سياحية وبيئية مهمة، ويعكس تنوّع التراث الطبيعي الذي تزخر به منطقة قالمة.`,
    coverImage: 'https://placehold.co/1280x720?text=cascade-chaude-guelma',
    categoryId: 1,
    authorId: 2,
    publishedAt: new Date('2025-03-05'),
    readingTime: 3,
  },
  {
    titleAr: 'مجاهدو قالمة في حرب التحرير الوطنية',
    titleFr: 'Les moudjahidine de Guelma dans la guerre de libération',
    slug: 'moudjahidine-guelma-guerre-liberation',
    excerptAr: 'لعبت منطقة قالمة دوراً محورياً في الثورة التحريرية، وأنجبت العديد من المجاهدين الذين ضحّوا في سبيل استقلال الجزائر.',
    excerptFr: 'La région de Guelma a joué un rôle central dans la guerre de libération et a donné de nombreux moudjahidine tombés pour l\'indépendance de l\'Algérie.',
    bodyAr: `# مجاهدو قالمة في حرب التحرير

شكّلت منطقة قالمة إحدى ساحات الكفاح المسلح خلال الثورة التحريرية الجزائرية (1954-1962).

## الموقع الاستراتيجي

بفضل تضاريسها الجبلية وغاباتها الكثيفة، كانت قالمة ملاذاً لجيش التحرير الوطني وقاعدة لانطلاق العمليات الفدائية.

## ذاكرة 1945

حملت المنطقة جراح مجازر 8 ماي 1945، مما عمّق الوعي الوطني ودفع أبناءها للالتحاق بصفوف الثورة منذ اندلاعها.

## التضحيات

سقط المئات من أبناء قالمة شهداء في معارك ضد الاستعمار، وبقيت أسماؤهم محفورة في ذاكرة المدينة ونصبها التذكارية.

## التخليد

تُخلّد قالمة ذكرى مجاهديها عبر المتاحف والساحات والشوارع التي تحمل أسماءهم تكريماً لتضحياتهم.`,
    coverImage: 'https://placehold.co/1280x720?text=moudjahidine-guelma-guerre-liberation',
    categoryId: 2,
    authorId: 3,
    publishedAt: new Date('2024-11-01'),
    readingTime: 6,
  },
  {
    titleAr: 'الصناعات التقليدية في قالمة: حرف تقاوم النسيان',
    titleFr: 'L\'artisanat traditionnel de Guelma : des métiers qui résistent à l\'oubli',
    slug: 'artisanat-traditionnel-guelma',
    excerptAr: 'من النسيج إلى الفخار والنحاس، حافظت قالمة على حرف تقليدية تعكس هوية المنطقة وذوق سكانها.',
    excerptFr: 'Du tissage à la poterie et au cuivre, Guelma a préservé des métiers traditionnels qui reflètent l\'identité de la région.',
    bodyAr: `# الصناعات التقليدية في قالمة

تزخر منطقة قالمة بتراث حرفي عريق توارثته الأجيال، ويشكّل جزءاً أصيلاً من هويتها الثقافية.

## النسيج والزرابي

اشتهرت نساء المنطقة بصناعة الزرابي والأفرشة الصوفية بزخارف أمازيغية وعربية تعكس البيئة المحلية.

## الفخار والخزف

توارث الحرفيون صناعة الأواني الفخارية باستخدام تقنيات تقليدية، لتلبية حاجات الحياة اليومية والزينة.

## أشغال النحاس والجلد

برع صنّاع قالمة في تشكيل النحاس ودبغ الجلود، وهي حرف ارتبطت بالأسواق التقليدية ومواسم المدينة.

## التحديات الراهنة

تواجه هذه الحرف اليوم منافسة المنتجات الصناعية، مما يستدعي جهوداً للحفاظ عليها ونقلها للأجيال القادمة.`,
    coverImage: 'https://placehold.co/1280x720?text=artisanat-traditionnel-guelma',
    categoryId: 3,
    authorId: 2,
    publishedAt: new Date('2025-01-28'),
    readingTime: 5,
  },
  {
    titleAr: 'المطبخ القالمي: نكهات من قلب الشرق الجزائري',
    titleFr: 'La cuisine de Guelma : saveurs du cœur de l\'Est algérien',
    slug: 'cuisine-guelma',
    excerptAr: 'يعكس المطبخ القالمي ثراء الأرض وتنوّع موارد المنطقة، من الأطباق الموسمية إلى الحلويات التقليدية.',
    excerptFr: 'La cuisine de Guelma reflète la richesse de la terre et la diversité des ressources de la région, des plats de saison aux pâtisseries traditionnelles.',
    bodyAr: `# المطبخ القالمي

يُعد المطبخ القالمي مرآة للحياة الريفية والفلاحية في المنطقة، حيث تتنوع الأطباق بتنوع المواسم.

## أطباق الأرض

تعتمد المائدة القالمية على القمح والزيتون والخضروات المحلية، وتشتهر بأطباق الكسكسي والشخشوخة والرشتة.

## مواسم الحصاد

ترتبط بعض الأكلات بمواسم الحصاد والأعياد، حيث تُحضّر بطقوس خاصة تجمع العائلات الممتدة.

## الحلويات التقليدية

تزدان المناسبات بحلويات تقليدية كالمقروط والبقلاوة، التي تعكس مهارة نساء المنطقة وكرم الضيافة.

## إرث يتوارث

يبقى المطبخ القالمي جزءاً من الذاكرة الجماعية، ينتقل من جيل إلى جيل حاملاً معه قصص الأرض والناس.`,
    coverImage: 'https://placehold.co/1280x720?text=cuisine-guelma',
    categoryId: 3,
    authorId: 1,
    publishedAt: new Date('2024-12-20'),
    readingTime: 4,
  },
  {
    titleAr: 'محطة قطار قالمة: شريان الحركة والذاكرة',
    titleFr: 'La gare de Guelma : artère du mouvement et de la mémoire',
    slug: 'gare-guelma',
    excerptAr: 'شكّلت محطة القطار بقالمة نقطة وصل حيوية ربطت المدينة بالموانئ والمدن الكبرى منذ أواخر القرن التاسع عشر.',
    excerptFr: 'La gare de Guelma fut un point de jonction vital reliant la ville aux ports et grandes villes depuis la fin du XIXe siècle.',
    bodyAr: `# محطة قطار قالمة

مثّلت السكة الحديدية أحد أبرز مظاهر التحوّل العمراني في قالمة منذ أواخر القرن التاسع عشر.

## ربط المدينة بالعالم

ربطت السكة الحديدية قالمة بميناء عنابة والمدن المجاورة، مما سهّل نقل المنتجات الفلاحية والمسافرين.

## العمارة الاستعمارية

بُنيت المحطة على الطراز المعماري الفرنسي السائد آنذاك، وتُعد من المباني التاريخية التي تشهد على تلك الحقبة.

## ذاكرة جماعية

ارتبطت المحطة بذكريات الرحيل والعودة في وجدان سكان قالمة، وبقيت رمزاً للحركة والتواصل عبر الأجيال.`,
    coverImage: 'https://placehold.co/1280x720?text=gare-guelma',
    categoryId: 1,
    authorId: 3,
    publishedAt: new Date('2024-10-05'),
    readingTime: 4,
  },
  {
    titleAr: 'استقلال الجزائر 1962: فرحة قالمة بالحرية',
    titleFr: 'L\'indépendance de 1962 : la joie de la liberté à Guelma',
    slug: 'independance-1962-guelma',
    excerptAr: 'في صيف 1962، عاشت قالمة كباقي مدن الجزائر لحظة تاريخية فارقة باسترجاع السيادة الوطنية بعد عقود من الاستعمار.',
    excerptFr: 'À l\'été 1962, Guelma a vécu, comme toute l\'Algérie, un moment historique avec le recouvrement de la souveraineté nationale.',
    bodyAr: `# استقلال الجزائر 1962 في قالمة

شكّل الخامس من جويلية 1962 يوماً مشهوداً في تاريخ قالمة والجزائر بأسرها.

## نهاية حقبة

بعد 132 عاماً من الاستعمار الفرنسي، استرجعت الجزائر سيادتها الوطنية، وعمّت الاحتفالات شوارع قالمة.

## ثمن الحرية

جاء الاستقلال بعد تضحيات جسيمة، وكانت قالمة قد دفعت ثمناً باهظاً منذ مجازر 1945 وطوال سنوات الثورة.

## بناء الدولة

مع الاستقلال، انخرط أبناء قالمة في بناء مؤسسات الدولة الفتية، من التعليم والصحة إلى الإدارة المحلية.

## ذاكرة الفرح

يبقى يوم الاستقلال محطة احتفالية سنوية تستعيد فيها المدينة ذاكرة الكفاح وفرحة الحرية.`,
    coverImage: 'https://placehold.co/1280x720?text=independance-1962-guelma',
    categoryId: 5,
    authorId: 2,
    publishedAt: new Date('2025-07-05'),
    readingTime: 5,
  },
]

// articles.createdByUserId is NOT NULL, so an admin must exist before articles.
const [admin] = await db.select({ id: users.id }).from(users).where(eq(users.role, 'admin'))

if (!admin) {
  console.error('❌ No admin account found. Run `pnpm db:seed:admin` before seeding articles.')
  await seedClient.end({ timeout: 1 }).catch(() => {})
  process.exit(1)
}

// Owner pool for round-robin assignment of articles.createdByUserId. Ownership
// is the CREATING account, independent of the byline (articles.authorId). Run
// `pnpm db:seed` first so the author accounts exist; otherwise this falls back
// to admin-only ownership.
const ownerRows = await db
  .select({ id: users.id })
  .from(users)
  .where(inArray(users.role, ['admin', 'author']))
const ownerPool = ownerRows.length > 0 ? ownerRows.map(row => row.id) : [admin.id]

/** Pick an owner for the article at `index`, cycling through the owner pool. */
function ownerFor(index: number): string {
  return ownerPool[index % ownerPool.length]!
}

// Idempotent seed: remove any existing rows with these slugs first so reruns
// don't create duplicates. Related media and tags cascade-delete via FK.
const slugs = articleData.map(article => article.slug)
const removed = await db.delete(articles).where(inArray(articles.slug, slugs)).returning({ id: articles.id })

if (removed.length > 0) {
  console.log(`  \u2192 Removed ${removed.length} existing article(s) with matching slugs`)
}

// --- Resolve UUIDs for the local fixture references ---
// Small position numbers exist only inside this fixture. Stable slugs translate
// them to generated database UUIDs before values reach the articles table.
const categorySlugByPosition = [
  'sites-historiques', // 1
  'histoire-militaire', // 2
  'culture-patrimoine', // 3
  'personnalites', // 4
  'evenements', // 5
]
const authorSlugByPosition = [
  'ahmed-ben-mohamed', // 1
  'fatima-zohra-boualam', // 2
  'youssef-khalidi', // 3
]

const categoryRows = await db.select({ id: categories.id, slug: categories.slug }).from(categories)
const categoryIdBySlug = new Map(categoryRows.map(row => [row.slug, row.id]))

const authorRows = await db.select({ id: authors.id, slug: authors.slug }).from(authors)
const authorIdBySlug = new Map(authorRows.map(row => [row.slug, row.id]))

/** Translate a local 1-based fixture reference into a database UUID. */
function resolveUuid(position: number, slugs: string[], idBySlug: Map<string, string>, kind: string): string {
  const slug = slugs[position - 1]
  const id = slug === undefined ? undefined : idBySlug.get(slug)
  if (id === undefined) {
    throw new Error(`Seed error: ${kind} ${position} not found. Run \`pnpm db:seed\` first.`)
  }
  return id
}

console.log('  \u2192 Inserting additional articles...')
const inserted = await db
  .insert(articles)
  .values(articleData.map((article, index) => ({
    ...article,
    coverImageVariants: createSeedImageVariants(article.slug),
    categoryId: resolveUuid(article.categoryId, categorySlugByPosition, categoryIdBySlug, 'category'),
    authorId: resolveUuid(article.authorId, authorSlugByPosition, authorIdBySlug, 'author'),
    createdByUserId: ownerFor(index),
  })))
  .returning({
    id: articles.id,
    slug: articles.slug,
  })

// Sample gallery (images + uploaded video + YouTube link) for the 1962
// independence article so the media gallery has real data to render.
const independence = inserted.find(article => article.slug === 'independance-1962-guelma')

if (independence) {
  await db.insert(articleMedia).values([
    {
      articleId: independence.id,
      type: 'image',
      url: 'https://placehold.co/1280x800?text=guelma-1962-celebration-main',
      imageVariants: seedImageVariants('guelma-1962-celebration'),
      captionAr: 'احتفالات الاستقلال في شوارع قالمة',
      captionFr: 'Célébrations de l\'indépendance dans les rues de Guelma',
      position: 0,
    },
    {
      articleId: independence.id,
      type: 'image',
      url: 'https://placehold.co/1280x800?text=guelma-1962-drapeau-main',
      imageVariants: seedImageVariants('guelma-1962-drapeau'),
      captionAr: 'رفع العلم الوطني',
      captionFr: 'Levée du drapeau national',
      position: 1,
    },
    {
      articleId: independence.id,
      type: 'youtube',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      captionAr: 'أرشيف: لحظة الاستقلال',
      captionFr: 'Archives : le moment de l\'indépendance',
      position: 2,
    },
  ])
  console.log('  \u2192 Inserted sample gallery for independance-1962-guelma')
}

console.log('\u2705 Additional article seed complete! Inserted:')
console.log(`   - ${articleData.length} articles`)

await seedClient.end()
