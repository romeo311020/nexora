# تفعيل تسجيل الدخول بجوجل على GitHub Pages

## ✅ خطوة واحدة بس متبقية

الـ Client ID بتاعك متحطوط بالفعل في `data.json`:
```
158260704766-3j0udrn6iap31k6ojs7tu522ijn4v88s.apps.googleusercontent.com
```

**لازم بس تضيف رابط موقعك في إعدادات جوجل:**

1. روح https://console.cloud.google.com/apis/credentials
2. دوس على الـ OAuth Client اللي أنشأته.
3. في خانة **Authorized JavaScript origins**، ضيف بالظبط:
   ```
   https://username.github.io
   ```
   (استبدل `username` باسم حسابك الحقيقي على GitHub — من غير اسم الريبو، ومن غير سلاش في الآخر)
4. احفظ (Save).

⚠️ **مهم جداً:** طالما تطبيقك على **Google Auth Platform** لسه في وضع الاختبار (Testing)، فقط الإيميلات المضافة في **Test users** (تحت OAuth consent screen) هي اللي هتقدر تسجل دخول. لو عايز أي حد يسجل دخول، لازم تنشر التطبيق (Publish App) من نفس الصفحة.

---

## ارفع الملفات على GitHub

```
git add data.json index.html
git commit -m "تفعيل تسجيل الدخول بجوجل"
git push
```

بعد شوية (GitHub Pages بياخد دقيقة أو اتنين ينشر)، افتح موقعك وجرب الزرار.

---

## ملاحظات

- **جوجل مش هيشتغل على `localhost` أو لو فتحت الملف مباشرة من جهازك (`file://`)** — لازم يكون على الدومين المسجل بالظبط.
- لو غيّرت اسم حسابك أو حاولت تستخدم دومين مخصص، لازم ترجع تحدّث Authorized origins بالدومين الجديد.
- ملف `data.json` فيه بس الـ Client ID (عام وآمن يظهر)، ومفيهوش الـ Client Secret خالص — وده مقصود ومهم.
