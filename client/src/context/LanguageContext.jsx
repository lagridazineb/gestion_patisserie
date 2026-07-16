import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { translations } from '../i18n/translations'

const STORAGE_KEY = 'diana_lang'
const LanguageContext = createContext(null)

// Choix de langue PERSONNEL : stocké dans le localStorage de l'appareil (pas en base), donc
// chaque utilisateur/appareil garde son propre réglage FR/AR, indépendamment des autres.
export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved === 'ar' || saved === 'fr' ? saved : 'fr'
    } catch {
      return 'fr'
    }
  })

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, lang) } catch {}
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
  }, [lang])

  const toggleLang = () => setLang((l) => (l === 'fr' ? 'ar' : 'fr'))

  // t('nav.caisse') -> lit translations[lang].nav.caisse, avec repli sur le français puis sur
  // la clé elle-même si rien n'est trouvé (évite un écran vide en cas de clé manquante).
  const t = useMemo(() => {
    return (key) => {
      const lookup = (l) => key.split('.').reduce((node, part) => (node && node[part] !== undefined ? node[part] : undefined), translations[l])
      return lookup(lang) ?? lookup('fr') ?? key
    }
  }, [lang])

  const value = useMemo(() => ({ lang, setLang, toggleLang, t, isAr: lang === 'ar' }), [lang])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage doit être utilisé à l’intérieur de <LanguageProvider>')
  return ctx
}
