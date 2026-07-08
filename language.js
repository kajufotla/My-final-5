const translations = {
  en: { nav_home: "Home", tab_editor: "📝 Editor", tab_preview: "👁️ Preview", act_save: "💾 Save To History" },
  ur: { nav_home: "ہوم", tab_editor: "📝 ایڈیٹر", tab_preview: "👁️ پیش نظارہ", act_save: "💾 محفوظ کریں" },
  ar: { nav_home: "الرئيسية", tab_editor: "📝 محرر", tab_preview: "👁️ معاينة", act_save: "💾 حفظ" },
};

export function setLanguage(lang) {
  localStorage.setItem('rgp_lang', lang);
  const isRtl = ['ur', 'ar'].includes(lang);
  document.documentElement.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
  document.documentElement.setAttribute('lang', lang);

  const dict = translations[lang] || translations['en']; 
  document.querySelectorAll('[data-i18n]').forEach(el => { 
    const key = el.getAttribute('data-i18n'); 
    if(dict[key]) { 
      if(el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.placeholder = dict[key]; 
      else el.innerHTML = el.innerHTML.replace(/^[^\<]+/, dict[key] + ' '); 
    } 
  }); 
}
