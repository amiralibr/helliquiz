# راهنمای خط‌به‌خط کد HelliQuiz

این فایل، کد را **به ترتیب اجرا** می‌خواند: از لحظه‌ای که بک‌اند بالا می‌آید، تا وقتی دبیر
دانش‌آموز می‌سازد، دانش‌آموز وارد می‌شود، آزمون می‌دهد و کارنامه‌اش ثبت می‌شود.

> هر جا کد را با `>` یا در بلوک کد دیدی، آن خط‌ها عیناً از فایل هستند. توضیح زیرشان
> دقیقاً می‌گوید آن خط چه کار می‌کند و اگر نبود چه می‌شد.

---

## ۰) نقشهٔ کلی در یک نگاه

```
مرورگر  ──►  Next.js (پورت 3000)  ──►  Strapi (پورت 1337)  ──►  SQLite
             ├─ صفحه‌ها (RSC)           ├─ Content API
             ├─ /api/student/*          ├─ /api/student-auth/*
             ├─ /api/teacher/*          └─ /api/teacher-students
             └─ /api/strapi/* (پروکسی)
```

سه قانون که همه‌جای کد تکرار می‌شوند:

1. مرورگر هیچ‌وقت مستقیم به `127.0.0.1:1337` درخواست نمی‌زند؛ همه‌چیز از `/api/strapi/...`.
2. توکن‌ها فقط در کوکی `httpOnly` می‌نشینند (جاوااسکریپت آن‌ها را نمی‌بیند).
3. نقش تعیین می‌کند چه کسی چه کاری می‌کند: `Public` (مهمان) / `Authenticated` (دبیر) / `Student` (دانش‌آموز).

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

### ۱-۳) نقش پیش‌فرض ثبت‌نام

```ts
const setDefaultRegistrationRole = async (strapi, roleId) => {
  await strapi.store({ type: 'plugin', name: 'users-permissions', key: 'advanced' })
    .set({ value: { ...current, default_role: roleId } });
};
```
- همان تنظیمی که در `/admin → Settings → Users & Permissions → Advanced` دیده می‌شود.
- یعنی هر کسی که از مسیر عمومی ثبت‌نام کند، **دانش‌آموز** می‌شود، نه دبیر.

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

### ۱-۵) دادهٔ نمونه (پشت کلید `SEED_DEMO`)

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
  فارسی و کنترل‌شده بدهیم؛ اما نگهبانِ واقعی همین دو خط است.

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
const { fullName, studentClass, nationalCode, password } = validateStudentInput({ ... });
```
`validateStudentInput` در `backend/src/utils/student-account.ts`:
```ts
if (fullName.length < 3) throw httpError(400, 'نام و نام خانوادگی باید دست‌کم ۳ نویسه باشد.');
if (!isValidNationalCode(nationalCode)) throw httpError(400, 'کد ملی باید دقیقاً ۱۰ رقم و معتبر باشد.');
if (password.length < MIN_PASSWORD_LENGTH) throw httpError(400, `رمز عبور باید دست‌کم ۸ نویسه باشد.`);
```
- `isValidNationalCode` هم طول/رقم‌بودن را چک می‌کند و هم `1234567890`های تکراری‌رقم را
  رد نمی‌کند ولی `1111111111` را رد می‌کند:
```ts
export const isValidNationalCode = (value: string): boolean =>
  NATIONAL_CODE_PATTERN.test(value) && !/^(\d)\1{9}$/.test(value);
```

```ts
const existing = await findUserByNationalCode(strapi, nationalCode);
if (existing) throw httpError(409, 'این کد ملی قبلاً ثبت شده است.');
```
- `findUserByNationalCode` سه چیز را می‌گردد: `nationalCode`، `username`، `email`
  (چون هر سه از کد ملی ساخته می‌شوند) ⇒ حتی اگر کاربری از مسیر دیگری ساخته شده باشد،
  تکراری رد می‌شود.

```ts
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
- `password` را **هش نمی‌کنیم**؛ سرویس `user.add` خودش bcrypt می‌زند. اگر از قبل هش
  کنیم، دو بار هش می‌شود و ورود همیشه شکست می‌خورد.
