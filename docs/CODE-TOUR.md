# راهنمای خط‌به‌خط کد HelliQuiz

این فایل، کد را **به ترتیب اجرا** می‌خواند: از لحظه‌ای که بک‌اند بالا می‌آید، تا وقتی دبیر
دانش‌آموز می‌سازد، دانش‌آموز وارد می‌شود، آزمون می‌دهد و کارنامه‌اش ثبت می‌شود.

> هر جا کد را با `>` یا در بلوک کد دیدی، آن خط‌ها عیناً از فایل هستند. توضیح زیرشان
> دقیقاً می‌گوید آن خط چه کار می‌کند و اگر نبود چه می‌شد.
>
> اگر عجله داری یا می‌خواهی سر کلاس بخوانی، از **پیش‌درآمد** شروع کن؛ آن‌جا هیچ کدی
> نیست و کل ماجرا به زبان ساده آمده است.

## پیش‌درآمد: امروز چه کاری کردیم؟ (به زبان ساده — برای خواندن سر کلاس)

این بخش هیچ کد ندارد. فقط داستانِ کارهایی است که امروز روی سامانه انجام دادیم، به همان
ترتیبی که اتفاق افتاد. اگر می‌خواهی سر کلاس برای بچه‌ها توضیح بدهی، کافی است همین
چند پاراگراف را بخوانی؛ هر جا لازم شد، بخش فنیِ پایین‌تر همان جمله را با کد نشان می‌دهد.

### قدم ۱ — از کجا شروع کردیم؟

اولِ کار، یک ایراد بزرگ داشتیم: دانش‌آموز در سامانه «حساب» نداشت. هر کس صفحهٔ آزمون را
باز می‌کرد، خودش اسم و کلاس و کد ملی‌اش را تایپ می‌کرد و می‌رفت سراغ سؤال‌ها. معلوم است
که این‌طوری چه می‌شود: هر کسی می‌توانست اسم هر کسی را بنویسد. کارنامه‌ها هم به یک «اسمِ
تایپی» وصل بودند، نه به یک آدمِ واقعی با حساب. دبیر هم هیچ راهی نداشت مطمئن شود این
کارنامه مال همان بچه‌ای است که سر کلاس نشسته.

### قدم ۲ — تصمیم اصلی: هر دانش‌آموز، یک کاربر واقعی

گفتیم حساب دانش‌آموز باید یک کاربر واقعی در خودِ استراپی باشد، با نقش `Student` — همان‌جایی
که حساب دبیرها هست. این کار سه فایدهٔ روشن داشت:

- دبیر می‌تواند ببیند چه کسی حساب دارد، حساب کسی را قفل کند، یا رمزش را عوض کند.
- دانش‌آموز با یک کد ملی و رمز وارد می‌شود و همهٔ کارنامه‌هایش را یک‌جا می‌بیند.
- «نام تایپی» دیگر معنا ندارد؛ نام و کلاس از خودِ حساب خوانده می‌شود.

### قدم ۳ — دانش‌آموز از کجا می‌آید؟ دستِ دبیر

تب تازه‌ای در پنل دبیر ساختیم به اسم «دانش‌آموزان». دبیر نام، کلاس، کد ملی و رمز را
می‌نویسد، دکمهٔ ساخت را می‌زند و یک کارت می‌بیند که کد ملی و رمز را نشان می‌دهد؛ همان را
به دانش‌آموز می‌دهد. بعداً هم می‌تواند همان ردیف را ویرایش کند، مسدودش کند یا حذفش کند.
اگر کد ملی کسی را عوض کند، کارنامه‌های قبلی هم دنبالش می‌آیند و گم نمی‌شوند.

### قدم ۴ — ورود باید امن باشد

رمزها را خودِ استراپی هش می‌کند؛ ما هیچ‌جا رمز را ذخیره نمی‌کنیم. بعد از ورود، توکن در
کوکی `httpOnly` می‌نشیند؛ یعنی جاوااسکریپت صفحه نمی‌تواند آن را بخواند و بدزدد. کوکی
دسترسی هم خودش تمدید می‌شود تا بچه وسط آزمون از سامانه بیرون نیفتد.

### قدم ۵ — مرورگر یک راه دارد، نه دو راه

مرورگر هیچ‌وقت مستقیم با استراپی (پورت ۱۳۳۷) حرف نمی‌زند؛ همه‌چیز از `/api/strapi/...`
رد می‌شود. سودش این است که آدرس داخلی سرور بیرون نمی‌افتد، کوکی‌ها یک‌جا کنترل می‌شوند و
هر درخواست از یک دروازه رد می‌شود.

### قدم ۶ — هر آزمون، فقط یک کارنامه

هر کارنامه یک «کلید یکتا» دارد که از شناسهٔ آزمون و کد ملی ساخته می‌شود. دیتابیس هم روی
همان کلید ایندکس یکتا دارد؛ پس حتی اگر دو نفر هم‌زمان دکمهٔ ثبت را بزنند، دومی رد می‌شود.
اولِ هر بوت هم کارنامه‌های تکراری قدیمی پاک می‌شوند تا این قاعده از روز اول برقرار باشد.

### قدم ۷ — آماده‌سازی برای استفادهٔ واقعی

- کلید `SEED_DEMO` پیش‌فرض `false` شد؛ یعنی در محیط واقعی هیچ حساب و آزمون نمونه‌ای ساخته نمی‌شود.
- یک صفحهٔ «این صفحه پیدا نشد» و یک صفحهٔ «مشکلی پیش آمد» با همان طراحی سایت ساختیم.
- رنگ‌های دستی که از تم بیرون بودند (خاکستری‌های `slate`) را برداشتیم تا همه‌چیز یک‌دست باشد.

### قدم ۸ — ایراد امروز، شمارهٔ یک: ثبت‌نام باید برود

بچه‌ها گفتند: «ما ثبت‌نام نمی‌خواهیم. دبیر حساب می‌سازد و همان را می‌دهد.» درست هم بود؛
تا وقتی دبیر حساب می‌سازد، هر مسیر ثبت‌نامِ اضافه فقط یک راه برای ساختن حسابِ الکی است.
پس فرم ثبت‌نام از صفحهٔ دانش‌آموز برداشته شد، آدرس `POST /api/student/register` حذف شد و
تابعِ ساختِ حسابِ عمومی در بک‌اند هم پاک شد. حالا صفحهٔ `/student` فقط دو خانه دارد:
کد ملی و رمز. زیرش هم نوشته‌ایم: «حساب نداری یا رمزت را فراموش کرده‌ای؟ به دبیر بگو.»

### قدم ۹ — ایراد امروز، شمارهٔ دو: آزمون بدون ورود شروع نمی‌شود

قبلاً هر کسی می‌توانست وارد صفحهٔ آزمون شود و با نوشتن یک اسم، آزمون بدهد. حالا صفحهٔ
آزمون اول یک کارتِ «ورود به آزمون» نشان می‌دهد: کد ملی و رمز. تا این دو درست نباشد، هیچ
سؤالی نمی‌آید. بعد از ورود، اسم و کلاس از خودِ حساب خوانده می‌شود و دانش‌آموز فقط دکمهٔ
«شروع آزمون» را می‌بیند. بک‌اند هم سختگیر شد: اگر کسی بدون ورود مستقیم به سرور درخواست
بفرستد، جواب `401` می‌گیرد. یعنی حتی اگر کسی صفحه را دور بزند، کارنامه‌ای ثبت نمی‌شود.

