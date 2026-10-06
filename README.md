# مسیرنما

ابزار شناخت و توسعه سازمانی — ۱۲ سؤال تشریحی کوتاه (فارسی، RTL) با ورود و ذخیره‌سازی سمت سرور.

ساختار و استاندارد پروژه هم‌راستا با [`belbin-assessment`](https://github.com/mshq78/belbin-assessment) است:
React 19 + Vite + Tailwind 4 در فرانت‌اند، و یک تابع Serverless روی Vercel با دیتابیس Neon Postgres در بک‌اند.

## ساختار

```
api/login.ts                 ورود: شماره تماس + کد ملی (فقط افراد ثبت‌شده در فهرست)
api/participants.ts          مدیریت فهرست شرکت‌کنندگان (فقط ادمین)
api/analysis.ts              تحلیل پاسخ‌ها با Claude و گزارش (فقط ادمین)
api/sessions.ts              ثبت نهایی (POST) · فهرست فقط برای ادمین (GET)
src/
  App.tsx, main.tsx          HashRouter + ErrorBoundary + SurveyProvider
  config.ts, config/brand.ts ثابت‌ها و برند
  content/ui.fa.ts           همه متن‌های رابط و متن رضایت‌نامه
  context/SurveyContext.tsx  وضعیت جلسه، پیش‌نویس، ثبت نهایی
  services/api.ts            فراخوانی API
  storage.ts                 پیش‌نویس روی دستگاه (localStorage، پیشوند masirnama:)
  questions.ts, countChars.ts  بانک سؤال و قواعد شمارش کاراکتر
  features/{start,question,review,done,admin}
  components/, styles/tokens.css, utils/, test/
public/                      فونت Vazirmatn، favicon، manifest
```

## اجرا

```bash
npm install
npm run dev        # فقط فرانت‌اند (روی :3000)؛ API در دسترس نیست
npx vercel dev     # فرانت‌اند + API (نیاز به DATABASE_URL و ADMIN_PASSWORD)
npm run lint       # tsc --noEmit
npm test           # تست‌های واحد
npm run build
```

## متغیرهای محیطی (Vercel)

| نام | توضیح |
| --- | --- |
| `DATABASE_URL` | رشته اتصال Neon (با اتصال Vercel ↔ Neon خودکار تنظیم می‌شود) |
| `ADMIN_PASSWORD` | گذرواژه پنل مدیریت (`#/admin`)؛ فقط سمت سرور |
| `ANTHROPIC_API_KEY` | کلید Claude API برای تحلیل (فقط سمت سرور) |
| `ANALYSIS_MODEL` | (اختیاری) مدل تحلیل؛ پیش‌فرض `claude-opus-5-5` |
| `PARTICIPANT_TOKEN_SECRET` | (اختیاری) کلید HMAC برای ساخت توکن شرکت‌کننده؛ اگر نباشد از `ADMIN_PASSWORD` استفاده می‌شود |

جدول `masirnama_sessions` در اولین درخواست خودکار ساخته می‌شود.

## حساب شرکت‌کنندگان

مدیر پیش از شروع، شرکت‌کنندگان را در `#/admin` ← «شرکت‌کنندگان» ثبت می‌کند:

- **با فایل اکسل (.xlsx):** سطر عنوان باید ستون‌های «نام»، «نام خانوادگی»، «کد ملی» و «تلفن همراه» را داشته باشد؛ بقیهٔ ستون‌ها (مثل «ردیف») نادیده گرفته می‌شوند. پیش از افزودن، پیش‌نمایش و خطای هر ردیف نمایش داده می‌شود.
- **تکی:** فرم افزودن در همان صفحه.

شرکت‌کننده با **شماره تماس (نام کاربری)** و **کد ملی (رمز عبور)** وارد می‌شود و فقط افراد ثبت‌شده می‌توانند وارد شوند.
کد ملی هیچ‌جا ذخیره نمی‌شود؛ سرور فقط یک توکن HMAC از آن می‌سازد.

## تحلیل پاسخ‌ها

در `#/admin` ← «جلسه‌های ثبت‌شده» برای هر جلسه دکمهٔ «تحلیل» (یا «تحلیل همهٔ جلسه‌های تحلیل‌نشده») هست. روش تحلیل قابل انتخاب است: خودکار با هوش مصنوعی، قاعده‌محور (بدون هیچ اتصال بیرونی، تقریبی) یا دستی (امتیازدهی تحلیل‌گر). گزارش (شش شاخص، شاخص ترکیبی، شواهد، هشدارهای کیفیت و خلاصهٔ مدیریتی) فقط در پنل ادمین دیده می‌شود. همهٔ قواعد امتیازدهی فقط در `api/analysis.ts` (سرور) است و در بستهٔ مرورگر نیست.

جزئیات تصمیم‌های طراحی در [ASSUMPTIONS.md](./ASSUMPTIONS.md).
