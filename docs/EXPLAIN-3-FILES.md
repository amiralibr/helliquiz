# سه فایل مهم، خط‌به‌خط — به زبان ساده

این فایل مکمل [`CODE-TOUR.md`](CODE-TOUR.md) است، ولی فقط سه فایل را با جزئیات و
به زبان عامیانه توضیح می‌دهد:

1. `backend/src/index.ts` — «خانه‌تکانی» سرور، هر بار که استراپی بالا می‌آید
2. `frontend/src/app/teacher/page.tsx` — تمام پنل دبیر (بزرگ‌ترین فایل پروژه)
3. `backend/src/api/submission/*` — فایل `submission.ts` راه‌ها، سرویس و کنترلر کارنامه‌ها

> اصطلاح‌های کوچک که در متن زیاد می‌بینی:
> **تابع (function)** = یک دستور آماده که کاری انجام می‌دهد.
> **state** = حافظهٔ صفحه؛ چیزی که اگر عوض شود، صفحه دوباره رسم می‌شود.
> **`await`** = «صبر کن تا این کار تمام شود، بعد برو خط بعد».
> **`fetch`** = درخواست فرستادن به سرور.
> **`try / catch`** = تورِ نجات؛ خطا داخل `try` بیفتد، در `catch` می‌گیریمش تا برنامه نمیرد.
> **JSON** = بستهٔ استاندارد داده بین مرورگر و سرور (`{ "data": ... }`).

## این سه فایل چطور به هم وصل می‌شوند؟

```
مرورگر:  teacher/page.tsx
              │  (درخواست به /api/strapi/...)
              ▼
        پروکسی Next  ────►  استراپی
                              ├── controllers/submission.ts   ← کارنامه‌ها
                              └── (و در بوت) index.ts          ← نقش‌ها، مجوزها، ایندکس، پیش‌نویس‌ها
```

یعنی: `index.ts` موقع بالا آمدن، «قوانین زمین» را می‌چیند. پنل دبیر (`page.tsx`) با
آن قوانین حرف می‌زند. کارنامه‌ها هم از در `controllers/submission.ts` رد می‌شوند.

---

# فایل ۱ — `backend/src/index.ts` (۳۷۳ خط)

این فایل، اسکریپت راه‌اندازی استراپی است. هر بار `npm run develop` می‌زنی، استراپی این
فایل را **یک بار** اجرا می‌کند و بعد سرور بالا می‌آید. کارش این است که چیزهایی که باید
همیشه باشند (نقش‌ها، مجوزها، ایندکس یکتا) را بسازد؛ اگر از قبل باشند، دست به آن‌ها نمی‌زند.

## خط ۱ تا ۱۰ — اعلام و توضیح

```ts
import type { Core } from '@strapi/strapi';
```
- `Core` فقط برای «تایپ» است (می‌گوید `strapi` چه شکلی است)؛ در خروجی برنامه هیچ اثری ندارد.

```ts
 *   - Authenticated → دبیران (دسترسی کامل به آزمون‌ها، سؤال‌ها و کارنامه‌ها)
 *   - Student       → دانش‌آموزان (بدون مجوز محتوایی؛ کارنامه‌شان را فقط از
 *                     مسیر /api/student-auth/me می‌گیرند)
```
- همین دو خط، فلسفهٔ کل سامانه است: دبیر «همه‌چیز» را می‌بیند، دانش‌آموز «فقط کارنامهٔ خودش».

## خط ۱۲ تا ۱۴ — سه ثابت کوچک

```ts
const USER_UID = 'plugin::users-permissions.user';
const STUDENT_ROLE_TYPE = 'student';
const STUDENT_EMAIL_DOMAIN = 'student.helliquiz.local';
```
- `USER_UID` = آدرس جدول کاربران استراپی. هر جا کاربر می‌سازیم یا می‌خوانیم، از این
  استفاده می‌کنیم تا اگر یک روز اسمش عوض شد، فقط یک جا عوض شود.
- `STUDENT_ROLE_TYPE` = تیکهٔ انگلیسیِ نقش دانش‌آموز؛ چیزی که در کد نوشته می‌شود (اسم نمایشی «Student» است).
- `STUDENT_EMAIL_DOMAIN` = استراپی ایمیل اجباری می‌خواهد ولی دانش‌آموز ایمیل ندارد؛
  پس از کد ملی یک ایمیل قلابی می‌سازیم: `0012345678@student.helliquiz.local`.

## خط ۱۶ — مجوزهای مهمان

```ts
const PUBLIC_ACTIONS = ['api::quiz.quiz.find', 'api::quiz.quiz.findOne'];
```
- به نقش `Public` (کسی که وارد نشده) فقط اجازهٔ «دیدن فهرست آزمون‌ها» می‌دهیم.
- `find` = لیست، `findOne` = یک آزمون. نه ساختن، نه حذف، نه دیدن کارنامه‌ها.
- اگر این خط نبود، صفحهٔ اول سایت (که آزمون‌ها را نشان می‌دهد) برای مهمان خالی می‌شد.

## خط ۱۸ تا ۳۴ — مجوزهای دبیر

```ts
const AUTHENTICATED_ACTIONS = [
  'api::quiz.quiz.find', ... 'api::quiz.quiz.delete',
  'api::question.question.find', ... 'api::question.question.delete',
  'api::submission.submission.find', ... 'api::submission.submission.delete',
];
```
- ۱۵ خط، پنج عمل (`find/findOne/create/update/delete`) برای سه چیز: آزمون، سؤال، کارنامه.
- این یعنی دبیر می‌تواند همهٔ این‌ها را بسازد و پاک کند — همان چیزی که در پنلش می‌بیند.
- **نکتهٔ مهم:** نقش `Student` عمداً در هیچ‌کدام نیست. دانش‌آموز از این درها هیچ کاری
  نمی‌تواند بکند؛ فقط از مسیر اختصاصی `student-auth/me` کارنامهٔ خودش را می‌خواند.

## خط ۳۶ تا ۴۹ — `ensureRole` («نقش را بساز، اگر نیست»)

```ts
let role = await strapi.db.query('plugin::users-permissions.role').findOne({ where: { type } });
if (!role) {
  role = await strapi.db.query('plugin::users-permissions.role').create({ data: { name, description, type } });
  strapi.log.info(`[bootstrap] نقش «${name}» ساخته شد.`);
}
return role;
```
- اول می‌گردد؛ اگر پیدا نکرد، می‌سازد. اگر بود، دست نمی‌زند.
- **چرا مهم است؟** چون این تابع هر بوت اجرا می‌شود؛ اگر بدون چک می‌ساخت، بعد از ده بار
  بوت ده نقش تکراری «Student» داشتیم.
- سه نقش ساخته می‌شود: `Public`، `Authenticated` (دبیر) و `student` (دانش‌آموز).

## خط ۵۱ تا ۶۳ — `ensureRolePermissions` («مجوز را بچسبان، اگر نیست»)

