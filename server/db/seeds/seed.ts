import { inArray } from 'drizzle-orm'
import { articles, authors, categories, db, eq, seedClient, users } from './_client'
import { seedAuthorAccounts } from './seed-authors'

// Ensure tables exist (run migrations first via `pnpm db:migrate`)
console.log('🌱 Seeding database...')

// articles.createdByUserId is NOT NULL, so an admin must exist before articles.
// The admin is also the first owner in the round-robin pool built below.
const [admin] = await db.select({ id: users.id }).from(users).where(eq(users.role, 'admin'))

if (!admin) {
  console.error('❌ No admin account found. Run `pnpm db:seed:admin` before seeding articles.')
  await seedClient.end({ timeout: 1 }).catch(() => {})
  process.exit(1)
}

// --- Authors ---
const authorData = [
  {
    nameAr: 'أحمد بن محمد',
    nameFr: 'Ahmed Ben Mohamed',
    slug: 'ahmed-ben-mohamed',
    bioAr: 'باحث في تاريخ الجزائر المعاصر ومتخصص في تاريخ قالمة',
    bioFr: 'Chercheur en histoire contemporaine de l\'Algérie, spécialiste de Guelma',
  },
  {
    nameAr: 'فاطمة الزهراء بوعلام',
    nameFr: 'Fatima Zohra Boualam',
    slug: 'fatima-zohra-boualam',
    bioAr: 'كاتبة ومؤرخة متخصصة في التراث الثقافي الجزائري',
    bioFr: 'Écrivaine et historienne spécialisée dans le patrimoine culturel algérien',
  },
  {
    nameAr: 'يوسف خالدي',
    nameFr: 'Youssef Khalidi',
    slug: 'youssef-khalidi',
    bioAr: 'أستاذ جامعي في قسم التاريخ بجامعة قالمة',
    bioFr: 'Professeur universitaire au département d\'histoire de l\'Université de Guelma',
  },
]

console.log('  → Inserting authors...')
await db.insert(authors).values(authorData).onConflictDoNothing()

// --- Categories ---
const categoryData = [
  {
    nameAr: 'مواقع تاريخية',
    nameFr: 'Sites historiques',
    slug: 'sites-historiques',
    descriptionAr: 'المعالم والمواقع الأثرية في قالمة',
    descriptionFr: 'Monuments et sites archéologiques de Guelma',
  },
  {
    nameAr: 'تاريخ عسكري',
    nameFr: 'Histoire militaire',
    slug: 'histoire-militaire',
    descriptionAr: 'الأحداث العسكرية والمقاومة في منطقة قالمة',
    descriptionFr: 'Événements militaires et résistance dans la région de Guelma',
  },
  {
    nameAr: 'ثقافة وتراث',
    nameFr: 'Culture et patrimoine',
    slug: 'culture-patrimoine',
    descriptionAr: 'التراث الثقافي والعادات والتقاليد المحلية',
    descriptionFr: 'Patrimoine culturel, coutumes et traditions locales',
  },
  {
    nameAr: 'شخصيات تاريخية',
    nameFr: 'Personnalités historiques',
    slug: 'personnalites',
    descriptionAr: 'أعلام وشخصيات بارزة من قالمة',
    descriptionFr: 'Figures et personnalités marquantes de Guelma',
  },
  {
    nameAr: 'أحداث زمنية',
    nameFr: 'Événements chronologiques',
    slug: 'evenements',
    descriptionAr: 'أحداث تاريخية مرتبة زمنياً',
    descriptionFr: 'Événements historiques classés chronologiquement',
  },
]

console.log('  → Inserting categories...')
await db.insert(categories).values(categoryData).onConflictDoNothing()

// --- Author accounts ---
// Create the author accounts now (after the byline `authors` rows exist) so the
// owner pool below includes them BEFORE articles are inserted. This is what lets
// a single `pnpm db:seed` distribute ownership across admin + authors.
console.log('  → Seeding author accounts...')
await seedAuthorAccounts()

// Owner pool for round-robin assignment of articles.createdByUserId. Ownership
// is the CREATING account and is independent of the byline (articles.authorId,
// display only). Admin first, then the author accounts; falls back to admin-only
// if the author accounts are missing for any reason.
const ownerRows = await db
  .select({ id: users.id })
  .from(users)
  .where(inArray(users.role, ['admin', 'author']))