### قدم ۱۰ — ایراد امروز، شمارهٔ سه: ۶ آزمون بود، ولی پنل دبیر خالی بود

این جالب‌ترین ایراد امروز بود. استراپی برای هر محتوا دو حالت دارد: «پیش‌نویس» و
«منتشرشده». پنل دبیر فقط منتشرشده‌ها را می‌خواند؛ شش آزمونی که ساخته بودی هم در حالت
پیش‌نویس مانده بودند. برای همین در `/admin` دیده می‌شدند و در پنل دبیر نه!

راه‌حل را ساده کردیم: برای آزمون و سؤال، این دوگانگی را کامل برداشتیم. هر آزمونی که
ذخیره می‌شود، همان لحظه فعال است. بک‌اند هم موقع بالا آمدن، یک بار همهٔ پیش‌نویس‌های قبلی
را «منتشرشده» می‌کند؛ پس آن شش آزمون هم سر جایشان می‌آیند و چیزی از دست نمی‌رود. حالا
قانون روشن است: **هر چه در استراپی بسازی، همان لحظه در پنل دبیر و در سایت هست.**

### قدم ۱۱ — سه قانونی که از امروز به بعد داریم

1. حساب دانش‌آموز را **فقط دبیر** می‌سازد.
2. شرکت در آزمون **بدون ورود** ممکن نیست؛ نه از صفحه، نه از سرور.
3. هر آزمونی که ساخته می‌شود **همان لحظه فعال** است؛ حالت «پیش‌نویس» نداریم.

### قدم ۱۲ — سؤال‌هایی که سر کلاس پیش می‌آید

**«چرا دانش‌آموز خودش ثبت‌نام نکند؟»** چون آن‌وقت معلوم نیست کیست و دبیر باید دنبال
حساب‌های ناشناس بگردد. حالا هر حساب یک صاحب مشخص دارد و رمزش را دبیر می‌دهد.

**«اگر رمز کسی یادش رفت؟»** دبیر در تب «دانش‌آموزان» همان ردیف را باز می‌کند و رمز تازه
می‌گذارد. دانش‌آموز با رمز جدید وارد می‌شود و کارنامه‌های قبلی‌اش سر جایشان هستند.

**«اگر کسی کد ملی دوستش را بداند و با آن آزمون بدهد؟»** بدون رمز نمی‌تواند؛ آزمون فقط با
حساب باز می‌شود. برای همین رمزها را جدی بگیرید و پیش‌فرض‌ها را عوض کنید.

**«چرا کارنامهٔ من ثبت نشد؟»** چون هر آزمون فقط یک بار ثبت می‌شود. اگر قبلاً داده باشی،
همان کارنامهٔ قبلی را می‌بینی؛ این‌طوری کسی نمی‌تواند با تکرار آزمون، نمرهٔ بهتری بسازد.

**«آزمون را که در پنل استراپی ساختم، چرا در سایت نبود؟»** آن روزها مشکل «پیش‌نویس» بود؛
الان دیگر این مشکل وجود ندارد و آزمون تازه همان لحظه در سایت دیده می‌شود.

### چکیدهٔ تغییرات امروز در کد

| فایل | چه چیزی عوض شد |
| --- | --- |
| `frontend/src/components/student/StudentAuth.tsx` | فرم ثبت‌نام برداشته شد؛ فقط ورود با کد ملی و رمز |
| `frontend/src/app/api/student/register/route.ts` | **حذف شد** (دیگر مسیر ثبت‌نامی وجود ندارد) |
| `backend/src/api/submission/routes/02-student-auth.ts` | فقط مسیر `me` ماند |
| `backend/src/api/submission/controllers/student-auth.ts` | اکشن `register` حذف شد |
| `backend/src/api/teacher-students/controllers/teacher-students.ts` | ساخت دانش‌آموز از تابع مشترک `createStudentAccount` استفاده می‌کند |
| `frontend/src/components/student/QuizLoginGate.tsx` | **فایل تازه** — دروازهٔ ورود قبل از آزمون |
| `frontend/src/app/quiz/[id]/page.tsx` | بدون نشست، دروازهٔ ورود؛ با نشست، فرم شروع آزمون |
| `frontend/src/components/QuizRunner.tsx` | فرم شناسنامه حذف شد؛ فقط «شروع آزمون» و ارسال پاسخ‌ها |
| `backend/src/api/quiz/controllers/quiz.ts` | ثبت کارنامه فقط با توکن دانش‌آموز؛ بدون توکن `401` |
| `backend/src/api/quiz/content-types/quiz/schema.json` | `draftAndPublish` از `true` به `false` |
| `backend/src/api/question/content-types/question/schema.json` | `draftAndPublish` از `true` به `false` |
| `backend/src/api/quiz/controllers/quiz-public.ts` | فیلترهای `status: 'published'` و فیلتر `publishedAt` سؤال‌ها حذف شد |
| `backend/src/index.ts` | تابع `publishLegacyQuizzes` — انتشار یک‌بارهٔ پیش‌نویس‌های قدیمی |
| `frontend/src/app/teacher/page.tsx` | فهرست آزمون‌ها دیگر فیلتر وضعیت ندارد؛ پیام «هنوز آزمونی ساخته نشده» |
| `README.md` · `docs/CODE-TOUR.md` | هم‌تراز شدن با رفتار تازه |

---

## ۰) نقشهٔ کلی در یک نگاه

```
مرورگر  ──►  Next.js (پورت 3000)  ──►  Strapi (پورت 1337)  ──►  SQLite
             ├─ صفحه‌ها (RSC)           ├─ Content API
             ├─ /api/student/*          ├─ /api/student-auth/*
             ├─ /api/teacher/*          └─ /api/teacher-students
             └─ /api/strapi/* (پروکسی)
```

چهار قانون که همه‌جای کد تکرار می‌شوند:

1. مرورگر هیچ‌وقت مستقیم به `127.0.0.1:1337` درخواست نمی‌زند؛ همه‌چیز از `/api/strapi/...`.
2. توکن‌ها فقط در کوکی `httpOnly` می‌نشینند (جاوااسکریپت آن‌ها را نمی‌بیند).
3. نقش تعیین می‌کند چه کسی چه کاری می‌کند: `Public` (مهمان) / `Authenticated` (دبیر) / `Student` (دانش‌آموز).
4. حساب دانش‌آموز را فقط دبیر می‌سازد و آزمون فقط با همان حساب باز می‌شود (نه با تایپ نام).
5. آدرس‌هایی که به پروکسی می‌دهیم **بدون** `/api` هستند: `/api/strapi/quizzes` ⇒ استراپی
   `/api/quizzes`. اگر `/api` دوباره اضافه شود (`/api/strapi/api/quizzes`)، استراپی
   `404 Not Found` می‌دهد.