```ts
for (const action of actions) {
  const existing = await strapi.db.query('plugin::users-permissions.permission')
    .findOne({ where: { action, role: { id: roleId } } });
  if (!existing) {
    await strapi.db.query('plugin::users-permissions.permission').create({ data: { action, role: roleId } });
  }
}
```
- برای هر مجوز: «آیا این نقش این اجازه را دارد؟» اگر نه، اضافه می‌کند.
- همین چیز در پنل ادمین زیر Settings → Users & Permissions دیده می‌شود؛ ما فقط خودکار
  انجامش می‌دهیم تا نصب تازه بدون کلیک‌کردن هم کار کند.
- این تابع هم «فقط اضافه می‌کند»؛ چیزی را پس نمی‌گیرد. اگر دستی مجوزی را از نقشی
  بگیری و بوت کنی، دوباره برمی‌گردد (چون در همین لیست است).

## خط ۶۵ تا ۷۳ — نقش پیش‌فرض ثبت‌نام

```ts
const current = ((await store.get()) || {}) as Record<string, unknown>;
if (current.default_role === roleId) return;
await store.set({ value: { ...current, default_role: roleId } });
```
- «تنظیمات پیشرفتهٔ» پلاگین users-permissions را می‌خواند و `default_role` را روی
  دانش‌آموز می‌گذارد.
- یعنی اگر کسی (مثلاً از ابزار استراپی) کاربر بسازد، خودبه‌خود **دانش‌آموز** می‌شود، نه دبیر.
- خودِ سامانه دیگر ثبت‌نام عمومی ندارد؛ این فقط تورِ ایمنی برای حالت‌های جانبی است.

## خط ۷۹ تا ۱۲۷ — آزمون‌های نمونه

```ts
const DEMO_QUIZZES = [
  { title: 'آزمون آزمایشی ریاضی — عبارت‌های جبری', ... questions: [ ... ] },
  { title: 'آزمون فیزیک — حرکت و سرعت', ... },
];
```
- فقط دادهٔ نمایشی است؛ دو آزمون با چند سؤال. در `correctOption` عدد **از صفر** شمرده
  می‌شود: `0` یعنی گزینهٔ اول، `1` یعنی دوم.
- این داده فقط وقتی استفاده می‌شود که `SEED_DEMO=true` باشد (خط ۳۶۴).

## خط ۱۲۹ تا ۱۴۸ — `seedTeacher`

```ts
const email = process.env.SEED_TEACHER_EMAIL || 'teacher@helli.ir';
const existing = await strapi.db.query(USER_UID).findOne({ where: { email } });
if (existing) return;
await strapi.plugin('users-permissions').service('user').add({ ... role: teacherRoleId });
```
- ایمیل و رمز از `.env` خوانده می‌شود؛ اگر نبود، مقدار پیش‌فرض.
- اگر چنین دبیری از قبل هست، هیچ کاری نمی‌کند (پس رمز عوض نمی‌شود).
- `service('user').add` رمز را خودش هش می‌کند؛ ما رمز خام می‌دهیم.

## خط ۱۵۰ تا ۱۷۸ — `seedQuizzes`

```ts
const quizCount = await strapi.documents('api::quiz.quiz').count({});
if (quizCount > 0) return;
```
- «اگر حتی یک آزمون وجود دارد، هیچ‌چیز نساز.» یعنی آزمون‌های واقعی تو دست‌نخورده می‌مانند.
- بعد برای هر آزمون نمونه: خودِ آزمون را می‌سازد، بعد سؤال‌هایش را یکی‌یکی با
  `quiz: quiz.documentId` به آن وصل می‌کند.
- `documents(...)` همان API رسمی استراپی ۵ است (جای `entityService` قدیمی).

## خط ۱۸۰ تا ۲۶۵ — `seedStudent`

```ts
const nationalCode = process.env.SEED_STUDENT_NATIONAL_CODE || '0012345678';
const existing = await strapi.db.query(USER_UID).findOne({ where: { nationalCode } });
```
- یک دانش‌آموز نمونه می‌سازد: کد ملی، کلاس «نهم ۱»، نقش Student.
- بعد یک **کارنامهٔ نمونه** می‌سازد تا پنل دانش‌آموز خالی نباشد:

```ts
const submissionKey = `${quizKey}:${nationalCode}`;
const alreadySubmitted = await strapi.db.query('api::submission.submission').findOne({ where: { submissionKey } });
if (alreadySubmitted) return;
```
- `submissionKey` = «شناسهٔ آزمون + دو نقطه + کد ملی». این کلید، اثر انگشتِ یکتای هر
  کارنامه است؛ ما با آن می‌فهمیم «این دانش‌آموز قبلاً در این آزمون شرکت کرده یا نه».
- `if (alreadySubmitted) return;` مانع می‌شود هر بوت یک کارنامهٔ تکراری بسازد.

```ts
const selected = index === 1 ? (correct + 1) % Math.max(options.length, 1) : correct;
```
- در کارنامهٔ نمونه، سؤال اول و سوم درست و سؤال دوم عمداً غلط پاسخ داده شده (چون `+1`
  می‌شود گزینهٔ بعدی). این‌طوری پاسخ‌نامهٔ تفکیکی در پنل، هم درست دارد هم غلط.

```ts
score = details.filter((item) => item.isCorrect).reduce((sum, item) => sum + item.weight, 0);
```
- نمره = جمعِ «وزن» سؤال‌هایی که درست پاسخ داده شده‌اند. وزن هر سؤال همان `score` سؤال است.

## خط ۲۷۵ تا ۳۱۱ — ایندکس یکتای کارنامه‌ها

```ts
const knex = strapi.db.connection;
```
- `knex` = ابزار دسترسی مستقیم به دیتابیس. وقتی API استراپی کافی نباشد، با SQL خام کار می‌کنیم.

```ts
const hasTable = await knex.schema.hasTable(table);
if (!hasTable) return;
```
- اگر جدول `submissions` هنوز ساخته نشده (نصب تازه)، بی‌صدا برمی‌گردیم؛ خطا نمی‌دهیم.

```ts
await knex.raw(`DELETE FROM ${table} WHERE id NOT IN (SELECT MIN(id) FROM ${table} GROUP BY submission_key)`);
```
- اگر از نسخه‌های قدیمی کارنامه‌های تکراری مانده، همه را حذف می‌کند و فقط **قدیمی‌ترین**
  (`MIN(id)`) هر کلید را نگه می‌دارد.
- **چرا؟** چون قدم بعد، ساختن «ایندکس یکتا» است و اگر دادهٔ تکراری باشد، ساختِ ایندکس
  شکست می‌خورد.

```ts
if (client.includes('sqlite') ...) {
  await knex.raw(`CREATE UNIQUE INDEX IF NOT EXISTS submissions_key_unique ON ${table} (submission_key)`);
} else { /* MySQL: ALTER TABLE ... ADD UNIQUE INDEX ... */ }
```
- روی SQLite و PostgreSQL: `IF NOT EXISTS` یعنی هر بوت بی‌خطر است.
- روی MySQL (که این دستور را ندارد) اول در `information_schema` می‌گردیم، بعد اضافه می‌کنیم.
- **نتیجهٔ عملی:** حتی اگر دو نفر در یک لحظه دکمهٔ «ثبت» را بزنند، دیتابیس دومی را رد
  می‌کند. این تنها جایی است که «هم‌زمانی» را واقعاً می‌بندد.

