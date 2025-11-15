// utils/i18n.ts
import { UserProfile } from "../context/UserContext";

export type SupportedLang = "en" | "hi" | "ar" | "es";

const translations: Record<SupportedLang, Record<string, string>> = {
  en: {
    home_greeting: "Hi",
    home_subtitle: "Here’s how things look right now:",
    home_btn_feeling: "How are you feeling? 💬",
    home_btn_tools: "Open tools 🧰",
    home_btn_parent: "Parent view 👀",

    checkin_title: "Check-in time 💬",
    checkin_subtitle:
      "How are you feeling right now, {name}? Your feelings help me protect you better.",
    checkin_pick_mood: "Pick the closest mood:",
    checkin_body_question: "What’s happening in your body?",
    checkin_sleep_question: "How did you sleep last night?",
    checkin_save: "Save check-in 💛",
    checkin_footer: "You’re doing a good job just by noticing how you feel.",

    coach_title: "I’m here with you 💛",
    coach_use_tools: "Use calming tools 🧘‍♀️",
    coach_back_home: "Back to home",

    parent_header: "Parent overview 👀",
    parent_subheader:
      "A quick snapshot of how {name} has been feeling recently.",

    generic_you: "you",
  },

  hi: {
    home_greeting: "नमस्ते",
    home_subtitle: "अभी आपकी स्थिति कुछ ऐसी है:",
    home_btn_feeling: "आप कैसा महसूस कर रहे हैं? 💬",
    home_btn_tools: "कैल्मिंग टूल्स खोलें 🧰",
    home_btn_parent: "पैरेंट व्यू 👀",

    checkin_title: "चेक-इन समय 💬",
    checkin_subtitle:
      "अभी आप कैसा महसूस कर रहे हैं, {name}? आपकी फीलिंग्स मुझे आपको बेहतर प्रोटेक्ट करने में मदद करती हैं।",
    checkin_pick_mood: "सबसे करीब वाला मूड चुनें:",
    checkin_body_question: "शरीर में क्या महसूस हो रहा है?",
    checkin_sleep_question: "कल रात आपकी नींद कैसी थी?",
    checkin_save: "चेक-इन सेव करें 💛",
    checkin_footer: "सिर्फ नोटिस करना भी बहुत बड़ा कदम है।",

    coach_title: "मैं आपके साथ हूँ 💛",
    coach_use_tools: "कैल्मिंग टूल्स इस्तेमाल करें 🧘‍♀️",
    coach_back_home: "होम पर वापस जाएँ",

    parent_header: "Parent overview 👀",
    parent_subheader:
      "{name} ने हाल ही में कैसा महसूस किया है, उसका एक छोटा सा सारांश।",

    generic_you: "आप",
  },

  ar: {
    home_greeting: "مرحباً",
    home_subtitle: "هكذا تبدو حالتك الآن:",
    home_btn_feeling: "كيف تشعر الآن؟ 💬",
    home_btn_tools: "افتح أدوات التهدئة 🧰",
    home_btn_parent: "عرض الوالد 👀",

    checkin_title: "وقت المتابعة 💬",
    checkin_subtitle:
      "كيف تشعر الآن، {name}؟ مشاعرك تساعدني على حمايتك بشكل أفضل.",
    checkin_pick_mood: "اختر المزاج الأقرب:",
    checkin_body_question: "ماذا يحدث في جسدك؟",
    checkin_sleep_question: "كيف كانت نومتك الليلة الماضية؟",
    checkin_save: "احفظ المتابعة 💛",
    checkin_footer: "مجرد ملاحظة شعورك خطوة شجاعة.",

    coach_title: "أنا هنا معك 💛",
    coach_use_tools: "استخدم أدوات التهدئة 🧘‍♀️",
    coach_back_home: "العودة إلى الرئيسية",

    parent_header: "نظرة الوالد 👀",
    parent_subheader:
      "ملخص سريع عن كيف كان {name} يشعر في الفترة الأخيرة.",

    generic_you: "أنت",
  },

  es: {
    home_greeting: "Hola",
    home_subtitle: "Así se ve tu estado ahora:",
    home_btn_feeling: "¿Cómo te sientes? 💬",
    home_btn_tools: "Abrir herramientas calmantes 🧰",
    home_btn_parent: "Vista para padres 👀",

    checkin_title: "Momento de check-in 💬",
    checkin_subtitle:
      "¿Cómo te sientes ahora, {name}? Lo que sientes me ayuda a protegerte mejor.",
    checkin_pick_mood: "Elige el estado de ánimo más cercano:",
    checkin_body_question: "¿Qué está pasando en tu cuerpo?",
    checkin_sleep_question: "¿Cómo dormiste anoche?",
    checkin_save: "Guardar check-in 💛",
    checkin_footer: "Notar cómo te sientes ya es un gran paso.",

    coach_title: "Estoy aquí contigo 💛",
    coach_use_tools: "Usar herramientas calmantes 🧘‍♀️",
    coach_back_home: "Volver al inicio",

    parent_header: "Vista para padres 👀",
    parent_subheader:
      "Un resumen rápido de cómo se ha sentido {name} últimamente.",

    generic_you: "tú",
  },
};

export function t(key: string, lang: SupportedLang = "en"): string {
  const table = translations[lang] || translations.en;
  return table[key] || translations.en[key] || key;
}

// Helper: pick language safely from user profile
export function getLangFromProfile(profile: UserProfile | null): SupportedLang {
  const code = profile?.language as SupportedLang | undefined;
  if (!code) return "en";
  if (["en", "hi", "ar", "es"].includes(code)) return code;
  return "en";
}