---

## ۱) بوتِ بک‌اند — `backend/src/index.ts`

این فایل هر بار که Strapi بالا می‌آید اجرا می‌شود و «خانه‌تکانی» می‌کند.

### ۱-۱) نقش‌ها

```ts
const ensureRole = async (
  strapi: Core.Strapi,
  type: string,
  name: string,
  description: string
) => { ... }
```
- `type` همان شناسهٔ داخلی نقش است (`public` / `authenticated` / `student`).
- اول با `strapi.db.query('plugin::users-permissions.role').findOne({ where: { type } })`
  دنبال نقش می‌گردد.
- اگر نبود، با `strapi.plugin('users-permissions').service('role').create(...)` می‌سازد.
- پس **هیچ‌وقت نقش تکراری ساخته نمی‌شود** و اگر خودت در `/admin` پاکش کنی، بوت بعدی
  دوباره می‌سازدش. (به همین دلیل «پاک‌کردن نقش‌ها» در استراپی بی‌فایده است.)

### ۱-۲) مجوزها

```ts
const PUBLIC_ACTIONS = ['api::quiz.quiz.find', 'api::quiz.quiz.findOne'];

const AUTHENTICATED_ACTIONS = [
  // quiz + question + submission → find, findOne, create, update, delete
];
```
- `PUBLIC_ACTIONS`: مهمان فقط می‌تواند آزمون‌ها را ببیند (و نه پاسخ صحیح را).
- `AUTHENTICATED_ACTIONS`: دبیر روی آزمون/سؤال/کارنامه دست کامل دارد.
- `Student` عمداً **هیچ** مجوزی ندارد؛ تنها راهش `/api/student-auth/me` است.

```ts
const ensureRolePermissions = async (strapi, roleId, actions) => {
  for (const action of actions) {
    const exists = await strapi.db
      .query('plugin::users-permissions.permission')
      .findOne({ where: { action, role: roleId } });
    if (!exists) {
      await strapi.plugin('users-permissions').service('permission').create({ ... });
    }
  }
};
```
- خط `if (!exists)` جلوی مجوز تکراری را می‌گیرد؛ پس اجرای مکرّر بوت بی‌خطر است
  (idempotent).

### ۱-۳) نقش پیش‌فرض ثبت‌نامِ مستقیم users-permissions

```ts
const setDefaultRegistrationRole = async (strapi, roleId) => {
  await strapi.store({ type: 'plugin', name: 'users-permissions', key: 'advanced' })
    .set({ value: { ...current, default_role: roleId } });
};
```
- همان تنظیمی که در `/admin → Settings → Users & Permissions → Advanced` دیده می‌شود.
- ثبت‌نام عمومی خودِ سامانه حذف شده است (حساب دانش‌آموز را فقط دبیر می‌سازد)،
  اما اگر کسی مستقیم به `/api/auth/local/register` استراپی بزند، نقشش **دانش‌آموز**
  می‌شود، نه دبیر.

### ۱-۴) ایندکس یکتا و پاک‌سازی کارنامه‌های تکراری

```ts
async function ensureUniqueSubmissionIndex(strapi: Core.Strapi) {
  const knex = strapi.db.connection;
```

```ts
await knex.raw(
  `DELETE FROM ${table} WHERE id NOT IN (SELECT MIN(id) FROM ${table} GROUP BY submission_key)`
);
```
- اگر از نسخه‌های قدیمی دو کارنامه با یک `submissionKey` مانده باشد، فقط قدیمی‌ترین
  (کوچک‌ترین `id`) می‌ماند. بدون این خط، خط بعدی خطا می‌دهد.

```ts
await knex.raw(
  `CREATE UNIQUE INDEX IF NOT EXISTS submissions_key_unique ON ${table} (submission_key)`
);
```
- `IF NOT EXISTS` ⇒ هر بوت بی‌خطر است.
- چرا لازم شد؟ چون Strapi روی جدولی که از قبل وجود دارد، قید `unique` فایل schema را
  اعمال نمی‌کند؛ پس خودمان می‌سازیم.
- برای MySQL شاخهٔ `else` با `ALTER TABLE ... ADD UNIQUE INDEX` اجرا می‌شود.

### ۱-۵) پیش‌نویس‌های قدیمی، یک بار منتشر می‌شوند

```ts
async function publishLegacyQuizzes(strapi: Core.Strapi) {
  const knex = strapi.db.connection;

  for (const table of ['quizzes', 'questions']) {
    try {
      const hasTable = await knex.schema.hasTable(table);
      if (!hasTable) continue;

      const updated = await knex(table)
        .whereNull('published_at')
        .update({ published_at: knex.fn.now() });

      if (Number(updated) > 0) {
        strapi.log.info(`[publish-backfill] ${updated} رکورد در «${table}» از پیش‌نویس به منتشرشده تبدیل شد.`);
      }
    } catch (error) {
      strapi.log.warn(`[publish-backfill] به‌روزرسانی «${table}» ناموفق بود:`, error);
    }
  }
}
```
- `whereNull('published_at')` یعنی «هر ردیفی که هیچ‌وقت منتشر نشده»؛ همین‌ها همان
  آزمون‌هایی هستند که در `/admin` دیده می‌شدند ولی در پنل دبیر نه.
- `update({ published_at: knex.fn.now() })` تاریخ انتشار را می‌گذارد تا دیگر «پیش‌نویس»
  حساب نشوند. برای جدول `questions` هم تکرار می‌شود، چون سؤالِ پیش‌نویس داخل آزمون هم
  دیده نمی‌شود.
- `if (!hasTable) continue` جلوی خطا در نصب تازه (که هنوز جدولی ندارد) را می‌گیرد.
- `try/catch` باعث می‌شود اگر یک جدول مشکل داشت، بالا آمدن استراپی متوقف نشود؛ فقط
  یک هشدار در لاگ می‌ماند.
- خروجی در لاگ: `[publish-backfill] N رکورد در «quizzes» از پیش‌نویس به منتشرشده تبدیل شد.`
- چرا این کار لازم شد؟ چون در بخش ۷ حالت «پیش‌نویس/انتشار» آزمون‌ها را کامل خاموش کردیم؛
  ردیف‌های قدیمی همچنان `published_at` خالی داشتند و بعضی کوئری‌ها ممکن بود نادیده‌شان
  بگیرند. با این تابع، دادهٔ قبلی هم با قاعدهٔ تازه هم‌تراز می‌شود.

### ۱-۶) دادهٔ نمونه (پشت کلید `SEED_DEMO`)

```ts
if (process.env.SEED_DEMO !== 'true') return;
```
- این خط در `bootstrap` قبل از `seedTeacher` / `seedQuizzes` / `seedStudent` است.
- **هر چیزی جز `true`** (از جمله نبودنِ متغیر) یعنی «هیچ دادهٔ نمونه‌ای نساز».
- `seedQuizzes` فقط وقتی اجرا می‌شود که تعداد آزمون‌ها صفر باشد، پس آزمون‌های واقعی
  تو را دست نمی‌زند.

---

