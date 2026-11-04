# 🎓 حلی‌کوئیز | HelliQuiz

سامانه‌ی کامل برگزاری آزمون‌های آنلاین دبیرستان **علامه حلی ۵** — فارسی، راست‌به‌چپ و با پشتیبانی کامل از فرمول‌های ریاضی (KaTeX).

| نقش | امکانات |
| --- | --- |
| 🧑‍🎓 **دانش‌آموز** | ثبت‌نام/ورود با کد ملی، شرکت در آزمون با تایمر، دیدن درصد و نمره، **کارنامه‌ی کامل با پاسخ‌نامه‌ی تفکیکی (درست/غلط)** |
| 🧑‍🏫 **دبیر** | ورود امن، مشاهده و ویرایش کارنامه‌ها، ساخت/ویرایش/حذف آزمون و سؤال، آمار کلاس |
| 🛠 **مدیر (Strapi Admin)** | مدیریت کامل داده‌ها، آزمون‌ها و **کاربران** (دبیر و دانش‌آموز): ویرایش، مسدودسازی، بازنشانی رمز، تغییر کلاس |

---

## 🧱 معماری

```
┌──────────────────────────────┐        ┌───────────────────────────┐
│  مرورگر (دانش‌آموز / دبیر)   │        │  Strapi 5  (127.0.0.1:1337)│
│  Next.js 16 · React 19       │  HTTP  │  SQLite / Postgres         │
│  Tailwind v4 · KaTeX         │ ─────► │  Content API + Custom APIs │
└──────────────┬───────────────┘        └──────────────▲────────────┘
               │  درخواست نسبی                          │
               │  /api/strapi/* , /api/student/*         │ fetch سمت سرور
               ▼                                        │
        ┌──────────────────────┐                        │
        │  Route Handlers      │ ───────────────────────┘
        │  Next.js (سرور)      │   پروکسی + کوکی httpOnly
        └──────────────────────┘
```

**نکته‌ی کلیدی:** مرورگر هیچ‌وقت مستقیم به `localhost` یا `127.0.0.1` وصل نمی‌شود.
همه‌ی درخواست‌ها به مسیرهای نسبی Next.js می‌روند و از سمت سرور به Strapi منتقل می‌شوند
(بدون مشکل CORS و بدون وابستگی به آدرس شبکه‌ی کلاینت).

---

## 🚀 راه‌اندازی سریع

### پیش‌نیاز
- Node.js **۲۰ یا بالاتر** و npm
- (اختیاری) `python3` و `make` برای کامپایل `better-sqlite3` در صورت نبود فایل از پیش‌کامپایل‌شده

### ۱) بک‌اند (Strapi)

```bash
cd backend
cp .env.example .env          # سپس کلیدهای امنیتی را عوض کنید
npm install
npm run develop
```

سرویس روی `http://localhost:1337` بالا می‌آید. پنل مدیریت: `http://localhost:1337/admin`
(بار اول باید ادمین بسازید).

### ۲) فرانت‌اند (Next.js)

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev                   # http://localhost:3000
```

> 💡 اگر `better-sqlite3` هنگام نصب نتوانست باینری آماده دانلود کند:
> ```bash
> npm_config_nodedir=/usr/local npm_config_build_from_source=true npm install
> ```

### ۳) ورود به سامانه

| نقش | آدرس | نام کاربری / کد ملی | رمز |
| --- | --- | --- | --- |
| دبیر | `/teacher` | `teacher@helli.ir` (یا `teacher`) | `teacher1234` |
| دانش‌آموز | `/student` | `0012345678` | `student1234` |

این حساب‌ها فقط وقتی ساخته می‌شوند که `SEED_DEMO=true` باشد (پیش‌فرض نمونه).
در محیط واقعی آن را `false` کنید.

---

## ⚙️ متغیرهای محیطی

### بک‌اند (`backend/.env`)

| متغیر | توضیح | پیش‌فرض |
| --- | --- | --- |
| `HOST` / `PORT` | آدرس و پورت Strapi | `0.0.0.0` / `1337` |
| `APP_KEYS` | کلیدهای نشست (چندتا با کاما) | — |
| `ADMIN_JWT_SECRET` | کلید توکن پنل ادمین | — |
| `API_TOKEN_SALT` / `TRANSFER_TOKEN_SALT` | نمک توکن‌های API | — |
| `ENCRYPTION_KEY` | کلید رمزنگاری | — |
| `JWT_SECRET` | کلید امضای توکن‌های users-permissions (دبیر و دانش‌آموز) | — |
| `DATABASE_CLIENT` | `sqlite` \| `postgres` \| `mysql` | `sqlite` |
| `DATABASE_FILENAME` | مسیر فایل SQLite | `.tmp/data.db` |
| `CORS_ORIGINS` | دامنه‌های مجاز (کاما) | `*` |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` | پنجره و سقف نرخ درخواست عمومی | `60000` / `300` |
| `SEED_DEMO` | ساخت داده و حساب‌های نمونه | `false` |
| `SEED_TEACHER_EMAIL` / `SEED_TEACHER_USERNAME` / `SEED_TEACHER_PASSWORD` | حساب نمایشی دبیر | `teacher@helli.ir` / `teacher` / `teacher1234` |
| `SEED_STUDENT_NATIONAL_CODE` / `SEED_STUDENT_PASSWORD` | حساب نمایشی دانش‌آموز | `0012345678` / `student1234` |

