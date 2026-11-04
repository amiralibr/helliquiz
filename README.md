# 🎓 حلی‌کوئیز | HelliQuiz

سامانه‌ی کامل برگزاری آزمون‌های آنلاین دبیرستان **علامه حلی ۵** — فارسی، راست‌به‌چپ و با پشتیبانی کامل از فرمول‌های ریاضی (KaTeX).

| نقش | امکانات |
| --- | --- |
| 🧑‍🎓 **دانش‌آموز** | ثبت‌نام/ورود با کد ملی، شرکت در آزمون با تایمر، دیدن درصد و نمره، **کارنامه‌ی کامل با پاسخ‌نامه‌ی تفکیکی (درست/غلط)** |
| 🧑‍🏫 **دبیر** | ورود امن، مشاهده و ویرایش کارنامه‌ها، ساخت/ویرایش/حذف آزمون و سؤال، آمار کلاس |
| 🛠 **مدیر (Strapi Admin)** | مدیریت کامل داده‌ها، نقش‌ها و تنظیمات |

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
| `JWT_SECRET` | کلید توکن دبیران (users-permissions) | — |
| `STUDENT_TOKEN_SECRET` | کلید امضای توکن دانش‌آموز | اولین `APP_KEYS` |
| `DATABASE_CLIENT` | `sqlite` \| `postgres` \| `mysql` | `sqlite` |
| `DATABASE_FILENAME` | مسیر فایل SQLite | `.tmp/data.db` |
| `CORS_ORIGINS` | دامنه‌های مجاز (کاما) | `*` |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` | پنجره و سقف نرخ درخواست عمومی | `60000` / `300` |
| `SEED_DEMO` | ساخت داده و حساب‌های نمونه | `false` |

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
Student                          (نام، کلاس، کد ملی یکتا، هش رمز عبور scrypt)
```

- **`correctOption`**: ایندکس صفر-بیس گزینه‌ی صحیح (`0` یعنی گزینه اول). فیلد قدیمی
  `correctAnswer` (یک-بیس) فقط برای سازگاری خوانده می‌شود.
- **`submissionKey`**: ترکیب `documentId آزمون + کد ملی` با **ایندکس یکتا در دیتابیس** →
  هر دانش‌آموز هر آزمون را فقط یک بار می‌تواند ثبت کند.
- **`passwordHash` / `passwordSalt`**: با `scrypt`؛ هرگز از هیچ API‌ای بیرون نمی‌رود
  (content-type دانش‌آموز هیچ مسیر عمومی CRUD ندارد).

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
| `POST` | `/api/student-auth/register` | ثبت‌نام با نام، کلاس، کد ملی و رمز (حداقل ۸ نویسه) |
| `POST` | `/api/student-auth/login` | ورود؛ توکن HMAC-SHA256 با انقضای ۳۰ روز |
| `GET` | `/api/student-auth/me` | پروفایل + همه‌ی کارنامه‌های خودش با جزئیات |

در سمت Next:
`POST /api/student/login`، `POST /api/student/register`، `POST /api/student/logout`، `GET /api/student/me`
— توکن در کوکی **httpOnly** نگه‌داری می‌شود و جاوااسکریپت به آن دسترسی ندارد.

### دبیر (JWT از `POST /api/auth/local`)
`/api/quizzes`, `/api/questions`, `/api/submissions` — CRUD کامل با JWT.
پاسخ صحیح سؤال‌ها **فقط** برای دبیر احراز هویت‌شده در خروجی وجود دارد.

### پروکسی Next
هر مسیر `/api/strapi/*` مستقیماً به همان مسیر در Strapi منتقل می‌شود
(هدر `Authorization` و IP واقعی کلاینت حفظ می‌شوند).

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
- ✅ **رمز عبور با scrypt + نمک تصادفی** و مقایسه‌ی زمان-ثابت؛ پیام خطای یکسان برای
  «کاربر ناموجود» و «رمز غلط»
- ✅ **کارنامه‌ها فقط برای دبیر** — مسیر هسته‌ی `submissions` بدون JWT دبیر ۴۰۳ می‌دهد

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
curl -s -X POST http://127.0.0.1:3000/api/strapi/auth/local \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"teacher@helli.ir","password":"teacher1234"}'
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
│       │   ├── submission/        # کارنامه‌ها (فقط دبیر)
│       │   └── student/           # حساب دانش‌آموز + مسیرهای student-auth
│       ├── middlewares/rate-limit.ts
│       └── index.ts               # مجوزهای پیش‌فرض + داده‌ی نمایشی
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
│       └── lib/                   # api, student-api, student-session
└── .uiux-skill/                   # بسته‌ی طراحی ui-ux-pro-max (دست‌نخورده)
```

> 🧹 دارایی‌های `ui-ux-pro-max` (پوشه‌ی `.uiux-skill/` و فایل zip) عمداً دست‌نخورده
> مانده‌اند. پیشنهاد می‌شود در آینده از مخزن خارج شوند (حدود ۳۱ مگابایت).

---

## 🩺 عیب‌یابی

| نشانه | علت / راه‌حل |
| --- | --- |
| صفحه می‌گوید «آزمون فعالی یافت نشد» | Strapi بالا نیست یا `STRAPI_INTERNAL_URL` اشتباه است |
| `403 Forbidden` روی `/api/questions` | نرمال است؛ فقط دبیر دسترسی دارد. مجوزها در بوت‌استرپ خودکار ساخته می‌شوند |
| `429 Too Many Requests` | محدودیت نرخ فعال شده؛ چند دقیقه صبر کنید یا `RATE_LIMIT_MAX` را بالا ببرید |
| کارنامه ذخیره نمی‌شود | احتمالاً قبلاً ثبت شده (۴۰۹) یا کد ملی نامعتبر است (۴۰۰) |
| `npm install` روی better-sqlite3 شکست می‌خورد | `npm_config_nodedir=/usr/local npm_config_build_from_source=true npm install` |
| پنل ادمین Strapi خالی است | برای اولین بار باید ادمین بسازید: `npm run strapi admin:create-user` |