const ownerPool = ownerRows.length > 0 ? ownerRows.map(row => row.id) : [admin.id]

/** Pick an owner for the article at `index`, cycling through the owner pool. */
function ownerFor(index: number): number {
  return ownerPool[index % ownerPool.length]!
}

// --- Articles ---
const articleData = [
  {
    titleAr: 'حمام دباغ: المنتجع الروماني هيبوليس',
    titleFr: 'Hammam Debagh : la station thermale romaine Hippolis',
    slug: 'hammam-debagh-hippolis',
    excerptAr: 'تُعد حمامات دباغ من أقدم المنتجعات الحرارية في شمال أفريقيا، ويعود تاريخها إلى العصر الروماني عندما عُرفت باسم هيبوليس.',
    excerptFr: 'Les thermes de Hammam Debagh comptent parmi les plus anciennes stations thermales d\'Afrique du Nord, remontant à l\'époque romaine sous le nom d\'Hippolis.',
    body: `# حمام دباغ: المنتجع الروماني هيبوليس

تعد حمامات دباغ من أقدم المنتجعات الحرارية في شمال أفريقيا، حيث يعود تاريخها إلى العصر الروماني عندما كانت تُعرف باسم "هيبوليس". تقع على بعد 20 كيلومتراً شمال شرق مدينة قالمة.

## التاريخ القديم

استغل الرومان هذه الينابيع الحارة منذ القرن الأول الميلادي، وأقاموا حولها مرافق استحمام فاخرة تليق بأهمية المنطقة. وقد عُثر على آثار رومانية عديدة في المنطقة تشهد على ازدهارها في تلك الحقبة.

## المياه المعدنية

تتميز مياه حمام دباغ بدرجة حرارة تصل إلى 98 درجة مئوية، مما يجعلها من أسخن الينابيع الحرارية في العالم. تحتوي على معادن متعددة لها فوائد علاجية معروفة منذ القدم.

## الوضع الحالي

لا تزال حمامات دباغ تستقطب الزوار من مختلف أنحاء الجزائر والعالم، وتُعد من أهم المعالم السياحية في ولاية قالمة.`,
    coverImage: 'https://placehold.co/1280x720?text=hammam-debagh-hippolis',
    categoryId: 1,
    authorId: 1,
    publishedAt: new Date('2024-11-15'),
    readingTime: 5,
  },
  {
    titleAr: 'مسرح قالمة الروماني: شاهد على عظمة كالاما',
    titleFr: 'Le théâtre romain de Guelma : témoin de la grandeur de Calama',
    slug: 'theatre-romain-guelma',
    excerptAr: 'يُعد المسرح الروماني بقالمة من أهم الآثار الرومانية في الجزائر، وشاهداً حياً على مدينة كالاما القديمة.',
    excerptFr: 'Le théâtre romain de Guelma est l\'un des plus importants vestiges romains d\'Algérie et un témoin vivant de l\'antique Calama.',
    body: `# مسرح قالمة الروماني

يُعد المسرح الروماني بقالمة من أهم الآثار الرومانية في الجزائر، وهو شاهد حي على مدينة كالاما القديمة التي كانت من أبرز المدن في مقاطعة نوميديا الرومانية.

## البناء والتصميم

شُيّد المسرح في القرن الثاني الميلادي، ويتسع لحوالي 5000 متفرج. يتميز بتصميمه نصف الدائري المحفور في سفح التل، مع مدرجات حجرية متدرجة وخشبة مسرح واسعة.

## الاكتشاف والترميم

اكتُشف المسرح في القرن التاسع عشر خلال الفترة الاستعمارية، وخضع لعمليات ترميم متعددة. اليوم يُستخدم لإقامة المهرجانات الثقافية والعروض المسرحية.

## الأهمية التاريخية

يعكس المسرح مستوى التحضر الذي بلغته مدينة كالاما، ويدل على أهميتها كمركز ثقافي وإداري في المنطقة.`,
    coverImage: 'https://placehold.co/1280x720?text=theatre-romain-guelma',
    categoryId: 1,
    authorId: 1,
    publishedAt: new Date('2024-10-20'),
    readingTime: 4,
  },
  {
    titleAr: 'مجازر 8 ماي 1945 في قالمة: يوم لا يُنسى',
    titleFr: 'Les massacres du 8 mai 1945 à Guelma : un jour inoubliable',
    slug: 'massacres-8-mai-1945-guelma',
    excerptAr: 'تُعد مجازر 8 ماي 1945 من أبشع جرائم الاستعمار الفرنسي في الجزائر، وكانت في قالمة وحشية بشكل خاص.',
    excerptFr: 'Les massacres du 8 mai 1945 comptent parmi les pires crimes du colonialisme français en Algérie, d\'une violence particulière à Guelma.',
    body: `# مجازر 8 ماي 1945 في قالمة

تُعد مجازر 8 ماي 1945 من أبشع الجرائم التي ارتكبها الاستعمار الفرنسي في الجزائر. في قالمة، كانت المجزرة وحشية بشكل خاص، حيث قُتل آلاف الجزائريين العُزّل.

## السياق التاريخي

جاءت هذه الأحداث في سياق احتفالات نهاية الحرب العالمية الثانية، حيث خرج الجزائريون يطالبون بالاستقلال الذي وُعدوا به مقابل مشاركتهم في الحرب.

## الأحداث في قالمة

في قالمة، قاد المستوطن أندريه أشياري حملة إبادة منظمة ضد السكان المسلمين. أُحرقت الجثث في أفران الجير لإخفاء الأدلة، واستمرت عمليات القتل لأسابيع.

## الذاكرة والتخليد

تُخلّد الجزائر ذكرى هذه المجازر كل عام، وتُعد محطة أساسية في مسار الكفاح التحريري الذي توّج باستقلال الجزائر عام 1962.`,
    coverImage: 'https://placehold.co/1280x720?text=massacres-8-mai-1945-guelma',
    categoryId: 2,
    authorId: 2,
    publishedAt: new Date('2025-05-08'),
    readingTime: 6,
  },
  {
    titleAr: 'بنك الجزائر في القرن 19: من جذور جالي',
    titleFr: 'La Banque d\'Algérie au XIXe siècle : des racines à Guelma',
    slug: 'banque-algerie-19e-siecle-guelma',
    excerptAr: 'شهدت قالمة خلال القرن التاسع عشر تطوراً عمرانياً كبيراً، ومن معالمه مبنى بنك الجزائر الذي لا يزال قائماً.',
    excerptFr: 'Au XIXe siècle, Guelma connut un essor urbain marqué, dont témoigne le bâtiment de la Banque d\'Algérie toujours debout.',
    body: `# بنك الجزائر في القرن 19

شهدت مدينة قالمة خلال القرن التاسع عشر تطوراً عمرانياً ومؤسساتياً كبيراً، ومن بين المباني التي شُيّدت في تلك الفترة مبنى بنك الجزائر الذي لا يزال قائماً حتى اليوم.

## العمارة الاستعمارية

يتميز المبنى بطرازه المعماري الكلاسيكي الفرنسي، مع واجهة حجرية مزخرفة وأعمدة كورنثية. يعكس هذا المبنى الطابع المعماري الذي فرضه المستعمر على المدن الجزائرية.

## الدور الاقتصادي

لعب البنك دوراً محورياً في الاقتصاد المحلي خلال الفترة الاستعمارية، حيث كان يموّل المشاريع الزراعية والتجارية للمستوطنين.

## ما بعد الاستقلال

بعد الاستقلال، تحوّل المبنى إلى فرع للبنك المركزي الجزائري، وهو اليوم شاهد على الحقبة الاستعمارية وتحولاتها.`,
    coverImage: 'https://placehold.co/1280x720?text=banque-algerie-19e-siecle-guelma',
    categoryId: 3,
    authorId: 3,
    publishedAt: new Date('2024-09-12'),
    readingTime: 4,
  },
  {
    titleAr: 'في قلب المدينة: ساحة قالمة عبر العصور',
    titleFr: 'Au cœur de la ville : la place de Guelma à travers les âges',
    slug: 'place-guelma-a-travers-ages',
    excerptAr: 'الساحة المركزية لقالمة من أقدم الفضاءات العمومية في المدينة، شهدت تحولات عديدة عبر الحقب التاريخية.',
    excerptFr: 'La place centrale de Guelma, l\'un des plus anciens espaces publics de la ville, a connu de nombreuses transformations au fil des époques.',
    body: `# في قلب المدينة: ساحة قالمة عبر العصور

تُعد الساحة المركزية لمدينة قالمة من أقدم الفضاءات العمومية في المدينة، وقد شهدت تحولات عديدة عبر مختلف الحقب التاريخية.

## العصر الروماني

في عهد مدينة كالاما الرومانية، كانت هذه المنطقة تضم الفوروم (الساحة العامة) حيث تُعقد الاجتماعات وتُمارس التجارة.

## الفترة العثمانية

خلال الحكم العثماني، تحولت الساحة إلى سوق تجاري نشط يربط بين مختلف أحياء المدينة.

## الفترة الاستعمارية

أعاد الفرنسيون تخطيط الساحة على الطراز الأوروبي، وأحاطوها بمبانٍ إدارية وتجارية لا تزال قائمة.

## اليوم

تبقى الساحة قلب المدينة النابض، حيث يلتقي السكان ويتبادلون أطراف الحديث تحت ظلال الأشجار المعمّرة.`,
    coverImage: 'https://placehold.co/1280x720?text=place-guelma-a-travers-ages',
    categoryId: 3,
    authorId: 1,
    publishedAt: new Date('2024-08-25'),
    readingTime: 5,
  },
  {
    titleAr: 'عيد المحلي: مهرجان من عبق التاريخ قالمة حوالي 1900',
    titleFr: 'Fête locale : un festival historique de Guelma vers 1900',
    slug: 'fete-locale-guelma-1900',
    excerptAr: 'في مطلع القرن العشرين، شهدت قالمة احتفالات محلية تمزج بين التقاليد الجزائرية وطقوس المستوطنين الفرنسيين.',
    excerptFr: 'Au début du XXe siècle, Guelma vivait des fêtes locales mêlant traditions algériennes et rites introduits par les colons français.',
    body: `# عيد المحلي: مهرجان من عبق التاريخ

في مطلع القرن العشرين، كانت مدينة قالمة تشهد احتفالات محلية تمزج بين التقاليد الجزائرية والطقوس التي أدخلها المستوطنون الفرنسيون.

## الأعياد التقليدية

حافظ سكان قالمة على أعيادهم التقليدية رغم الاستعمار، من احتفالات المولد النبوي إلى أعياد الحصاد والمواسم الزراعية.

## الحياة الاجتماعية

كانت هذه المناسبات فرصة للتلاقي والتواصل بين العائلات، وكانت الأسواق تنتعش والحرفيون يعرضون منتجاتهم.

## التوثيق البصري

تُعد الصور الفوتوغرافية النادرة من تلك الحقبة شهادات بصرية ثمينة على الحياة اليومية في قالمة مطلع القرن العشرين.`,
    coverImage: 'https://placehold.co/1280x720?text=fete-locale-guelma-1900',
    categoryId: 3,
    authorId: 2,
    publishedAt: new Date('2024-07-18'),
    readingTime: 3,
  },
  {
    titleAr: 'أحمد المقراني وأولاد سيحة في المقاومة',
    titleFr: 'Ahmed El Mokrani et les Ouled Saiha dans la résistance',
    slug: 'mokrani-ouled-saiha-resistance',
    excerptAr: 'تُعد ثورة المقراني عام 1871 من أكبر الانتفاضات الشعبية ضد الاستعمار الفرنسي، وشارك فيها أبناء قالمة بفعالية.',
    excerptFr: 'La révolte d\'El Mokrani de 1871 fut l\'un des plus grands soulèvements populaires contre le colonialisme français, auquel Guelma prit part activement.',
    body: `# أحمد المقراني وأولاد سيحة في المقاومة

تُعد ثورة المقراني عام 1871 من أكبر الانتفاضات الشعبية ضد الاستعمار الفرنسي في الجزائر، وقد شارك فيها أبناء منطقة قالمة بفعالية.

## ثورة المقراني 1871

قاد محمد المقراني ثورة شاملة ضد الاستعمار الفرنسي، امتدت من منطقة البرج إلى مختلف أنحاء الشرق الجزائري بما فيها قالمة.

## دور أولاد سيحة

انضمت قبيلة أولاد سيحة في منطقة قالمة إلى الثورة، وقدمت تضحيات جسيمة في سبيل مقاومة المستعمر.

## العقوبات الجماعية

بعد إخماد الثورة، فرض الاستعمار عقوبات جماعية قاسية على القبائل المشاركة، شملت مصادرة الأراضي والنفي والسجن.

## الإرث التاريخي

تبقى هذه الثورة رمزاً للمقاومة الشعبية، وتُدرّس في المناهج التعليمية كمحطة أساسية في تاريخ الكفاح الوطني.`,
    coverImage: 'https://placehold.co/1280x720?text=mokrani-ouled-saiha-resistance',
    categoryId: 2,
    authorId: 3,
    publishedAt: new Date('2024-06-30'),
    readingTime: 5,
  },
  {
    titleAr: 'تطور مواطني مدينة قالمة: البريد نحو محمد',
    titleFr: 'Évolution citoyenne de Guelma : la poste vers Mohamed',
    slug: 'evolution-poste-guelma',
    excerptAr: 'شهدت قالمة تطوراً عمرانياً ملحوظاً خلال القرنين التاسع عشر والعشرين، ومن أبرز معالمه مبنى البريد المركزي.',
    excerptFr: 'Guelma a connu un développement urbain notable aux XIXe et XXe siècles, illustré notamment par le bâtiment de la poste centrale.',
    body: `# تطور مواطني مدينة قالمة

شهدت مدينة قالمة تطوراً عمرانياً ملحوظاً خلال القرن التاسع عشر والعشرين، ومن أبرز المعالم التي تشهد على هذا التطور مبنى البريد المركزي.

## مبنى البريد

شُيّد مبنى البريد المركزي في قالمة خلال الفترة الاستعمارية، وكان يمثل رمزاً للحداثة والتواصل مع العالم الخارجي.

## شبكة الاتصالات

ربطت شبكة البريد والتلغراف مدينة قالمة بباقي المدن الجزائرية والفرنسية، مما ساهم في تطوير التجارة والإدارة.

## الدور الاجتماعي

لم يكن البريد مجرد مرفق إداري، بل كان فضاءً اجتماعياً يلتقي فيه السكان ويتبادلون الأخبار والرسائل.`,
    coverImage: 'https://placehold.co/1280x720?text=evolution-poste-guelma',
    categoryId: 3,
    authorId: 1,
    publishedAt: new Date('2025-01-10'),
    readingTime: 4,
  },
  {
    titleAr: 'قالمة بقر القرآن: الإصلاحات التعليمية في القرن 19',
    titleFr: 'Guelma et l\'enseignement coranique : les réformes éducatives au XIXe siècle',
    slug: 'enseignement-coranique-guelma-19e',
    excerptAr: 'لعب التعليم القرآني دوراً محورياً في الحفاظ على الهوية الثقافية والدينية لسكان قالمة خلال الفترة الاستعمارية.',
    excerptFr: 'L\'enseignement coranique a joué un rôle central dans la préservation de l\'identité culturelle et religieuse des habitants de Guelma durant la période coloniale.',
    body: `# قالمة والتعليم القرآني

لعب التعليم القرآني دوراً محورياً في الحفاظ على الهوية الثقافية والدينية لسكان قالمة خلال الفترة الاستعمارية.

## الكتاتيب والزوايا

انتشرت الكتاتيب القرآنية في مختلف أحياء قالمة وقراها، حيث كان الأطفال يتعلمون القراءة والكتابة وحفظ القرآن الكريم.

## المقاومة الثقافية

شكّل التعليم القرآني شكلاً من أشكال المقاومة الثقافية ضد سياسة الفرنسة التي انتهجها الاستعمار.

## جمعية العلماء المسلمين

في ثلاثينيات القرن العشرين، أسست جمعية العلماء المسلمين مدارس حرة في قالمة، ساهمت في نشر التعليم العربي والإسلامي.

## الإرث التعليمي

لا يزال هذا الإرث التعليمي حاضراً في قالمة اليوم من خلال المدارس القرآنية والمساجد التي تواصل رسالتها التربوية.`,
    coverImage: 'https://placehold.co/1280x720?text=enseignement-coranique-guelma-19e',
    categoryId: 3,
    authorId: 2,
    publishedAt: new Date('2024-12-05'),
    readingTime: 5,
  },
  {
    titleAr: 'يوم دائرة: تعيين جان بوجيمونيني في قالمة خلال الحقبة الاستعمارية',
    titleFr: 'Jour de cercle : la nomination de Jean Bougimonini à Guelma durant l\'ère coloniale',
    slug: 'nomination-bougimonini-guelma',
    excerptAr: 'تكشف الوثائق الإدارية الاستعمارية عن تفاصيل الحياة السياسية والإدارية في قالمة خلال القرن التاسع عشر.',
    excerptFr: 'Les archives administratives coloniales révèlent les détails de la vie politique et administrative de Guelma au XIXe siècle.',
    body: `# يوم دائرة: تعيين جان بوجيمونيني في قالمة

تكشف الوثائق الإدارية الاستعمارية عن تفاصيل الحياة السياسية والإدارية في قالمة خلال القرن التاسع عشر.

## النظام الإداري الاستعماري

قسّم الاستعمار الفرنسي الجزائر إلى دوائر إدارية، وكانت قالمة مركزاً لدائرة مهمة تضم عدة بلديات.

## المسؤولون الاستعماريون

تعاقب على إدارة دائرة قالمة عدد من المسؤولين الفرنسيين الذين تركوا بصماتهم على المدينة، سلباً وإيجاباً.

## الحياة اليومية تحت الإدارة الاستعمارية

عانى السكان المحليون من التمييز والظلم في ظل النظام الإداري الاستعماري، حيث كانت القوانين تخدم مصالح المستوطنين على حساب الأهالي.

## أهمية التوثيق

تُعد هذه الوثائق مصادر تاريخية قيّمة لفهم آليات الاستعمار وتأثيره على المجتمع المحلي في قالمة.`,
    coverImage: 'https://placehold.co/1280x720?text=nomination-bougimonini-guelma',
    categoryId: 5,
    authorId: 3,
    publishedAt: new Date('2025-03-22'),
    readingTime: 4,
  },
]