## ۲) دبیر دانش‌آموز می‌سازد

### ۲-۱) در مرورگر — `frontend/src/components/teacher/StudentManager.tsx`

```tsx
const response = await fetch(
  isCreate ? `${API_BASE}/teacher-students` : `${API_BASE}/teacher-students/${editing?.id}`,
  {
    method: isCreate ? "POST" : "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }
);
```
- `API_BASE = "/api/strapi"` است؛ پس درخواست به مسیر نسبی خود Next می‌رود (بدون CORS،
  بدون localhost).
- `POST` = ساخت، `PATCH` = ویرایش. همان یک بلوک، هر دو کار را انجام می‌دهد.

```tsx
const payload: Record<string, unknown> = {
  fullName: fullName.trim(),
  studentClass: studentClass.trim(),
  nationalCode: nationalCode.trim(),
};
if (password.length > 0) payload.password = password;
```
- در حالت ویرایش، اگر دبیر رمز را خالی بگذارد، رمز فعلی دست‌نخورده می‌ماند.

پیش از ارسال، فرم خودش چک می‌کند (تجربهٔ کاربری بهتر و پیام فوری):
```tsx
if (!NATIONAL_CODE_PATTERN.test(nationalCode.trim())) { ... }
if (mode === "create" && password.length < MIN_PASSWORD_LENGTH) { ... }
```
- اما این اعتبارسنجی «مهربان» است، نه امنیتی؛ چک واقعی در سرور است (بخش ۲-۳).

### ۲-۲) پروکسی — `frontend/src/app/api/strapi/[...path]/route.ts`

```ts
const segments = path[0] === "api" ? path.slice(1) : path;
const targetUrl = `${STRAPI_INTERNAL_URL}/api/${segments.map(encodeURIComponent).join("/")}${request.nextUrl.search}`;
```
- پروکسی خودش `/api` را به آدرس استراپی اضافه می‌کند. پس مسیر ورودی باید
  `/api/strapi/quizzes` باشد، نه `/api/strapi/api/quizzes`.
- خطِ `segments` هر دو شکل را می‌پذیرد؛ اگر کسی `/api` را دوباره بنویسد، حذف می‌شود.
  بدون این خط، آدرس تبدیل می‌شد به `/api/api/quizzes` و استراپی `404 Not Found`
  برمی‌گرداند (همین باعث شد یک بار پنل دبیر خالی و پر از خطای ۴۰۴ شود).

```ts
const targetUrl = `${STRAPI_INTERNAL_URL}/api/${path
  .map((segment) => encodeURIComponent(segment))
  .join("/")}${request.nextUrl.search}`;
```
- `/api/strapi/teacher-students/6` → `http://127.0.0.1:1337/api/teacher-students/6`.
- `encodeURIComponent` جلوی دستکاری مسیر را می‌گیرد.

```ts
if (!headers.has("authorization")) {
  const candidates: AuthKind[] = ["teacher", "student"];
```
- اگر خود مرورگر هدر `Authorization` فرستاده باشد، همان ارجح است.
- وگرنه اول کوکی **دبیر** و بعد کوکی **دانش‌آموز** بررسی می‌شود (دبیر اولویت دارد).

```ts
if (!isTokenUsable(accessToken)) {
  rotatedSession = await refreshAccessToken(refreshToken, refreshSig);
}
const effective = rotatedSession?.token ?? accessToken;
if (effective) headers.set("authorization", `Bearer ${effective}`);
```
- اگر توکن منقضی باشد، همین‌جا و بی‌صدا با «توکن تازه‌سازی» عوض می‌شود و درخواست
  با توکن تازه می‌رود؛ کاربر حتی متوجه نمی‌شود.

```ts
if (upstream.status === 401 && activeKind) {
  for (const name of [names.access, names.refresh, names.sig]) {
    response.cookies.set(name, "", { ... maxAge: 0 });
  }
}
```
- اگر استراپی گفت «توکن باطل»، کوکی‌ها پاک می‌شوند تا کاربر دوباره وارد شود؛ نه اینکه
  در حلقهٔ خطا بماند.

### ۲-۳) سرور — `backend/src/api/teacher-students/controllers/teacher-students.ts`

```ts
const teacher = await resolveTeacherFromContext(ctx);
if (!teacher) {
  return ctx.throw(401, 'برای ساخت دانش‌آموز باید با حساب دبیر وارد شوید.');
}
```
- مسیر در `routes/teacher-students.ts` با `auth: false` تعریف شده تا خودمان خطای
  فارسی و کنترل‌شده بدهیم؛ اما نگهبانِ واقعی همین چند خط است.

`resolveTeacherFromContext` در `backend/src/utils/teacher-identity.ts`:
```ts
payload = await strapi.plugin('users-permissions').service('jwt').verify(token);
...
const user = await strapi.db.query(USER_UID).findOne({ where: { id: payload.id }, populate: ['role'] });
if (!user || user.blocked) return null;
if (user.role?.type !== TEACHER_ROLE_TYPE) return null;   // 'authenticated'
```
- خط اول: امضا و انقضای توکن را استراپی چک می‌کند (دستکاری ممکن نیست).
- خط آخر: **نقش** باید دبیر باشد؛ دانش‌آموز رد می‌شود (در تست ۴۰۱ گرفت).

```ts
const student = await createStudentAccount(strapi, {
  fullName: body.fullName,
  studentClass: body.studentClass,
  nationalCode: body.nationalCode,
  password: body.password,
});

strapi.log.info(`[teacher-students] ${teacher.username || teacher.email} دانش‌آموز ${student.nationalCode} را ساخت.`);

return ctx.send({ data: toStudentRow(student) });
```
- کنترلر فقط «چه کسی می‌خواهد بسازد» را چک می‌کند؛ همهٔ قواعد ساخت حساب در
  `createStudentAccount` است (فایل `backend/src/utils/student-account.ts`).
- چرا یک تابع جدا؟ چون قبلاً همین منطق در دو جا نوشته شده بود: پنل دبیر و مسیر
  «ثبت‌نام عمومی». آن مسیر حذف شد، اما تابع ماند تا اگر فردا قاعده‌ای عوض شود، فقط
  یک جا عوض شود و دبیر و بقیهٔ کد یک رفتار داشته باشند.

داخل `createStudentAccount`:
```ts
const { fullName, studentClass, nationalCode, password } = validateStudentInput(input);

const existing = await findUserByNationalCode(strapi, nationalCode);
if (existing) throw httpError(409, 'این کد ملی قبلاً ثبت شده است.');

const role = await getStudentRole(strapi);

const user = await strapi.plugin('users-permissions').service('user').add({
  username: nationalCode,
  email: studentEmail(nationalCode),   // <code>@student.helliquiz.local
  password,                            // پلاگین خودش bcrypt می‌کند
  provider: 'local',
  confirmed: true,
  blocked: false,
  role: role.id,                       // نقش Student
  fullName, studentClass, nationalCode,
});
```
`validateStudentInput` همان فایل:
```ts
if (fullName.length < 3) throw httpError(400, 'نام و نام خانوادگی باید دست‌کم ۳ نویسه باشد.');
if (!isValidNationalCode(nationalCode)) throw httpError(400, 'کد ملی باید دقیقاً ۱۰ رقم و معتبر باشد.');
if (password.length < MIN_PASSWORD_LENGTH) throw httpError(400, `رمز عبور باید دست‌کم ۸ نویسه باشد.`);
```
- `isValidNationalCode` هم طول/رقم‌بودن را چک می‌کند و هم کدهای همه‌رقمِ یکسان مثل
  `1111111111` را رد می‌کند:
