// ==========================================================================
// MAIN APPLICATION CONTROLLER (App.js)
// ==========================================================================

import { UndoRedoEngine, runSmartFieldValidation, itemActions, debounce } from './invoiceCore.js';

// ان چار ماڈیولز کے امپورٹس جو آپ کے پاس پہلے سے الگ موجود ہیں:
// import { setLanguage } from './language.js';
// import { updatePreview, openPdfSetupModal } from './preview.js';
// import { sanitizeHTML, safeParseJSON, validateUploadedFile } from './security.js';
// import { executeStorageBackup, generateAutoNumber } from './storageAndExport.js';

document.addEventListener('DOMContentLoaded', () => {

  // ==========================================
  // PERFORMANCE SELECTOR CACHE
  // ==========================================
  const cache = {
    bizName: document.getElementById('bizName'),
    bizEmail: document.getElementById('bizEmail'),
    bizPhone: document.getElementById('bizPhone'),
    bizAddress: document.getElementById('bizAddress'),
    custName: document.getElementById('custName'),
    custCompany: document.getElementById('custCompany'),
    custEmail: document.getElementById('custEmail'),
    custPhone: document.getElementById('custPhone'),
    custAddress: document.getElementById('custAddress'),
    receiptNumber: document.getElementById('receiptNumber'),
    issueDate: document.getElementById('issueDate'),
    dueDate: document.getElementById('dueDate'),
    invoiceStatus: document.getElementById('invoiceStatus'),
    watermarkSelect: document.getElementById('watermarkSelect'),
    receiptType: document.getElementById('receiptType'),
    payUrl: document.getElementById('payUrl'),
    payMethod: document.getElementById('payMethod'),
    bankAccTitle: document.getElementById('bankAccTitle'),
    bankName: document.getElementById('bankName'),
    bankAccNo: document.getElementById('bankAccNo'),
    bankIban: document.getElementById('bankIban'),
    bankSwift: document.getElementById('bankSwift'),
    bankBranch: document.getElementById('bankBranch'),
    bankCode: document.getElementById('bankCode'),
    bankRef: document.getElementById('bankRef'),
    itemsBody: document.getElementById('itemsBody'),
    discountVal: document.getElementById('discountVal'),
    taxRate: document.getElementById('taxRate'),
    taxLabelInput: document.getElementById('taxLabelInput'),
    shippingCost: document.getElementById('shippingCost'),
    currencySelect: document.getElementById('currencySelect'),
    themeColorSelect: document.getElementById('themeColorSelect'),
    paymentArchType: document.getElementById('paymentArchType'),
    bankFields: document.getElementById('bankFields'),
    stripeFields: document.getElementById('stripeFields'),
    bankDetails: document.getElementById('bankDetails'),
    notes: document.getElementById('notes'),
    terms: document.getElementById('terms'),
    historyLogsContainer: document.getElementById('historyLogsContainer'),
    searchHistory: document.getElementById('searchHistory'),
    mainForm: document.getElementById('mainForm'),
    receiptPaper: document.getElementById('receiptPaper'),
    prevItemsBody: document.getElementById('prevItemsBody'),
    prevSubtotal: document.getElementById('prevSubtotal'),
    rowDiscount: document.getElementById('rowDiscount'),
    prevDiscount: document.getElementById('prevDiscount'),
    rowTax: document.getElementById('rowTax'),
    prevTax: document.getElementById('prevTax'),
    rowShipping: document.getElementById('rowShipping'),
    prevShipping: document.getElementById('prevShipping'),
    prevTotal: document.getElementById('prevTotal'),
    prevTaxLabel: document.getElementById('prevTaxLabel'),
    prevBizContact: document.getElementById('prevBizContact'),
    prevCustContact: document.getElementById('prevCustContact'),
    prevPayMethod: document.getElementById('prevPayMethod'),
    prevBankDetails: document.getElementById('prevBankDetails'),
    prevPayUrl: document.getElementById('prevPayUrl'),
    prevLogo: document.getElementById('prevLogo'),
    prevSig: document.getElementById('prevSig'),
    prevQr: document.getElementById('prevQr'),
    wrapQr: document.getElementById('wrapQr'),
    prevWatermark: document.getElementById('prevWatermark'),
    prevInvoiceStatus: document.getElementById('prevInvoiceStatus'),
    dashTotalClients: document.getElementById('dashTotalClients'),
    dashTotalInvoiced: document.getElementById('dashTotalInvoiced')
  };

  // ==========================================
  // INITIAL DATA & STATE ACTIONS
  // ==========================================
  let state = {
    items: [{ id: Date.now(), desc: '', qty: '', price: '' }],
    logoData: localStorage.getItem('rgp_logoData') || null,
    sigData: localStorage.getItem('rgp_sigData') || null,
    qrData: localStorage.getItem('rgp_qrData') || null,
    activeTemplate: localStorage.getItem('rgp_template_layout') || 'default'
  };

  let historyLogs = safeParseJSON(localStorage.getItem('rgp_history'), []);
  let savedClients = safeParseJSON(localStorage.getItem('rgp_clients'), []);
  let savedPayments = safeParseJSON(localStorage.getItem('rgp_payments'), []);
  let itemMemory = safeParseJSON(localStorage.getItem('rgp_item_memory'), []);
  let notesLibrary = safeParseJSON(localStorage.getItem('rgp_notes_library'), []);

  // INJECT UI AND STYLES RUNTIME
  injectStyles();
  injectUIElements();

  const calculateCalculatedDueDate = () => {
    const offsetSelect = document.getElementById('dueDateOffset');
    if (!offsetSelect || offsetSelect.value === 'manual' || !cache.issueDate?.value) return;
    
    const offsetDays = parseInt(offsetSelect.value, 10);
    const baseDate = new Date(cache.issueDate.value);
    if (!isNaN(baseDate.getTime())) {
      baseDate.setDate(baseDate.getDate() + offsetDays);
      if(cache.dueDate) cache.dueDate.value = baseDate.toISOString().split('T')[0];
      updatePreview();
    }
  };

  document.getElementById('dueDateOffset')?.addEventListener('change', calculateCalculatedDueDate);
  cache.issueDate?.addEventListener('change', calculateCalculatedDueDate);

  // ==========================================
  // NOTES & TERMS SNIPPET LIBRARY CONTROLLER
  // ==========================================
  const renderNotesLibraryDropdown = () => {
    const dbox = document.getElementById('libraryTargetSelect');
    if (!dbox) return;
    dbox.innerHTML = '<option value="">-- Choose From Notes & Terms Library --</option>';
    notesLibrary.forEach((item, index) => {
      dbox.innerHTML += `<option value="${index}">${sanitizeHTML(item.title)} (${item.type})</option>`;
    });
  };

  document.getElementById('btnSaveToLibrary')?.addEventListener('click', () => {
    const titlePrompt = prompt("Enter a unique lookup name for this snippet asset:");
    if (!titlePrompt) return;
    
    const noteVal = cache.notes?.value || '';
    const termVal = cache.terms?.value || '';
    const bankVal = cache.bankDetails?.value || '';

    const record = {
      title: titlePrompt,
      notes: noteVal,
      terms: termVal,
      bank: bankVal,
      type: noteVal ? 'Notes' : (termVal ? 'Terms' : 'Bank')
    };

    notesLibrary.push(record);
    localStorage.setItem('rgp_notes_library', JSON.stringify(notesLibrary));
    renderNotesLibraryDropdown();
    alert("Asset stored inside workspace library profile.");
  });

  document.getElementById('libraryTargetSelect')?.addEventListener('change', (e) => {
    if (e.target.value === "") return;
    const activeItem = notesLibrary[e.target.value];
    if (activeItem) {
      if (activeItem.notes && cache.notes) cache.notes.value = activeItem.notes;
      if (activeItem.terms && cache.terms) cache.terms.value = activeItem.terms;
      if (activeItem.bank && cache.bankDetails) cache.bankDetails.value = activeItem.bank;
      updatePreview();
    }
  });

  document.getElementById('btnDeleteLibraryItem')?.addEventListener('click', () => {
    const target = document.getElementById('libraryTargetSelect');
    if (!target || target.value === "") return alert("Please select an item to delete.");
    if (confirm("Remove this snippet item from local storage configurations permanently?")) {
      notesLibrary.splice(target.value, 1);
      localStorage.setItem('rgp_notes_library', JSON.stringify(notesLibrary));
      renderNotesLibraryDropdown();
      updatePreview();
    }
  });

  renderNotesLibraryDropdown();

  // ==========================================
  // SNAPSHOT & RECOVERY CONTROLLERS
  // ==========================================
  const captureCurrentFormSnapshot = () => {
    return {
      bizName: cache.bizName?.value || '',
      bizEmail: cache.bizEmail?.value || '',
      bizPhone: cache.bizPhone?.value || '',
      bizAddress: cache.bizAddress?.value || '',
      custName: cache.custName?.value || '',
      custCompany: cache.custCompany?.value || '',
      custEmail: cache.custEmail?.value || '',
      custPhone: cache.custPhone?.value || '',
      custAddress: cache.custAddress?.value || '',
      receiptNumber: cache.receiptNumber?.value || '',
      issueDate: cache.issueDate?.value || '',
      dueDate: cache.dueDate?.value || '',
      invoiceStatus: cache.invoiceStatus?.value || 'Draft',
      watermark: cache.watermarkSelect?.value || '',
      currency: cache.currencySelect?.value || '',
      discount: cache.discountVal?.value || '',
      tax: cache.taxRate?.value || '',
      taxLabel: cache.taxLabelInput?.value || '',
      shipping: cache.shippingCost?.value || '',
      themeColor: cache.themeColorSelect?.value || '',
      paymentArch: cache.paymentArchType?.value || '',
      bankDetails: cache.bankDetails?.value || '',
      payUrl: cache.payUrl?.value || '',
      payMethodText: cache.payMethod?.value || '',
      notes: cache.notes?.value || '',
      terms: cache.terms?.value || '',
      items: state.items
    };
  };

  const applySnapshotToForm = (snap) => {
    if (!snap) return;
    if (snap.bizName !== undefined && cache.bizName) cache.bizName.value = snap.bizName;
    if (snap.bizEmail !== undefined && cache.bizEmail) cache.bizEmail.value = snap.bizEmail;
    if (snap.bizPhone !== undefined && cache.bizPhone) cache.bizPhone.value = snap.bizPhone;
    if (snap.bizAddress !== undefined && cache.bizAddress) cache.bizAddress.value = snap.bizAddress;
    if (snap.custName !== undefined && cache.custName) cache.custName.value = snap.custName;
    if (snap.custCompany !== undefined && cache.custCompany) cache.custCompany.value = snap.custCompany;
    if (snap.custEmail !== undefined && cache.custEmail) cache.custEmail.value = snap.custEmail;
    if (snap.custPhone !== undefined && cache.custPhone) cache.custPhone.value = snap.custPhone;
    if (snap.custAddress !== undefined && cache.custAddress) cache.custAddress.value = snap.custAddress;
    if (snap.receiptNumber !== undefined && cache.receiptNumber) cache.receiptNumber.value = snap.receiptNumber;
    if (snap.issueDate !== undefined && cache.issueDate) cache.issueDate.value = snap.issueDate;
    if (snap.dueDate !== undefined && cache.dueDate) cache.dueDate.value = snap.dueDate;
    if (snap.invoiceStatus !== undefined && cache.invoiceStatus) cache.invoiceStatus.value = snap.invoiceStatus;
    if (snap.watermark !== undefined && cache.watermarkSelect) cache.watermarkSelect.value = snap.watermark;
    if (snap.currency !== undefined && cache.currencySelect) cache.currencySelect.value = snap.currency;
    if (snap.discount !== undefined && cache.discountVal) cache.discountVal.value = snap.discount;
    if (snap.tax !== undefined && cache.taxRate) cache.taxRate.value = snap.tax;
    if (snap.taxLabel !== undefined && cache.taxLabelInput) cache.taxLabelInput.value = snap.taxLabel;
    if (snap.shipping !== undefined && cache.shippingCost) cache.shippingCost.value = snap.shipping;
    if (snap.themeColor !== undefined && cache.themeColorSelect) cache.themeColorSelect.value = snap.themeColor;
    if (snap.paymentArch !== undefined && cache.paymentArchType) cache.paymentArchType.value = snap.paymentArch;
    if (snap.bankDetails !== undefined && cache.bankDetails) cache.bankDetails.value = snap.bankDetails;
    if (snap.payUrl !== undefined && cache.payUrl) cache.payUrl.value = snap.payUrl;
    if (snap.payMethodText !== undefined && cache.payMethod) cache.payMethod.value = snap.payMethodText;
    if (snap.notes !== undefined && cache.notes) cache.notes.value = snap.notes;
    if (snap.terms !== undefined && cache.terms) cache.terms.value = snap.terms;
    if (snap.items !== undefined) state.items = snap.items;

    renderItemsEditor();
    updatePreview();
  };

  const autoSaveDraftAction = debounce(() => {
    const snap = captureCurrentFormSnapshot();
    localStorage.setItem('rgp_autosave_draft_cache', JSON.stringify(snap));
    UndoRedoEngine.pushState(snap);
    executeStorageBackup();
  }, 700);

  (() => {
    const recoveryTarget = localStorage.getItem('rgp_autosave_draft_cache');
    if (recoveryTarget) {
      try {
        const parsed = JSON.parse(recoveryTarget);
        if (parsed && Object.keys(parsed).length > 0) {
          applySnapshotToForm(parsed);
        }
      } catch (err) {
        console.warn("Auto-recovery sequence fallback triggered due to data anomalies.", err);
      }
    }
  })();

  const validateForm = () => {
    let formsValid = true;
    if (cache.bizName && !runSmartFieldValidation(cache.bizName, 'string', cache)) formsValid = false;
    if (cache.custName && !runSmartFieldValidation(cache.custName, 'string', cache)) formsValid = false;
    if (cache.bizEmail?.value && !runSmartFieldValidation(cache.bizEmail, 'email', cache)) formsValid = false;
    if (cache.custEmail?.value && !runSmartFieldValidation(cache.custEmail, 'email', cache)) formsValid = false;
    if (cache.custPhone?.value && !runSmartFieldValidation(cache.custPhone, 'phone', cache)) formsValid = false;
    
    if (cache.dueDate && cache.dueDate.value) {
      if (!runSmartFieldValidation(cache.dueDate, 'date-order', cache)) {
        formsValid = false;
      }
    }

    state.items.forEach(item => {
      if (!item.desc.trim()) formsValid = false;
      if (parseFloat(item.qty) < 0 || isNaN(parseFloat(item.qty))) formsValid = false;
      if (parseFloat(item.price) < 0 || isNaN(parseFloat(item.price))) formsValid = false;
    });

    return formsValid;
  };

  document.getElementById('templateSelector')?.addEventListener('change', (e) => {
    const selectedTemplate = e.target.value;
    state.activeTemplate = selectedTemplate;
    localStorage.setItem('rgp_template_layout', selectedTemplate);
    
    if(cache.receiptPaper) {
        cache.receiptPaper.classList.remove('template-default', 'template-modern', 'template-classic', 'template-minimal');
        cache.receiptPaper.classList.add(`template-${selectedTemplate}`);
    }
    updatePreview();
  });

  const updateDynamicPaymentQRCode = () => {
    if(!cache.payUrl || !cache.prevQr || !cache.wrapQr) return;
    const rawStripeUrl = cache.payUrl.value.trim();
    if (rawStripeUrl && !state.qrData) {
      cache.prevQr.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(rawStripeUrl)}`;
      cache.wrapQr.style.display = 'flex';
    } else if (state.qrData) {
      cache.prevQr.src = state.qrData;
      cache.wrapQr.style.display = 'flex';
    } else {
      cache.wrapQr.style.display = 'none';
    }
  };

  const recomputeDashboardMetrics = () => {
    const metrics = { count: 0, paid: 0, pending: 0, overdue: 0, draft: 0, revenue: 0 };
    metrics.count = historyLogs.length;
    
    historyLogs.forEach(log => {
      const status = log.status || 'Draft';
      const parsedValue = parseFloat(log.totalVal?.replace(/[^0-9.-]+/g, "")) || 0;
      
      if (status === 'Paid') {
        metrics.paid++;
        metrics.revenue += parsedValue;
      } else if (status === 'Pending') {
        metrics.pending++;
      } else if (status === 'Overdue') {
        metrics.overdue++;
      } else {
        metrics.draft++;
      }
    });

    if (document.getElementById('statTotalCount')) {
      document.getElementById('statTotalCount').textContent = metrics.count;
      document.getElementById('statPaidCount').textContent = metrics.paid;
      document.getElementById('statPendingCount').textContent = metrics.pending;
      document.getElementById('statOverdueCount').textContent = metrics.overdue;
      document.getElementById('statTotalRevenue').textContent = formatMoney(metrics.revenue);
    }
  };

  const renderHistoryLogs = (filterKeyword = "") => {
    if(!cache.historyLogsContainer) return;
    cache.historyLogsContainer.innerHTML = '';
    if(cache.dashTotalClients) cache.dashTotalClients.textContent = savedClients.length;
    
    const query = filterKeyword.toLowerCase().trim();
    const filteredLogs = historyLogs.filter(h => {
      return (h.custName || '').toLowerCase().includes(query) ||
             (h.number || '').toLowerCase().includes(query) ||
             (h.date || '').toLowerCase().includes(query) ||
             (h.status || '').toLowerCase().includes(query) ||
             (h.totalVal || '').toLowerCase().includes(query) ||
             (h.bizName || '').toLowerCase().includes(query);
    });

    if (filteredLogs.length === 0) {
      cache.historyLogsContainer.innerHTML = `<p class="text-sm" style="color:var(--text-secondary);">No historical metrics match current filters.</p>`;
      return;
    }

    filteredLogs.forEach((h) => {
      const realIndex = historyLogs.indexOf(h);
      cache.historyLogsContainer.innerHTML += `
        <div class="list-item" style="padding: 8px; border-bottom: 1px solid rgba(0,0,0,0.05); display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong>${sanitizeHTML(h.custName || 'Unknown Profile')}</strong><br>
            <small>${sanitizeHTML(h.number)} | ${sanitizeHTML(h.date)} | Total: ${sanitizeHTML(h.totalVal)} | <span style="font-weight:bold;">${sanitizeHTML(h.status || 'Draft')}</span></small>
          </div>
          <div>
            <button class="btn-secondary text-sm" onclick="app.loadHistoryItem(${realIndex})">Load</button>
            <button class="btn-danger text-sm" onclick="app.deleteHistoryItem(${realIndex})">Del</button>
          </div>
        </div>`;
    });
    
    recomputeDashboardMetrics();
  };

  cache.searchHistory?.addEventListener('input', (e) => renderHistoryLogs(e.target.value));

  const savedProfile = safeParseJSON(localStorage.getItem('rgp_company_profile'), {});
  if(savedProfile.bizName && cache.bizName) cache.bizName.value = savedProfile.bizName;
  if(savedProfile.bizEmail && cache.bizEmail) cache.bizEmail.value = savedProfile.bizEmail;
  if(savedProfile.bizPhone && cache.bizPhone) cache.bizPhone.value = savedProfile.bizPhone;
  if(savedProfile.bizAddress && cache.bizAddress) cache.bizAddress.value = savedProfile.bizAddress;

  document.getElementById('btnQuickSaveProfile')?.addEventListener('click', () => {
    const profile = {
      bizName: cache.bizName?.value || '',
      bizEmail: cache.bizEmail?.value || '',
      bizPhone: cache.bizPhone?.value || '',
      bizAddress: cache.bizAddress?.value || ''
    };
    localStorage.setItem('rgp_company_profile', JSON.stringify(profile));
    updatePreview();
    alert("Company Profile Configuration Saved!");
  });

  const savedLang = localStorage.getItem('rgp_lang') || 'en';
  const langSwitcher = document.getElementById('langSwitcher');
  if(langSwitcher) {
      langSwitcher.value = savedLang;
      langSwitcher.addEventListener('change', (e) => setLanguage(e.target.value));
  }
  setLanguage(savedLang);

  const btnDark = document.getElementById('btnDarkMode');
  if (btnDark) {
    btnDark.addEventListener('click', () => {
      document.body.classList.toggle('rgp-dark-mode');
      localStorage.setItem('rgp_dark_mode', document.body.classList.contains('rgp-dark-mode'));
    });
    if (localStorage.getItem('rgp_dark_mode') === 'true') {
      document.body.classList.add('rgp-dark-mode');
    }
  }

  const btnDup = document.getElementById('btnDuplicate');
  if (btnDup) {
    btnDup.addEventListener('click', () => {
      validateForm();
      if(cache.receiptNumber) cache.receiptNumber.value = generateAutoNumber();
      if(cache.issueDate) cache.issueDate.valueAsDate = new Date();
      if(cache.invoiceStatus) cache.invoiceStatus.value = 'Draft';
      updatePreview();
      alert("Invoice Duplicated safely. A sequential generation ID has been provisions.");
    });
  }

  cache.themeColorSelect?.addEventListener('input', (e) => {
    const selectedColor = e.target.value;
    document.documentElement.style.setProperty('--receipt-theme-color', selectedColor);
    document.documentElement.style.setProperty('--receipt-light-bg', selectedColor + '15');
    updatePreview();
  });

  cache.paymentArchType?.addEventListener('change', (e) => {
    if(e.target.value === 'bank') {
      if(cache.bankFields) cache.bankFields.style.display = 'block';
      if(cache.stripeFields) cache.stripeFields.style.display = 'none';
    } else {
      if(cache.bankFields) cache.bankFields.style.display = 'none';
      if(cache.stripeFields) cache.stripeFields.style.display = 'block';
    }
    updatePreview();
  });

  const saveLayoutConfig = () => {
    localStorage.setItem('rgp_extras_defaults', JSON.stringify({ notes: cache.notes?.value || '', terms: cache.terms?.value || '' }));
    alert("Layout baseline defaults provisioned.");
  };
  document.getElementById('btnSaveNotesOnly')?.addEventListener('click', saveLayoutConfig);
  document.getElementById('btnSaveTermsOnly')?.addEventListener('click', saveLayoutConfig);

  const autoNumberLineHook = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const el = e.target;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const val = el.value;
      const linesBeforeCaret = val.substring(0, start).split('\n');
      const currentLine = linesBeforeCaret[linesBeforeCaret.length - 1];
      const match = currentLine.match(/^(\d+)\.\s/);
      let insertText = '\n';
      if (match) insertText += `${parseInt(match[1], 10) + 1}. `;
      else if (val.trim() === '') insertText += '1. ';
      el.value = val.substring(0, start) + insertText + val.substring(end);
      el.selectionStart = el.selectionEnd = start + insertText.length;
      updatePreview();
    }
  };
  cache.notes?.addEventListener('keydown', autoNumberLineHook);
  cache.terms?.addEventListener('keydown', autoNumberLineHook);

  const bankInputs = document.querySelectorAll('.bank-grid input');
  const updateBankString = () => {
    let str = '';
    if(document.getElementById('bankAccTitle')?.value) str += `Account Title: ${document.getElementById('bankAccTitle').value}\n`;
    if(document.getElementById('bankName')?.value) str += `Bank Name: ${document.getElementById('bankName').value}\n`;
    if(document.getElementById('bankAccNo')?.value) str += `Account No: ${document.getElementById('bankAccNo').value}\n`;
    if(document.getElementById('bankIban')?.value) str += `IBAN: ${document.getElementById('bankIban').value}\n`;
    if(document.getElementById('bankSwift')?.value) str += `SWIFT: ${document.getElementById('bankSwift').value}\n`;
    if(document.getElementById('bankBranch')?.value) str += `Branch: ${document.getElementById('bankBranch').value}\n`;
    if(document.getElementById('bankCode')?.value) str += `Code: ${document.getElementById('bankCode').value}\n`;
    if(document.getElementById('bankRef')?.value) str += `Ref: ${document.getElementById('bankRef').value}\n`;
    if(cache.bankDetails) cache.bankDetails.value = str.trim();
    updatePreview();
  };
  bankInputs.forEach(input => input.addEventListener('input', updateBankString));

  document.addEventListener('input', (e) => {
    if(['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
      updatePreview();
      autoSaveDraftAction();
    }
  });

  // ==========================================
  // SIDEBAR TAB SWITCHING ENGINE
  // ==========================================
  document.querySelectorAll('.sticker-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetBtn = e.currentTarget;
      const targetId = targetBtn.getAttribute('data-target');
      if(!targetId) return;

      document.querySelectorAll('.sticker-btn').forEach(b => b.classList.remove('active'));
      
      document.querySelectorAll('.editor-tab-content').forEach(c => {
        c.classList.remove('active');
        c.style.display = 'none'; 
      });

      targetBtn.classList.add('active');
      const targetContent = document.getElementById(targetId);
      if(targetContent) {
        targetContent.classList.add('active');
        targetContent.style.display = 'block'; 
      }
    });
  });

  document.getElementById('tabEditor')?.addEventListener('click', (e) => {
    e.target.classList.add('active');
    document.getElementById('tabPreview')?.classList.remove('active');
    document.querySelector('.editor-section')?.classList.add('active-tab');
    document.querySelector('.preview-section')?.classList.remove('active-tab');
  });

  document.getElementById('tabPreview')?.addEventListener('click', (e) => {
    validateForm(); 
    e.target.classList.add('active');
    document.getElementById('tabEditor')?.classList.remove('active');
    document.querySelector('.preview-section')?.classList.add('active-tab');
    document.querySelector('.editor-section')?.classList.remove('active-tab');
    updatePreview();
  });

  const formatMoney = (amount) => {
    const val = cache.currencySelect?.value || 'USD|$';
    const parts = val.split('|');
    const code = parts[0] || 'USD';
    const symbol = parts[1] || '';
    try {
      return new Intl.NumberFormat(document.documentElement.lang || 'en-US', { style: 'currency', currency: code }).format(amount || 0);
    } catch(e) {
      return `${symbol} ${new Intl.NumberFormat(document.documentElement.lang || 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount || 0)}`;
    }
  };

  const updateItemMemoryList = () => {
    const dl = document.getElementById('itemMemoryList');
    if (dl) {
      dl.innerHTML = '';
      itemMemory.forEach(desc => {
        dl.innerHTML += `<option value="${sanitizeHTML(desc)}">`;
      });
    }
  };
  updateItemMemoryList();

  // ROUTER CONTROLLERS FOR CORE ROW MUTATIONS
  window.itemActions = {
    duplicate(id) {
      state.items = itemActions.duplicate(state.items, id);
      renderItemsEditor();
      updatePreview();
      autoSaveDraftAction();
    },
    moveUp(id) {
      state.items = itemActions.moveUp(state.items, id);
      renderItemsEditor();
      updatePreview();
      autoSaveDraftAction();
    },
    moveDown(id) {
      state.items = itemActions.moveDown(state.items, id);
      renderItemsEditor();
      updatePreview();
      autoSaveDraftAction();
    }
  };

  // ==========================================
  // DYNAMIC ITEMS EDITOR GENERATOR
  // ==========================================
  const renderItemsEditor = () => {
    if(!cache.itemsBody) return;
    cache.itemsBody.innerHTML = '';
    state.items.forEach((item, index) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="vertical-align: middle; text-align: center; font-weight: bold; color: #666;">${index + 1}</td>
        <td><input type="text" class="item-desc req-field" data-id="${item.id}" value="${sanitizeHTML(item.desc)}" list="itemMemoryList" placeholder="Item Description" style="width:100%;"></td>
        <td><input type="number" class="item-qty req-field" data-id="${item.id}" value="${item.qty}" placeholder="Quantity (e.g. 1)" min="0" style="width:100%;"></td>
        <td><input type="number" class="item-price req-field" data-id="${item.id}" value="${item.price}" placeholder="Price (e.g. 100)" min="0" style="width:100%;"></td>
        <td style="text-align:right; white-space: nowrap;">
          <button type="button" class="btn-secondary text-sm" onclick="itemActions.moveUp(${item.id})" title="Move Up">↑</button>
          <button type="button" class="btn-secondary text-sm" onclick="itemActions.moveDown(${item.id})" title="Move Down">↓</button>
          <button type="button" class="btn-secondary text-sm" onclick="itemActions.duplicate(${item.id})" title="Duplicate Item">📋</button>
          <button type="button" class="btn-danger btn-remove-item" data-id="${item.id}" aria-label="Remove Item">✕</button>
        </td>
      `;
      cache.itemsBody.appendChild(tr);
    });

    document.querySelectorAll('.item-desc').forEach(el => el.addEventListener('input', (e) => {
      const id = parseInt(e.target.dataset.id, 10);
      const item = state.items.find(i => i.id === id);
      if(item) item.desc = e.target.value;
      runSmartFieldValidation(e.target, 'string', cache);
    }));

    document.querySelectorAll('.item-desc').forEach(el => el.addEventListener('blur', (e) => {
      if(e.target.value && !itemMemory.includes(e.target.value)) {
        itemMemory.push(e.target.value);
        localStorage.setItem('rgp_item_memory', JSON.stringify(itemMemory));
        updateItemMemoryList();
      }
    }));

    document.querySelectorAll('.item-qty').forEach(el => el.addEventListener('input', (e) => {
      const id = parseInt(e.target.dataset.id, 10);
      const item = state.items.find(i => i.id === id);
      if(item) item.qty = e.target.value;
      runSmartFieldValidation(e.target, 'numeric-positive', cache);
    }));

    document.querySelectorAll('.item-price').forEach(el => el.addEventListener('input', (e) => {
      const id = parseInt(e.target.dataset.id, 10);
      const item = state.items.find(i => i.id === id);
      if(item) item.price = e.target.value;
      runSmartFieldValidation(e.target, 'numeric-positive', cache);
    }));

    document.querySelectorAll('.btn-remove-item').forEach(el => el.addEventListener('click', (e) => {
      const id = parseInt(e.target.dataset.id, 10);
      if(state.items.length > 1) {
        state.items = state.items.filter(i => i.id !== id);
        renderItemsEditor();
        updatePreview();
        autoSaveDraftAction();
      }
    }));
  };

  document.getElementById('btnAddItem')?.addEventListener('click', () => {
    state.items.push({ id: Date.now(), desc: '', qty: '', price: '' });
    renderItemsEditor();
  });

  const renderList = (textId, listId, wrapId) => {
    const textEl = document.getElementById(textId);
    const wrap = document.getElementById(wrapId);
    const list = document.getElementById(listId);
    if (!textEl || !wrap || !list) return;
    const text = textEl.value;
    if (text.trim()) {
      wrap.style.display = 'block';
      list.innerHTML = text.replace(/\n/g, '<br>');
    } else {
      wrap.style.display = 'none';
    }
  };

  // ==========================================
  // REALTIME PREVIEW ENGINE & A4 FLOW MONITOR
  // ==========================================
  const updatePreview = () => {
    document.querySelectorAll('[data-bind]').forEach(el => {
      const key = el.getAttribute('data-bind');
      if(['notes', 'terms', 'bankDetails', 'payUrl', 'payMethod'].includes(key)) return;

      const targets = document.querySelectorAll(`[id^="prev${key.charAt(0).toUpperCase() + key.slice(1)}"]`);
      targets.forEach(target => {
        if(el.tagName === 'TEXTAREA') target.textContent = el.value;
        else target.innerHTML = sanitizeHTML(el.value);
      });
    });

    if(cache.prevTaxLabel && cache.taxLabelInput) cache.prevTaxLabel.textContent = cache.taxLabelInput.value || 'Tax';
    
    if(cache.prevBizContact) {
        cache.prevBizContact.innerHTML = [sanitizeHTML(cache.bizPhone?.value), sanitizeHTML(cache.bizEmail?.value)].filter(Boolean).join(' | ');
    }
    if(cache.prevCustContact) {
        cache.prevCustContact.innerHTML = [sanitizeHTML(cache.custPhone?.value), sanitizeHTML(cache.custEmail?.value)].filter(Boolean).join(' | ');
    }
    
    renderList('notes', 'prevNotesList', 'wrapNotes');
    renderList('terms', 'prevTermsList', 'wrapTerms');

    const payUrl = cache.payUrl?.value || '';
    const payMethod = cache.payMethod?.value || '';
    const bankLines = (cache.bankDetails?.value || '').split('\n').map(line => {
      if(line.includes(':')) {
        const parts = line.split(':');
        return `<strong>${sanitizeHTML(parts[0])}:</strong>${sanitizeHTML(parts.slice(1).join(':'))}`;
      }
      return sanitizeHTML(line);
    });

    if(cache.prevPayMethod) cache.prevPayMethod.textContent = payMethod;
    
    if(cache.paymentArchType?.value === 'bank') {
      if(cache.prevBankDetails) cache.prevBankDetails.innerHTML = bankLines.join('<br>');
      if(cache.prevPayUrl) cache.prevPayUrl.style.display = 'none';
    } else {
      if(cache.prevBankDetails) cache.prevBankDetails.textContent = '';
      if(payUrl && cache.prevPayUrl) {
        cache.prevPayUrl.href = payUrl;
        const paymentNames = {
          'stripe': 'Pay Securely Via Stripe ↗', 'paypal': 'Pay Securely Via PayPal ↗',
          'payoneer': 'Pay Securely Via Payoneer ↗', 'wise': 'Pay Securely Via Wise ↗', 'crypto': 'Pay via Crypto Wallet ↗'
        };
        cache.prevPayUrl.textContent = paymentNames[cache.paymentArchType?.value] || "Click here to Pay ↗";
        cache.prevPayUrl.style.display = 'block';
      } else if (cache.prevPayUrl) {
        cache.prevPayUrl.style.display = 'none';
      }
    }

    if(state.logoData && cache.prevLogo) { cache.prevLogo.src = state.logoData; cache.prevLogo.style.display = 'block'; }
    if(state.sigData && cache.prevSig) { cache.prevSig.src = state.sigData; cache.prevSig.style.display = 'block'; }

    updateDynamicPaymentQRCode();

    if(cache.prevItemsBody) {
        cache.prevItemsBody.innerHTML = '';
        let subtotal = 0, indexCounter = 1;
        
        state.items.forEach((item) => {
          let p = parseFloat(item.price) || 0, q = parseFloat(item.qty) || 0;
          if(!item.desc && p === 0) return;
          let t = p * q;
          subtotal += t;
          cache.prevItemsBody.innerHTML += `
            <tr>
              <td style="width: 5%; text-align:center; color:#64748b; font-weight:600;">${indexCounter}</td>
              <td style="width: 45%; text-align:left; font-weight:500;">${sanitizeHTML(item.desc)}</td>
              <td style="width: 15%; text-align:center;">${q||''}</td>
              <td style="width: 15%; text-align:right;">${formatMoney(p)}</td>
              <td style="width: 20%; text-align:right; font-weight:700; color:#0f172a;">${formatMoney(t)}</td>
            </tr>`;
          indexCounter++;
        });

        let d = parseFloat(cache.discountVal?.value) || 0, tR = parseFloat(cache.taxRate?.value) || 0, s = parseFloat(cache.shippingCost?.value) || 0;
        let taxAmt = (subtotal - d) * (tR / 100);
        let gTotal = (subtotal - d) + taxAmt + s;

        if(cache.prevSubtotal) cache.prevSubtotal.textContent = formatMoney(subtotal);
        if(cache.rowDiscount) cache.rowDiscount.style.display = d > 0 ? 'flex' : 'none';
        if(d>0 && cache.prevDiscount) cache.prevDiscount.textContent = `-${formatMoney(d)}`;
        if(cache.rowTax) cache.rowTax.style.display = taxAmt > 0 ? 'flex' : 'none';
        if(taxAmt>0 && cache.prevTax) cache.prevTax.textContent = formatMoney(taxAmt);
        if(cache.rowShipping) cache.rowShipping.style.display = s > 0 ? 'flex' : 'none';
        if(s>0 && cache.prevShipping) cache.prevShipping.textContent = formatMoney(s);
        if(cache.prevTotal) cache.prevTotal.textContent = formatMoney(gTotal);
    }

    if (cache.watermarkSelect && cache.prevWatermark) {
      if (cache.watermarkSelect.value) {
        cache.prevWatermark.textContent = cache.watermarkSelect.value;
        cache.prevWatermark.style.display = 'block';
        cache.prevWatermark.style.color = cache.watermarkSelect.value === 'PAID' ? 'green' : (cache.watermarkSelect.value === 'UNPAID' ? 'red' : 'gray');
      } else { cache.prevWatermark.style.display = 'none'; }
    }

    if (cache.invoiceStatus && cache.prevInvoiceStatus) { cache.prevInvoiceStatus.style.display = 'none'; }

    let prevDue = document.getElementById('prevDueDate');
    if (cache.dueDate && cache.dueDate.value) {
      if (!prevDue) {
        document.getElementById('prevIssueDate')?.insertAdjacentHTML('afterend', '<div id="prevDueDate"></div>');
        prevDue = document.getElementById('prevDueDate');
      }
      if (prevDue) { prevDue.textContent = `Due Date: ${cache.dueDate.value}`; prevDue.style.display = 'block'; }
    } else if (prevDue) { prevDue.style.display = 'none'; }

    // DYNAMIC A4 MEASUREMENT SUB-ROUTINE
    setTimeout(() => {
      const paper = cache.receiptPaper;
      const statusEl = document.getElementById('a4-overflow-status');
      const safeLine = document.getElementById('a4-safe-area-line');
      
      if (paper && statusEl) {
        let measureDiv = document.getElementById('a4-measure-div');
        if (!measureDiv) {
            measureDiv = document.createElement('div');
            measureDiv.id = 'a4-measure-div';
            measureDiv.style.height = '297mm'; 
            measureDiv.style.position = 'absolute';
            measureDiv.style.visibility = 'hidden';
            measureDiv.style.zIndex = '-1';
            document.body.appendChild(measureDiv);
        }
        
        const a4HeightPx = measureDiv.getBoundingClientRect().height;
        const originalMinHeight = paper.style.minHeight;
        paper.style.minHeight = '0px';
        const contentHeight = paper.scrollHeight;
        paper.style.minHeight = originalMinHeight || '297mm';

        const usagePercent = Math.max(1, Math.round((contentHeight / a4HeightPx) * 100));
        statusEl.style.display = 'block';
        if (safeLine) safeLine.style.display = 'block';

        if (usagePercent <= 100) {
            statusEl.innerHTML = `✅ Perfect Fit – 1 Page <br><span style="font-weight:normal; font-size:13px;">${usagePercent}% A4 Used</span>`;
            statusEl.style.backgroundColor = '#dcfce7'; statusEl.style.color = '#166534'; statusEl.style.border = '1px solid #bbf7d0';
            statusEl.setAttribute('data-exceeds', 'false');
        } else {
            statusEl.innerHTML = `⚠ Invoice exceeds one A4 page. The generated Print will contain 2 pages. <br><span style="font-weight:normal; font-size:13px;">${usagePercent}% → Second page required</span>`;
            statusEl.style.backgroundColor = '#fee2e2'; statusEl.style.color = '#991b1b'; statusEl.style.border = '1px solid #fecaca';
            statusEl.setAttribute('data-exceeds', 'true');
        }
      }
    }, 100);
  };

  const handleFile = (id, stateKey) => {
    const fileInput = document.getElementById(id);
    if(fileInput) {
        fileInput.addEventListener('change', function(e) {
          const file = e.target.files[0];
          if(file && validateUploadedFile(file)) {
            const reader = new FileReader();
            reader.onload = (ev) => {
              state[stateKey] = ev.target.result;
              localStorage.setItem('rgp_' + stateKey, ev.target.result);
              updatePreview();
            };
            reader.readAsDataURL(file);
          }
        });
    }
  };
  handleFile('logoUpload', 'logoData');
  handleFile('sigUpload', 'sigData');
  handleFile('qrUpload', 'qrData');

  document.getElementById('btnAutoNum')?.addEventListener('click', () => {
    if(cache.receiptNumber) cache.receiptNumber.value = generateAutoNumber();
    updatePreview();
  });

  // ==========================================
  // CUSTOMER / PAYMENT PROFILE TARGET ENGINES
  // ==========================================
  const updateDropdowns = () => {
    const cDrop = document.getElementById('savedClientsDropdown');
    if(cDrop) {
        cDrop.innerHTML = '<option value="">-- Manual Entry --</option>';
        savedClients.forEach((c, i) => cDrop.innerHTML += `<option value="${i}">${sanitizeHTML(c.custName)}</option>`);
    }
    const pDrop = document.getElementById('savedPaymentsDropdown');
    if(pDrop) {
        pDrop.innerHTML = '<option value="">-- Manual Entry --</option>';
        savedPayments.forEach((p, i) => pDrop.innerHTML += `<option value="${i}">Profile ${i+1} (${sanitizeHTML(p.payArch)})</option>`);
    }
  };
  updateDropdowns();

  document.getElementById('btnSaveClient')?.addEventListener('click', () => {
    const name = cache.custName?.value;
    if(!name) return alert("Customer name required to save.");
    savedClients.push({
      custName: name, custCompany: cache.custCompany?.value || '', custEmail: cache.custEmail?.value || '', custPhone: cache.custPhone?.value || '', custAddress: cache.custAddress?.value || ''
    });
    localStorage.setItem('rgp_clients', JSON.stringify(savedClients));
    updateDropdowns();
    alert("Client Record Cataloged.");
  });

  document.getElementById('savedClientsDropdown')?.addEventListener('change', (e) => {
    if(e.target.value !== "") {
      const c = savedClients[e.target.value];
      if(cache.custName) cache.custName.value = c.custName || '';
      if(cache.custCompany) cache.custCompany.value = c.custCompany || '';
      if(cache.custEmail) cache.custEmail.value = c.custEmail || '';
      if(cache.custPhone) cache.custPhone.value = c.custPhone || '';
      if(cache.custAddress) cache.custAddress.value = c.custAddress || '';
      updatePreview();
    }
  });

  document.getElementById('btnSavePaymentProfile')?.addEventListener('click', () => {
    savedPayments.push({
      payArch: cache.paymentArchType?.value || '', bank: cache.bankDetails?.value || '', stripe: cache.payUrl?.value || '', payMethodText: cache.payMethod?.value || '',
      bTitle: document.getElementById('bankAccTitle')?.value || '', bName: document.getElementById('bankName')?.value || '', bAcc: document.getElementById('bankAccNo')?.value || '',
      bIban: document.getElementById('bankIban')?.value || '', bSwift: document.getElementById('bankSwift')?.value || '', bBranch: document.getElementById('bankBranch')?.value || '',
      bCode: document.getElementById('bankCode')?.value || '', bRef: document.getElementById('bankRef')?.value || ''
    });
    localStorage.setItem('rgp_payments', JSON.stringify(savedPayments));
    updateDropdowns();
    alert("Payment Parameter Gateway Profile Saved!");
  });

  document.getElementById('savedPaymentsDropdown')?.addEventListener('change', (e) => {
    if(e.target.value !== "") {
      const p = savedPayments[e.target.value];
      if(cache.paymentArchType) cache.paymentArchType.value = p.payArch || '';
      if(cache.bankDetails) cache.bankDetails.value = p.bank || '';
      if(cache.payUrl) cache.payUrl.value = p.stripe || '';
      if(cache.payMethod) cache.payMethod.value = p.payMethodText || '';
      if(document.getElementById('bankAccTitle')) document.getElementById('bankAccTitle').value = p.bTitle || '';
      if(document.getElementById('bankName')) document.getElementById('bankName').value = p.bName || '';
      if(document.getElementById('bankAccNo')) document.getElementById('bankAccNo').value = p.bAcc || '';
      if(document.getElementById('bankIban')) document.getElementById('bankIban').value = p.bIban || '';
      if(document.getElementById('bankSwift')) document.getElementById('bankSwift').value = p.bSwift || '';
      if(document.getElementById('bankBranch')) document.getElementById('bankBranch').value = p.bBranch || '';
      if(document.getElementById('bankCode')) document.getElementById('bankCode').value = p.bCode || '';
      if(document.getElementById('bankRef')) document.getElementById('bankRef').value = p.bRef || '';
      if(cache.paymentArchType) cache.paymentArchType.dispatchEvent(new Event('change'));
      updatePreview();
    }
  });

  // ==========================================
  // RESET & HISTORICAL VAULT CONTROLLER
  // ==========================================
  document.getElementById('btnReset')?.addEventListener('click', () => {
    if(confirm("Reset entire active structural composer layout sheet?")) {
      document.querySelectorAll('input:not([type="file"]):not(#themeColorSelect), textarea').forEach(el => el.value = '');
      document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
      document.querySelectorAll('.error-msg').forEach(el => el.style.display = 'none');
      state.items = [{ id: Date.now(), desc: '', qty: '', price: '' }];
      if(cache.receiptNumber) cache.receiptNumber.value = generateAutoNumber();
      if(cache.issueDate) cache.issueDate.valueAsDate = new Date();
      if(cache.invoiceStatus) cache.invoiceStatus.value = 'Draft';
      if(cache.watermarkSelect) cache.watermarkSelect.value = '';
      if(cache.taxLabelInput) cache.taxLabelInput.value = 'Tax';
      localStorage.removeItem('rgp_autosave_draft_cache');
      renderItemsEditor();
      updatePreview();
    }
  });

  document.getElementById('btnSaveHistory')?.addEventListener('click', () => {
    if(!validateForm()) return alert("Please fill required fields correctly to store.");
    historyLogs.push({
      bizName: cache.bizName?.value || '', bizEmail: cache.bizEmail?.value || '', bizPhone: cache.bizPhone?.value || '', bizAddress: cache.bizAddress?.value || '',
      custName: cache.custName?.value || '', custCompany: cache.custCompany?.value || '', custEmail: cache.custEmail?.value || '', custPhone: cache.custPhone?.value || '', custAddress: cache.custAddress?.value || '',
      currency: cache.currencySelect?.value || '', notes: cache.notes?.value || '', terms: cache.terms?.value || '', number: cache.receiptNumber?.value || '', date: cache.issueDate?.value || '',
      type: cache.receiptType?.value || '', totalVal: cache.prevTotal?.textContent || '', items: JSON.parse(JSON.stringify(state.items)),
      discount: cache.discountVal?.value || '', tax: cache.taxRate?.value || '', shipping: cache.shippingCost?.value || '', themeColor: cache.themeColorSelect?.value || '',
      payArch: cache.paymentArchType?.value || '', bank: cache.bankDetails?.value || '', stripe: cache.payUrl?.value || '', payMethodText: cache.payMethod?.value || '',
      status: cache.invoiceStatus ? cache.invoiceStatus.value : 'Draft', dueDate: cache.dueDate ? cache.dueDate.value : '', watermark: cache.watermarkSelect ? cache.watermarkSelect.value : ''
    });
    localStorage.setItem('rgp_history', JSON.stringify(historyLogs));
    localStorage.removeItem('rgp_autosave_draft_cache');
    renderHistoryLogs();
    alert("Record Saved To System Vault Ledger.");
  });

  // HOTKEYS GLOBAL ROUTING HOOKS
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
      const key = e.key.toLowerCase();
      if (key === 's') { e.preventDefault(); document.getElementById('btnSaveHistory')?.click(); }
      else if (key === 'p') { e.preventDefault(); document.getElementById('btnPrintView')?.click(); }
      else if (key === 'n') { e.preventDefault(); document.getElementById('btnReset')?.click(); }
      else if (key === 'd') { e.preventDefault(); document.getElementById('btnDuplicate')?.click(); }
      else if (key === 'z') { e.preventDefault(); UndoRedoEngine.undo((s) => applySnapshotToForm(s)); }
      else if (key === 'y') { e.preventDefault(); UndoRedoEngine.redo((s) => applySnapshotToForm(s)); }
    }
  });

  // EXPOSE GLOBAL RUNTIME INTERFACES
  window.app = {
    loadHistoryItem: (i) => {
      const h = historyLogs[i];
      const mappings = {
        bizName: h.bizName, bizEmail: h.bizEmail, bizPhone: h.bizPhone, bizAddress: h.bizAddress,
        custName: h.custName, custCompany: h.custCompany, custEmail: h.custEmail, custPhone: h.custPhone,
        custAddress: h.custAddress, receiptNumber: h.number, issueDate: h.date
      };
      
      Object.entries(mappings).forEach(([id, val]) => {
        if(document.getElementById(id)) document.getElementById(id).value = val || '';
      });

      if(h.currency && cache.currencySelect) cache.currencySelect.value = h.currency;
      if(h.notes !== undefined && cache.notes) cache.notes.value = h.notes;
      if(h.terms !== undefined && cache.terms) cache.terms.value = h.terms;
      if(h.status && cache.invoiceStatus) cache.invoiceStatus.value = h.status;
      if(h.dueDate && cache.dueDate) cache.dueDate.value = h.dueDate;
      if(h.watermark && cache.watermarkSelect) cache.watermarkSelect.value = h.watermark;
      if(cache.receiptType) cache.receiptType.value = h.type || 'Invoice';
      if(cache.discountVal) cache.discountVal.value = h.discount || '';
      if(cache.taxRate) cache.taxRate.value = h.tax || '';
      if(cache.shippingCost) cache.shippingCost.value = h.shipping || '';

      if(h.themeColor && cache.themeColorSelect) {
        cache.themeColorSelect.value = h.themeColor;
        document.documentElement.style.setProperty('--receipt-theme-color', h.themeColor);
        document.documentElement.style.setProperty('--receipt-light-bg', h.themeColor + '15');
      }

      if(h.payArch && cache.paymentArchType) cache.paymentArchType.value = h.payArch;
      if(h.bank && cache.bankDetails) {
        cache.bankDetails.value = h.bank;
        h.bank.split('\n').forEach(l => {
          if(l.includes('Account Title:') && document.getElementById('bankAccTitle')) document.getElementById('bankAccTitle').value = l.split(':')[1].trim();
          if(l.includes('Bank Name:') && document.getElementById('bankName')) document.getElementById('bankName').value = l.split(':')[1].trim();
          if(l.includes('Account No:') && document.getElementById('bankAccNo')) document.getElementById('bankAccNo').value = l.split(':')[1].trim();
          if(l.includes('IBAN:') && document.getElementById('bankIban')) document.getElementById('bankIban').value = l.split(':')[1].trim();
        });
      }

      if(h.stripe && cache.payUrl) cache.payUrl.value = h.stripe;
      if(h.payMethodText && cache.payMethod) cache.payMethod.value = h.payMethodText;
      
      if(cache.paymentArchType) cache.paymentArchType.dispatchEvent(new Event('change'));
      state.items = (h.items || [{ desc: '', qty: '', price: '' }]).map((it, idx) => ({ ...it, id: Date.now() + idx }));
      
      renderItemsEditor();
      updatePreview();
      alert("Ledger Item Content Loaded Into Active Document Sandbox.");
    },

    deleteHistoryItem: (i) => {
      if(confirm("Permanently wipe this transaction ledger log?")) {
        historyLogs.splice(i, 1);
        localStorage.setItem('rgp_history', JSON.stringify(historyLogs));
        renderHistoryLogs(cache.searchHistory?.value || '');
      }
    },

    showAuth: (type) => {
      const modal = document.getElementById('authModal');
      if (!modal) return;
      if(document.getElementById('authTitle')) document.getElementById('authTitle').innerText = type === 'login' ? 'Login' : 'Create Account';
      if(document.getElementById('btnSubmitAuth')) document.getElementById('btnSubmitAuth').innerText = type === 'login' ? 'Login' : 'Sign Up';
      if(document.getElementById('authSwitchText')) document.getElementById('authSwitchText').innerHTML = type === 'login' ? `Don't have an account? <a onclick="app.showAuth('signup')">Sign up</a>` : `Already have an account? <a onclick="app.showAuth('login')">Login</a>`;
      modal.classList.add('active');
    }
  };

  document.querySelectorAll('.close-modal').forEach(b => b.addEventListener('click', (e) => e.target.closest('.modal-overlay').classList.remove('active')));

  if (state.activeTemplate !== 'default') {
    const tSelector = document.getElementById('templateSelector');
    if (tSelector) tSelector.value = state.activeTemplate;
    if(cache.receiptPaper) cache.receiptPaper.classList.add(`template-${state.activeTemplate}`);
  }

  if(cache.receiptNumber && !cache.receiptNumber.value) cache.receiptNumber.value = generateAutoNumber();
  if(cache.issueDate && !cache.issueDate.value) cache.issueDate.valueAsDate = new Date();
  if(cache.taxLabelInput && !cache.taxLabelInput.value) cache.taxLabelInput.value = 'Tax';

  // APP HANDLER BOOTSTRAPPING
  renderItemsEditor();
  renderHistoryLogs();
  updatePreview();
});