## خط ۳۱۹ تا ۳۴۰ — `publishLegacyQuizzes` (تازه)

```ts
for (const table of ['quizzes', 'questions']) {
  const updated = await knex(table)
    .whereNull('published_at')
    .update({ published_at: knex.fn.now() });
}
```
- استراپی برای هر محتوا ستونی دارد به اسم `published_at`؛ خالی‌بودنش یعنی «پیش‌نویس».
- این تابع هر ردیفی که تاریخ انتشار ندارد را «منتشرشده» می‌کند؛ یعنی همان ۶ آزمونی که
  در `/admin` دیده می‌شدند ولی در پنل دبیر نه.
- سؤال‌ها را هم می‌گیرد؛ چون سؤالِ پیش‌نویس داخل آزمون هم نمایش داده نمی‌شد.
- `try/catch` دارد تا اگر یک جدول مشکل داشت، بالا آمدن استراپی متوقف نشود.
- در لاگ، این پیام را می‌بینی: `[publish-backfill] 6 رکورد در «quizzes» ...`

## خط ۳۴۳ تا ۳۴۵ — خروجی فایل

```ts
export default {
  register() {},
```
- `register()` عمداً خالی است؛ استراپی این قلاب را قبل از بوت صدا می‌زند. کاری برای انجام
  دادن نداریم، ولی بودنش لازم است چون استراپی این ساختار را انتظار دارد.

## خط ۳۴۷ تا ۳۷۲ — `bootstrap` (قلب فایل)

```ts
async bootstrap({ strapi }: { strapi: Core.Strapi }) {
  try {
```
- `bootstrap` بعد از بالا آمدن کامل استراپی اجرا می‌شود؛ یعنی دیتابیس آماده است.

```ts
const publicRole  = await ensureRole(strapi, 'public', 'Public', 'عمومی');
const teacherRole = await ensureRole(strapi, 'authenticated', 'Authenticated', 'دبیران');
const studentRole = await ensureRole(strapi, STUDENT_ROLE_TYPE, 'Student', '...');
```
- سه نقش را می‌سازد/پیدا می‌کند. `public` و `authenticated` از خود استراپی هستند.

```ts
await ensureRolePermissions(strapi, publicRole.id, PUBLIC_ACTIONS);
await ensureRolePermissions(strapi, teacherRole.id, AUTHENTICATED_ACTIONS);
await setDefaultRegistrationRole(strapi, studentRole.id);
await ensureUniqueSubmissionIndex(strapi);
await publishLegacyQuizzes(strapi);
```
- ترتیب مهم است: اول نقش‌ها، بعد مجوزهایشان، بعد تنظیم نقش پیش‌فرض، بعد ایندکس دیتابیس،
  بعد انتشار پیش‌نویس‌های قدیمی.

```ts
if (process.env.SEED_DEMO !== 'true') return;
```
- **دروازهٔ محیط واقعی.** هر چیزی جز `true` (حتی نبودنِ مقدار) یعنی «هیچ دادهٔ نمونه‌ای نساز».
- در `.env.example` این مقدار `false` است؛ پس در مدرسه هیچ حساب و آزمون نمایشی ساخته نمی‌شود.

```ts
await seedTeacher(strapi, teacherRole.id);
await seedQuizzes(strapi);
await seedStudent(strapi, studentRole.id);
} catch (error) {
  strapi.log.error('راه‌اندازی اولیه ... ناموفق بود:', error);
}
```
- سه تابع نمونه‌سازی، پشتِ همان دروازه.
- `catch` بیرونی باعث می‌شود اگر مثلاً دیتابیس قفل بود، استراپی با پیام روشن بالا بیاید
  (و لاگ کند) به‌جای اینکه کرش کند.

**خلاصهٔ فایل ۱ در یک جمله:** «هر بوت، نقش‌ها و مجوزها را می‌سازد، کارنامه‌های تکراری را
جمع می‌کند، ایندکس یکتا می‌گذارد، پیش‌نویس‌های قدیمی را منتشر می‌کند و اگر خواسته باشی،
دادهٔ نمایشی می‌سازد.»

---

# فایل ۲ — `frontend/src/app/teacher/page.tsx` (۱۹۹۳ خط)

این بزرگ‌ترین فایل پروژه است و **همهٔ پنل دبیر** در آن است: ورود، چهار تب، سه مودال.
عمداً یکجا مانده و به اجزای کوچک نشکسته؛ برای همین اول نقشه‌اش را می‌بینیم، بعد
تکه‌تکه می‌خوانیم.

## نقشهٔ فایل (این جدول را موقع خواندن کنار دستت داشته باش)

| خط‌ها | چه چیزی |
| --- | --- |
| ۱–۳۱ | `import`ها: React، Next، آیکون‌ها، `MathRenderer`، `StudentManager` |
| ۳۳–۵۸ | تایپ‌ها: `QuestionDetail` و `SubmissionItem` (شکل هر کارنامه در پنل) |
| ۶۰–۸۲ | تایپ‌ها: `QuestionItem`، `QuizItem`، `TeacherUser` |
| ۸۴–۹۶ | `resolveCorrectOption` — خواندن پاسخ صحیح از داده‌های قدیمی و جدید |
| ۹۸–۱۰۰ | `getErrorMessage` — از خطا، یک پیام فارسی بیرون می‌کشد |
| ۱۰۲–۱۱۰ | ثابت‌ها: آدرس پروکسی و سه آدرس ورود/نشست/خروج |
| ۱۱۲–۱۹۳ | `useState`ها (حافظهٔ صفحه) در ۶ گروه |
| ۱۹۵–۲۲۰ | `useEffect` اول: «آیا دبیر وارد است؟» |
| ۲۲۲–۲۵۵ | `handleLogin` — ورود |
| ۲۵۷–۲۶۴ | `handleLogout` — خروج |
| ۲۶۶–۲۷۸ | `extractStrapiError` — پیام خطای استراپی + کد وضعیت |
| ۲۸۰–۲۹۲ | `strapiPath` و `authedFetch` — درخواست‌های دبیر به پروکسی |
| ۲۹۴–۳۳۲ | `createQuestionsForQuiz` — ثبت سؤال‌ها بعد از ساخت آزمون |
| ۳۳۴–۳۳۷ | `toggleRow` — باز/بسته‌کردن ردیف پاسخ‌نامه |
| ۳۳۹–۴۵۴ | `fetchData` — گرفتن کارنامه‌ها و آزمون‌ها و مرتب‌کردنشان |
| ۴۵۶–۴۶۲ | `useEffect` دوم: بعد از ورود، یک بار `fetchData` |
| ۴۶۴–۵۴۷ | حذف/ویرایش/ذخیرهٔ کارنامه |
| ۵۴۹–۶۳۲ | حذف و ویرایش آزمون |
| ۶۳۴–۷۳۵ | حذف، ویرایش و افزودن سؤال |
| ۷۳۷–۸۴۴ | ساخت آزمون جدید (+ تلاش مجدد برای سؤال‌های ناموفق) |
| ۸۴۶–۸۵۵ | `filteredSubmissions` — جست‌وجو |
| ۸۵۷–۸۶۳ | `formatTime` — ثانیه به «دقیقه و ثانیه» |
| ۸۶۵–۸۷۲ | صفحهٔ «در حال بارگذاری» |
| ۸۷۴–۹۶۴ | صفحهٔ ورود دبیر |
| ۹۶۶–۱۹۹۳ | بدنهٔ پنل: هدر، تب‌ها، محتوای چهار تب، سه مودال |

