/** Product copy is independent of layout and API error codes. Add locales here without changing the flow. */
export const authCopy = {
  en: {
    login: 'Welcome back.', register: 'Find your people.', verify: 'Check your inbox.', profile: 'Make it you.', interests: 'Your kind of fun.',
    'forgot-password': 'Back in a moment.', 'reset-password': 'New password.', restricted: 'A quick pause.',
    email: 'Email address', nickname: 'Nickname', nicknamePlaceholder: 'What should we call you?', birthday: 'Birthday',
    birthdayHint: '18+ only. Your full birthday stays private.', gender: 'Gender', woman: 'Woman', man: 'Man', undisclosed: 'Rather not say',
    avatar: 'Choose avatar', avatarHint: 'Photo or system avatar', upload: 'Upload a photo', crop: 'Adjust your photo', zoom: 'Zoom', usePhoto: 'Use this photo',
    continue: 'Continue', code: '6-digit code', codeHint: 'Expires in 5 minutes. Check spam if needed.', resend: 'Resend code', changeEmail: 'Change email',
    password: 'Password', newPassword: 'New password', confirmPassword: 'Confirm password', passwordHint: '15–128 characters. Use a unique passphrase.',
    show: 'Show password', hide: 'Hide password', passwordMethod: 'Use a password', codeMethod: 'Use an email code', forgot: 'Forgot password?',
    firstTime: 'First time here?', join: 'Join the club', already: 'Already here?', signIn: 'Log in', signOut: 'Sign out', back: 'Back', close: 'Close',
    termsStart: 'I accept the', terms: 'Terms of Service', and: 'and acknowledge the', privacy: 'Privacy Notice', help: 'Help',
    privateEmail: 'Your email stays private.', games: 'Games', vibes: 'Your vibe', life: 'More about you', tagTip: '3 suggested · 5 max',
    skip: 'Skip for now', finish: 'Let’s go', save: 'Save password', resetComplete: 'Password updated. Sign in again.',
    restrictedHint: 'Your account is restricted. Your wallet and order history are preserved. Contact support for help.', support: 'Contact support',
    supportTitle: 'Need a hand?', supportHint: 'Tell us what happened. Do not include passwords or verification codes.', supportSubject: 'Subject', supportMessage: 'Message', sendMessage: 'Send', supportSent: 'Your request has been sent.',
    supportGuest: 'For email access problems, check the address and spam folder, then try again. You can return to browse while you recover access.', browse: 'Back to browse',
    network: 'Connection interrupted. Your details are still here. Try again.', generic: 'We couldn’t complete that. Please try again.',
    invalidEmail: 'Enter a valid email address.', invalidCode: 'Check the 6-digit code, or request a new one.', ageError: 'You must be 18 or older. Check your birthday.',
    invalidName: 'Use 2–32 characters.', invalidPassword: 'Use 15–128 characters and avoid common passwords.', mismatch: 'The passwords do not match.',
    invalidCredentials: 'The email or password is incorrect.', consent: 'Please read and accept the terms to continue.', expired: 'This step expired. Verify your email again.',
    mailUnavailable: 'Email delivery is temporarily unavailable. Please try again later.', cooldown: 'Please wait before trying again.',
    photoError: 'Choose a JPG, PNG or WebP under 10 MB.', photoFailed: 'This photo couldn’t be used. Try another or choose a system avatar.',
    maxTags: 'Choose up to 5 interests.', loading: 'One moment…', retry: 'Try again', incomplete: 'Complete your profile to continue. Your existing account stays yours.',
    development: 'Local email preview', done: 'You’re in.', emailStep: 'Email', youStep: 'You', tagsStep: 'Interests',
    policyTerms: ['By accessing or using our services, you agree to these terms. If you do not agree, do not use the services.', 'You are responsible for your account and the content you provide. Do not engage in prohibited conduct.', 'Access to services may be suspended or terminated in accordance with platform rules.'],
    policyPrivacy: ['We collect information you provide when creating an account, updating a profile or communicating with other users.', 'We use it to provide, maintain and improve the service. Your full date of birth is private and used to verify the 18+ age requirement.', 'We take reasonable measures to protect your information against loss, misuse and unauthorized access.'],
  },
  ar: {
    login: 'أهلًا بعودتك.', register: 'اعثر على رفاقك.', verify: 'تحقق من بريدك.', profile: 'كن على طبيعتك.', interests: 'ما الذي تحبه؟',
    'forgot-password': 'لنعدك إلى اللعب.', 'reset-password': 'كلمة مرور جديدة.', restricted: 'توقف قصير.',
    email: 'البريد الإلكتروني', nickname: 'الاسم المستعار', nicknamePlaceholder: 'بماذا نناديك؟', birthday: 'تاريخ الميلاد',
    birthdayHint: 'للبالغين 18 عامًا فأكثر. تاريخ ميلادك الكامل خاص.', gender: 'الجنس', woman: 'امرأة', man: 'رجل', undisclosed: 'أفضل عدم الإفصاح',
    avatar: 'اختر صورتك', avatarHint: 'صورة أو صورة رمزية', upload: 'رفع صورة', crop: 'اضبط صورتك', zoom: 'التكبير', usePhoto: 'استخدام هذه الصورة',
    continue: 'متابعة', code: 'رمز من 6 أرقام', codeHint: 'صالح لـ5 دقائق. تحقق من الرسائل غير المرغوب فيها.', resend: 'إعادة إرسال الرمز', changeEmail: 'تغيير البريد',
    password: 'كلمة المرور', newPassword: 'كلمة المرور الجديدة', confirmPassword: 'تأكيد كلمة المرور', passwordHint: 'من 15 إلى 128 حرفًا. استخدم عبارة فريدة.',
    show: 'إظهار كلمة المرور', hide: 'إخفاء كلمة المرور', passwordMethod: 'استخدام كلمة المرور', codeMethod: 'استخدام رمز البريد', forgot: 'نسيت كلمة المرور؟',
    firstTime: 'أول مرة هنا؟', join: 'انضم إلينا', already: 'لديك حساب؟', signIn: 'تسجيل الدخول', signOut: 'تسجيل الخروج', back: 'رجوع', close: 'إغلاق',
    termsStart: 'أوافق على', terms: 'شروط الخدمة', and: 'وأقر بالاطلاع على', privacy: 'إشعار الخصوصية', help: 'المساعدة',
    privateEmail: 'يبقى بريدك الإلكتروني خاصًا.', games: 'ألعاب', vibes: 'أسلوبك', life: 'المزيد عنك', tagTip: 'نقترح 3 · حتى 5',
    skip: 'التخطي الآن', finish: 'هيا بنا', save: 'حفظ كلمة المرور', resetComplete: 'تم تحديث كلمة المرور. سجل الدخول مجددًا.',
    restrictedHint: 'حسابك مقيّد حاليًا. رصيدك وسجل طلباتك محفوظان. تواصل مع الدعم للمساعدة.', support: 'التواصل مع الدعم',
    supportTitle: 'تحتاج مساعدة؟', supportHint: 'أخبرنا بما حدث. لا تذكر كلمات المرور أو رموز التحقق.', supportSubject: 'الموضوع', supportMessage: 'الرسالة', sendMessage: 'إرسال', supportSent: 'تم إرسال طلبك.',
    supportGuest: 'تحقق من عنوان البريد والرسائل غير المرغوب فيها ثم حاول مجددًا. يمكنك العودة للتصفح أثناء استعادة الوصول.', browse: 'العودة للتصفح',
    network: 'انقطع الاتصال. بياناتك ما زالت هنا. حاول مجددًا.', generic: 'تعذر إكمال العملية. حاول مجددًا.',
    invalidEmail: 'أدخل بريدًا إلكترونيًا صحيحًا.', invalidCode: 'تحقق من الرمز المكون من 6 أرقام أو اطلب رمزًا جديدًا.', ageError: 'يجب أن تبلغ 18 عامًا أو أكثر. تحقق من تاريخ ميلادك.',
    invalidName: 'استخدم من 2 إلى 32 حرفًا.', invalidPassword: 'استخدم من 15 إلى 128 حرفًا وتجنب كلمات المرور الشائعة.', mismatch: 'كلمتا المرور غير متطابقتين.',
    invalidCredentials: 'البريد أو كلمة المرور غير صحيحة.', consent: 'اقرأ الشروط ووافق عليها للمتابعة.', expired: 'انتهت صلاحية هذه الخطوة. أكد بريدك مجددًا.',
    mailUnavailable: 'إرسال البريد غير متاح مؤقتًا. حاول لاحقًا.', cooldown: 'يرجى الانتظار قبل المحاولة مجددًا.',
    photoError: 'اختر JPG أو PNG أو WebP أصغر من 10 ميغابايت.', photoFailed: 'تعذر استخدام الصورة. جرب أخرى أو اختر صورة رمزية.',
    maxTags: 'يمكنك اختيار 5 اهتمامات كحد أقصى.', loading: 'لحظة واحدة…', retry: 'حاول مجددًا', incomplete: 'أكمل ملفك للمتابعة. حسابك الحالي محفوظ.',
    development: 'معاينة البريد المحلية', done: 'أهلًا بك.', emailStep: 'البريد', youStep: 'أنت', tagsStep: 'الاهتمامات',
    policyTerms: ['باستخدام خدماتنا فإنك توافق على هذه الشروط. إذا كنت لا توافق فلا تستخدم الخدمات.', 'أنت مسؤول عن حسابك والمحتوى الذي تقدمه. يجب عدم ممارسة سلوك محظور.', 'يمكن تعليق أو إنهاء الوصول إلى الخدمات وفقًا لقواعد المنصة.'],
    policyPrivacy: ['نجمع المعلومات التي تقدمها عند إنشاء الحساب أو تحديث الملف أو التواصل مع المستخدمين.', 'نستخدمها لتقديم الخدمات وصيانتها وتحسينها. تاريخ ميلادك الكامل خاص ويُستخدم للتحقق من بلوغ 18 عامًا.', 'نتخذ تدابير معقولة لحماية بياناتك من الفقد أو سوء الاستخدام أو الوصول غير المصرح به.'],
  },
};
export type AuthCopy = typeof authCopy.en;
export const tagLabels: Record<string, [string, string]> = {
  valorant: ['Valorant','Valorant'], pubg: ['PUBG Mobile','PUBG Mobile'], fc: ['EA SPORTS FC','EA SPORTS FC'], ml: ['Mobile Legends','Mobile Legends'],
  chill: ['Chill duo','لعب بهدوء'], ranked: ['Ranked grind','مباريات تصنيف'], voice: ['Voice chat','دردشة صوتية'], night: ['Late-night queue','لعب ليلي'],
  music: ['Music','موسيقى'], anime: ['Anime','أنمي'], football: ['Football','كرة القدم'], coffee: ['Coffee','قهوة'],
};

export function errorCopy(code: string, c: AuthCopy) {
  if (code === 'NETWORK_ERROR') return c.network;
  if (/COOLDOWN|RATE_LIMIT/.test(code)) return c.cooldown;
  if (/CREDENTIAL/.test(code)) return c.invalidCredentials;
  if (/AGE|BIRTH/.test(code)) return c.ageError;
  if (/PASSWORD/.test(code)) return c.invalidPassword;
  if (/GRANT|PROOF|REGISTRATION_TOKEN|RESET_TOKEN/.test(code)) return c.expired;
  if (/EMAIL_CODE/.test(code)) return c.invalidCode;
  if (/MAIL|DELIVERY/.test(code)) return c.mailUnavailable;
  if (/AVATAR|IMAGE|UPLOAD/.test(code)) return c.photoFailed;
  if (/TERMS|CONSENT|PRIVACY/.test(code)) return c.consent;
  if (/RESTRICT|FROZEN|RISK_HOLD|DEVICE_BANNED/.test(code)) return c.restrictedHint;
  if (/PROFILE/.test(code)) return c.incomplete;
  return c.generic;
}