```ts
export const isValidNationalCode = (value: string): boolean =>
  NATIONAL_CODE_PATTERN.test(value) && !/^(\d)\1{9}$/.test(value);
```
- `findUserByNationalCode` سه چیز را می‌گردد: `nationalCode`، `username`، `email`
  (چون هر سه از کد ملی ساخته می‌شوند) ⇒ اگر همان کد از مسیر دیگری هم ساخته شده باشد،
  ۴۰۹ برمی‌گردد و رکورد تکراری ساخته نمی‌شود.
- `password` را **هش نمی‌کنیم**؛ سرویس `user.add` خودش bcrypt می‌زند. اگر از قبل هش
  کنیم، دو بار هش می‌شود و ورود همیشه شکست می‌خورد.
- `email` واقعی نیست ولی یکتا لازم است (استراپی ایمیل تکراری را رد می‌کند).
- `confirmed: true` یعنی لازم نیست ایمیل تأیید شود.
- اگر دیتابیس خطای `unique` بدهد (مثلاً دو درخواست هم‌زمان)، `catch` همان ۴۰۹ را می‌دهد.

```ts
return ctx.send({ data: toStudentRow(student) });
```
- `toStudentRow` فقط فیلدهای امن را برمی‌گرداند (بدون `password`/`resetPasswordToken`).

### ۲-۴) ویرایش، مسدودسازی، حذف

```ts
if (body.blocked !== undefined) patch.blocked = Boolean(body.blocked);
if (body.password !== undefined && body.password !== '') patch.password = password;
```
- یک `PATCH` هم مشخصات، هم رمز، هم وضعیت مسدود را عوض می‌کند.

```ts
const updated = await strapi.plugin('users-permissions').service('user').edit(id, patch);
```
- `patch.password` هم اینجا خودکار هش می‌شود.

```ts
if (patch.nationalCode && user.nationalCode) {
  await moveSubmissionsToNewCode(user.nationalCode, String(patch.nationalCode));
}
```
- اگر کد ملی عوض شد، کارنامه‌های قبلی هم به کد جدید منتقل می‌شوند
  (`nationalCode` و `submissionKey` هر کارنامه به‌روز می‌شود) تا سابقه گم نشود.

```ts
await strapi.plugin('users-permissions').service('user').remove({ id });
```
- حذف حساب؛ **قبلش** کارنامه‌های همان کد ملی با `documents(...).delete` پاک می‌شوند،
  وگرنه داده‌ی یتیم می‌ماند.

---

## ۳) دانش‌آموز وارد می‌شود

### ۳-۱) `frontend/src/app/api/student/login/route.ts`

```ts
const nationalCode = typeof body?.nationalCode === "string" ? body.nationalCode.trim() : "";
if (!/^\d{10}$/.test(nationalCode) || password.length === 0) {
  return NextResponse.json({ error: { message: "کد ملی (۱۰ رقم) و رمز عبور را کامل وارد کنید." } }, { status: 400 });
}
```

```ts
const result = await signIn(nationalCode, password);
if (!result.ok) {
  return NextResponse.json({ error: { message: "کد ملی یا رمز عبور اشتباه است." } }, { status: result.status === 200 ? 401 : result.status });
}
```
- `signIn` در `frontend/src/lib/auth.ts` با `POST /api/auth/local` استراپی حرف می‌زند:
```ts
response = await fetch(`${STRAPI_INTERNAL_URL}/api/auth/local`, {
  method: "POST",
  body: JSON.stringify({ identifier, password }),
});
```
- برای دانش‌آموز، `identifier` همان **کد ملی** است، چون `username` او کد ملی گذاشته شده.

```ts
if (!user.nationalCode) {
  return NextResponse.json({ error: { message: "این حساب مربوط به دبیر است؛ از پنل دبیر وارد شوید." } }, { status: 403 });
}
```
- جلوی ورود حساب دبیر از فرم دانش‌آموزی را می‌گیرد (و برعکسش در `/api/teacher/login`).

```ts
const response = NextResponse.json({ student: profile });
response.cookies.set(STUDENT.access, token, accessCookieOptions);
response.cookies.set(STUDENT.user, JSON.stringify(profile), userCookieOptions);
if (refresh && sig) {
  response.cookies.set(STUDENT.refresh, refresh, refreshCookieOptions);
  response.cookies.set(STUDENT.sig, sig, refreshCookieOptions);
}
```
- چهار کوکی: توکن دسترسی، توکن تازه‌سازی + امضای آن، و پروفایلِ خوانا (برای نمایش نام).
- `accessCookieOptions` در `auth.ts`:
```ts
{ httpOnly: true, sameSite: "lax", path: "/", maxAge: 60*60*6, secure: IS_PRODUCTION }
```
- `httpOnly` ⇒ جاوااسکریپت نمی‌تواند بخواند (ضد XSS).
- `secure: IS_PRODUCTION` ⇒ روی HTTPS حتماً TLS لازم است، ولی روی `localhost` ساده کار می‌کند.

### ۳-۲) صفحهٔ `/student` — `frontend/src/lib/student-session.ts`

```ts
await connection();
```
- به Next می‌گوید «این تابع در زمان درخواست اجرا شود». بدون آن، Next سعی می‌کند صفحه را
  از پیش بسازد و به مقدارهای متغیر (کوکی/زمان) گیر می‌دهد.

```ts
let token = store.get(STUDENT.access)?.value;
if (!isTokenUsable(token)) {
  const rotated = await refreshAccessToken(store.get(STUDENT.refresh)?.value, store.get(STUDENT.sig)?.value);
  if (!rotated) return null;          // نشست تمام است ⇒ فرم ورود
  token = rotated.token;
}
```
- `isTokenUsable` داخلِ توکن را می‌خواند و `exp` را با ساعت الان مقایسه می‌کند
  (با ۵ ثانیه حاشیه برای اختلاف ساعت).

```ts
const response = await fetch(`${STRAPI_INTERNAL_URL}/api/student-auth/me`, {
  headers: { authorization: `Bearer ${token}` },
});
```
- از کوکی به هدر `Authorization` تبدیل می‌شود، چون APIهای استراپی هدر می‌خواهند.

### ۳-۳) `backend/src/api/submission/controllers/student-auth.ts`

```ts
payload = await strapi.plugin('users-permissions').service('jwt').verify(header.slice(7).trim());
const user = await strapi.db.query(USER_UID).findOne({ where: { id: payload?.id }, populate: ['role'] });
if (!user || user.blocked) return fail(ctx, 401, 'حساب کاربری در دسترس نیست.');
if (!user.nationalCode) return fail(ctx, 403, 'این حساب به یک دانش‌آموز متصل نیست.');
```
- ۴۰۱ = توکن بد/منقضی یا حساب مسدود، ۴۰۳ = حساب دبیر است نه دانش‌آموز.