## خط ۱ تا ۳۱ — کتابخانه‌ها

```tsx
"use client";
```
- خط اول و مهم‌ترین خط: می‌گوید این فایل در **مرورگر** اجرا می‌شود (نه روی سرور). برای
  همین می‌تواند دکمه و فرم و `useState` داشته باشد. بدون این خط، Next اجازهٔ `useState` نمی‌داد.
- بقیهٔ خط‌ها آیکون‌ها هستند (`Users`, `Trash2`, `Save`, `KeyRound` …) و دو کامپوننت:
  `MathRenderer` (نمایش فرمول ریاضی) و `StudentManager` (تب دانش‌آموزان، فایل جدا).

## خط ۳۳ تا ۵۸ — شکل داده

```tsx
interface SubmissionItem {
  studentName: string; studentClass: string; nationalCode: string;
  score: number; percentage: number; correctCount: number; totalQuestions: number;
  details: QuestionDetail[];
}
```
- `interface` یعنی «قرار است شیء این شکل باشد». در مرورگر اثری ندارد، ولی اگر اسم فیلدی
  را غلط بنویسی، ادیتور همان‌جا خط قرمز می‌کشد.

## خط ۸۴ تا ۹۶ — `resolveCorrectOption`

```tsx
const modern = Number(question?.correctOption);
if (Number.isInteger(modern) && modern >= 0) return modern;
const legacy = Number(question?.correctAnswer);
return legacy >= 1 ? legacy - 1 : legacy;
```
- سؤال‌های جدید پاسخ صحیح را در `correctOption` (از صفر) نگه می‌دارند.
- سؤال‌های خیلی قدیمی `correctAnswer` (از یک) داشتند؛ این تابع نسخهٔ قدیمی را یک واحد
  کم می‌کند تا هر دو یک‌شکل شوند.
- **چرا مهم است؟** اگر این تبدیل نبود، در سؤال‌های قدیمی به‌جای گزینهٔ دوم، گزینهٔ سوم
  به‌عنوان پاسخ درست نشان داده می‌شد و نمرهٔ بچه‌ها اشتباه می‌شد.

## خط ۱۰۲ تا ۱۱۰ — آدرس‌ها

```tsx
const STRAPI_BASE_URL = "/api/strapi";
const TEACHER_SESSION_ENDPOINT = "/api/teacher/session";
const TEACHER_LOGIN_ENDPOINT = "/api/teacher/login";
const TEACHER_LOGOUT_ENDPOINT = "/api/teacher/logout";
```
- `STRAPI_BASE_URL` = درِ پشتیِ سایت به استراپی (همان پروکسی).
- سه آدرس دیگر، مسیرهای خودِ Next هستند: «کسی وارد است؟»، «وارد کن»، «بیرون کن».
- **چرا آدرس نسبی؟** چون آدرس نسبی هم روی `localhost` کار می‌کند، هم روی سرور واقعی،
  هم داخل پیش‌نمایش؛ و هیچ‌وقت به CORS گیر نمی‌کند.

## خط ۱۱۲ تا ۱۹۳ — حافظهٔ صفحه (`useState`)

```tsx
const [authenticated, setAuthenticated] = useState(false);
const [teacherUser, setTeacherUser] = useState<TeacherUser | null>(null);
const [authLoading, setAuthLoading] = useState(true);
```
- سه state ورود: «وارد است؟»، «چه کسی»، «هنوز داریم چک می‌کنیم؟».
- `authLoading` اول `true` است تا صفحه اول یک اسپینر نشان دهد و بعد تصمیم بگیرد؛
  وگرنه یک لحظه فرم ورود چشمک می‌زد.

```tsx
const [loginIdentifier, setLoginIdentifier] = useState("");
const [loginPassword, setLoginPassword] = useState("");
const [loginError, setLoginError] = useState<string | null>(null);
const [loggingIn, setLoggingIn] = useState(false);
```
- چهار state فرم ورود: نام کاربری، رمز، پیام خطا، «در حال ورود».

```tsx
const [activeTab, setActiveTab] = useState<"results"|"students"|"quizzes"|"create">("results");
const [studentCount, setStudentCount] = useState(0);
```
- کدام تب باز است (پیش‌فرض: کارنامه‌ها) و تعداد دانش‌آموزان برای برچسب تب.

```tsx
const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [successMsg, setSuccessMsg] = useState("");
const [searchQuery, setSearchQuery] = useState("");
const [expandedRowId, setExpandedRowId] = useState<string | number | null>(null);
const [actionId, setActionId] = useState<string | null>(null);
```
- **داده‌های اصلی پنل**: کارنامه‌ها و آزمون‌ها. هر دو همین‌جا زندگی می‌کنند؛ همهٔ تب‌ها از
  همین دو آرایه می‌خوانند.
- `error` و `successMsg` = نوار قرمز و نوار سبز بالای پنل.
- `searchQuery` = متن جست‌وجو.
- `expandedRowId` = کدام ردیف کارنامه باز شده (برای دیدن پاسخ‌نامهٔ تفکیکی).
- `actionId` = «کدام دکمه الان در حال کار است»؛ با آن دکمه را غیرفعال و اسپینر می‌کنیم
  تا کاربر دو بار کلیک نکند.

```tsx
const [title, setTitle] = useState("");
const [durationMinutes, setDurationMinutes] = useState(15);
const [questions, setQuestions] = useState<QuestionItem[]>([{ questionText: "", options: ["","","",""], correctOption: 0, score: 10 }]);
const [creating, setCreating] = useState(false);
const [pendingQuiz, setPendingQuiz] = useState<{...} | null>(null);
```
- فرم ساخت آزمون: عنوان، توضیح، مدت، اسمک، لیست سؤال‌ها — با **یک سؤال خالی از اول** تا
  دبیر بداند باید سؤال وارد کند.
- `pendingQuiz` برای حالت نیمه‌کاره است: آزمون ساخته شده ولی چند سؤال ثبت نشده؛ در تب
  «طراحی آزمون» هشدار می‌دهد و دکمهٔ «تلاش مجدد» نشان می‌دهد.

```tsx
const [editingSub, setEditingSub] = useState<SubmissionItem | null>(null);
const [editSubName, ...] ; // و به همین ترتیب
const [editingQuiz, setEditingQuiz] = useState<QuizItem | null>(null);
const [editingQuestionQuiz, setEditingQuestionQuiz] = useState<QuizItem | null>(null);
const [editingQuestionIdx, setEditingQuestionIdx] = useState<number | null>(null);
const [questionDraft, setQuestionDraft] = useState<QuestionItem>({...});
```
- سه مودال: کارنامه، آزمون، سؤال. الگوی همه یکی است: `editingX` می‌گوید «مودال باز است
  و دارد این رکورد را ویرایش می‌کند»، و فیلدهای `editX...` مقدارهای داخل فرم هستند.