### فرانت‌اند (`frontend/.env.local`)

| متغیر | توضیح | پیش‌فرض |
| --- | --- | --- |
| `STRAPI_INTERNAL_URL` | آدرس استراپی برای فراخوانی سمت سرور | `http://127.0.0.1:1337` |
| `NEXT_PUBLIC_STRAPI_URL` | فقط برای سازگاری/اشکال‌زدایی | همان بالا |

---

## 🗃 مدل داده

```
Quiz ──1:N──► Question          (گزینه‌ها JSON، correctOption صفر-بیس، score)
Quiz ──1:N──► Submission        (نمره، زمان، پاسخ‌نامه JSON، submissionKey یکتا)

User (users-permissions) ──► Role
       ├─ دبیر  → role: Authenticated
       └─ دانش‌آموز → role: Student  +  fullName, studentClass, nationalCode(unique)
```

- **`correctOption`**: ایندکس صفر-بیس گزینه‌ی صحیح (`0` یعنی گزینه اول). فیلد قدیمی
  `correctAnswer` (یک-بیس) فقط برای سازگاری خوانده می‌شود.
- **`submissionKey`**: ترکیب `documentId آزمون + کد ملی` با **ایندکس یکتا در دیتابیس** →
  هر دانش‌آموز هر آزمون را فقط یک بار می‌تواند ثبت کند.
- **رمز عبور**: با `bcrypt` در users-permissions هش می‌شود؛ هرگز در هیچ خروجی‌ای
  برنمی‌گردد. بازنشانی/تغییر رمز از پنل ادمین انجام می‌شود.
- **`nationalCode`**: ستون یکتا روی کاربر؛ هم‌زمان `username` دانش‌آموز است

---

## 🔌 مسیرهای API

### عمومی (بدون احراز هویت)
| متد | مسیر | کار |
| --- | --- | --- |
| `GET` | `/api/quiz-public` | فهرست آزمون‌های منتشرشده (بدون سؤال) |
| `GET` | `/api/quiz-public/:id` | یک آزمون با سؤال‌ها — **هرگز پاسخ صحیح ندارد** |
| `POST` | `/api/quizzes/:id/submit` | تصحیح و ثبت کارنامه (اعتبارسنجی + ضدتکرار) |

### دانش‌آموز
| متد | مسیر | کار |
| --- | --- | --- |
| `POST` | `/api/student-auth/register` | ثبت‌نام: نام، کلاس، کد ملی ۱۰ رقمی و رمز ≥ ۸ نویسه |
| `POST` | `/api/auth/local` | ورود (users-permissions) با `identifier` = کد ملی |
| `GET` | `/api/student-auth/me` | پروفایل + همه‌ی کارنامه‌های خودش با جزئیات (`Bearer <jwt>`) |

هر سه روی **users-permissions** سوارند: دانش‌آموز یک ردیف واقعی در `up_users` با نقش
`Student` است. حساب او از `/admin` قابل ویرایش، مسدودسازی و بازنشانی رمز است.

در سمت Next:
`POST /api/student/login`، `POST /api/student/register`، `POST /api/student/logout`، `GET /api/student/me`
— توکن در کوکی **httpOnly** نگه‌داری می‌شود و جاوااسکریپت به آن دسترسی ندارد.

### دبیر (نقش `Authenticated`)
`/api/quizzes`, `/api/questions`, `/api/submissions` — CRUD کامل با JWT.
پاسخ صحیح سؤال‌ها **فقط** برای دبیر احراز هویت‌شده در خروجی وجود دارد.
نقش `Student` هیچ مجوزی روی این مسیرها ندارد (۴۰۳)؛ نشست دبیر و دانش‌آموز هم
از هم جدا هستند و فرم هرکدام حساب نقش مقابل را نمی‌پذیرد.