```ts
const submissions = await strapi.documents('api::submission.submission').findMany({
  filters: { nationalCode: { $eq: user.nationalCode } },
  populate: { quiz: { fields: ['title', 'durationMinutes', 'documentId'] } },
  sort: ['createdAt:desc'],
});
```
- فیلتر با **کد ملیِ داخل توکن** است، نه با ورودی کاربر ⇒ کسی نمی‌تواند کارنامهٔ
  دیگری را بخواند.

```ts
return ctx.send({ student: {...}, attempts, stats: {...} });
```
- `attempts` همان `shapeSubmission`‌ها هستند: نمره، درصد، تعداد درست، مدت زمان و
  `details` (هر سؤال: متن، گزینه‌ها، انتخاب کاربر، پاسخ درست، درست/غلط).

### ۳-۴) ثبت‌نام برداشته شد

حالا فایل مسیرها فقط یک ردیف دارد:
```ts
export default {
  routes: [
    { method: 'GET', path: '/student-auth/me', handler: 'student-auth.me', config: { auth: false } },
  ],
};
```
- مسیر `POST /api/student-auth/register` پاک شد؛ تست: همان آدرس `405` می‌دهد.
- در فرانت هم `frontend/src/app/api/student/register/route.ts` حذف شد؛ تست: همان آدرس `404` می‌دهد.
- اکشن `register` از `controllers/student-auth.ts` هم برداشته شد؛ آن فایل حالا فقط
  توکن را می‌خواند، کاربر را از دیتابیس می‌آورد و کارنامه‌های همان کد ملی را برمی‌گرداند.
- تنها راهِ ساخت حساب، `POST /api/teacher-students` است (بخش ۲) که دبیر صدا می‌زند.
- **چرا؟** هر ثبت‌نامی که دبیر خبر نداشته باشد، یعنی یک حساب با صاحب نامعلوم. حالا هر
  حسابِ دانش‌آموزی حتماً یک دبیر پشتش است و همان دبیر رمزش را می‌داند.

در فرم ورود (`frontend/src/components/student/StudentAuth.tsx`) هم تبِ «ثبت‌نام» و
فیلدهای نام/کلاس برداشته شد؛ فقط دو خانه ماند: کد ملی و رمز.

---

## ۴) دانش‌آموز آزمون می‌دهد

مسیر آزمون سه لایه دارد: صفحهٔ آزمون (دروازهٔ ورود) → فرم شروع → ثبت کارنامه در سرور.

### ۴-۱) صفحهٔ آزمون، دو حالت دارد — `frontend/src/app/quiz/[id]/page.tsx`

```tsx
const [quiz, session] = await Promise.all([
  getQuizById(id).catch((error) => {
    console.error("Failed to load quiz:", error);
    return null;
  }),
  getStudentSession(),
]);

if (!quiz) notFound();

if (!session) {
  return <QuizLoginGate quizTitle={quiz.title} />;
}
```
- `getStudentSession()` نشستِ دانش‌آموز را از کوکی می‌خواند (بخش ۳-۲). اگر `null` بود،
  یعنی کسی وارد نشده ⇒ به‌جای آزمون، کارتِ ورود نشان داده می‌شود.
- نکتهٔ مهم: این تصمیم **سمت سرور** گرفته می‌شود، نه با جاوااسکریپت مرورگر. پس با
  دست‌کاری صفحه هم نمی‌شود از آن رد شد.
- اگر دانش‌آموز قبلاً در همین آزمون شرکت کرده باشد، `session.attempts` پیدا می‌شود و
  به‌جای فرم، کارنامهٔ قبلی نمایش داده می‌شود.

### ۴-۲) کارتِ ورود — `frontend/src/components/student/QuizLoginGate.tsx`

```tsx
const response = await fetch("/api/student/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ nationalCode, password }),
});
if (!response.ok) throw new Error(data?.error?.message || "...");
router.refresh();
```
- همان مسیر ورودِ پنل دانش‌آموز صدا زده می‌شود؛ پس یک رمز، یک رفتار.
- `router.refresh()` صفحه را از سرور دوباره می‌سازد؛ این بار کوکی هست، `session` پر
  می‌شود و به‌جای کارتِ ورود، فرم شروع می‌آید. هیچ ریدایرکتی لازم نیست.
- روی دکمه، تا وقتی کد ملی ۱۰ رقم و رمز ۸ نویسه نباشد، غیرفعال است.

### ۴-۳) فرم شروع — `frontend/src/components/QuizRunner.tsx`

```tsx
const { fullName: studentName, studentClass, nationalCode } = student;
```
- دیگر `useState` برای نام و کلاس و کد ملی نداریم؛ از propِ `student` می‌آید که
  صفحهٔ آزمون آن را از نشست پر کرده است.
- صفحهٔ شروع فقط مشخصات حساب + تعداد سؤال + مدت آزمون را نشان می‌دهد و یک دکمه:
  «شروع آزمون».

```tsx
body: JSON.stringify({
  timeSpentSeconds: Math.min(secondsElapsed, totalSeconds),
  answers,
}),
```
- به سرور فقط **پاسخ‌ها و زمان** می‌رود. نام و کد ملی نه؛ چون سرور خودش از توکن
  می‌خواند. این یعنی حتی اگر کسی بتواند این درخواست را دست‌کاری کند، هویتش عوض نمی‌شود.

### ۴-۴) هویت از حساب، نه از فرم — `backend/src/api/quiz/controllers/quiz.ts`

```ts
const account = await resolveStudentFromContext(ctx);

if (!account) {
  ctx.status = 401;
  ctx.body = {
    error: {
      status: 401,
      name: 'Unauthorized',
      message: 'برای شرکت در آزمون باید با کد ملی و رمز عبوری که دبیر داده است وارد شوید.',
    },
  };
  return;
}

const studentName = cleanText(account.fullName, 80);
const studentClass = cleanText(account.studentClass, 40);
const nationalCode = account.nationalCode;
```
- مسیر عمداً `auth: false` مانده تا خودمان بتوانیم خطای **فارسی** بدهیم؛ ولی نگهبانِ
  واقعی همان `if (!account)` است. بدون توکن، `401` برمی‌گردد (تست شد).
- نام و کلاس و کد ملی **فقط** از حساب خوانده می‌شوند؛ هیچ‌کدام از `body` خوانده
  نمی‌شود. پس کسی نمی‌تواند با کد ملی دیگری کارنامه بسازد.
- اگر حساب ناقص باشد (مثلاً دبیر کلاس را خالی گذاشته)، پیام روشن می‌دهیم:
  «کلاس/پایه در حساب شما ثبت نشده است؛ با دبیر خود تماس بگیرید.»

### ۴-۵) ضدتکرار

