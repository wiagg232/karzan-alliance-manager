// src/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';

i18n
    .use(initReactI18next)
    .use(LanguageDetector)
    .use(HttpBackend)
    .init({
        lng: 'zh-TW',                     // 強制起始語言
        fallbackLng: {
            'zh-HK': ['zh-TW'],
            'zh-MO': ['zh-TW'],
            'zh-CN': ['zh-TW'],
            'zh': ['zh-TW'],
            'default': ['zh-TW']
        },
        supportedLngs: ['zh-TW', 'en', 'zh', 'zh-HK', 'zh-MO', 'zh-CN'],   // 明確列出所有可能被偵測到的中文變體
        nonExplicitSupportedLngs: true, // 允許非精確匹配（如 zh-HK 匹配 zh）
        ns: ['translation'],
        defaultNS: 'translation',
        backend: {
            loadPath: `${import.meta.env.BASE_URL}locales/{{lng}}/{{ns}}.json`,
        },
        detection: {
            order: ['localStorage', 'navigator'],
            lookupLocalStorage: 'preferredLanguage',
            caches: ['localStorage'],
        },
        interpolation: {
            escapeValue: false,
        },
        debug: import.meta.env.DEV,
        react: {
            useSuspense: true,
        },
    });

// 強制修正 zh → zh-TW
i18n.on('languageChanged', (lng) => {
    if (lng.startsWith('zh') && lng !== 'zh-TW') {
        i18n.changeLanguage('zh-TW');
    }
});

export default i18n;