### نشست دبیر (سمت Next)
| متد | مسیر | کار |
| --- | --- | --- |
| `POST` | `/api/teacher/login` | ورود؛ توکن دسترسی + توکن تازه‌سازی در کوکی **httpOnly** |
| `GET` | `/api/teacher/session` | وضعیت نشست (نام کاربری/ایمیل) بدون افشای توکن |
| `POST` | `/api/teacher/logout` | پاک‌کردن کامل کوکی‌های نشست |

توکن دسترسی استراپی ۱۰ دقیقه اعتبار دارد؛ پروکسی هنگام انقضا (یا پاسخ ۴۰۱)
به‌طور خودکار آن را با توکن تازه‌سازی عوض می‌کند و درخواست را تکرار می‌کند.

### پروکسی Next
هر مسیر `/api/strapi/*` مستقیماً به همان مسیر در Strapi منتقل می‌شود
(هدر `Authorization` و IP واقعی کلاینت حفظ می‌شوند).

---

## 👥 حساب‌ها و نقش‌ها

همه‌ی کاربران (دبیر و دانش‌آموز) در **users-permissions** استراپی هستند؛ یعنی
«کاربران و نقش‌ها» در `/admin` تنها منبع حقیقت است:

| نقش | نوع | مجوزها |
| --- | --- | --- |
| `Public` | عمومی | فقط `quiz.find` / `quiz.findOne` |
| `Authenticated` | دبیران | CRUD کامل روی `quiz`, `question`, `submission` |
| `Student` | دانش‌آموزان (نقش پیش‌فرض ثبت‌نام) | هیچ مجوزی روی content-typeها؛ فقط `/api/student-auth/me` |

در `/admin → Content Manager → User` می‌توانید برای هر دانش‌آموز `fullName`،
`studentClass` و `nationalCode` را ویرایش کنید، حساب را با `blocked` قفل کنید یا
با گزینه‌ی تغییر رمز، رمز تازه بدهید. نقش پیش‌فرض ثبت‌نام‌های جدید در اولین
بوت روی `Student` تنظیم می‌شود (هیچ ثبت‌نامی به‌طور پیش‌فرض دبیر نمی‌شود).

دبیران را در همان صفحه با نقش `Authenticated` بسازید — یا از `SEED_DEMO=true`
برای ساخت خودکار استفاده کنید.

---

## 🔒 سخت‌سازی امنیتی (نسبت به نسخه‌ی اولیه)

- ✅ **حذف کامل وابستگی به `127.0.0.1` در مرورگر** — همه‌چیز از پروکسی سمت سرور
- ✅ **پاسخ صحیح واقعی در پنل دبیر** — قبلاً فیلتر می‌شد و با هر ذخیره پاسخ صحیح
  سؤال به گزینه‌ی اول تغییر می‌کرد
- ✅ **جلوگیری از کارنامه‌ی تکراری** — بررسی در کنترلر + ایندکس یکتای دیتابیس
- ✅ **محدودیت نرخ درخواست** — ورود/ثبت‌نام ۱۰ درخواست در دقیقه، ثبت آزمون ۲۰ در دقیقه
- ✅ **اعتبارسنجی سمت سرور** — کد ملی ۱۰ رقمی، نام/کلاس، سقف زمان آزمون، اندازه بدنه (`256kb`)
- ✅ **هویت از حساب، نه از کلاینت** — اگر دانش‌آموز وارد شده باشد، نام/کد ملی از پروفایل خوانده می‌شود
- ✅ **پاسخ‌های صحیح در API عمومی وجود ندارد** — نه در فهرست و نه در تک‌آزمون
- ✅ **رمز عبور با bcrypt در users-permissions** (نه پیاده‌سازی دستی)؛ پیام خطای یکسان
  برای «کاربر ناموجود» و «رمز غلط» تا کد ملی کسی لو نرود
- ✅ **جداسازی نقش‌ها** — دانش‌آموز هیچ‌وقت به کارنامه‌های دیگران یا API دبیر دسترسی ندارد؛
  هویت از روی توکن سرور خوانده می‌شود، نه از ورودی فرم
- ✅ **کارنامه‌ها فقط برای دبیر** — مسیر هسته‌ی `submissions` بدون JWT دبیر ۴۰۳ می‌دهد
- ✅ **نشست دبیر و دانش‌آموز در کوکی httpOnly** — هیچ توکنی در `localStorage` نیست
  (ضد XSS) و با توکن تازه‌سازی به‌صورت شفاف و بدون خروج کاربر تمدید می‌شود

---

## 🧪 بررسی سریع سلامت سامانه

