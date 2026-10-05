# مسیرنما

ابزار شناخت و توسعه سازمانی: ۱۲ سؤال تشریحی کوتاه (فارسی، RTL) با ذخیره‌سازی سمت سرور.

ساختار و استاندارد پروژه هم‌راستا با [`belbin-assessment`](https://github.com/mshq78/belbin-assessment) است:
React 19 + Vite + Tailwind 4 در فرانت‌اند، و یک تابع Serverless روی Vercel با دیتابیس Neon Postgres در بک‌اند.

## ساختار

```
api/sessions.ts              بک‌اند (Vercel Function): POST ثبت نهایی · GET فقط ادمین
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

جدول `masirnama_sessions` در اولین درخواست خودکار ساخته می‌شود.

## لینک دعوت

هر شرکت‌کننده با لینک اختصاصی `https://<دامنه>/?t=<توکن>` وارد می‌شود. هر توکن فقط یک‌بار می‌تواند ثبت نهایی کند.
بدون `t` یک توکن دمو ساخته می‌شود.

جزئیات تصمیم‌های طراحی در [ASSUMPTIONS.md](./ASSUMPTIONS.md).