```ts
const quizKey = String(quiz.documentId || quiz.id);
const submissionKey = `${quizKey}:${nationalCode}`;

const previous = await strapi.db.query('api::submission.submission').findOne({ where: { submissionKey } });
if (previous) {
  ctx.status = 409;
  ctx.body = { error: { ... name: 'AlreadySubmitted' }, result: buildResultFromStoredSubmission(previous) };
  return;
}
```
- چک اول: اگر قبلاً ثبت شده، ۴۰۹ + **همان کارنامهٔ قبلی** برگردانده می‌شود تا دانش‌آموز
  نتیجه‌اش را ببیند (کاربر تجربهٔ بهتری دارد).

```ts
} catch (error: any) {
  if (String(error?.message || '').toLowerCase().includes('unique')) {
    ctx.status = 409;
    ...
```
- چک دوم: اگر دو درخواست هم‌زمان برسند و هر دو از چک اول رد شوند، **ایندکس یکتا** مانع
  رکورد دوم می‌شود و این `catch` دوباره ۴۰۹ می‌دهد ⇒ مسابقهٔ هم‌زمان هم بی‌خطر است.

### ۴-۶) تصحیح

```ts
const correctIndex = resolveCorrectIndex(question, options.length);
```
```ts
const rawSelected = pickAnswer(submittedAnswers, question, index);
```
```ts
const isCorrect = normalizedSelected !== null && correctIndex !== null && normalizedSelected === correctIndex;
```
- `resolveCorrectIndex` اول `correctOption` (صفر-بیس) را می‌خواند و اگر نبود، `correctAnswer`
  قدیمی (یک-بیس) را منهای یک می‌کند ⇒ دادهٔ قدیمی نمی‌شکند.
- `pickAnswer` پاسخ را با `documentId`، `id` یا ایندکس سؤال پیدا می‌کند.
- پاسخ خالی/خارج از محدوده `null` حساب می‌شود (بی‌پاسخ، نه غلط تصادفی).

```ts
const percentage = totalPossibleScore > 0 ? Math.round((earnedScore / totalPossibleScore) * 100) : 0;
```
- درصد از **مجموع بارم** حساب می‌شود، نه تعداد سؤال.

### ۴-۷) ذخیره

```ts
await strapi.documents('api::submission.submission').create({
  data: { studentName, studentClass, nationalCode, submissionKey, score: earnedScore, timeSpentSeconds,
          answers: { ...result, rawAnswers: submittedAnswers }, quiz: quizKey },
});
```
- همه‌چیز در یک رکورد: نمره، زمان، و `answers` که هم نتیجهٔ نهایی و هم پاسخ‌های خام را دارد.
- آزمون، سؤال و کارنامه عمداً `draftAndPublish: false` هستند
  (`content-types/{quiz,question,submission}/schema.json`)؛
  وگرنه استراپی برای هر کارنامه دو ردیف (پیش‌نویس + منتشر) می‌ساخت، ایندکس یکتا
  می‌شکست و داشبورد خالی می‌ماند.

---

## ۵) محدودیت نرخ — `backend/src/middlewares/rate-limit.ts`

```ts
const AUTH_PREFIXES = ['/api/auth/local'];
const SUBMIT_ROUTE = /^\/api\/quizzes\/[^/]+\/submit\/?$/;
```
```ts
if (AUTH_PREFIXES.some((prefix) => path.startsWith(prefix))) limiter = authLimiter;      // ۱۰ در دقیقه
else if (SUBMIT_ROUTE.test(path)) limiter = submitLimiter;                                // ۲۰ در دقیقه
else limiter = generalLimiter;                                                            // ۳۰۰ در دقیقه
```
```ts
const clientKey = (ctx: any) => {
  const forwarded = ctx.request.header['x-forwarded-for'];
  const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '') || ctx.request.ip || 'unknown';
  return `${ip}`;
};
```
- کلید محدودیت، IP واقعی کاربر است؛ پروکسی Next این هدر را منتقل می‌کند تا همهٔ
  کاربران یک مدرسه زیر یک IP حساب نشوند.

```ts
if (verdict.limited) {
  ctx.status = 429;
  ctx.body = { error: { status: 429, name: 'TooManyRequests', message: `... ${verdict.retryAfterSeconds} ثانیه دیگر ...` } };
  return;
}
```
- پاسخ ۴۲۹ با پیام فارسی و هدر `Retry-After`.

---

## ۶) پنل دبیر و پنل دانش‌آموز (فرانت)

### ۶-۱) `frontend/src/app/teacher/page.tsx`
- یک کامپوننت کلاینتِ بزرگ که اول از `/api/teacher/session` می‌پرسد «کسی وارد است؟»؛
  اگر ۲۰۰ بگیرد، تب‌ها را نشان می‌دهد، وگرنه فرم ورود.
- سه تب قبلی (کارنامه‌ها / آزمون‌ها / ساخت آزمون) + تب تازهٔ **دانش‌آموزان** که
  `<StudentManager />` را رندر می‌کند.

```tsx
const [subRes, quizRes] = await Promise.all([
  fetch(`${STRAPI_BASE_URL}/api/submissions?populate=*`, { cache: "no-store" }),
  fetch(`${STRAPI_BASE_URL}/api/quizzes?populate=*`, { cache: "no-store" }),
]);

if (!subRes.ok || !quizRes.ok) {
  if (subRes.status === 401 || quizRes.status === 401) handleLogout();
  throw new Error(await extractStrapiError(failed, 'خطا در برقراری ارتباط با سرور استراپی.'));
}
```
- `populate=*` یعنی «آزمون‌ها را با سؤال‌هایشان بیاور». این آدرس پارامترِ وضعیت ندارد،
  ولی استراپی به‌طور پیش‌فرض فقط «منتشرشده»ها را برمی‌گرداند؛ همین باعث می‌شد آزمون‌های
  پیش‌نویس در لیست نیایند (بخش ۷).
- در دکمه‌های ساخت و ویرایش آزمون هم `?status=published` نوشته شده بود؛ چون این پارامتر
  روی نوشتن اثری ندارد و فقط سردرگمی می‌ساخت، برداشته شد.
- `cache: "no-store"` یعنی همیشه نسخهٔ تازه از سرور؛ وگرنه دبیر آزمون تازه‌ساخته را
  نمی‌دید.
- پسوند آدرس‌ها عمداً بدون `/api` است (`/api/strapi/quizzes`). در تابع `authedFetch`
  هم `strapiPath()` هر `/api` اضافه‌ای را پاک می‌کند تا این اشتباه تکرار نشود.
- `handleLogout()` وقتی صدا زده می‌شود که سرور `401` بدهد؛ یعنی نشست دبیر منقضی شده و
  باید دوباره وارد شود.
- اگر سرور خطا بدهد، پیامش بالای صفحه در یک کادر قرمز می‌آید و لیست خالی می‌ماند؛ پس
  «خالی بودن لیست» همیشه یعنی «داده نیست» نیست — پیام خطا را هم باید خواند.

