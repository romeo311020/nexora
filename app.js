// تحميل كل شاشة (قسم) من ملفها المنفصل جوه screens/ وحقنها داخل الحاوية الفاضية في index.html
const SCREEN_NAMES = ['auth', 'dashboard', 'subjects', 'subject-detail', 'ai', 'books', 'planner', 'courses', 'lecture', 'profile'];

async function loadScreens() {
  await Promise.all(SCREEN_NAMES.map(async (name) => {
    const el = document.getElementById('screen-' + name);
    if (!el) return;
    try {
      const res = await fetch(`screens/${name}.html`, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      el.innerHTML = await res.text();
    } catch (err) {
      console.error('تعذر تحميل القسم:', name, err);
      el.innerHTML = '<div class="glass-card" style="text-align:center; color:var(--muted); padding:30px;">تعذر تحميل هذا القسم، تأكد من رفع فولدر screens/ بجانب index.html.</div>';
    }
  }));
}

const USERS_KEY = 'eduvo_users_v1';
    const SESSION_KEY = 'eduvo_session_v1';
    const SETTINGS_KEY = 'eduvo_settings_v1';

    // كل البيانات القابلة للتغيير (Client ID، المواد، المدرسين، الكتب) بقت في data.json
    // مفيش أي بيانات حساسة أو محتوى ثابت هنا في index.html خالص
    let appConfig = { googleClientId: '', aiEndpoint: '', supabaseUrl: '', supabaseAnonKey: '', subjects: [], teachers: [], books: [], freeCourses: [], app: {} };

    async function loadAppConfig() {
      try {
        const res = await fetch('data.json', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          appConfig = { ...appConfig, ...data };
          const flatTeachers = appConfig.teachers || [];
          subjects = (appConfig.subjects || []).map(subject => ({
            ...subject,
            teachers: flatTeachers.filter(t => t.subjectId === subject.id)
          }));
        }
      } catch (err) {
        console.warn('تعذر تحميل data.json — تأكد إنه في نفس مجلد index.html', err);
      }
    }

    let googleSdkLoading = false;

    // بيانات المواد والمدرسين بقت في data.json
    let subjects = [];

    // بيانات الكتب بقت في data.json (appConfig.books)

    const aiKnowledge = {
      math: [
        { keywords: ['معادلة', 'المعادلات', 'مجهول'], reply: 'لحل معادلة من الدرجة الأولى: اجمع كل حدود المجهول في طرف والأعداد في الطرف الآخر، ثم اقسم على معامل المجهول. مثال: 2س + 4 = 10 → 2س = 6 → س = 3.' },
        { keywords: ['هندسة', 'مثلث', 'زاوية', 'محيط', 'مساحة'], reply: 'في الهندسة: محيط المستطيل = 2×(الطول+العرض)، مساحته = الطول×العرض. مجموع زوايا أي مثلث = 180°. اكتب المعطيات على شكل رسم يساعدك تشوف العلاقة بسهولة.' },
        { keywords: ['تفاضل', 'مشتقة'], reply: 'المشتقة بتقيس معدل تغيّر الدالة. القاعدة الأساسية: مشتقة س^ن = ن×س^(ن-1). ابدأ دايمًا بتبسيط الدالة قبل ما تشتق.' },
        { keywords: ['تكامل'], reply: 'التكامل هو عكس التفاضل. تكامل س^ن = س^(ن+1)/(ن+1) + ثابت. لا تنسَ إضافة ثابت التكامل (+C) في التكامل غير المحدود.' },
        { keywords: ['كسر', 'كسور'], reply: 'لجمع أو طرح الكسور لازم تتحد المقامات أولاً (بإيجاد المضاعف المشترك الأصغر)، وبعدين تجمع أو تطرح البسوط فقط.' },
        { keywords: ['نسبة مئوية', 'نسبة%', '%'], reply: 'النسبة المئوية = (الجزء ÷ الكل) × 100. لو عايز تحسب جزء من نسبة: القيمة = (النسبة ÷ 100) × الكل.' }
      ],
      physics: [
        { keywords: ['نيوتن', 'قانون الحركة', 'قوة'], reply: 'قانون نيوتن الثاني: القوة = الكتلة × التسارع (ق = ك×ت). كل ما زادت الكتلة، احتجت قوة أكبر لنفس التسارع.' },
        { keywords: ['سرعة', 'تسارع', 'حركة'], reply: 'السرعة = المسافة ÷ الزمن. التسارع = التغير في السرعة ÷ الزمن. لو السرعة ثابتة، التسارع = صفر.' },
        { keywords: ['طاقة', 'شغل'], reply: 'الشغل = القوة × المسافة في اتجاه القوة. الطاقة الحركية = ½×الكتلة×(السرعة)². الطاقة لا تفنى ولا تستحدث، بس بتتحول من شكل لآخر.' },
        { keywords: ['كهرباء', 'دائرة', 'مقاومة', 'تيار'], reply: 'قانون أوم: الجهد = التيار × المقاومة (ف = ت×م). في التوصيل على التوالي المقاومة الكلية = مجموع المقاومات. في التوازي، مقلوب المقاومة الكلية = مجموع مقلوب كل مقاومة.' },
        { keywords: ['ضوء', 'انعكاس', 'انكسار'], reply: 'قانون الانعكاس: زاوية السقوط = زاوية الانعكاس. الانكسار بيحصل لما الضوء ينتقل بين وسطين مختلفي الكثافة، والسرعة والاتجاه بيتغيروا.' }
      ],
      chem: [
        { keywords: ['رابطة', 'تساهمية', 'أيونية'], reply: 'الرابطة التساهمية بتحصل بمشاركة إلكترونات بين ذرتين لا فلزيتين. الرابطة الأيونية بتحصل بانتقال إلكترون من فلز إلى لا فلز، فبيتكون أيون موجب وأيون سالب.' },
        { keywords: ['ذرة', 'عدد ذري', 'عدد كتلي', 'بروتون', 'إلكترون'], reply: 'العدد الذري = عدد البروتونات في النواة، وهو اللي بيحدد نوع العنصر. العدد الكتلي = عدد البروتونات + عدد النيوترونات.' },
        { keywords: ['تفاعل', 'موازنة معادلة'], reply: 'لموازنة معادلة كيميائية: تأكد إن عدد ذرات كل عنصر متساوي في الطرفين، وده بضبط المعاملات (الأرقام قبل الصيغ) مش الأرقام السفلية داخل الصيغة.' },
        { keywords: ['حمض', 'قاعدة', 'رقم هيدروجيني', 'ph'], reply: 'الحمض بيطلق أيونات هيدروجين موجبة (H+) في الماء. الرقم الهيدروجيني (pH) من 0 إلى 14: أقل من 7 حمضي، 7 متعادل، أكبر من 7 قاعدي.' },
        { keywords: ['جدول دوري', 'عنصر'], reply: 'الجدول الدوري مرتب حسب العدد الذري تصاعديًا. العناصر في نفس المجموعة (العمود) لها نفس عدد إلكترونات التكافؤ، فبيكون لها خواص كيميائية متشابهة.' }
      ],
      arabic: [
        { keywords: ['فعل', 'مضارع', 'ماضي', 'أمر'], reply: 'الفعل الماضي يدل على حدث انتهى (كتبَ). المضارع يدل على حدث حاضر أو مستقبل (يكتبُ) ويبدأ بحرف من "أنيت". فعل الأمر يطلب حدوث الفعل (اكتبْ).' },
        { keywords: ['جملة اسمية', 'مبتدأ', 'خبر'], reply: 'الجملة الاسمية تبدأ باسم، وتتكون من مبتدأ (الاسم الأول) وخبر (يكمل المعنى). مثال: "الطالبُ مجتهدٌ" — الطالب مبتدأ، مجتهد خبر.' },
        { keywords: ['جملة فعلية', 'فاعل', 'مفعول'], reply: 'الجملة الفعلية تبدأ بفعل، وتتكون من فعل وفاعل (من قام بالفعل)، وقد يأتي بعدها مفعول به (وقع عليه الفعل). مثال: "أكل الولدُ التفاحةَ".' },
        { keywords: ['إعراب'], reply: 'لإعراب أي كلمة: حدد نوعها (اسم/فعل/حرف) ثم موقعها في الجملة (فاعل، مفعول، مبتدأ...) ثم العلامة الإعرابية المناسبة (ضمة، فتحة، كسرة، سكون).' },
        { keywords: ['بلاغة', 'تشبيه', 'استعارة', 'كناية'], reply: 'التشبيه: مقارنة بين شيئين بأداة تشبيه ووجه شبه. الاستعارة: تشبيه محذوف أحد طرفيه. الكناية: تعبير يُقصد به معنى غير المعنى الحرفي المباشر.' }
      ],
      biology: [
        { keywords: ['خلية', 'نواة', 'غشاء'], reply: 'الخلية هي الوحدة الأساسية للكائن الحي. النواة تحتوي المادة الوراثية (DNA) وتتحكم في نشاط الخلية. الغشاء الخلوي ينظم دخول وخروج المواد.' },
        { keywords: ['بناء ضوئي', 'بلاستيدة خضراء'], reply: 'البناء الضوئي بيحصل في البلاستيدات الخضراء، وبيحول ثاني أكسيد الكربون والماء وضوء الشمس إلى جلوكوز وأكسجين.' },
        { keywords: ['جهاز دوري', 'قلب', 'دم'], reply: 'الجهاز الدوري مسؤول عن نقل الدم والأكسجين والغذاء لكل خلايا الجسم عن طريق القلب والأوعية الدموية.' },
        { keywords: ['وراثة', 'جين', 'صفة سائدة', 'صفة متنحية'], reply: 'الصفة السائدة تظهر حتى لو موجودة نسخة واحدة من الجين المسؤول عنها. الصفة المتنحية تحتاج نسختين من الجين عشان تظهر.' },
        { keywords: ['جهاز عصبي', 'خلية عصبية', 'عصبون'], reply: 'الجهاز العصبي بيتكون من المخ والحبل الشوكي والأعصاب، وبينقل الإشارات الكهربائية بين الخلايا العصبية (العصبونات) بسرعة كبيرة.' }
      ]
    };

    function tryCalculate(text) {
      const cleaned = text.replace(/[×xX]/g, '*').replace(/÷/g, '/');
      const arithMatch = cleaned.match(/^[\s\d+\-*/().]+$/);
      if (arithMatch && /\d/.test(cleaned) && /[+\-*/]/.test(cleaned)) {
        try {
          const result = Function('"use strict"; return (' + cleaned + ')')();
          if (typeof result === 'number' && isFinite(result)) {
            return `الناتج = ${Number(result.toFixed(6)).toString().replace(/\.0+$/, '')}`;
          }
        } catch { /* ليست عملية حسابية صحيحة */ }
      }
      return null;
    }

    function trySolveLinearEquation(text) {
      const normalized = text.replace(/×/g, '*').replace(/÷/g, '/');
      const match = normalized.match(/(-?\d*\.?\d*)\s*([a-zA-Zأ-ي])\s*([+-]\s*\d+\.?\d*)?\s*=\s*(-?\d+\.?\d*)/);
      if (!match) return null;

      let [, coefRaw, , addRaw, rhsRaw] = match;
      const coef = coefRaw === '' || coefRaw === '-' ? (coefRaw === '-' ? -1 : 1) : parseFloat(coefRaw);
      const add = addRaw ? parseFloat(addRaw.replace(/\s/g, '')) : 0;
      const rhs = parseFloat(rhsRaw);

      if (coef === 0 || isNaN(coef) || isNaN(rhs)) return null;

      const x = (rhs - add) / coef;
      return `حل المعادلة: المجهول = ${Number(x.toFixed(4)).toString().replace(/\.0+$/, '')}`;
    }

    function generateSmartReply(rawText) {
      const calcResult = tryCalculate(rawText);
      if (calcResult) return calcResult;

      const eqResult = trySolveLinearEquation(rawText);
      if (eqResult) return eqResult;

      const text = rawText.toLowerCase();
      const greetings = ['السلام عليكم', 'مرحبا', 'اهلا', 'أهلا', 'هاي', 'ازيك'];
      if (greetings.some(g => text.includes(g))) {
        return 'أهلاً بيك! اسألني عن أي موضوع في الرياضيات، الفيزياء، الكيمياء، العربية، أو الأحياء، أو اكتبلي عملية حسابية وهحلها لك.';
      }

      for (const subjectId in aiKnowledge) {
        for (const item of aiKnowledge[subjectId]) {
          if (item.keywords.some(k => text.includes(k))) {
            return item.reply;
          }
        }
      }

      return 'قسّم سؤالك لثلاث خطوات: (1) ما المطلوب بالضبط؟ (2) ما المعطيات المتاحة؟ (3) ما القانون أو القاعدة المناسبة؟ لو حددت مادة السؤال (رياضيات، فيزياء، كيمياء، عربي، أحياء) هقدر أساعدك بشكل أدق. تقدر كمان تكتب معادلة أو عملية حسابية وهحلها لك مباشرة.';
    }

    const state = { user: null };

    function getUsers() {
      try { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); }
      catch { return []; }
    }

    function saveUsers(data) {
      localStorage.setItem(USERS_KEY, JSON.stringify(data));
    }

    function getSettings() {
      const defaults = { theme: 'dark', language: 'ar', layout: 'mobile' };
      try { return { ...defaults, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') }; }
      catch { return defaults; }
    }

    function saveSettings(data) {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
    }

    function saveSession(user) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    }

    function clearSession() {
      localStorage.removeItem(SESSION_KEY);
    }

    function showMessage(message, type = 'success') {
      const existing = document.querySelector('.toast');
      if (existing) existing.remove();
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.textContent = message;
      toast.style.position = 'fixed';
      toast.style.top = '20px';
      toast.style.right = '20px';
      toast.style.zIndex = '9999';
      toast.style.padding = '14px 18px';
      toast.style.borderRadius = '12px';
      toast.style.background = type === 'error' ? '#ef4444' : '#10b981';
      toast.style.color = '#fff';
      toast.style.fontWeight = '700';
      toast.style.boxShadow = '0 18px 40px rgba(0,0,0,0.2)';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2600);
    }

    function sanitizePhone(value) {
      return (value || '').replace(/[^0-9]/g, '');
    }

    function isValidPhone(phone) {
      const digits = sanitizePhone(phone);
      return /^(010|011|012|015)\d{8}$/.test(digits);
    }

    function authTab(tab) {
      const loginForm = document.getElementById('login-form');
      const signupForm = document.getElementById('signup-form');
      const buttons = document.querySelectorAll('.auth-tab');
      buttons.forEach(btn => btn.classList.toggle('active', btn.dataset.authTab === tab));
      loginForm.classList.toggle('active', tab === 'login');
      signupForm.classList.toggle('active', tab === 'signup');
      loginForm.style.display = tab === 'login' ? 'block' : 'none';
      signupForm.style.display = tab === 'signup' ? 'block' : 'none';
    }

    function applySettings() {
      const settings = getSettings();
      document.body.classList.toggle('light-theme', settings.theme === 'light');
      const themeSelect = document.getElementById('theme-select');
      const layoutSelect = document.getElementById('layout-select');
      if (themeSelect) themeSelect.value = settings.theme;
      if (layoutSelect) layoutSelect.value = settings.layout;
    }

    function renderSubjects() {
      const container = document.getElementById('subjects-grid');
      if (!container) return;
      container.innerHTML = subjects.map((subject, i) => `
        <div class="subject-card fade-in-up" style="animation-delay:${i * 0.06}s;" data-subject-id="${subject.id}">
          <div style="font-size:2.1rem;">${subject.icon}</div>
          <div style="font-size:1.2rem; font-weight:800;">${subject.name}</div>
          <div style="color: var(--muted); line-height:1.8;">${subject.description}</div>
          <div style="font-size:0.8rem; color: var(--accent-2); font-weight:700;">${subject.teachers.length} معلم/معلمة متاح</div>
        </div>
      `).join('');

      document.querySelectorAll('.subject-card').forEach(card => {
        card.addEventListener('click', () => showSubjectDetails(card.dataset.subjectId));
      });
    }

    function showSubjectDetails(subjectId) {
      const subject = subjects.find(item => item.id === subjectId);
      const container = document.getElementById('subject-detail-content');
      const title = document.getElementById('subject-detail-title');
      if (!subject || !container || !title) return;

      title.textContent = subject.name;
      container.innerHTML = `
        <div class="subject-feature">
          <div class="subject-feature-icon">${subject.icon}</div>
          <div>
            <span style="font-size:0.8rem; color: var(--accent-2); font-weight:800;">المادة</span>
            <h3>${subject.name}</h3>
            <p style="color: var(--muted); line-height:1.8; margin-top:8px;">${subject.description}</p>
          </div>
        </div>
        <div class="glass-card">
          <h4 style="margin-bottom: 12px;">أفضل المدرسين والمعلمين</h4>
          <div class="teacher-grid">
            ${subject.teachers.map((teacher, i) => `
              <div class="teacher-card fade-in-up" style="animation-delay:${i * 0.08}s;">
                <div class="teacher-head">
                  <img class="teacher-photo" src="${teacher.photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=500&q=80'}" alt="${teacher.name}" onerror="this.src='https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=500&q=80'" />
                  <div>
                    <div class="teacher-name">${teacher.name}</div>
                    <div class="teacher-meta">
                      <span>⭐ ${teacher.rating}</span>
                      <span>${teacher.students} طالب</span>
                    </div>
                  </div>
                </div>
                <p><strong>${teacher.specialty}</strong></p>
                <p>${teacher.style}</p>
                <p>${teacher.nextLesson}</p>
                ${teacher.website ? `<a href="${teacher.website}" target="_blank" rel="noopener" class="teacher-cta">زيارة موقع المدرس</a>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      `;

      setActiveScreen('screen-subject-detail');
    }

    function setActiveScreen(screenId) {
      document.querySelectorAll('.screen').forEach(screen => screen.classList.toggle('active', screen.id === screenId));
      document.querySelectorAll('.nav-item, .sidebar-item').forEach(item => {
        item.classList.toggle('active', item.dataset.target === screenId);
      });
      const topbar = document.getElementById('global-topbar');
      if (topbar) {
        topbar.style.display = screenId === 'screen-auth' ? 'none' : 'block';
      }
      closeGlobalSearchResults();
      closeMobileSidebar();
    }

    function openMobileSidebar() {
      document.querySelector('.sidebar')?.classList.add('mobile-open');
      document.getElementById('sidebar-overlay')?.classList.add('open');
    }

    function closeMobileSidebar() {
      document.querySelector('.sidebar')?.classList.remove('mobile-open');
      document.getElementById('sidebar-overlay')?.classList.remove('open');
    }

    function updateUserProfile() {
      if (!state.user) return;
      const name = state.user.fullName || 'اسم الطالب';
      document.getElementById('dashboard-greeting').textContent = `مرحباً ${name} في EDUVO`;
      document.getElementById('profile-name').textContent = name;
      document.getElementById('profile-phone').textContent = state.user.phone;
      document.getElementById('profile-grade').textContent = state.user.grade;
      document.getElementById('profile-avatar').textContent = name.trim().charAt(0) || 'ع';
    }

    function decodeJwtPayload(token) {
      try {
        const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const json = decodeURIComponent(
          atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
        );
        return JSON.parse(json);
      } catch {
        return null;
      }
    }

    function loginOrCreateSocialUser(fullName, email, provider) {
      if (!email) {
        showMessage('❌ تعذر الحصول على البريد الإلكتروني من الحساب', 'error');
        return;
      }

      const users = getUsers();
      let user = users.find(item => item.email === email && item.provider === provider);
      let isNewUser = false;

      if (!user) {
        isNewUser = true;
        user = {
          id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
          fullName: fullName || 'مستخدم EDUVO',
          email,
          phone: email,
          grade: '',
          provider,
          createdAt: new Date().toISOString()
        };
        users.push(user);
        saveUsers(users);
      }

      state.user = user;
      saveSession(user);
      updateUserProfile();
      showMessage('✅ تم تسجيل الدخول بنجاح', 'success');
      setActiveScreen('screen-dashboard');
      ensureRemindersInterval();
      if (isNewUser) syncStudentToSupabase(user, provider);
    }

    function handleGoogleCredentialResponse(response) {
      const payload = decodeJwtPayload(response.credential);
      if (!payload) {
        showMessage('❌ حدث خطأ أثناء تسجيل الدخول بجوجل', 'error');
        return;
      }
      loginOrCreateSocialUser(payload.name, payload.email, 'google');
    }

    function doGoogleLogin() {
      google.accounts.id.initialize({
        client_id: appConfig.googleClientId,
        callback: handleGoogleCredentialResponse
      });
      google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          showMessage('❌ تعذر فتح نافذة جوجل، تأكد من ضبط googleClientId في data.json وإضافة دومين موقعك في Google Cloud Console', 'error');
        }
      });
    }

    function triggerGoogleLogin() {
      if (!appConfig.googleClientId) {
        showMessage('❌ لم يتم ضبط googleClientId في data.json بعد', 'error');
        return;
      }
      if (window.google && window.google.accounts && window.google.accounts.id) {
        doGoogleLogin();
        return;
      }
      if (googleSdkLoading) return;
      googleSdkLoading = true;

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => { googleSdkLoading = false; doGoogleLogin(); };
      script.onerror = () => {
        googleSdkLoading = false;
        showMessage('❌ تعذر تحميل خدمة تسجيل الدخول بجوجل', 'error');
      };
      document.head.appendChild(script);
    }

    function syncStudentToSupabase(user, provider) {
      if (!appConfig.supabaseUrl || !appConfig.supabaseAnonKey) {
        console.warn('Supabase غير مفعّل بعد (supabaseUrl / supabaseAnonKey فاضيين في data.json) — بيانات الطالب اتحفظت محليًا بس.');
        return;
      }

      fetch(`${appConfig.supabaseUrl}/rest/v1/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': appConfig.supabaseAnonKey,
          'Authorization': `Bearer ${appConfig.supabaseAnonKey}`,
          'Prefer': 'resolution=merge-duplicates,return=minimal'
        },
        body: JSON.stringify({
          id: user.id,
          full_name: user.fullName,
          phone: user.phone || null,
          email: user.email || null,
          grade: user.grade || '',
          provider: provider || 'phone',
          status: 'active'
        })
      }).catch(err => {
        console.warn('تعذر مزامنة بيانات الطالب مع Supabase (الطالب لسه محفوظ محليًا وقادر يستخدم الموقع عادي):', err);
      });
    }

    function handleSignup() {
      const name = document.getElementById('signup-name').value.trim();
      const phone = sanitizePhone(document.getElementById('signup-phone').value);
      const grade = document.getElementById('signup-grade').value;
      const password = document.getElementById('signup-password').value.trim();
      const confirm = document.getElementById('signup-confirm').value.trim();

      if (name.split(/\s+/).length < 3) {
        showMessage('❌ الرجاء إدخال الاسم الثلاثي الكامل', 'error');
        return;
      }
      if (!isValidPhone(phone)) {
        showMessage('❌ رقم الموبايل غير صحيح. مثال: 01027675035', 'error');
        return;
      }
      if (password.length < 6) {
        showMessage('❌ كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error');
        return;
      }
      if (password !== confirm) {
        showMessage('❌ تأكيد كلمة المرور غير متطابق', 'error');
        return;
      }

      const users = getUsers();
      if (users.some(item => item.phone === phone)) {
        showMessage('❌ هذا الرقم مسجل مسبقاً', 'error');
        return;
      }

      const user = {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        fullName: name,
        phone,
        grade,
        password,
        createdAt: new Date().toISOString()
      };

      users.push(user);
      saveUsers(users);
      state.user = user;
      saveSession(user);
      updateUserProfile();
      showMessage('✅ تم إنشاء الحساب بنجاح', 'success');
      setActiveScreen('screen-dashboard');
      ensureRemindersInterval();
      syncStudentToSupabase(user, 'phone');
    }

    function handleLogin() {
      const phone = sanitizePhone(document.getElementById('login-phone').value);
      const password = document.getElementById('login-password').value.trim();

      if (!isValidPhone(phone)) {
        showMessage('❌ رقم الموبايل غير صحيح. مثال: 01027675035', 'error');
        return;
      }
      if (!password) {
        showMessage('❌ أدخل كلمة المرور', 'error');
        return;
      }

      const users = getUsers();
      const match = users.find(item => item.phone === phone && item.password === password);
      if (!match) {
        showMessage('❌ رقم الموبايل أو كلمة المرور غير صحيحة', 'error');
        return;
      }

      state.user = match;
      saveSession(match);
      updateUserProfile();
      showMessage('✅ تم تسجيل الدخول بنجاح', 'success');
      setActiveScreen('screen-dashboard');
      ensureRemindersInterval();
    }

    function handleLogout() {
      state.user = null;
      clearSession();
      document.getElementById('login-form').reset();
      document.getElementById('signup-form').reset();
      showMessage('✅ تم تسجيل الخروج', 'success');
      setActiveScreen('screen-auth');
    }

    function renderBooksScreen() {
      const container = document.getElementById('books-container');
      if (!container) return;

      const books = appConfig.books || [];

      if (!books.length) {
        container.innerHTML = `
          <div class="glass-card" style="text-align:center; color: var(--muted);">
            لا توجد كتب مضافة حالياً. أضف كتبك في ملف data.json.
          </div>
        `;
        return;
      }

      container.innerHTML = `
        <div class="grid-2">
          ${books.map((book, i) => `
            <div class="glass-card fade-in-up" style="animation-delay:${i * 0.06}s;">
              <div style="font-size:2rem; margin-bottom:8px;">📄</div>
              <div style="font-size:1.15rem; font-weight:800; margin-bottom:6px;">${book.title}</div>
              ${book.subjectName ? `<div style="color: var(--accent-2); font-weight:700; font-size:0.85rem; margin-bottom:8px;">${book.subjectName}</div>` : ''}
              ${book.description ? `<p style="color: var(--muted); line-height:1.7; margin-bottom:10px;">${book.description}</p>` : ''}
              ${book.url
                ? `<a href="${book.url}" target="_blank" rel="noopener" class="btn-primary" style="margin-top:8px; display:block; text-align:center; text-decoration:none;">فتح الكتاب PDF</a>`
                : `<button type="button" class="btn-secondary" disabled style="margin-top:8px; opacity:0.6;">لا يوجد رابط بعد</button>`}
            </div>
          `).join('')}
        </div>
      `;
    }

    const PLANNER_DAYS = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
    const ARABIC_MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

    // ===== أدوات مساعدة عامة =====
    function uid() {
      return crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
    }

    function todayISO() {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    function getTodayArabicDay() {
      const map = { 6: 'السبت', 0: 'الأحد', 1: 'الاثنين', 2: 'الثلاثاء', 3: 'الأربعاء', 4: 'الخميس', 5: 'الجمعة' };
      return map[new Date().getDay()];
    }

    function formatArabicDate(date = new Date()) {
      return `${date.getDate()} ${ARABIC_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
    }

    function formatMinutes(totalMinutes) {
      const m = Math.max(0, Math.round(totalMinutes));
      const h = Math.floor(m / 60);
      const rem = m % 60;
      if (h === 0) return `${rem} دقيقة`;
      if (rem === 0) return `${h} ساعة`;
      return `${h} ساعة و${rem} دقيقة`;
    }

    function uidKey(base) {
      return `${base}_${state.user ? state.user.id : 'guest'}`;
    }

    // ===== تخزين المهام =====
    function loadPlannerTasks() {
      try {
        const raw = localStorage.getItem(uidKey('eduvo_planner'));
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    }

    function savePlannerTasks(tasks) {
      localStorage.setItem(uidKey('eduvo_planner'), JSON.stringify(tasks));
    }

    // ===== تخزين الهدف اليومي =====
    function loadDailyGoalMinutes() {
      try {
        const raw = localStorage.getItem(uidKey('eduvo_goal'));
        return raw ? JSON.parse(raw).minutes : 180;
      } catch {
        return 180;
      }
    }

    function saveDailyGoalMinutes(minutes) {
      localStorage.setItem(uidKey('eduvo_goal'), JSON.stringify({ minutes }));
    }

    // ===== تخزين سجل جلسات المذاكرة (لحساب الإحصائيات والسلسلة) =====
    function loadSessions() {
      try {
        const raw = localStorage.getItem(uidKey('eduvo_sessions'));
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    }

    function saveSessions(sessions) {
      localStorage.setItem(uidKey('eduvo_sessions'), JSON.stringify(sessions));
    }

    function logSession(taskId, subjectName, seconds) {
      if (seconds <= 0) return;
      const sessions = loadSessions();
      sessions.push({ date: todayISO(), taskId, subjectName: subjectName || 'عام', seconds });
      saveSessions(sessions);
    }

    // ===== تخزين المهام المكتملة (لكل تاريخ) =====
    function loadCompletions() {
      try {
        const raw = localStorage.getItem(uidKey('eduvo_completions'));
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    }

    function saveCompletions(list) {
      localStorage.setItem(uidKey('eduvo_completions'), JSON.stringify(list));
    }

    function markTaskCompleted(taskId) {
      const completions = loadCompletions();
      const already = completions.some(c => c.taskId === taskId && c.date === todayISO());
      if (!already) {
        completions.push({ taskId, date: todayISO() });
        saveCompletions(completions);
      }
    }

    function unmarkTaskCompleted(taskId) {
      const completions = loadCompletions().filter(c => !(c.taskId === taskId && c.date === todayISO()));
      saveCompletions(completions);
    }

    function isTaskCompletedToday(taskId) {
      return loadCompletions().some(c => c.taskId === taskId && c.date === todayISO());
    }

    // ===== أهداف اليوم / التقدم =====
    function getStudySecondsForDate(dateISO) {
      return loadSessions().filter(s => s.date === dateISO).reduce((sum, s) => sum + s.seconds, 0);
    }

    function isGoalMetOnDate(dateISO, goalMinutes) {
      return getStudySecondsForDate(dateISO) >= goalMinutes * 60;
    }

    // ===== سلسلة الإنجاز =====
    function computeStreak() {
      const goalMinutes = loadDailyGoalMinutes();
      const sessions = loadSessions();
      if (!sessions.length) return { current: 0, best: 0 };

      const dateSet = new Set(sessions.map(s => s.date));
      const sortedDates = [...dateSet].sort();

      // أفضل سلسلة عبر كل السجل
      let best = 0, run = 0, prevDate = null;
      sortedDates.forEach(dateStr => {
        if (!isGoalMetOnDate(dateStr, goalMinutes)) { run = 0; prevDate = dateStr; return; }
        if (prevDate) {
          const diffDays = Math.round((new Date(dateStr) - new Date(prevDate)) / 86400000);
          run = diffDays === 1 ? run + 1 : 1;
        } else {
          run = 1;
        }
        best = Math.max(best, run);
        prevDate = dateStr;
      });

      // السلسلة الحالية (بالرجوع للخلف من اليوم)
      let current = 0;
      let cursor = new Date();
      const todayMet = isGoalMetOnDate(todayISO(), goalMinutes);
      if (!todayMet) cursor.setDate(cursor.getDate() - 1);

      while (true) {
        const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
        if (isGoalMetOnDate(iso, goalMinutes)) {
          current += 1;
          cursor.setDate(cursor.getDate() - 1);
        } else {
          break;
        }
      }

      return { current, best: Math.max(best, current) };
    }

    // ===== المؤقت النشط (مقاوم لتحديث الصفحة والتنقل) =====
    function loadActiveTimer() {
      try {
        const raw = localStorage.getItem(uidKey('eduvo_active_timer'));
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    }

    function saveActiveTimer(timer) {
      if (timer) {
        localStorage.setItem(uidKey('eduvo_active_timer'), JSON.stringify(timer));
      } else {
        localStorage.removeItem(uidKey('eduvo_active_timer'));
      }
    }

    function getRemainingSeconds(timer) {
      if (!timer) return 0;
      if (timer.status === 'running') {
        const elapsed = Math.floor((Date.now() - timer.runningSince) / 1000);
        return Math.max(0, timer.remainingAtPause - elapsed);
      }
      return Math.max(0, timer.remainingAtPause);
    }

    let timerInterval = null;

    function startTimerTick() {
      if (timerInterval) return;
      timerInterval = setInterval(() => {
        const timer = loadActiveTimer();
        if (!timer || timer.status !== 'running') return;

        const remaining = getRemainingSeconds(timer);
        updateTimerDisplay(remaining);

        if (remaining <= 0) {
          finishTask(true);
        }
      }, 1000);
    }

    function updateTimerDisplay(seconds) {
      const el = document.getElementById('timer-display');
      if (!el) return;
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      el.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    function openTimerModalForTask(task, timer) {
      document.getElementById('timer-task-title').textContent = task.title;
      const subject = subjects.find(s => s.id === task.subjectId);
      document.getElementById('timer-subject-icon').textContent = subject ? subject.icon : '📚';
      document.getElementById('timer-task-subtitle').textContent = subject ? subject.name : (task.subjectName || '');
      updateTimerDisplay(getRemainingSeconds(timer));
      document.getElementById('timer-pause-btn').textContent = timer.status === 'running' ? '⏸ إيقاف مؤقت' : '▶ استئناف';
      document.getElementById('timer-modal-overlay').classList.add('open');
    }

    function startTask(taskId) {
      const tasks = loadPlannerTasks();
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      let timer = loadActiveTimer();
      if (!timer || timer.taskId !== taskId) {
        timer = {
          taskId,
          status: 'running',
          remainingAtPause: task.durationMinutes * 60,
          runningSince: Date.now()
        };
      } else if (timer.status === 'paused') {
        timer.status = 'running';
        timer.runningSince = Date.now();
      }
      saveActiveTimer(timer);
      openTimerModalForTask(task, timer);
      startTimerTick();
    }

    function togglePauseTimer() {
      const timer = loadActiveTimer();
      if (!timer) return;

      if (timer.status === 'running') {
        timer.remainingAtPause = getRemainingSeconds(timer);
        timer.status = 'paused';
      } else {
        timer.runningSince = Date.now();
        timer.status = 'running';
      }
      saveActiveTimer(timer);
      document.getElementById('timer-pause-btn').textContent = timer.status === 'running' ? '⏸ إيقاف مؤقت' : '▶ استئناف';
    }

    function finishTask(auto = false) {
      const timer = loadActiveTimer();
      if (!timer) return;

      const tasks = loadPlannerTasks();
      const task = tasks.find(t => t.id === timer.taskId);
      if (task) {
        const remaining = getRemainingSeconds(timer);
        const elapsedSeconds = Math.max(0, task.durationMinutes * 60 - remaining);
        const subject = subjects.find(s => s.id === task.subjectId);
        logSession(task.id, subject ? subject.name : task.subjectName, elapsedSeconds);
        markTaskCompleted(task.id);
      }

      saveActiveTimer(null);
      document.getElementById('timer-modal-overlay').classList.remove('open');

      updateStreakAfterActivity();
      renderPlannerScreen();
      if (!auto) showMessage('✅ تم تسجيل المذاكرة، أحسنت!', 'success');
    }

    function updateStreakAfterActivity() {
      // إعادة الحساب تتم عند renderPlannerScreen تلقائيًا من خلال computeStreak()
    }

    // ===== نموذج إضافة / تعديل مهمة =====
    let editingTaskId = null;

    function populateTaskSubjectSelect() {
      const select = document.getElementById('task-subject');
      if (!select) return;
      select.innerHTML = '<option value="">بدون مادة محددة</option>' +
        subjects.map(s => `<option value="${s.id}">${s.icon} ${s.name}</option>`).join('');
    }

    function openTaskModal(taskId = null) {
      populateTaskSubjectSelect();
      editingTaskId = taskId;

      const titleEl = document.getElementById('task-modal-title');
      const saveBtn = document.getElementById('task-save-btn');

      if (taskId) {
        const task = loadPlannerTasks().find(t => t.id === taskId);
        if (!task) return;
        titleEl.textContent = 'تعديل المهمة';
        saveBtn.textContent = 'حفظ التعديلات';
        document.getElementById('task-subject').value = task.subjectId || '';
        document.getElementById('task-title').value = task.title;
        document.getElementById('task-day').value = task.day;
        document.getElementById('task-repeat').value = String(task.repeatWeekly !== false);
        document.getElementById('task-start').value = task.startTime;
        document.getElementById('task-end').value = task.endTime;
        document.getElementById('task-reminder').value = String(task.reminderMinutes || 0);
        document.getElementById('task-notes').value = task.notes || '';
      } else {
        titleEl.textContent = 'مهمة جديدة';
        saveBtn.textContent = 'إضافة إلى الجدول';
        document.getElementById('task-subject').value = '';
        document.getElementById('task-title').value = '';
        document.getElementById('task-day').value = getTodayArabicDay();
        document.getElementById('task-repeat').value = 'true';
        document.getElementById('task-start').value = '';
        document.getElementById('task-end').value = '';
        document.getElementById('task-reminder').value = '10';
        document.getElementById('task-notes').value = '';
      }

      document.getElementById('task-modal-overlay').classList.add('open');
    }

    function closeTaskModal() {
      document.getElementById('task-modal-overlay').classList.remove('open');
      editingTaskId = null;
    }

    function calcDurationMinutes(start, end) {
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      let diff = (eh * 60 + em) - (sh * 60 + sm);
      if (diff <= 0) diff += 24 * 60;
      return diff;
    }

    function saveTaskFromModal() {
      const subjectId = document.getElementById('task-subject').value;
      const title = document.getElementById('task-title').value.trim();
      const day = document.getElementById('task-day').value;
      const repeatWeekly = document.getElementById('task-repeat').value === 'true';
      const startTime = document.getElementById('task-start').value;
      const endTime = document.getElementById('task-end').value;
      const reminderMinutes = parseInt(document.getElementById('task-reminder').value, 10);
      const notes = document.getElementById('task-notes').value.trim();

      if (!title || !startTime || !endTime) {
        showMessage('❌ أدخل اسم المهمة ووقت البداية والنهاية', 'error');
        return;
      }

      const durationMinutes = calcDurationMinutes(startTime, endTime);
      const subject = subjects.find(s => s.id === subjectId);

      const tasks = loadPlannerTasks();

      if (editingTaskId) {
        const index = tasks.findIndex(t => t.id === editingTaskId);
        if (index !== -1) {
          tasks[index] = { ...tasks[index], subjectId, subjectName: subject ? subject.name : '', title, day, repeatWeekly, startTime, endTime, durationMinutes, reminderMinutes, notes };
        }
      } else {
        tasks.push({
          id: uid(), subjectId, subjectName: subject ? subject.name : '', title, day, repeatWeekly,
          startTime, endTime, durationMinutes, reminderMinutes, notes
        });
      }

      savePlannerTasks(tasks);
      closeTaskModal();
      renderPlannerScreen();
      showMessage(editingTaskId ? '✅ تم حفظ التعديلات' : '✅ تمت إضافة المهمة لجدولك', 'success');
    }

    function deleteTaskById(id) {
      if (!confirm('هل تريد حذف هذه المهمة؟')) return;
      const tasks = loadPlannerTasks().filter(t => t.id !== id);
      savePlannerTasks(tasks);
      renderPlannerScreen();
    }

    function toggleTaskDoneDirect(id) {
      if (isTaskCompletedToday(id)) {
        unmarkTaskCompleted(id);
      } else {
        markTaskCompleted(id);
      }
      renderPlannerScreen();
    }

    // ===== التذكيرات =====
    let remindersEnabled = false;
    const firedReminders = new Set();

    function enableReminders() {
      if (!('Notification' in window)) {
        showMessage('⚠️ المتصفح ده مش بيدعم الإشعارات', 'error');
        return;
      }
      Notification.requestPermission().then(perm => {
        if (perm === 'granted') {
          remindersEnabled = true;
          showMessage('🔔 تم تفعيل التذكيرات (تعمل طالما التطبيق مفتوح في المتصفح)', 'success');
        } else {
          showMessage('❌ لازم تسمح بالإشعارات من إعدادات المتصفح', 'error');
        }
      });
    }

    let remindersIntervalStarted = false;
    function ensureRemindersInterval() {
      if (remindersIntervalStarted) return;
      remindersIntervalStarted = true;
      setInterval(checkReminders, 30000);
    }

    function checkReminders() {
      const tasks = getTodayTasksSorted();
      const now = new Date();

      tasks.forEach(task => {
        if (!task.reminderMinutes) return;
        const key = `${task.id}_${todayISO()}`;
        if (firedReminders.has(key)) return;

        const [h, m] = task.startTime.split(':').map(Number);
        const taskStart = new Date();
        taskStart.setHours(h, m, 0, 0);
        const reminderTime = new Date(taskStart.getTime() - task.reminderMinutes * 60000);

        if (now >= reminderTime && now < taskStart) {
          firedReminders.add(key);
          const msg = `🔔 بعد ${task.reminderMinutes} دقائق تبدأ مذاكرة ${task.subjectName || task.title}`;
          if (remindersEnabled && Notification.permission === 'granted') {
            new Notification('EDUVO', { body: msg });
          } else {
            showMessage(msg, 'success');
          }
        }
      });
    }

    // ===== جلب مهام اليوم =====
    function getTodayTasksSorted() {
      const today = getTodayArabicDay();
      return loadPlannerTasks()
        .filter(t => t.day === today)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
    }

    // ===== العرض الرئيسي لصفحة خطتي =====
    function renderPlannerScreen() {
      renderPlannerHeader();
      renderGoalCard();
      renderTodaySummary();
      renderTodayTasks();
      renderPlannerStats();
      renderStreakCard();
      renderFullPlannerList();

      // إعادة فتح المؤقت لو فيه مهمة نشطة (المؤقت لا يفقد وقته عند التنقل)
      const activeTimer = loadActiveTimer();
      if (activeTimer) {
        const task = loadPlannerTasks().find(t => t.id === activeTimer.taskId);
        if (task && getRemainingSeconds(activeTimer) > 0) {
          startTimerTick();
        }
      }
    }

    function renderPlannerHeader() {
      const name = state.user ? (state.user.fullName || '').split(' ')[0] : '';
      const greetingEl = document.getElementById('planner-greeting');
      if (greetingEl) greetingEl.textContent = name ? `مرحبًا ${name} 👋` : 'مرحبًا 👋';
      const dateEl = document.getElementById('planner-date');
      const today = new Date();
      if (dateEl) dateEl.textContent = `${getTodayArabicDay()}، ${formatArabicDate(today)}`;
    }

    function renderGoalCard() {
      const goalMinutes = loadDailyGoalMinutes();
      const studiedSeconds = getStudySecondsForDate(todayISO());
      const studiedMinutes = studiedSeconds / 60;
      const percent = goalMinutes > 0 ? Math.min(100, Math.round((studiedMinutes / goalMinutes) * 100)) : 0;

      const optionsEl = document.getElementById('goal-options');
      const presets = [60, 120, 180];
      optionsEl.innerHTML = presets.map(p => `
        <button type="button" class="goal-chip ${goalMinutes === p ? 'active' : ''}" data-goal="${p}">${p === 60 ? 'ساعة' : (p / 60) + ' ساعات'}</button>
      `).join('') + `<button type="button" class="goal-chip" id="custom-goal-btn">⚙️ مخصص</button>`;

      optionsEl.querySelectorAll('[data-goal]').forEach(btn => {
        btn.addEventListener('click', () => {
          saveDailyGoalMinutes(parseInt(btn.dataset.goal, 10));
          renderPlannerScreen();
        });
      });
      document.getElementById('custom-goal-btn').addEventListener('click', () => {
        const val = prompt('اكتب هدفك بالدقائق (مثال: 90):', String(goalMinutes));
        const num = parseInt(val, 10);
        if (num > 0) {
          saveDailyGoalMinutes(num);
          renderPlannerScreen();
        }
      });

      document.getElementById('goal-progress-bar').style.width = `${percent}%`;
      const exceeded = studiedMinutes > goalMinutes;
      document.getElementById('goal-progress-text').textContent = exceeded
        ? `🎉 تجاوزت هدفك! ${formatMinutes(studiedMinutes)} من ${formatMinutes(goalMinutes)}`
        : `${formatMinutes(studiedMinutes)} من ${formatMinutes(goalMinutes)} (${percent}%)`;
    }

    function renderTodaySummary() {
      const tasks = getTodayTasksSorted();
      const completedCount = tasks.filter(t => isTaskCompletedToday(t.id)).length;
      const remaining = tasks.length - completedCount;
      const studiedSeconds = getStudySecondsForDate(todayISO());
      const goalMinutes = loadDailyGoalMinutes();
      const percent = goalMinutes > 0 ? Math.min(100, Math.round((studiedSeconds / 60 / goalMinutes) * 100)) : 0;

      const el = document.getElementById('today-summary');
      el.innerHTML = `
        <div class="summary-tile"><div class="st-num">📚 ${tasks.length}</div><div class="st-label">مهام اليوم</div></div>
        <div class="summary-tile"><div class="st-num">✅ ${completedCount}</div><div class="st-label">مكتملة</div></div>
        <div class="summary-tile"><div class="st-num">⏳ ${remaining}</div><div class="st-label">متبقية</div></div>
        <div class="summary-tile"><div class="st-num">🎯 ${percent}%</div><div class="st-label">من الهدف اليومي</div></div>
      `;
    }

    function renderTodayTasks() {
      const container = document.getElementById('today-tasks-list');
      const tasks = getTodayTasksSorted();

      if (!tasks.length) {
        container.innerHTML = `<div class="glass-card fade-in-up" style="text-align:center; color: var(--muted);">مفيش مهام مجدولة النهاردة. دوس "مهمة جديدة" وابدأ خطتك.</div>`;
        return;
      }

      const activeTimer = loadActiveTimer();

      container.innerHTML = tasks.map((task, i) => {
        const subject = subjects.find(s => s.id === task.subjectId);
        const done = isTaskCompletedToday(task.id);
        const isActive = activeTimer && activeTimer.taskId === task.id;
        let actionBtn;
        if (done) {
          actionBtn = `<button type="button" class="btn-secondary" disabled style="width:auto; padding:8px 16px; opacity:0.7;">✓ تم الإنجاز</button>`;
        } else if (isActive) {
          actionBtn = `<button type="button" class="btn-primary" data-resume-id="${task.id}" style="width:auto; padding:8px 16px;">⏱ متابعة المذاكرة</button>`;
        } else {
          actionBtn = `<button type="button" class="btn-primary" data-start-id="${task.id}" style="width:auto; padding:8px 16px;">▶ ابدأ المذاكرة</button>`;
        }

        return `
          <div class="task-card fade-in-up ${done ? 'done' : ''}" style="animation-delay:${i * 0.05}s;">
            <div style="display:flex; gap:14px; align-items:center;">
              <div class="task-time">${task.startTime}</div>
              <div>
                <div class="task-title">${subject ? subject.icon + ' ' : ''}${subject ? subject.name : (task.subjectName || '')}${subject ? ' — ' : ''}${task.title}</div>
                <div class="task-meta">المدة: ${task.durationMinutes} دقيقة${task.notes ? ' · ' + task.notes : ''}</div>
              </div>
            </div>
            <div class="task-actions">
              ${actionBtn}
              <button type="button" class="icon-btn" data-toggle-id="${task.id}" title="${done ? 'إلغاء الإنجاز' : 'تحديد كمكتملة'}">${done ? '↺' : '✓'}</button>
              <button type="button" class="icon-btn" data-edit-id="${task.id}" title="تعديل">✏️</button>
              <button type="button" class="icon-btn" data-delete-id="${task.id}" title="حذف">🗑️</button>
            </div>
          </div>
        `;
      }).join('');

      container.querySelectorAll('[data-start-id]').forEach(btn => btn.addEventListener('click', () => startTask(btn.dataset.startId)));
      container.querySelectorAll('[data-resume-id]').forEach(btn => btn.addEventListener('click', () => {
        const timer = loadActiveTimer();
        const task = loadPlannerTasks().find(t => t.id === btn.dataset.resumeId);
        if (timer && task) openTimerModalForTask(task, timer);
      }));
      container.querySelectorAll('[data-toggle-id]').forEach(btn => btn.addEventListener('click', () => toggleTaskDoneDirect(btn.dataset.toggleId)));
      container.querySelectorAll('[data-edit-id]').forEach(btn => btn.addEventListener('click', () => openTaskModal(btn.dataset.editId)));
      container.querySelectorAll('[data-delete-id]').forEach(btn => btn.addEventListener('click', () => deleteTaskById(btn.dataset.deleteId)));
    }

    function renderPlannerStats() {
      const sessions = loadSessions();
      const now = new Date();
      const weekAgo = new Date();
      weekAgo.setDate(now.getDate() - 6);

      const weekSessions = sessions.filter(s => new Date(s.date) >= new Date(weekAgo.toDateString()));
      const weekSeconds = weekSessions.reduce((sum, s) => sum + s.seconds, 0);

      const totalTasksCount = loadPlannerTasks().length;
      const weekCompletions = loadCompletions().filter(c => new Date(c.date) >= new Date(weekAgo.toDateString()));
      const uniqueCompleted = new Set(weekCompletions.map(c => c.taskId)).size;

      const subjectTotals = {};
      sessions.forEach(s => {
        subjectTotals[s.subjectName] = (subjectTotals[s.subjectName] || 0) + s.seconds;
      });
      let topSubject = null, topSeconds = 0;
      Object.keys(subjectTotals).forEach(name => {
        if (subjectTotals[name] > topSeconds) { topSeconds = subjectTotals[name]; topSubject = name; }
      });

      const el = document.getElementById('planner-stats');
      el.innerHTML = `
        <div class="glass-card" style="text-align:center;">
          <div style="font-size:0.85rem; color:var(--muted); margin-bottom:6px;">⏱️ وقت المذاكرة هذا الأسبوع</div>
          <div style="font-size:1.3rem; font-weight:800; color:var(--accent-2);">${weekSeconds > 0 ? formatMinutes(weekSeconds / 60) : 'لا توجد بيانات بعد'}</div>
        </div>
        <div class="glass-card" style="text-align:center;">
          <div style="font-size:0.85rem; color:var(--muted); margin-bottom:6px;">✅ المهام المكتملة (٧ أيام)</div>
          <div style="font-size:1.3rem; font-weight:800; color:var(--accent-2);">${totalTasksCount > 0 ? `${uniqueCompleted} / ${totalTasksCount}` : 'لا توجد مهام بعد'}</div>
        </div>
        <div class="glass-card" style="text-align:center;">
          <div style="font-size:0.85rem; color:var(--muted); margin-bottom:6px;">📈 نسبة الالتزام</div>
          <div style="font-size:1.3rem; font-weight:800; color:var(--accent-2);">${totalTasksCount > 0 ? Math.round((uniqueCompleted / totalTasksCount) * 100) + '%' : '—'}</div>
        </div>
        <div class="glass-card" style="text-align:center;">
          <div style="font-size:0.85rem; color:var(--muted); margin-bottom:6px;">📚 أكثر مادة تمت مذاكرتها</div>
          <div style="font-size:1.3rem; font-weight:800; color:var(--accent-2);">${topSubject || 'لا توجد بيانات بعد'}</div>
        </div>
      `;
    }

    function renderStreakCard() {
      const { current, best } = computeStreak();
      const el = document.getElementById('streak-card');
      el.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:14px;">
          <div style="display:flex; align-items:center; gap:14px;">
            <div class="streak-flame">🔥</div>
            <div>
              <div style="font-weight:800; font-size:1.15rem;">${current} ${current === 1 ? 'يوم متتالي' : 'أيام متتالية'}</div>
              <div style="color:var(--muted); font-size:0.85rem;">حقق هدفك اليومي عشان تحافظ على السلسلة</div>
            </div>
          </div>
          <div style="text-align:left;">
            <div style="color:var(--muted); font-size:0.8rem;">أفضل سلسلة</div>
            <div style="font-weight:800; color:var(--gold);">${best} يومًا</div>
          </div>
        </div>
      `;
    }

    function renderFullPlannerList() {
      const container = document.getElementById('planner-list');
      const tasks = loadPlannerTasks();

      if (!tasks.length) {
        container.innerHTML = `<div class="glass-card fade-in-up" style="text-align:center; color: var(--muted);">جدولك فاضي حالياً. أضف أول مهمة من زر "مهمة جديدة" فوق.</div>`;
        return;
      }

      const sorted = [...tasks].sort((a, b) => {
        const dayDiff = PLANNER_DAYS.indexOf(a.day) - PLANNER_DAYS.indexOf(b.day);
        return dayDiff !== 0 ? dayDiff : a.startTime.localeCompare(b.startTime);
      });

      const grouped = {};
      sorted.forEach(t => { (grouped[t.day] = grouped[t.day] || []).push(t); });

      container.innerHTML = Object.keys(grouped).map((day, i) => `
        <div class="glass-card fade-in-up" style="animation-delay:${i * 0.05}s;">
          <h4 style="margin-bottom:10px; color: var(--accent-2);">${day}</h4>
          ${grouped[day].map(task => {
            const subject = subjects.find(s => s.id === task.subjectId);
            return `
              <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; padding:10px 0; border-bottom:1px solid var(--border); flex-wrap:wrap;">
                <span>${task.startTime}–${task.endTime} — ${subject ? subject.icon + ' ' + subject.name + ' — ' : ''}${task.title}</span>
                <div style="display:flex; gap:6px;">
                  <button type="button" class="icon-btn" data-edit-id2="${task.id}">✏️</button>
                  <button type="button" class="icon-btn" data-delete-id2="${task.id}">🗑️</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `).join('');

      container.querySelectorAll('[data-edit-id2]').forEach(btn => btn.addEventListener('click', () => openTaskModal(btn.dataset.editId2)));
      container.querySelectorAll('[data-delete-id2]').forEach(btn => btn.addEventListener('click', () => deleteTaskById(btn.dataset.deleteId2)));
    }

    // ===== خطة مقترحة من EDUVO AI =====
    const pendingAiPlans = {};

    function tryGenerateStudyPlan(message) {
      if (!message.includes('امتحان')) return null;

      const dayMatch = PLANNER_DAYS.find(d => message.includes(d));
      if (!dayMatch) return null;

      const subjectMatch = subjects.find(s => message.includes(s.name.replace('ال', '')) || message.includes(s.name));
      const lessonsMatch = message.match(/(\d+)\s*دروس|(\d+)\s*درس/);
      const lessonsCount = lessonsMatch ? parseInt(lessonsMatch[1] || lessonsMatch[2], 10) : 2;

      const todayIndex = PLANNER_DAYS.indexOf(getTodayArabicDay());
      const examIndex = PLANNER_DAYS.indexOf(dayMatch);
      let daysUntilExam = examIndex - todayIndex;
      if (daysUntilExam <= 0) daysUntilExam += 7;

      const availableDays = [];
      for (let i = 1; i < daysUntilExam; i++) {
        availableDays.push(PLANNER_DAYS[(todayIndex + i) % 7]);
      }
      if (!availableDays.length) availableDays.push(PLANNER_DAYS[todayIndex]);

      const planDays = [];
      let lessonsLeft = lessonsCount;
      availableDays.forEach((day, i) => {
        if (lessonsLeft <= 0) return;
        const items = [];
        items.push({ time: '17:00', label: `الدرس ${lessonsCount - lessonsLeft + 1}` });
        lessonsLeft -= 1;
        if (lessonsLeft > 0 || i === availableDays.length - 1) {
          items.push({ time: '18:30', label: 'حل أسئلة ومراجعة' });
        }
        planDays.push({ day, items });
      });

      const planId = uid();
      pendingAiPlans[planId] = {
        subjectId: subjectMatch ? subjectMatch.id : '',
        subjectName: subjectMatch ? subjectMatch.name : '',
        examDay: dayMatch,
        days: planDays
      };

      return planId;
    }

    function renderAiPlanCard(planId) {
      const plan = pendingAiPlans[planId];
      if (!plan) return '';
      return `
        <div style="margin-top:10px; padding:12px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.2); border-radius:12px;">
          <div style="font-weight:800; margin-bottom:8px;">📋 خطة مذاكرة مقترحة ${plan.subjectName ? '(' + plan.subjectName + ')' : ''} قبل امتحان ${plan.examDay}</div>
          ${plan.days.map(d => `
            <div style="margin-bottom:6px;">
              <strong style="color:var(--accent-2);">${d.day}</strong><br/>
              ${d.items.map(it => `${it.time} ← ${it.label}`).join('<br/>')}
            </div>
          `).join('')}
          <button type="button" class="btn-primary" data-add-plan-id="${planId}" style="margin-top:8px; width:auto; padding:8px 16px; font-size:0.85rem;">➕ إضافة الخطة إلى خطتي</button>
        </div>
      `;
    }

    function addAiPlanToPlanner(planId) {
      const plan = pendingAiPlans[planId];
      if (!plan) return;

      const tasks = loadPlannerTasks();
      plan.days.forEach(d => {
        d.items.forEach(it => {
          const startTime = it.time;
          const [h, m] = startTime.split(':').map(Number);
          const endDate = new Date(2000, 0, 1, h, m + 60);
          const endTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;
          tasks.push({
            id: uid(),
            subjectId: plan.subjectId,
            subjectName: plan.subjectName,
            title: it.label,
            day: d.day,
            repeatWeekly: false,
            startTime,
            endTime,
            durationMinutes: 60,
            reminderMinutes: 10,
            notes: `خطة مقترحة قبل امتحان ${plan.examDay}`
          });
        });
      });

      savePlannerTasks(tasks);
      showMessage('✅ تمت إضافة الخطة كاملة إلى جدولك', 'success');
    }

    function applyAppConfigToUI() {
      const alertEl = document.getElementById('dashboard-alert');
      if (alertEl && appConfig.app && appConfig.app.announcement) {
        alertEl.textContent = appConfig.app.announcement;
      }
    }

    // ===== البحث الشامل (Global Search) =====
    function normalizeArabic(str) {
      return (str || '')
        .toString()
        .replace(/[\u064B-\u0652\u0640]/g, '') // إزالة التشكيل والتطويل
        .replace(/[إأآا]/g, 'ا')
        .replace(/ى/g, 'ي')
        .replace(/ة/g, 'ه')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
    }

    function levenshtein(a, b) {
      const m = a.length, n = b.length;
      if (!m) return n;
      if (!n) return m;
      const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
      for (let j = 0; j <= n; j++) d[0][j] = j;
      for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
          d[i][j] = a[i - 1] === b[j - 1]
            ? d[i - 1][j - 1]
            : 1 + Math.min(d[i - 1][j], d[i][j - 1], d[i - 1][j - 1]);
        }
      }
      return d[m][n];
    }

    function buildSearchIndex() {
      const index = [];

      subjects.forEach(s => {
        index.push({ type: 'مواد', icon: s.icon, label: s.name, sub: s.description, action: () => { setActiveScreen('screen-subjects'); showSubjectDetails(s.id); } });
        (s.teachers || []).forEach(t => {
          index.push({ type: 'المدرسون', icon: '👨‍🏫', label: t.name, sub: s.name, action: () => { setActiveScreen('screen-subjects'); showSubjectDetails(s.id); } });
        });
      });

      (appConfig.books || []).forEach(b => {
        index.push({ type: 'الكتب', icon: '📖', label: b.title, sub: b.subjectName || '', action: () => setActiveScreen('screen-books') });
      });

      (appConfig.freeCourses || []).filter(c => c.published !== false).forEach(c => {
        index.push({ type: 'كورسات مجانية', icon: '🎓', label: c.lectureTitle, sub: `${c.teacherName} — ${c.subject || ''}`, action: () => openLecture(c.id) });
      });

      loadPlannerTasks().forEach(t => {
        index.push({ type: 'المهام والجدول', icon: '📅', label: t.title, sub: `${t.day} — ${t.startTime}`, action: () => setActiveScreen('screen-planner') });
      });

      return index;
    }

    function searchIndex(query) {
      const normQuery = normalizeArabic(query);
      if (!normQuery) return [];

      const index = buildSearchIndex();
      const results = [];

      index.forEach(entry => {
        const normLabel = normalizeArabic(entry.label);
        const normSub = normalizeArabic(entry.sub);
        let score = -1;

        if (normLabel.includes(normQuery) || normQuery.includes(normLabel)) {
          score = 100 - Math.abs(normLabel.length - normQuery.length);
        } else if (normSub.includes(normQuery)) {
          score = 60;
        } else {
          const words = normLabel.split(' ');
          const minDist = Math.min(...words.map(w => levenshtein(w, normQuery)));
          if (minDist <= 2 && normQuery.length >= 3) {
            score = 40 - minDist * 5;
          }
        }

        if (score > 0) results.push({ ...entry, score });
      });

      return results.sort((a, b) => b.score - a.score);
    }

    let searchDebounceTimer = null;

    function setupGlobalSearch() {
      const input = document.getElementById('global-search-input');
      const resultsBox = document.getElementById('global-search-results');
      if (!input) return;

      input.addEventListener('input', () => {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
          const query = input.value.trim();
          if (!query) { closeGlobalSearchResults(); return; }
          renderGlobalSearchResults(searchIndex(query), query);
        }, 150);
      });

      document.addEventListener('click', (e) => {
        if (!e.target.closest('#global-topbar')) closeGlobalSearchResults();
      });
    }

    function closeGlobalSearchResults() {
      const box = document.getElementById('global-search-results');
      if (box) box.classList.remove('open');
    }

    function renderGlobalSearchResults(results, query) {
      const box = document.getElementById('global-search-results');
      if (!box) return;

      if (!results.length) {
        box.innerHTML = `<div class="search-empty-state">لا توجد نتائج لـ "${query}"</div>`;
        box.classList.add('open');
        return;
      }

      const grouped = {};
      results.slice(0, 30).forEach(r => { (grouped[r.type] = grouped[r.type] || []).push(r); });

      box.innerHTML = Object.keys(grouped).map(type => `
        <div class="search-group-label">${type}</div>
        ${grouped[type].slice(0, 5).map((r, i) => `
          <div class="search-result-item" data-result-index="${results.indexOf(r)}">
            <span class="sr-icon">${r.icon}</span>
            <div>
              <div class="sr-label">${r.label}</div>
              ${r.sub ? `<div class="sr-sub">${r.sub}</div>` : ''}
            </div>
          </div>
        `).join('')}
      `).join('');

      box.classList.add('open');

      box.querySelectorAll('[data-result-index]').forEach(item => {
        item.addEventListener('click', () => {
          const result = results[parseInt(item.dataset.resultIndex, 10)];
          if (result && result.action) result.action();
          document.getElementById('global-search-input').value = '';
          closeGlobalSearchResults();
        });
      });
    }

    // ===== الكورسات المجانية =====
    function courseProgressKey() {
      return uidKey('eduvo_course_progress');
    }

    function loadCourseProgress() {
      try {
        const raw = localStorage.getItem(courseProgressKey());
        return raw ? JSON.parse(raw) : {};
      } catch {
        return {};
      }
    }

    function saveCourseProgress(progress) {
      localStorage.setItem(courseProgressKey(), JSON.stringify(progress));
    }

    function setCourseStatus(courseId, status) {
      const progress = loadCourseProgress();
      progress[courseId] = status;
      saveCourseProgress(progress);
    }

    function renderCoursesScreen() {
      const container = document.getElementById('courses-container');
      const courses = (appConfig.freeCourses || []).filter(c => c.published !== false);

      if (!courses.length) {
        container.innerHTML = `<div class="glass-card" style="text-align:center; color: var(--muted);">لا توجد محاضرات مجانية متاحة حاليًا.</div>`;
        return;
      }

      const grouped = {};
      courses.forEach(c => { (grouped[c.teacherName] = grouped[c.teacherName] || []).push(c); });

      const progress = loadCourseProgress();

      container.innerHTML = Object.keys(grouped).map((teacherName, gi) => `
        <div style="margin-bottom: 28px;">
          <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px;">
            <img src="${grouped[teacherName][0].teacherImage || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}" onerror="this.src='https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'" style="width:42px; height:42px; border-radius:50%; object-fit:cover; border:2px solid rgba(255,255,255,0.25);" loading="lazy" />
            <h4>${teacherName}</h4>
          </div>
          <div class="grid-2">
            ${grouped[teacherName].map((c, i) => {
              const status = progress[c.id] || 'new';
              const statusLabel = status === 'watched' ? '✅ تمت المشاهدة' : status === 'watching' ? '🔵 قيد المشاهدة' : '▶️ لم تبدأ';
              const statusClass = status === 'watched' ? 'watched' : status === 'watching' ? 'watching' : '';
              return `
                <div class="course-card fade-in-up" style="animation-delay:${(gi + i) * 0.05}s;">
                  <img class="course-thumb" src="${c.thumbnail || 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=500&q=80'}" onerror="this.src='https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=500&q=80'" alt="${c.lectureTitle}" loading="lazy" />
                  <div class="course-body">
                    <span class="course-status-badge ${statusClass}">${statusLabel}</span>
                    <div class="course-title">${c.lectureTitle}</div>
                    <div class="course-meta">📚 ${c.subject || ''} ${c.duration ? '· ⏱️ ' + c.duration : ''}</div>
                    <div class="course-desc">${c.description || ''}</div>
                    <button type="button" class="btn-primary" data-open-lecture="${c.id}" style="width:100%;">▶ مشاهدة المحاضرة</button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `).join('');

      container.querySelectorAll('[data-open-lecture]').forEach(btn => {
        btn.addEventListener('click', () => openLecture(btn.dataset.openLecture));
      });
    }

    function openLecture(courseId) {
      const course = (appConfig.freeCourses || []).find(c => String(c.id) === String(courseId));
      if (!course) return;

      const progress = loadCourseProgress();
      if (!progress[courseId] || progress[courseId] === 'new') {
        setCourseStatus(courseId, 'watching');
      }

      setActiveScreen('screen-lecture');
      renderLectureScreen(course);
    }

    function renderLectureScreen(course) {
      const container = document.getElementById('lecture-content');
      const status = loadCourseProgress()[course.id] || 'watching';

      const playerHtml = course.embedUrl
        ? `<div class="lecture-player-chrome"><iframe src="${course.embedUrl}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div>`
        : `<div class="glass-card" style="text-align:center; color: var(--muted); padding: 60px 20px;">رابط الفيديو غير متاح حاليًا لهذه المحاضرة.</div>`;

      container.innerHTML = `
        ${playerHtml}
        <div class="glass-card fade-in-up" style="margin-top:16px;">
          <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
            <img src="${course.teacherImage || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}" onerror="this.src='https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'" style="width:48px; height:48px; border-radius:50%; object-fit:cover;" />
            <div>
              <div style="font-weight:800;">${course.teacherName}</div>
              <div style="color:var(--muted); font-size:0.82rem;">📚 ${course.subject || ''} ${course.duration ? '· ⏱️ ' + course.duration : ''}</div>
            </div>
          </div>
          <h3 style="margin-bottom:8px;">${course.lectureTitle}</h3>
          <p style="color:var(--muted); line-height:1.8; margin-bottom:16px;">${course.description || ''}</p>
          <button type="button" class="btn-primary" id="mark-watched-btn" style="width:auto; padding:10px 20px;" ${status === 'watched' ? 'disabled' : ''}>
            ${status === 'watched' ? '✅ تمت المشاهدة' : '✓ تحديد كمُشاهَد'}
          </button>
        </div>
      `;

      const markBtn = document.getElementById('mark-watched-btn');
      if (markBtn && status !== 'watched') {
        markBtn.addEventListener('click', () => {
          setCourseStatus(course.id, 'watched');
          renderLectureScreen(course);
          renderCoursesScreen();
          showMessage('✅ تم تسجيل المحاضرة كمشاهَدة', 'success');
        });
      }
    }

    function toggleEditProfile() {
      const form = document.getElementById('edit-profile-form');
      const isOpen = form.style.display === 'block';
      if (!isOpen && state.user) {
        document.getElementById('edit-profile-name').value = state.user.fullName || '';
        document.getElementById('edit-profile-grade').value = state.user.grade || '';
      }
      form.style.display = isOpen ? 'none' : 'block';
    }

    function saveProfileEdits() {
      if (!state.user) return;
      const name = document.getElementById('edit-profile-name').value.trim();
      const grade = document.getElementById('edit-profile-grade').value;

      if (name.split(/\s+/).length < 3) {
        showMessage('❌ الرجاء إدخال الاسم الثلاثي الكامل', 'error');
        return;
      }

      const users = getUsers();
      const index = users.findIndex(item => item.id === state.user.id);
      if (index !== -1) {
        users[index].fullName = name;
        users[index].grade = grade;
        saveUsers(users);
        state.user = users[index];
        saveSession(state.user);
        updateUserProfile();
        document.getElementById('edit-profile-form').style.display = 'none';
        showMessage('✅ تم تحديث بياناتك بنجاح', 'success');
      }
    }

    function setupNavigation() {
      document.querySelectorAll('.auth-tab').forEach(button => {
        button.addEventListener('click', () => authTab(button.dataset.authTab));
      });

      document.getElementById('login-btn').addEventListener('click', handleLogin);
      document.getElementById('signup-btn').addEventListener('click', handleSignup);
      document.getElementById('google-login-btn').addEventListener('click', triggerGoogleLogin);
      document.getElementById('google-signup-btn').addEventListener('click', triggerGoogleLogin);
      document.getElementById('edit-profile-toggle').addEventListener('click', toggleEditProfile);
      document.getElementById('save-profile-btn').addEventListener('click', saveProfileEdits);

      document.getElementById('open-add-task-btn').addEventListener('click', () => openTaskModal());
      document.getElementById('task-modal-close').addEventListener('click', closeTaskModal);
      document.getElementById('task-save-btn').addEventListener('click', saveTaskFromModal);
      document.getElementById('timer-pause-btn').addEventListener('click', togglePauseTimer);
      document.getElementById('timer-finish-btn').addEventListener('click', () => finishTask(false));
      document.getElementById('enable-reminders-btn').addEventListener('click', enableReminders);
      document.getElementById('lecture-back-btn').addEventListener('click', () => setActiveScreen('screen-courses'));

      setupGlobalSearch();

      document.getElementById('logout-btn').addEventListener('click', handleLogout);
      document.getElementById('back-to-subjects').addEventListener('click', () => setActiveScreen('screen-subjects'));
      document.getElementById('send-ai').addEventListener('click', sendAiMessage);
      document.getElementById('ai-input').addEventListener('keydown', (event) => {
        if (event.key === 'Enter') sendAiMessage();
      });

      document.getElementById('theme-select').addEventListener('change', (event) => {
        const settings = getSettings();
        settings.theme = event.target.value;
        saveSettings(settings);
        applySettings();
      });

      document.getElementById('layout-select').addEventListener('change', (event) => {
        const settings = getSettings();
        settings.layout = event.target.value;
        saveSettings(settings);
        applySettings();
      });

      document.querySelectorAll('[data-target]').forEach(item => {
        item.addEventListener('click', () => {
          const target = item.dataset.target;
          if (['screen-dashboard', 'screen-subjects', 'screen-ai', 'screen-profile', 'screen-books', 'screen-planner', 'screen-courses', 'screen-lecture'].includes(target) && !state.user) {
            showMessage('❌ يجب تسجيل الدخول أولاً', 'error');
            setActiveScreen('screen-auth');
            return;
          }
          setActiveScreen(target);
          if (target === 'screen-books') renderBooksScreen();
          if (target === 'screen-planner') renderPlannerScreen();
          if (target === 'screen-courses') renderCoursesScreen();
        });
      });
    }

    function sendAiMessage() {
      const input = document.getElementById('ai-input');
      const value = input.value.trim();
      if (!value) return;

      const box = document.getElementById('chat-box');

      const userBubble = document.createElement('div');
      userBubble.className = 'chat-bubble chat-user';
      userBubble.textContent = value;
      box.appendChild(userBubble);

      const answerBubble = document.createElement('div');
      answerBubble.className = 'chat-bubble chat-ai';
      answerBubble.textContent = 'جارِ التفكير...';
      box.appendChild(answerBubble);

      input.value = '';
      box.scrollTop = box.scrollHeight;

      // كشف طلبات خطة مذاكرة قبل امتحان (مثال: "عندي امتحان فيزياء يوم الخميس")
      const planId = state.user ? tryGenerateStudyPlan(value) : null;
      if (planId) {
        answerBubble.innerHTML = `تمام، جهزتلك خطة مقترحة بناءً على مهامك الحالية: ${renderAiPlanCard(planId)}`;
        wireAiPlanButtons(answerBubble);
        box.scrollTop = box.scrollHeight;
        return;
      }

      // لو الـ aiEndpoint متفعّل في data.json مستقبلاً (ذكاء اصطناعي حقيقي)، استخدمه بدل الرد المحلي
      if (appConfig.aiEndpoint) {
        fetch(appConfig.aiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: value })
        })
          .then(res => res.json())
          .then(data => {
            answerBubble.textContent = data.reply || generateSmartReply(value);
            box.scrollTop = box.scrollHeight;
          })
          .catch(() => {
            answerBubble.textContent = generateSmartReply(value);
            box.scrollTop = box.scrollHeight;
          });
        return;
      }

      setTimeout(() => {
        answerBubble.textContent = generateSmartReply(value);
        box.scrollTop = box.scrollHeight;
      }, 500);
    }

    function wireAiPlanButtons(container) {
      container.querySelectorAll('[data-add-plan-id]').forEach(btn => {
        btn.addEventListener('click', () => {
          addAiPlanToPlanner(btn.dataset.addPlanId);
          btn.disabled = true;
          btn.textContent = '✅ تمت الإضافة';
        });
      });
    }

    function restoreSession() {
      try {
        const saved = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
        if (saved) {
          const users = getUsers();
          const match = users.find(item => item.phone === saved.phone);
          if (match) {
            state.user = match;
          }
        }
      } catch {
        state.user = null;
      }
    }

    document.addEventListener('DOMContentLoaded', async () => {
      await loadScreens();
      await loadAppConfig();
      applyAppConfigToUI();
      renderSubjects();
      setupNavigation();
      applySettings();
      authTab('login');
      restoreSession();

      if (state.user) {
        updateUserProfile();
        setActiveScreen('screen-dashboard');
        ensureRemindersInterval();
      } else {
        setActiveScreen('screen-auth');
      }
    });

    // تسجيل الـ Service Worker لتفعيل التثبيت (Add to Home Screen) والعمل بدون إنترنت للصفحات المزارة
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js').catch((err) => {
          console.warn('تعذر تسجيل Service Worker:', err);
        });
      });
    }