- `questionDraft` نسخهٔ موقتِ سؤال است تا با هر تایپ، لیست اصلی عوض نشود؛ با «ذخیره»
  نوشته می‌شود.

## خط ۱۹۵ تا ۲۲۰ — «آیا دبیر وارد است؟»

```tsx
let cancelled = false;
const res = await fetch(TEACHER_SESSION_ENDPOINT, { cache: "no-store" });
if (cancelled) return;
if (res.ok) { const data = await res.json(); setTeacherUser(data?.user ?? null); setAuthenticated(true); }
...
finally { if (!cancelled) setAuthLoading(false); }
return () => { cancelled = true; };
```
- یک بار موقع باز شدن صفحه، از سرور می‌پرسد «نشست دارم؟». کوکی `httpOnly` خودکار همراه
  درخواست می‌رود؛ خودِ کد ما هیچ توکنی نمی‌بیند.
- `cancelled` جلوی خطای «آپدیت کردن صفحه‌ای که رفته» را می‌گیرد.
- `finally` تضمین می‌کند اسپینر در هر حالتی تمام شود؛ وگرنه اگر شبکه قطع بود، صفحه
  همیشه اسپینر می‌ماند.
- هرگز توکن را در `localStorage` نمی‌گذاریم؛ یک خط `localStorage` هم در کل پروژه نیست.

## خط ۲۲۲ تا ۲۵۵ — ورود

```tsx
const res = await fetch(TEACHER_LOGIN_ENDPOINT, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ identifier: loginIdentifier, password: loginPassword }),
});
if (!res.ok) throw new Error(data?.error?.message || "نام کاربری یا رمز عبور اشتباه است...");
setTeacherUser(data.user ?? null); setAuthenticated(true); setLoginPassword("");
```
- رمز به سرور خودمان می‌رود، نه مستقیم به استراپی. اگر درست بود، سرور کوکی می‌گذارد و
  ما فقط می‌گوییم «وارد شد».
- `setLoginPassword("")` رمز را از حافظهٔ صفحه پاک می‌کند.
- پیام خطا از پاسخ سرور خوانده می‌شود تا «رمز اشتباه» با «حساب مسدود» قاطی نشود.

## خط ۲۵۷ تا ۲۶۴ — خروج

```tsx
setAuthenticated(false); setTeacherUser(null); setSubmissions([]); setQuizzes([]);
void fetch(TEACHER_LOGOUT_ENDPOINT, { method: "POST" }).catch(() => {});
```
- اول صفحه را پاک می‌کنیم، بعد به سرور می‌گوییم کوکی را باطل کند. اگر درخواست شکست
  بخورد هم اهمیتی ندارد (`catch(() => {})`) — کاربر در هر حال از پنل بیرون رفته.

## خط ۲۶۶ تا ۲۹۲ — دو ابزار درخواست

```tsx
const json = await res.json();
if (json?.error?.message) message = json.error.message;
return `${message} (کد ${res.status})`;
```
- پیام خطای استراپی را بیرون می‌کشد و کد وضعیت را هم می‌چسباند. همان «(کد ۴۰۴)» که در
  نوار قرمز دیدی، از همین خط می‌آید.

```tsx
const strapiPath = (path: string) => path.replace(/^\/api(?=\/|$)/, "");
const authedFetch = async (path, init = {}) => {
  const res = await fetch(`${STRAPI_BASE_URL}${strapiPath(path)}`, { ...init, headers: {...} });
  if (res.status === 401) { handleLogout(); throw new Error("نشست کاری منقضی شده است..."); }
  return res;
};
```
- `strapiPath`: اگر مسیر با `/api` شروع شده باشد، همان را برمی‌دارد؛ چون پروکسی خودش
  `/api` را اضافه می‌کند. **این خط تازه اضافه شد**؛ قبلاً آدرس دوبار api می‌شد
  (`/api/api/quizzes`) و استراپی `404` می‌داد.
- `authedFetch`: هر درخواست دبیر از این در می‌رود. اگر `401` بگیرد، خودکار خارج می‌کند و
  پیام فارسی می‌دهد.

## خط ۲۹۴ تا ۳۳۲ — ثبت سؤال‌ها

```tsx
for (const q of quizQuestions) {
  try { const res = await authedFetch(`/api/questions`, { method: "POST", body: ... }); ... }
  catch { failed.push(q); }
}
return failed;
```
- سؤال‌ها یک جدول جدا هستند و باید یکی‌یکی با `quiz: documentId` به آزمون وصل شوند.
- هر سؤال مستقل ثبت می‌شود؛ اگر یکی خطا داد، بقیه ادامه می‌دهند و آن یکی در آرایهٔ
  `failed` برمی‌گردد. بعداً «تلاش مجدد» فقط همان‌ها را می‌فرستد.
- اگر این را یک درخواست بزرگ می‌کردیم و وسطش قطع می‌شد، معلوم نبود کدام سؤال‌ها ثبت شده‌اند.

## خط ۳۳۹ تا ۴۵۴ — `fetchData` (مهم‌ترین تابع پنل)

```tsx
const [subRes, quizRes] = await Promise.all([
  fetch(`${STRAPI_BASE_URL}/submissions?populate=*`, { cache: "no-store" }),
  fetch(`${STRAPI_BASE_URL}/quizzes?populate=*`, { cache: "no-store" }),
]);
```
- دو درخواست **هم‌زمان** (نه پشت سر هم) تا پنل سریع باز شود.
- `populate=*` = آزمون‌ها را با سؤال‌هایشان بیاور.
- `no-store` = از حافظهٔ قبلی نخوان؛ همیشه تازه.

```tsx
if (!subRes.ok || !quizRes.ok) {
  if (subRes.status === 401 || quizRes.status === 401) { handleLogout(); throw ...; }
  const failed = !subRes.ok ? subRes : quizRes;
  throw new Error(await extractStrapiError(failed, "خطا در برقراری ارتباط با سرور استراپی."));
}
```
- اگر یکی خطا داد، پیام همان را نشان می‌دهیم.
- **درسِ آن ۴۰۴:** وقتی این خط خطا می‌دهد، `setSubmissions` و `setQuizzes` هرگز اجرا
  نمی‌شوند؛ پس لیست خالی می‌ماند و شمارنده صفر می‌شود. یعنی «صفر» همیشه معنی‌اش
  «داده نیست» نیست.

```tsx
const data = item.attributes ? item.attributes : item;
```
- استراپی ۴ فیلدها را داخل `attributes` می‌گذاشت، استراپی ۵ صاف می‌دهد. این خط هر دو را
  می‌پذیرد (سازگاری با دادهٔ قدیمی).

```tsx
const percentage = typeof answersObj.percentage === "number" ? answersObj.percentage : Math.min(100, Math.round(score));
```
- درصد از خود کارنامه خوانده می‌شود؛ اگر نبود (کارنامه‌های خیلی قدیمی)، از نمره حساب می‌شود.

