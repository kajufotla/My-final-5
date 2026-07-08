// ==========================================
// i18n Translation Dictionary & Logic
// ==========================================
const translations = {
  en: { nav_home: "Home", nav_invoice: "Invoice Builder", nav_history: "History", nav_contact: "Contact", nav_login: "Login", nav_signup: "Sign Up", tab_editor: "📝 Editor", tab_preview: "👁️ Preview", side_doc: "Document", side_company: "Company", side_customer: "Customer", side_items: "Items & Tax", side_payment: "Payment", side_extras: "Extras", side_history: "History", act_save: "💾 Save To History", act_print: "🖨️ Print PDF", act_reset: "↺ Reset", tot_due: "TOTAL DUE:", card_bank: "BANK DETAILS", card_scan: "SCAN TO PAY", card_terms: "TERMS & CONDITIONS", card_notes: "NOTES", foot_sig: "Authorized Signature", foot_thx: "Thank you for your business!", err_req: "Required field" },
  ur: { nav_home: "ہوم", nav_invoice: "انوائس بلڈر", nav_history: "ہسٹری", nav_contact: "رابطہ", nav_login: "لاگ ان", nav_signup: "سائن اپ", tab_editor: "📝 ایڈیٹر", tab_preview: "👁️ پیش نظارہ", side_doc: "دستاویز", side_company: "کمپنی", side_customer: "گاہک", side_items: "اشیاء اور ٹیکس", side_payment: "ادائیگی", side_extras: "اضافی معلومات", side_history: "ہسٹری", act_save: "💾 محفوظ کریں", act_print: "🖨️ پرنٹ", act_reset: "↺ ری سیٹ", tot_due: "کل رقم:", card_bank: "بینک کی تفصیلات", card_scan: "اسکین کریں", card_terms: "شرائط و ضوابط", card_notes: "نوٹس", foot_sig: "مجاز دستخط", foot_thx: "آپ کے کاروبار کا شکریہ!", err_req: "مطلوبہ فیلڈ" },
  ar: { nav_home: "الرئيسية", nav_invoice: "صانع الفواتير", nav_history: "السجل", nav_contact: "اتصل بنا", nav_login: "تسجيل الدخول", nav_signup: "اشتراك", tab_editor: "📝 محرر", tab_preview: "👁️ معاينة", side_doc: "وثيقة", side_company: "شركة", side_customer: "عميل", side_items: "عناصر وضريبة", side_payment: "دفع", side_extras: "إضافات", side_history: "سجل", act_save: "💾 حفظ", act_print: "🖨️ طباعة", act_reset: "↺ إعادة تعيين", tot_due: "الإجمالي:", card_bank: "تفاصيل البنك", card_scan: "مسح للدفع", card_terms: "الشروط والأحكام", card_notes: "ملاحظات", foot_sig: "توقيع معتمد", foot_thx: "شكرا لتعاملكم معنا!", err_req: "حقل مطلوب" },
};

function setLanguage(lang) {
  localStorage.setItem('rgp_lang', lang);
  const isRtl = ['ur', 'ar'].includes(lang);
  document.documentElement.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
  document.documentElement.setAttribute('lang', lang);

  const dict = translations[lang] || translations['en']; 
  document.querySelectorAll('[data-i18n]').forEach(el => { 
    const key = el.getAttribute('data-i18n'); 
    if(dict[key]) { 
      if(el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = dict[key]; 
      } else {
        el.innerHTML = el.innerHTML.replace(/^[^\<]+/, dict[key] + ' '); 
      }
    } 
  }); 
}