- `email` واقعی نیست ولی یکتا لازم است (استراپی ایمیل تکراری را رد می‌کند).
- `confirmed: true` یعنی لازم نیست ایمیل تأیید شود.

```ts
return ctx.send({ data: toStudentRow(user) });
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

---

## ۴) دانش‌آموز آزمون می‌دهد — `backend/src/api/quiz/controllers/quiz.ts`

### ۴-۱) هویت از حساب، نه از فرم

```ts
const account = await resolveStudentFromContext(ctx);

if (account) {
  studentName = cleanText(account.fullName, 80) || studentName;
  studentClass = cleanText(account.studentClass, 40) || studentClass;
  nationalCode = account.nationalCode;
}
```
- مسیر `auth: false` است تا مهمان هم بتواند آزمون بدهد.
- اما اگر توکن دانش‌آموز همراه درخواست باشد، نام/کلاس/کد ملی **از حساب** خوانده می‌شود
  و ورودی فرم نادیده گرفته می‌شود ⇒ با کد ملی دیگری نمی‌شود کارنامه ساخت.

### ۴-۲) ضدتکرار

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

### ۴-۳) تصحیح

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

### ۴-۴) ذخیره

```ts
await strapi.documents('api::submission.submission').create({
  data: { studentName, studentClass, nationalCode, submissionKey, score: earnedScore, timeSpentSeconds,
          answers: { ...result, rawAnswers: submittedAnswers }, quiz: quizKey },
});
```
- همه‌چیز در یک رکورد: نمره، زمان، و `answers` که هم نتیجهٔ نهایی و هم پاسخ‌های خام را دارد.
- کارنامه‌ها عمداً `draftAndPublish: false` هستند (`content-types/submission/schema.json`)؛
  وگرنه استراپی برای هر کارنامه دو ردیف (پیش‌نویس + منتشر) می‌ساخت، ایندکس یکتا
  می‌شکست و داشبورد خالی می‌ماند.

---

## ۵) محدودیت نرخ — `backend/src/middlewares/rate-limit.ts`

```ts
const AUTH_PREFIXES = ['/api/auth/local/register', '/api/auth/local', '/api/student-auth/login', '/api/student-auth/register'];
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

## ۷) فهرست فایل‌های کلیدی

| فایل | نقش |
| --- | --- |
| `backend/src/index.ts` | نقش‌ها، مجوزها، نقش پیش‌فرض، ایندکس یکتا، دادهٔ نمونه |
| `backend/src/utils/student-account.ts` | اعتبارسنجی و ساخت حساب دانش‌آموز (یک منبع برای همه) |
| `backend/src/utils/teacher-identity.ts` | تشخیص دبیر از توکن (نقش `Authenticated`) |
| `backend/src/utils/student-identity.ts` | تشخیص دانش‌آموز از توکن (برای ثبت کارنامه) |
| `backend/src/api/teacher-students/*` | CRUD دانش‌آموز توسط دبیر |
| `backend/src/api/submission/controllers/student-auth.ts` | ثبت‌نام عمومی + `me` (کارنامه‌های من) |
| `backend/src/api/quiz/controllers/quiz.ts` | تصحیح، ضدتکرار، ذخیرهٔ کارنامه |
| `backend/src/middlewares/rate-limit.ts` | سقف درخواست |
| `backend/src/extensions/users-permissions/content-types/user/schema.json` | فیلدهای دانش‌آموز روی کاربر استراپی |
| `frontend/src/lib/auth.ts` | کوکی‌ها، توکن، ورود، تمدید |
| `frontend/src/lib/student-session.ts` | خواندن نشست دانش‌آموز در سرور |
| `frontend/src/app/api/strapi/[...path]/route.ts` | پروکسی امن به استراپی |
| `frontend/src/app/api/{student,teacher}/*` | ورود/ثبت‌نام/خروج هر نقش |
| `frontend/src/components/teacher/StudentManager.tsx` | تب مدیریت دانش‌آموزان |
| `frontend/src/components/student/*` | ورود و داشبورد دانش‌آموز |
