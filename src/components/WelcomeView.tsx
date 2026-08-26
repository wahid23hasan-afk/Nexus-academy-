import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppLogo } from './AppLogo';
import { LogIn, UserPlus, ArrowRight, Globe, Check, ChevronDown, Sparkles } from 'lucide-react';
import { AppView } from '../types/auth';

interface WelcomeViewProps {
  onNavigate: (view: AppView) => void;
}

export interface AcademicLanguage {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  region: string;
}

export const ACADEMIC_LANGUAGES: AcademicLanguage[] = [
  { code: 'en', name: 'English', nativeName: 'English (Academic)', flag: '🇺🇸', region: 'Global / Oxford' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা (একাডেমিক)', flag: '🇧🇩', region: 'Bangladesh & India' },
  { code: 'es', name: 'Spanish', nativeName: 'Español (Académico)', flag: '🇪🇸', region: 'Spain & Latin America' },
  { code: 'fr', name: 'French', nativeName: 'Français (Académique)', flag: '🇫🇷', region: 'France & Francophone' },
  { code: 'de', name: 'German', nativeName: 'Deutsch (Wissenschaft)', flag: '🇩🇪', region: 'Germany & DACH' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية (الأكاديمية)', flag: '🇸🇦', region: 'Middle East & Arab League' },
  { code: 'zh', name: 'Chinese', nativeName: '中文 (学术标准)', flag: '🇨🇳', region: 'China & East Asia' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी (शैक्षणिक)', flag: '🇮🇳', region: 'India & South Asia' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語 (学術)', flag: '🇯🇵', region: 'Japan' },
];

const TRANSLATIONS: Record<string, {
  tagline: string;
  feature1: string;
  feature2: string;
  feature3: string;
  loginBtn: string;
  registerBtn: string;
  terms: string;
  languageSelectedToast: string;
}> = {
  en: {
    tagline: 'Access world-class study programs, immersive practical cohorts, and elite certifications designed for future leaders.',
    feature1: '150+ Professional Masterclasses',
    feature2: '1-on-1 Senior Industry Mentorship',
    feature3: 'Accredited Academic Credentials',
    loginBtn: 'Login to Account',
    registerBtn: 'Create New Account',
    terms: 'By continuing, you agree to our Terms of Intellect.',
    languageSelectedToast: 'Language updated to English'
  },
  bn: {
    tagline: 'বিশ্বমানের একাডেমিক কোর্স, প্র্যাকটিক্যাল কোহর্ট এবং ভবিষ্যৎ নেতৃত্বের জন্য ডিজাইনকৃত সেরা সার্টিফিকেশন এক্সেস করুন।',
    feature1: '১৫০+ প্রফেশনাল মাস্টারক্লাস ও লেকচার',
    feature2: '১-অন-১ শীর্ষ ইন্ডাস্ট্রি মেন্টরশিপ',
    feature3: 'যাচাইকৃত একাডেমিক সার্টিফিকেট',
    loginBtn: 'অ্যাকাউন্টে লগইন করুন',
    registerBtn: 'নতুন অ্যাকাউন্ট তৈরি করুন',
    terms: 'চালিয়ে যাওয়ার মাধ্যমে আপনি আমাদের নীতিমালার সাথে একমত প্রকাশ করছেন।',
    languageSelectedToast: 'ভাষা পরিবর্তন করা হয়েছে: বাংলা'
  },
  es: {
    tagline: 'Acceda a programas de estudio de primer nivel, cohortes prácticas inmersivas y certificaciones de élite diseñadas para futuros líderes.',
    feature1: 'Más de 150 Clases Magistrales',
    feature2: 'Mentoría 1 a 1 de la Industria',
    feature3: 'Certificaciones Académicas Oficiales',
    loginBtn: 'Iniciar Sesión',
    registerBtn: 'Crear Nueva Cuenta',
    terms: 'Al continuar, usted acepta nuestros Términos Académicos.',
    languageSelectedToast: 'Idioma actualizado a Español'
  },
  fr: {
    tagline: 'Accédez à des programmes d’études de calibre mondial, des cohortes pratiques et des certifications d’élite pour les futurs leaders.',
    feature1: '150+ Masterclasses Professionnelles',
    feature2: 'Mentorat Individuel 1-sur-1',
    feature3: 'Certifications Reconnues Mondialement',
    loginBtn: 'Se Connecter',
    registerBtn: 'Créer un Compte',
    terms: 'En continuant, vous acceptez nos conditions d’utilisation.',
    languageSelectedToast: 'Langue mise à jour en Français'
  },
  de: {
    tagline: 'Erhalten Sie Zugang zu erstklassigen Studienprogrammen, praxisnahen Kohorten und Elite-Zertifizierungen für angehende Führungskräfte.',
    feature1: '150+ Professionelle Masterclasses',
    feature2: '1-zu-1 Mentoring mit Industrie-Experten',
    feature3: 'Akkreditierte Universitätszertifikate',
    loginBtn: 'Anmelden',
    registerBtn: 'Neues Konto Erstellen',
    terms: 'Mit der Fortsetzung stimmen Sie unseren akademischen Bedingungen zu.',
    languageSelectedToast: 'Sprache geändert auf Deutsch'
  },
  ar: {
    tagline: 'احصل على برامج دراسية عالمية المستوى، ودورات تدريبية عملية وتطبيقية وشهادات معتمدة لقادة المستقبل.',
    feature1: 'أكثر من ١٥٠ درس أكاديمي احترافي',
    feature2: 'إرشاد وتوجيه فردي مع خبراء الصناعة',
    feature3: 'شهادات أكاديمية معتمدة وموثقة',
    loginBtn: 'تسجيل الدخول',
    registerBtn: 'إنشاء حساب جديد',
    terms: 'بالمتابعة، فإنك توافق على شروط وأحكام منصتنا الأكاديمية.',
    languageSelectedToast: 'تم تغيير اللغة إلى العربية'
  },
  zh: {
    tagline: '获取世界一流的学习课程、沉浸式实践训练营以及为未来领导者量身定制的专业认证。',
    feature1: '150+ 专业名师大师课',
    feature2: '1对1 资深行业导师带教',
    feature3: '国际认可学术结业认证',
    loginBtn: '登录学员账户',
    registerBtn: '注册全新账户',
    terms: '继续操作即表示您同意我们的学术服务条款。',
    languageSelectedToast: '语言已更新为：中文'
  },
  hi: {
    tagline: 'विश्वस्तरीय अध्ययन कार्यक्रमों, व्यावहारिक कोहोर्ट्स और भविष्य के लीडर्स के लिए डिज़ाइन किए गए प्रमाणपत्रों तक पहुंच प्राप्त करें।',
    feature1: '150+ व्यावसायिक मास्टरक्लास',
    feature2: '1-ऑन-1 उद्योग विशेषज्ञ मेंटरशिप',
    feature3: 'मान्यता प्राप्त शैक्षणिक प्रमाणपत्र',
    loginBtn: 'खाते में लॉग इन करें',
    registerBtn: 'नया खाता बनाएं',
    terms: 'जारी रखकर, आप हमारी शर्तों से सहमत होते हैं।',
    languageSelectedToast: 'भाषा बदलकर हिन्दी कर दी गई है'
  },
  ja: {
    tagline: '世界水準のアカデミックプログラム、実践的なコホート、未来のリーダー向けのエリート認定資格にアクセスできます。',
    feature1: '150以上のプロフェッショナル講座',
    feature2: '業界トップメンターによる1対1指導',
    feature3: '公式認定アカデミック修了証',
    loginBtn: 'アカウントにログイン',
    registerBtn: '新規アカウント作成',
    terms: '続行することにより、利用規約に同意したことになります。',
    languageSelectedToast: '言語を日本語に変更しました'
  }
};

export const WelcomeView: React.FC<WelcomeViewProps> = ({ onNavigate }) => {
  const [selectedLang, setSelectedLang] = useState<string>(() => {
    return localStorage.getItem('nexus_academic_language') || 'en';
  });
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [showLanguageNotice, setShowLanguageNotice] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLangInfo = ACADEMIC_LANGUAGES.find(l => l.code === selectedLang) || ACADEMIC_LANGUAGES[0];
  const t = TRANSLATIONS[selectedLang] || TRANSLATIONS.en;

  // Handle clicks outside language dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectLanguage = (code: string) => {
    setSelectedLang(code);
    localStorage.setItem('nexus_academic_language', code);
    setIsDropdownOpen(false);
    setShowLanguageNotice(true);
    setTimeout(() => setShowLanguageNotice(false), 2400);
  };

  return (
    <div className="flex-1 flex flex-col justify-between py-4 sm:py-6 relative">
      {/* Floating Language Selection Dropdown at Top-Right Corner */}
      <div 
        ref={dropdownRef} 
        className="absolute top-0 right-0 z-40"
      >
        <motion.button
          id="welcome-language-toggle-btn"
          type="button"
          whileTap={{ scale: 0.96 }}
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800/90 border border-white/15 hover:border-[#39FF14]/50 backdrop-blur-xl text-slate-200 text-xs font-mono transition-all shadow-[0_4px_20px_rgba(0,0,0,0.5)] cursor-pointer group"
          title="Toggle Academic Language"
        >
          <span className="text-sm">{currentLangInfo.flag}</span>
          <Globe size={13} className="text-[#39FF14] group-hover:rotate-45 transition-transform duration-300" />
          <span className="font-semibold text-[11px] text-white tracking-wider uppercase">
            {currentLangInfo.code}
          </span>
          <ChevronDown 
            size={12} 
            className={`text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-[#39FF14]' : ''}`} 
          />
        </motion.button>

        {/* Dropdown Menu */}
        <AnimatePresence>
          {isDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.95 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="absolute right-0 mt-2 w-64 sm:w-72 bg-slate-950/95 border border-[#39FF14]/30 backdrop-blur-2xl rounded-2xl p-2 shadow-[0_15px_40px_rgba(0,0,0,0.9)] z-50 flex flex-col space-y-1 animate-in"
            >
              <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between mb-1">
                <div className="flex items-center space-x-1.5">
                  <Globe size={13} className="text-[#39FF14]" />
                  <span className="text-[11px] font-mono font-bold text-white uppercase tracking-wider">
                    Academic Language
                  </span>
                </div>
                <span className="text-[9px] font-mono text-[#39FF14] bg-[#39FF14]/10 px-1.5 py-0.5 rounded border border-[#39FF14]/30 font-bold">
                  {ACADEMIC_LANGUAGES.length} LOCALE
                </span>
              </div>

              <div 
                className="max-h-60 overflow-y-auto overscroll-contain pr-1 space-y-1"
                style={{ scrollbarWidth: 'thin', scrollbarColor: '#39FF14 rgba(255,255,255,0.05)' }}
              >
                {ACADEMIC_LANGUAGES.map((lang) => {
                  const isSelected = selectedLang === lang.code;
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => handleSelectLanguage(lang.code)}
                      className={`w-full px-2.5 py-2 text-left rounded-xl text-xs font-mono transition-all flex items-center justify-between cursor-pointer border ${
                        isSelected
                          ? 'bg-[#39FF14] text-black font-bold border-[#39FF14] shadow-[0_0_12px_rgba(57,255,20,0.25)]'
                          : 'text-slate-200 hover:bg-white/10 hover:text-white border-white/5 hover:border-white/15 bg-white/[0.02]'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 truncate">
                        <span className="text-base flex-shrink-0">{lang.flag}</span>
                        <div className="flex flex-col truncate">
                          <span className={`text-[12px] truncate ${isSelected ? 'text-black font-extrabold' : 'text-white'}`}>
                            {lang.nativeName}
                          </span>
                          <span className={`text-[9px] font-sans truncate ${isSelected ? 'text-black/80 font-medium' : 'text-slate-400'}`}>
                            {lang.name} • {lang.region}
                          </span>
                        </div>
                      </div>

                      {isSelected ? (
                        <Check size={14} className="stroke-[3] text-black shrink-0 ml-1" />
                      ) : (
                        <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-1 uppercase">{lang.code}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Language Change Notification Toast */}
      <AnimatePresence>
        {showLanguageNotice && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-12 left-1/2 -translate-x-1/2 z-50 px-3.5 py-1.5 rounded-full bg-[#39FF14] text-black text-xs font-mono font-bold shadow-[0_4px_25px_rgba(57,255,20,0.4)] flex items-center space-x-1.5 pointer-events-none"
          >
            <Sparkles size={13} className="text-black" />
            <span>{t.languageSelectedToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top spacing to accommodate the language selector */}
      <div className="h-10" />

      {/* Hero section */}
      <div className="flex flex-col items-center justify-center flex-1 my-6 sm:my-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.21, 0.47, 0.32, 0.98] }}
        >
          <AppLogo size="lg" />
        </motion.div>
        
        <motion.p 
          key={`tagline-${selectedLang}`}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="mt-6 text-center text-slate-300 max-w-xs sm:max-w-sm text-sm sm:text-base leading-relaxed font-sans"
        >
          {t.tagline}
        </motion.p>

        {/* Floating Glass Accent Features List */}
        <div className="mt-8 w-full space-y-2.5">
          <motion.div 
            initial={{ opacity: 0, x: -16, y: 8 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25, ease: 'easeOut' }}
            className="flex items-center space-x-3 glass-panel-light border border-white/5 rounded-xl px-4 py-3 backdrop-blur-md"
          >
            <span className="w-2 h-2 rounded-full bg-[#39FF14] shadow-[0_0_8px_#39FF14]" />
            <span className="text-xs text-slate-300 font-mono">{t.feature1}</span>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, x: 16, y: 8 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35, ease: 'easeOut' }}
            className="flex items-center space-x-3 glass-panel-light border border-white/5 rounded-xl px-4 py-3 backdrop-blur-md"
          >
            <span className="w-2 h-2 rounded-full bg-[#39FF14] shadow-[0_0_8px_#39FF14]" />
            <span className="text-xs text-slate-300 font-mono">{t.feature2}</span>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: -16, y: 8 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45, ease: 'easeOut' }}
            className="flex items-center space-x-3 glass-panel-light border border-white/5 rounded-xl px-4 py-3 backdrop-blur-md"
          >
            <span className="w-2 h-2 rounded-full bg-[#39FF14] shadow-[0_0_8px_#39FF14]" />
            <span className="text-xs text-slate-300 font-mono">{t.feature3}</span>
          </motion.div>
        </div>
      </div>

      {/* Controls & Buttons */}
      <div className="space-y-3.5 w-full">
        {/* Login Button with Neon fill hover */}
        <motion.button
          id="welcome-login-btn"
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.55, ease: [0.21, 0.47, 0.32, 0.98] }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onNavigate('login')}
          className="
            w-full py-4 px-6 min-h-[52px] rounded-2xl bg-[#39FF14] text-black font-semibold 
            text-base sm:text-sm tracking-wide shadow-[0_4px_20px_rgba(57,255,20,0.25)] 
            hover:shadow-[0_4px_30px_rgba(57,255,20,0.4)] active:scale-[0.98]
            transition-all duration-300 flex items-center justify-center space-x-2 cursor-pointer
          "
        >
          <LogIn size={20} />
          <span>{t.loginBtn}</span>
          <ArrowRight size={18} className="ml-1" />
        </motion.button>

        {/* Register Button with elegant outline and glass glow */}
        <motion.button
          id="welcome-register-btn"
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.65, ease: [0.21, 0.47, 0.32, 0.98] }}
          whileHover={{ scale: 1.01, backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onNavigate('register')}
          className="
            w-full py-4 px-6 min-h-[52px] rounded-2xl glass-panel-light border border-white/10 
            text-slate-100 font-semibold text-base sm:text-sm tracking-wide hover:border-white/25 active:bg-white/10
            transition-all duration-300 flex items-center justify-center space-x-2 cursor-pointer
          "
        >
          <UserPlus size={20} className="text-[#39FF14]" />
          <span>{t.registerBtn}</span>
        </motion.button>

        {/* Footer info text */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.75 }}
          className="text-center text-[11px] text-slate-400 font-mono pt-1"
        >
          {t.terms}
        </motion.p>
      </div>
    </div>
  );
};