// --- Resolve real DB ids for the hardcoded seed references ---
// The articleData above references categories/authors by SEED POSITION
// (categoryId 1-5, authorId 1-3, matching the arrays above). Real primary
// keys are DB-generated — CockroachDB uses unique_rowid(), not 1, 2, 3… —
// so we translate each position to the actual id through the row's slug.
const categorySlugByPosition = categoryData.map(category => category.slug)
const authorSlugByPosition = authorData.map(author => author.slug)

const categoryRows = await db.select({ id: categories.id, slug: categories.slug }).from(categories)
const categoryIdBySlug = new Map(categoryRows.map(row => [row.slug, row.id]))

const authorRows = await db.select({ id: authors.id, slug: authors.slug }).from(authors)
const authorIdBySlug = new Map(authorRows.map(row => [row.slug, row.id]))

/** Translate a 1-based seed position into the real database id. */
function realId(position: number, slugs: string[], idBySlug: Map<string, number>, kind: string): number {
  const slug = slugs[position - 1]
  const id = slug === undefined ? undefined : idBySlug.get(slug)
  if (id === undefined) {
    throw new Error(`Seed error: ${kind} ${position} not found in the database.`)
  }
  return id
}

console.log('  → Inserting articles...')
await db
  .insert(articles)
  .values(articleData.map((article, index) => ({
    ...article,
    categoryId: realId(article.categoryId, categorySlugByPosition, categoryIdBySlug, 'category'),
    authorId: realId(article.authorId, authorSlugByPosition, authorIdBySlug, 'author'),
    createdByUserId: ownerFor(index),
  })))
  .onConflictDoNothing()

console.log('✅ Seed complete! Inserted:')
console.log(`   - ${authorData.length} authors`)
console.log(`   - ${categoryData.length} categories`)
console.log(`   - ${articleData.length} articles`)

await seedClient.end()