```tsx
setSubmissions(mappedSubmissions);
setQuizzes(mappedQuizzes);
} catch (err) {
  if (err instanceof TypeError) setError("ارتباط با سرور آزمون برقرار نشد (خطای شبکه)...");
  else setError(getErrorMessage(err, "خطا در واکشی داده‌ها از استراپی"));
} finally { setLoading(false); }
```
- `TypeError` یعنی درخواست اصلاً نرسیده (سرور خاموش)؛ پیامش با «استراپی خطا داد» فرق دارد.
- `finally` اسپینر را در هر حالتی خاموش می‌کند.

## خط ۴۵۶ تا ۴۶۲ — کِی داده بگیریم؟

```tsx
useEffect(() => { if (authenticated) { fetchData(); } }, [authenticated]);
```
- فقط وقتی وضعیت ورود `true` شد، یک بار داده می‌گیرد. وابستگی‌اش `authenticated` است، نه
  `fetchData`؛ وگرنه تابع در هر رندر ساخته می‌شد و حلقهٔ بی‌پایان می‌شد (برای همین
  `eslint-disable` بالای خط هست).

## خط ۴۶۴ تا ۵۴۷ — کارنامه‌ها: حذف و ویرایش

```tsx
if (!window.confirm(`کارنامهٔ «${sub.studentName}» حذف شود؟`)) return;
const res = await authedFetch(`/api/submissions/${encodeURIComponent(id)}`, { method: "DELETE" });
```
- تأیید می‌گیرد، بعد `DELETE` می‌زند. `encodeURIComponent` جلوی خرابکاری در آدرس را می‌گیرد.

```tsx
setSubmissions((prev) => prev.map(...))   // در ذخیره
setSubmissions((prev) => prev.filter(...)) // در حذف
```
- بعد از موفقیت، **بدون رفت‌وبرگشت به سرور** فقط همان یک ردیف را در حافظه عوض می‌کنیم؛
  پنل فوری به‌روز می‌شود. (`fetchData` هم دکمهٔ «به‌روزرسانی» دارد برای هم‌ترازی کامل.)

## خط ۵۴۹ تا ۶۳۲ — آزمون‌ها

- `handleDeleteQuiz`: تأیید + `DELETE /quizzes/:id` + حذف از `quizzes`.
- `openEditQuizModal`: مقدارهای فعلی را داخل فیلدهای مودال می‌ریزد.
- `handleSaveQuiz`: `PUT /quizzes/:id` با `{ data: { title, description, durationMinutes, slug } }`
  و بعد به‌روزرسانی همان آیتم در حافظه.

## خط ۶۳۴ تا ۷۳۵ — سؤال‌ها

- `handleDeleteQuestion(quiz, index)`: سؤال از `question.documentId` حذف می‌شود، بعد از
  آرایهٔ `questions` همان آزمون در حافظه هم برداشته می‌شود.
- `openEditQuestionModal`: آزمون و شمارهٔ سؤال را نگه می‌دارد و `questionDraft` را پر می‌کند.
- `handleSaveQuestion`: `PUT /questions/:documentId` با متن، گزینه‌ها، پاسخ درست و نمره.
- `handleAddQuestionField`: یک سؤال خالی جدید به فرم اضافه می‌کند.

## خط ۷۳۷ تا ۸۴۴ — ساخت آزمون (دو فاز)

```tsx
// فاز ۱: خودِ آزمون
const res = await authedFetch(`/api/quizzes`, { method: "POST", body: JSON.stringify({ data: {...} }) });
const quizDocumentId = quizJson?.data?.documentId;
if (!quizDocumentId) throw new Error("پاسخ سرور فاقد documentId آزمون بود.");
// فاز ۲: سؤال‌ها
const failedQuestions = await createQuestionsForQuiz(quizDocumentId, questions);
```
- اول آزمون ساخته می‌شود، چون سؤال‌ها باید به یک آزمونِ موجود وصل شوند.
- `documentId` شناسهٔ رشته‌ای استراپی ۵ است؛ بدون آن نمی‌دانیم سؤال را به کدام آزمون بچسبانیم.
- اگر همه سؤال‌ها ثبت شدند: پیام سبز، پاک‌کردن فرم، `fetchData()` تازه و پرش به تب آزمون‌ها.
- اگر بعضی ثبت نشدند: `pendingQuiz` ست می‌شود و پیام می‌گوید «آزمون ساخته شد، N سؤال
  ناقص است» — **فرم را پاک نمی‌کنیم** تا دادهٔ دبیر از دست نرود.
- `if (res.status === 403)` پیام مخصوص می‌دهد: «دسترسی نداری؛ مجوز نقش Authenticated را
  بررسی کن» — چون این خطا معمولاً مجوزی است، نه خرابی.

## خط ۸۴۶ تا ۸۶۳ — جست‌وجو و زمان

```tsx
return sub.studentName.toLowerCase().includes(q) || ... sub.nationalCode ... || sub.quizTitle ...;
```
- جست‌وجو در نام، کلاس، کد ملی و نام آزمون؛ بی‌حساسیت به حروف بزرگ/کوچک.

```tsx
if (mins > 0) return `${mins} دقیقه و ${secs} ثانیه`;
return `${secs} ثانیه`;
```
- زمان کارنامه را «۲۴۵ ثانیه» نشان نمی‌دهیم؛ «۴ دقیقه و ۵ ثانیه» می‌شود.

## خط ۸۶۵ تا ۹۶۴ — دو صفحهٔ قبل از پنل

```tsx
if (authLoading) { return ( ...اسپینر... ); }
if (!authenticated) { return ( ...فرم ورود... ); }
```
- سه حالت: «دارم چک می‌کنم» → اسپینر؛ «وارد نیستی» → فرم ورود؛ «واردی» → پنل کامل.
- این دو `return` قبل از `return` اصلی هستند؛ یعنی تا وقتی وارد نباشی، اصلاً کد پنل اجرا نمی‌شود.

## خط ۹۶۶ تا ۱۰۲۴ — هدر پنل

```tsx
<header ...>
  <GraduationCap /> <h1>داشبورد مدیریت دبیر</h1>
  {teacherUser && <span className="badge">{teacherUser.username || teacherUser.email}</span>}
  <button onClick={() => fetchData()} disabled={loading}><RefreshCw className={loading ? "animate-spin" : ""} /> به‌روزرسانی</button>
  <button onClick={handleLogout}>خروج</button>
  <Link href="/">مشاهده سامانه دانش‌آموز</Link>
</header>
```
- دکمهٔ «به‌روزرسانی» همان `fetchData` را صدا می‌زند و آیکونش می‌چرخد تا معلوم باشد
  در حال کار است.
- `teacherUser.username || teacherUser.email` = اگر نام کاربری بود آن، وگرنه ایمیل.

## خط ۱۰۲۶ تا ۱۰۶۲ — تب‌ها

```tsx
<button onClick={() => setActiveTab("results")} className={`tab ${activeTab === "results" ? "tab-active" : ""}`}>
  کارنامه دانش‌آموزان ({submissions.length})
</button>
...
مدیریت آزمون‌ها ({quizzes.length})
```
- چهار تب؛ فقط یک `activeTab` در حافظه داریم و کلاس رنگی به تب فعال داده می‌شود.
- عددهای داخل پرانتز مستقیم از `submissions.length` و `quizzes.length` می‌آیند؛ برای همین
  وقتی واکشی خطا می‌داد، هر دو صفر بودند.