```tsx
{quizzes.length === 0 && (
  <div className="card ...">
    <p>هنوز آزمونی ساخته نشده است</p>
    <p>از دکمهٔ «آزمون جدید» شروع کنید؛ آزمون‌هایی که در پنل استراپی می‌سازید هم همین‌جا نمایش داده می‌شوند.</p>
  </div>
)}
```
- این پیام برای این گذاشته شد که دبیر بداند «صفر آزمون» یعنی واقعاً آزمونی ساخته نشده،
  نه اینکه سامانه خراب است.
- کارت هر آزمون آمارش را از همان رکورد می‌خواند: `documentId`، `title`، `durationMinutes`،
  `questions` و لینک «شرکت در آزمون» که به `/quiz/<documentId>` می‌رود.

### ۶-۲) `frontend/src/components/teacher/StudentManager.tsx`
- `load()` فهرست را از `GET /api/strapi/teacher-students` می‌گیرد و تعداد را به تب می‌دهد.
- `handleSubmit()` ساخت/ویرایش را انجام می‌دهد (بخش ۲-۱).
- `toggleBlock()` فقط `{ blocked: !student.blocked }` می‌فرستد.
- `removeStudent()` بعد از تأیید، `DELETE` می‌زند (کارنامه‌ها هم پاک می‌شوند).
- `created` کارت «کد ملی + رمز» را نگه می‌دارد تا دبیر کپی کند و به دانش‌آموز بدهد.

### ۶-۳) `frontend/src/components/student/StudentDashboard.tsx`
- ورودی‌اش `session` است که در سرور با `getStudentSession()` ساخته شده.
- بالای صفحه: کارت‌های آمار (تعداد آزمون، میانگین، بهترین درصد).
- هر ردیف: عنوان آزمون، درصد، نمره، زمان؛ با باز کردن ردیف، `details` هر سؤال
  (درست/غلط/بی‌پاسخ + پاسخ درست) نمایش داده می‌شود؛ فرمول‌های ریاضی با `<MathRenderer />`.

---

## ۷) پیش‌نویس و انتشار — چرا برداشته شد

استراپی به‌طور پیش‌فرض برای هر محتوا دو حالت دارد: **پیش‌نویس** و **منتشرشده**. تا وقتی
یک رکورد منتشر نشود، Content API آن را برنمی‌گرداند. همین باعث شد شش آزمون در `/admin`
دیده شوند و در پنل دبیر نه.

```json
"options": {
  "draftAndPublish": false
}
```
- این خط در `backend/src/api/quiz/content-types/quiz/schema.json` و
  `.../question/content-types/question/schema.json` از `true` به `false` تغییر کرد.
- نتیجه: هیچ آزمون/سؤالی حالت پیش‌نویس ندارد؛ هر رکوردی که ذخیره شود همان لحظه در
  `GET /api/quizzes` و `/api/quiz-public` هست. (کارنامه‌ها از قبل همین‌طور بودند.)
- نکتهٔ مهم: تغییر این گزینه با ری‌استارت استراپی اعمال می‌شود؛ در لاگ بوت هم پیام
  `[publish-backfill] ...` می‌آید (بخش ۱-۵).

```ts
// قبل
findOne({ documentId: identifier, status: 'published', populate: ['questions'] })
// بعد
findOne({ documentId: identifier, populate: ['questions'] })
```
- همهٔ `status: 'published'`ها از `quiz.ts`، `quiz-public.ts` و `index.ts` برداشته شد؛
  چون نوعِ محتوا دیگر چنین حالتی ندارد و گذاشتنش فقط سردرگمی می‌سازد.
- اگر جایی این فیلتر می‌ماند، رکوردهای قدیمی که `published_at` خالی دارند باز هم
  پنهان می‌شدند.

```ts
// quiz-public.ts
const quizQuestions = sortQuestions((quiz.questions || []).filter(Boolean));
```
- قبلاً سؤال‌ها هم با `question?.publishedAt` فیلتر می‌شدند؛ آن هم برداشته شد تا
  سؤالِ تازه‌ساخته بلافاصله در آزمون دیده شود.

> اگر روزی خواستیم دوباره «پیش‌نویس» داشته باشیم، فقط کافی است همین دو فایل schema را
> به `true` برگردانیم و فیلتر `status` را برگردانیم — ولی آن‌وقت باید در پنل دبیر یک
> دکمهٔ «انتشار» و در لیست، نشانِ «پیش‌نویس» بگذاریم. الان عمداً ساده است.

---

## ۸) فهرست فایل‌های کلیدی

| فایل | نقش |
| --- | --- |
| `backend/src/index.ts` | نقش‌ها، مجوزها، نقش پیش‌فرض، ایندکس یکتا، انتشار پیش‌نویس‌های قدیمی، دادهٔ نمونه |
| `backend/src/utils/student-account.ts` | اعتبارسنجی و ساخت حساب دانش‌آموز (یک منبع برای همه) |
| `backend/src/utils/teacher-identity.ts` | تشخیص دبیر از توکن (نقش `Authenticated`) |
| `backend/src/utils/student-identity.ts` | تشخیص دانش‌آموز از توکن (برای ثبت کارنامه) |
| `backend/src/api/teacher-students/*` | CRUD دانش‌آموز توسط دبیر |
| `backend/src/api/submission/controllers/student-auth.ts` | `me` — پروفایل و کارنامه‌های خودِ دانش‌آموز |
| `backend/src/api/quiz/controllers/quiz.ts` | هویت از توکن، تصحیح، ضدتکرار، ذخیرهٔ کارنامه |
| `backend/src/api/quiz/controllers/quiz-public.ts` | فهرست و تک‌آزمون برای صفحهٔ سایت (بدون پاسخ درست) |
| `backend/src/api/{quiz,question}/content-types/*/schema.json` | `draftAndPublish: false` — بدون حالت پیش‌نویس |
| `backend/src/middlewares/rate-limit.ts` | سقف درخواست |
| `backend/src/extensions/users-permissions/content-types/user/schema.json` | فیلدهای دانش‌آموز روی کاربر استراپی |
| `frontend/src/lib/auth.ts` | کوکی‌ها، توکن، ورود، تمدید |
| `frontend/src/lib/student-session.ts` | خواندن نشست دانش‌آموز در سرور |
| `frontend/src/app/api/strapi/[...path]/route.ts` | پروکسی امن به استراپی |
| `frontend/src/app/api/{student,teacher}/*` | ورود/خروج هر نقش (ثبت‌نام وجود ندارد) |
| `frontend/src/components/teacher/StudentManager.tsx` | تب مدیریت دانش‌آموزان |
| `frontend/src/components/student/StudentAuth.tsx` | فرم ورود دانش‌آموز (بدون ثبت‌نام) |
| `frontend/src/components/QuizRunner.tsx` | شروع آزمون، تایمر، ارسال پاسخ‌ها |
| `frontend/src/components/student/StudentDashboard.tsx` | کارنامه‌ها و پاسخ‌نامهٔ تفکیکی |
| `frontend/src/app/not-found.tsx` · `frontend/src/app/error.tsx` | صفحهٔ ۴۰۴ و صفحهٔ خطا |
| `frontend/src/components/student/QuizLoginGate.tsx` | دروازهٔ ورود پیش از شروع آزمون (بدون حساب، آزمون شروع نمی‌شود) |
