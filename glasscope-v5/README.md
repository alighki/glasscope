# 🔭 Glasscope v5.0 — AI Website Intelligence Platform

## نصب سریع

```bash
npm install
npm run dev
```

## نصب Playwright (برای Screenshot و Core Web Vitals واقعی)

```bash
npm install playwright
npx playwright install chromium
```

## Deploy

```bash
npm run build
npm start
```

## قابلیت‌های v5

### ✅ Feature 1 — مانیتورینگ سلامت سایت
- اضافه کردن سایت برای مانیتور مداوم
- بررسی دستی یا خودکار
- تشخیص تغییرات امتیاز
- هشدار افت امتیاز
- نمودار تاریخچه امتیاز

### ✅ Feature 2 — ردیابی رقبا
- اضافه کردن تا ۵ رقیب
- مقایسه امتیاز شاخص به شاخص
- تشخیص جهشی رقیب
- تاریخچه امتیاز رقیب

### ✅ Feature 3 — گزارش عمومی قابل اشتراک
- لینک عمومی /report/{id}
- SEO optimized
- Open Graph برای شبکه‌های اجتماعی
- دکمه اشتراک با clipboard

### ✅ Feature 4 — کد پاداش (Promo)
- سیستم کد امن با hash رمزنگاری‌شده
- فرمت GLS-XXXX-XXXX-XXXX
- تک‌بار مصرف، دارای تاریخ انقضا
- Rate limiting برای جلوگیری از brute force
- ۳۰ روز دسترسی Premium

### ✅ Feature 5 — Benchmark صنعتی
- مقایسه با SaaS، Ecommerce، Blog، Startup، News
- رتبه‌بندی درصدی
- نمایش "بهتر از X٪ سایت‌ها"

### ✅ Crawler 3-Stage
- Stage 1: HTTP سریع
- Stage 2: Playwright render
- Stage 3: Deep adaptive
- Failover خودکار بین مراحل

## ساختار

```
pages/
  index.js              ← صفحه اصلی
  dashboard.js          ← داشبورد مانیتورینگ
  report/[id].js        ← گزارش عمومی
  api/
    analyze.js          ← آنالیز اصلی
    monitor.js          ← مانیتورینگ
    competitor.js       ← رقبا
    promo.js            ← کد پاداش
    report.js           ← گزارش‌ها
    export.js           ← خروجی JSON
lib/
  store.js              ← پایگاه داده in-memory (DB-ready)
  crawler.js            ← Crawler سه مرحله‌ای
  ruleEngine.js         ← موتور ۱۲ شاخصی
  stackDetector.js      ← تشخیص ۳۵+ فناوری
  ssrf.js               ← محافظت امنیتی
  i18n.js               ← فارسی/انگلیسی
components/
  UI.js                 ← کامپوننت‌های مشترک
  Particles.js          ← پس‌زمینه سه‌بعدی
```

## توجه

`lib/store.js` یک پایگاه داده in-memory است که با restart ریست می‌شود.
برای production، توابع `Users`, `Monitors`, `Competitors`, `Reports`, `Promos`
را با PostgreSQL / Redis جایگزین کنید — interface یکسان است.