## خط ۱۰۹۴ تا ۱۳۷۷ — تب کارنامه‌ها و تب دانش‌آموزان

- تب «دانش‌آموزان» فقط `<StudentManager onCountChange={setStudentCount} onNotice={setSuccessMsg} />`
  است؛ کل مدیریت دانش‌آموز در فایل جداگانه است و تعداد را با `onCountChange` به این
  صفحه برمی‌گرداند.
- تب «کارنامه‌ها»: سه کارت آمار بالا (تعداد، میانگین، بهترین)، کادر جست‌وجو، جدول
  کارنامه‌ها. هر ردیف با کلیک باز می‌شود و پاسخ‌نامهٔ تفکیکی (`details`) را نشان می‌دهد:
  متن سؤال، گزینه‌ها، انتخاب دانش‌آموز، پاسخ درست، درست/غلط.

```tsx
{expandedRowId === sub.id && ( ... details ... )}
```
- فقط ردیفی که `expandedRowId` برابر شناسه‌اش باشد، جزئیات نشان می‌دهد.

## خط ۱۳۷۹ تا ۱۵۱۳ — تب آزمون‌ها

```tsx
{quizzes.length === 0 && ( <div className="card ...">هنوز آزمونی ساخته نشده است...</div> )}
{quizzes.map((quiz) => { const quizId = String(quiz.documentId || quiz.id); ... })}
```
- هر آزمون یک کارت: عنوان، توضیح، مدت، تعداد سؤال، و دکمه‌های «شرکت در آزمون»
  (`/quiz/<documentId>`)، «سؤال‌ها» (برای باز کردن لیست و ویرایش/حذف سؤال)، «ویرایش» و «حذف».
- کارت خالی «هنوز آزمونی ساخته نشده» برای این است که دبیر «صفر» را با «خرابی» اشتباه نگیرد.

## خط ۱۵۱۵ تا ۱۷۱۲ — تب «طراحی آزمون و سؤال جدید»

- اگر `pendingQuiz` باشد، بالای فرم نوار زرد با دو دکمه: «تلاش مجدد ثبت سؤال‌های
  باقی‌مانده» و «رها کردن».
- فرم: عنوان، توضیح، مدت (دقیقه)، اسمک، و برای هر سؤال: متن + چهار گزینه + دکمهٔ رادیویی
  «پاسخ درست» + نمره. دکمه‌های «افزودن سؤال» و «حذف سؤال».
- دکمهٔ نهایی `handleCreateQuiz` را صدا می‌زند و تا وقتی `creating` باشد غیرفعال است.

## خط ۱۷۱۴ تا ۱۹۹۳ — سه مودال

```tsx
{editingSub && ( <div className="modal-overlay"> ... </div> )}
{editingQuiz && ( <div className="modal-overlay"> ... </div> )}
{editingQuestionQuiz && editingQuestionIdx !== null && ( <div className="modal-overlay"> ... </div> )}
```
- الگوی یکسان: اگر state پر بود، مودال باز است؛ اگر `null` بود، هیچ‌چیز رندر نمی‌شود.
  بستن مودال = `setEditingX(null)`.
- مودال کارنامه: نام، کلاس، کد ملی، نمره → `handleSaveSubmission`.
- مودال آزمون: عنوان، توضیح، مدت، اسمک → `handleSaveQuiz`.
- مودال سؤال: متن، گزینه‌ها، پاسخ درست، نمره → `handleSaveQuestion` (با `questionDraft`).

**خلاصهٔ فایل ۲ در یک جمله:** «یک صفحهٔ مرورگری که اول می‌پرسد وارد شده‌ای یا نه؛ اگر
بله، دو لیست (کارنامه و آزمون) را از پروکسی می‌گیرد، در چهار تب نشان می‌دهد و با سه
مودال ویرایش می‌کند.»

---

# فایل ۳ — `submission.ts` (سه فایل کوچک کنار هم)

منظور از «submission.ts» معمولاً سه فایل است که با هم یک API می‌سازند:

```
backend/src/api/submission/
├── routes/submission.ts        (۷ خط)   ← چه آدرس‌هایی وجود دارد
├── services/submission.ts      (۷ خط)   ← توابع کمکی داخلی
└── controllers/submission.ts   (۹۷ خط)  ← منطق: چه کسی چه کاری می‌تواند بکند
```

## ۳-۱) `routes/submission.ts` — خط ۱ تا ۷

```ts
import { factories } from '@strapi/strapi';
export default factories.createCoreRouter('api::submission.submission');
```
- خط ۱ تا ۳ فقط توضیح است. خط ۵ ابزار استراپی را می‌آورد.
- خط ۷ **همهٔ** مسیرهای استاندارد یک collection type را می‌سازد:
  `GET /api/submissions`، `GET /api/submissions/:id`، `POST`، `PUT`، `DELETE`.
- یعنی ما دستی هیچ آدرسی نمی‌نویسیم؛ استراپی از روی اسم content-type می‌سازد. اگر این
  فایل نبود، آدرس `/api/submissions` وجود نداشت و پنل دبیر `404` می‌گرفت.

## ۳-۲) `services/submission.ts` — خط ۱ تا ۷

```ts
export default factories.createCoreService('api::submission.submission');
```
- «سرویس» یعنی توابعی که چند کنترلر می‌توانند استفاده کنند (مثل `find`, `create` در سطح
  دیتابیس). ما تابع خاصی اضافه نکرده‌ایم؛ نسخهٔ پیش‌فرض استراپی کافی است.
- نگه‌داشتنش لازم است چون استراپی برای هر content-type این فایل را انتظار دارد.

## ۳-۳) `controllers/submission.ts` — خط ۷ تا ۱۳: نگهبان

```ts
const requireStaff = (ctx: any) => {
  if (!ctx.state?.user) {
    ctx.unauthorized('برای دسترسی به کارنامه‌ها باید با حساب دبیر وارد شوید.');
    return false;
  }
  return true;
};
```
- `ctx.state.user` را خود استراپی از توکن پر می‌کند. اگر خالی باشد، یعنی کسی با حساب
  وارد نشده.
- `unauthorized` پاسخ `401` با پیام فارسی می‌فرستد و `false` برمی‌گرداند تا کنترلر
  بی‌درنگ `return` کند.
- **نکته:** این تابع می‌گوید «کسی وارد شده»، ولی نمی‌گوید «دبیر است». آن کار در پروکسی/نقش
  انجام می‌شود: نقش `Student` مجوز `api::submission.*` ندارد، پس حتی اگر این تابع را رد
  کند، استراپی جواب `403` می‌دهد. دو لایه، دو تور.

## خط ۱۵ تا ۵۴ — `find` (فهرست کارنامه‌ها)

```ts
async find(ctx) { if (!requireStaff(ctx)) return; const query = (ctx.query || {}) as Record<string, any>; ... }
```
- اگر نگهبان رد کند، تمام. وگرنه سراغ پارامترهای درخواست می‌رویم.