```bash
# فهرست آزمون‌های عمومی (نباید هیچ correctOption داشته باشد)
curl -s http://127.0.0.1:1337/api/quiz-public | head -c 300

# ورود دانش‌آموز نمونه
curl -s -X POST http://127.0.0.1:3000/api/student/login \
  -H 'Content-Type: application/json' \
  -d '{"nationalCode":"0012345678","password":"student1234"}'

# ورود دبیر
curl -s -X POST http://127.0.0.1:3000/api/teacher/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"teacher@helli.ir","password":"teacher1234"}'

# مسیر کامل دانش‌آموز: ثبت‌نام → نشست → کارنامه
curl -s -c jar.txt -X POST http://127.0.0.1:3000/api/student/register \
  -H 'Content-Type: application/json' \
  -d '{"fullName":"سارا رضایی","studentClass":"نهم ۲","nationalCode":"1234567890","password":"sara12345"}'
curl -s -b jar.txt http://127.0.0.1:3000/api/student/me | head -c 300

# نقش دانش‌آموز نباید به API دبیر دسترسی داشته باشد (باید 403 باشد)
curl -s -o /dev/null -w '%{http_code}\n' -b jar.txt http://127.0.0.1:3000/api/strapi/submissions
```

---

## 📁 ساختار پروژه

```
helliquiz/
├── backend/                       # Strapi 5
│   ├── config/                    # server, database, middlewares (CORS + rate-limit), plugins
│   └── src/
│       ├── api/
│       │   ├── quiz/              # کنترلر تصحیح + API عمومی آزمون
│       │   ├── question/          # سؤال‌ها
│       │   └── submission/        # کارنامه‌ها + مسیرهای student-auth (ثبت‌نام/من)
│       ├── extensions/
│       │   └── users-permissions/  # فیلدهای دانش‌آموز روی کاربر (نام، کلاس، کد ملی)
│       ├── middlewares/rate-limit.ts
│       └── index.ts               # نقش‌ها، مجوزها، نقش پیش‌فرض + داده‌ی نمایشی
├── frontend/                      # Next.js 16 (App Router)
│   └── src/
│       ├── app/
│       │   ├── page.tsx           # فهرست آزمون‌ها
│       │   ├── quiz/[id]/         # محیط آزمون
│       │   ├── student/           # پنل دانش‌آموز
│       │   ├── teacher/           # پنل دبیر
│       │   └── api/               # پروکسی strapi + مسیرهای نشست دانش‌آموز
│       ├── components/
│       │   ├── student/           # StudentAuth, StudentDashboard
│       │   ├── QuizRunner.tsx
│       │   └── MathRenderer.tsx   # رندر $...$ و $$...$$
│       └── lib/                   # api, auth (کوکی/توکن), student-api, student-session
└── package.json                   # اسکریپت‌های کمکی ریشه (setup / dev:*)
```

> 🧹 دارایی‌های بسته‌ی طراحی `ui-ux-pro-max` (پوشه‌ی `.uiux-skill/` و فایل zip) در
> `.gitignore` قرار گرفتند و **از مخزن خارج شدند** (حدود ۳۱ مگابایت سبک‌تر شد)،
> اما فایل‌ها روی دیسک دست‌نخورده باقی مانده‌اند.

---

## 🩺 عیب‌یابی

| نشانه | علت / راه‌حل |
| --- | --- |
| صفحه می‌گوید «آزمون فعالی یافت نشد» | Strapi بالا نیست یا `STRAPI_INTERNAL_URL` اشتباه است |
| `403 Forbidden` روی `/api/questions` یا `/api/submissions` | نرمال است؛ فقط دبیر دسترسی دارد. مجوزها در بوت‌استرپ خودکار ساخته می‌شوند |
| دانش‌آموز وارد می‌شود ولی «کارنامه‌ای ثبت نشده» می‌بیند | کد ملی حساب با `nationalCode` کارنامه یکی نیست؛ در `/admin` اصلاح کنید |
| ثبت‌نام می‌گوید کد ملی تکراری است (۴۰۹) | همان کد ملی از قبل در `User` وجود دارد؛ از فرم ورود استفاده کنید یا در `/admin` رمز را عوض کنید |
| `429 Too Many Requests` | محدودیت نرخ فعال شده؛ چند دقیقه صبر کنید یا `RATE_LIMIT_MAX` را بالا ببرید |
| کارنامه ذخیره نمی‌شود | احتمالاً قبلاً ثبت شده (۴۰۹) یا کد ملی نامعتبر است (۴۰۰) |
| `npm install` روی better-sqlite3 شکست می‌خورد | `npm_config_nodedir=/usr/local npm_config_build_from_source=true npm install` |
| پنل ادمین Strapi خالی است | برای اولین بار باید ادمین بسازید: `npm run strapi admin:create-user` |