```ts
const status = query.status || 'draft';
```
- ترفند مخصوص استراپی ۵: مقدار `'draft'` در واقع **هم پیش‌نویس و هم منتشرشده** را
  برمی‌گرداند. یعنی هر کارنامه‌ای که ثبت شده، دیده می‌شود.
- **چرا حیله لازم شد؟** چون کارنامه‌ها `draftAndPublish: false` هستند و اگر `published`
  می‌گذاشتیم، رکوردهایی که `published_at` خالی داشتند غیب می‌شدند.

```ts
ctx.query = { ...query, status, populate: { quiz: { fields: ['title', 'durationMinutes'] } },
  sort: query.sort || ['createdAt:desc'], pagination: { pageSize: 100, ...userPagination } };
```
- `populate` فقط دو فیلد از آزمون را می‌آورد (عنوان و مدت) تا پاسخ سبک بماند؛ کارنامه
  باید بداند مربوط به کدام آزمون است.
- پیش‌فرض مرتب‌سازی: تازه‌ترین اول.
- `pageSize: 100` یعنی حداکثر ۱۰۰ کارنامه در هر صفحه؛ اگر کلاینت خودش `pagination` فرستاد،
  مقدار او مقدم است (`...userPagination` بعدش می‌آید و رویش می‌نشیند).

```ts
const response = await super.find(ctx);
if (Array.isArray(response?.data)) {
  response.data = response.data.map(({ submissionKey, ...rest }: any) => rest);
}
return response;
```
- `super.find` همان منطق پیش‌فرض استراپی است؛ ما فقط قبلش query را مرتب کردیم.
- `submissionKey` کلید داخلی ضدتکرار است (`documentId:کدملی`) و **باید** از پاسخ حذف شود؛
  وگرنه همهٔ بچه‌ها می‌فهمند کلید یکتا چه شکلی است و می‌توانند دستکاری‌اش کنند.

## خط ۵۶ تا ۸۰ — `findOne` (یک کارنامه)

- دقیقاً همان دو کارِ `find`: گذاشتن `status: 'draft'`، `populate` آزمون، و حذف
  `submissionKey` از پاسخ تک‌رکوردی.

```ts
const { submissionKey, ...rest } = response.data as any;
return { ...response, data: rest };
```
- نسخهٔ تک‌رکوردی، شیء را باز می‌سازد (`{...response, data: rest}`) چون `response.data`
  اینجا یک شیء است، نه آرایه.

## خط ۸۲ تا ۹۵ — `delete`، `update`، `create`

```ts
async delete(ctx) { if (!requireStaff(ctx)) return; return super.delete(ctx); }
async update(ctx) { if (!requireStaff(ctx)) return; return super.update(ctx); }
async create(ctx) { if (!requireStaff(ctx)) return; return super.create(ctx); }
```
- سه عملِ نوشتن، هر سه فقط با یک شرط: «کسی وارد شده باشد». بعد کار عادی استراپی.
- **چرا اصلاً این سه را نوشتیم؟** برای اینکه خطای «وارد نشده‌ای» به فارسی و روشن باشد؛
  وگرنه استراپی فقط `403 Forbidden` می‌داد.
- دانش‌آموز از این مسیرها نمی‌تواند کارنامه بسازد؛ کارنامه را فقط سرورِ خودمان در
  `quiz.submit` می‌سازد (با هویتِ خوانده‌شده از توکن).

**خلاصهٔ فایل ۳ در یک جمله:** «راه‌ها پیش‌فرض استراپی‌اند؛ کنترلر فقط دو کار می‌کند:
نگهبانیِ در (فقط کاربر واردشده) و تمیزکاریِ پاسخ (حذف کلید ضدتکرار و آوردن عنوان آزمون).»

---

# جمع‌بندی: «اگر این خط نبود چه می‌شد؟»

| خط / بخش | اگر نبود |
| --- | --- |
| `index.ts` خط ۱۶ | مهمان صفحهٔ اول را خالی می‌دید |
| `index.ts` خط ۱۸–۳۴ | دبیر نمی‌توانست آزمون بسازد یا کارنامه ببیند (۴۰۳) |
| `ensureRole` با چک `if (!role)` | هر بوت یک نقش تکراری می‌ساخت |
| `ensureUniqueSubmissionIndex` | دو کارنامهٔ هم‌زمان برای یک نفر ممکن می‌شد |
| `publishLegacyQuizzes` | آزمون‌های قدیمیِ پیش‌نویس هیچ‌وقت در پنل دیده نمی‌شدند |
| `SEED_DEMO !== 'true'` | محیط واقعی مدرسه پر از دادهٔ نمایشی می‌شد |
| `"use client"` در page.tsx | کل پنل با `useState` کار نمی‌کرد |
| `authLoading` | صفحه یک لحظه فرم ورود نشان می‌داد و بعد می‌پرید |
| `strapiPath` | آدرس دوبار `/api` می‌شد و پنل `404` می‌گرفت |
| `fetchData` با `Promise.all` | پنل دو برابر کندتر باز می‌شد |
| `populate=*` | کارت آزمون‌ها بدون سؤال و آمار می‌ماند |
| `pendingQuiz` | اگر وسط ثبت سؤال‌ها اینترنت قطع می‌شد، کار دبیر از دست می‌رفت |
| `requireStaff` در کنترلر | پیام‌ها انگلیسی و مبهم می‌شد (`403 Forbidden`) |
| حذف `submissionKey` از پاسخ | کلید ضدتکرار به مرورگر لو می‌رفت |

# چهار سؤال که سر کلاس پیش می‌آید

**۱) چرا دبیر مستقیم به استراپی وصل نمی‌شود؟**
چون توکن دبیر در کوکی `httpOnly` است و مرورگر نمی‌تواند آن را بخواند؛ پس هر درخواست از
`/api/strapi/...` رد می‌شود و پروکسی توکن را از کوکی برمی‌دارد و به استراپی می‌دهد. سود
دیگرش: آدرس داخلی سرور و پورت‌ها از دید مرورگر پنهان می‌مانند.

**۲) چرا کارنامه‌ها یک فیلد مخفی دارند؟**
`submissionKey` = «شناسهٔ آزمون + کد ملی». با این کلید، دیتابیس اجازه نمی‌دهد یک نفر دو
بار برای یک آزمون کارنامه بسازد. چون کلید داخلی است، همیشه قبل از رسیدن به مرورگر
حذفش می‌کنیم.

**۳) چرا پنل دو تا لیست جدا دارد (submissions و quizzes)؟**
چون دو نوع دادهٔ متفاوت‌اند: کارنامه (نتیجهٔ بچه‌ها) و آزمون (سؤال‌ها). هر دو در یک
`fetchData` گرفته می‌شوند تا شمارندهٔ تب‌ها و کارت‌ها هم‌زمان درست باشند.

**۴) اگر بچه‌ها هم‌زمان امتحان بدهند چه می‌شود؟**
سه لایه محافظت هست: توکن (کسی که وارد نشده نمی‌تواند ثبت کند)، `submissionKey` (تکرار
ممنوع) و ایندکس یکتا در دیتابیس (تصادف هم‌زمان را هم رد می‌کند). یعنی حتی اگر دو درخواست
در یک هزارم ثانیه برسند، فقط یکی ذخیره می‌شود.
