// ==========================================================================
// MAIN APPLICATION CONTROLLER (App.js) - ENTERPRISE PRODUCTION READY
// ==========================================================================

import { UndoRedoEngine, runSmartFieldValidation, itemActions, debounce } from './invoiceCore.js';
import { initTabSwitching, initDarkMode, updateDropdowns as domUpdateDropdowns, initClientSelection, initPaymentSelection, initModalClosers } from './domHandlers.js';
import { setLanguage } from './language.js';
import { executeStorageBackup, generateAutoNumber, formatMoney } from './calculations.js';
import { sanitizeHTML, safeParseJSON, validateUploadedFile } from './security.js';
import { updatePreview, renderList } from './preview.js';
import { handleImageUpload, executePdfPrint, exportToCSV, backupToJSON, restoreFromJSON } from './storageAndExport.js';

document.addEventListener('DOMContentLoaded', () => {

  // --- Centralized DOM Cache Structure ---
  const cache = {
    bizName: document.getElementById('bizName'), bizEmail: document.getElementById('bizEmail'),
    bizPhone: document.getElementById('bizPhone'), bizAddress: document.getElementById('bizAddress'),
    custName: document.getElementById('custName'), custCompany: document.getElementById('custCompany'),
    custEmail: document.getElementById('custEmail'), custPhone: document.getElementById('custPhone'),
    custAddress: document.getElementById('custAddress'), receiptNumber: document.getElementById('receiptNumber'),
    issueDate: document.getElementById('issueDate'), dueDate: document.getElementById('dueDate'),
    invoiceStatus: document.getElementById('invoiceStatus'), watermarkSelect: document.getElementById('watermarkSelect'),
    receiptType: document.getElementById('receiptType'), payUrl: document.getElementById('payUrl'),
    payMethod: document.getElementById('payMethod'), bankAccTitle: document.getElementById('bankAccTitle'),
    bankName: document.getElementById('bankName'), bankAccNo: document.getElementById('bankAccNo'),
    bankIban: document.getElementById('bankIban'), bankSwift: document.getElementById('bankSwift'),
    bankBranch: document.getElementById('bankBranch'), bankCode: document.getElementById('bankCode'),
    bankRef: document.getElementById('bankRef'), itemsBody: document.getElementById('itemsBody'),
    discountVal: document.getElementById('discountVal'), taxRate: document.getElementById('taxRate'),
    taxLabelInput: document.getElementById('taxLabelInput'), shippingCost: document.getElementById('shippingCost'),
    currencySelect: document.getElementById('currencySelect'), themeColorSelect: document.getElementById('themeColorSelect'),
    paymentArchType: document.getElementById('paymentArchType'), bankFields: document.getElementById('bankFields'),
    stripeFields: document.getElementById('stripeFields'), bankDetails: document.getElementById('bankDetails'),
    notes: document.getElementById('notes'), terms: document.getElementById('terms'),
    historyLogsContainer: document.getElementById('historyLogsContainer'), searchHistory: document.getElementById('searchHistory'),
    mainForm: document.getElementById('mainForm'), receiptPaper: document.getElementById('receiptPaper'),
    prevItemsBody: document.getElementById('prevItemsBody'), prevSubtotal: document.getElementById('prevSubtotal'),
    rowDiscount: document.getElementById('rowDiscount'), prevDiscount: document.getElementById('prevDiscount'),
    rowTax: document.getElementById('rowTax'), prevTax: document.getElementById('prevTax'),
    rowShipping: document.getElementById('rowShipping'), prevShipping: document.getElementById('prevShipping'),
    prevTotal: document.getElementById('prevTotal'), prevTaxLabel: document.getElementById('prevTaxLabel'),
    prevBizContact: document.getElementById('prevBizContact'), prevCustContact: document.getElementById('prevCustContact'),
    prevPayMethod: document.getElementById('prevPayMethod'), prevBankDetails: document.getElementById('prevBankDetails'),
    prevPayUrl: document.getElementById('prevPayUrl'), prevLogo: document.getElementById('prevLogo'),
    prevSig: document.getElementById('prevSig'), prevQr: document.getElementById('prevQr'),
    wrapQr: document.getElementById('wrapQr'), prevWatermark: document.getElementById('prevWatermark'),
    prevInvoiceStatus: document.getElementById('prevInvoiceStatus'), dashTotalClients: document.getElementById('dashTotalClients'),
    dashTotalInvoiced: document.getElementById('dashTotalInvoiced')
  };

  // --- Reactive Application Core State ---
  let state = {
    items: [{ id: Date.now(), desc: '', qty: '', price: '' }],
    logoData: localStorage.getItem('rgp_logoData') || null,
    sigData: localStorage.getItem('rgp_sigData') || null,
    qrData: localStorage.getItem('rgp_qrData') || null,
    activeTemplate: localStorage.getItem('rgp_template_layout') || 'default'
  };

  // --- Memory Stores ---
  let historyLogs = safeParseJSON(localStorage.getItem('rgp_history'), []);
  let savedClients = safeParseJSON(localStorage.getItem('rgp_clients'), []);
  let savedPayments = safeParseJSON(localStorage.getItem('rgp_payments'), []);
  let itemMemory = safeParseJSON(localStorage.getItem('rgp_item_memory'), []);
  let notesLibrary = safeParseJSON(localStorage.getItem('rgp_notes_library'), []);

  // --- Core Document Render Trigger ---
  const triggerPreview = () => updatePreview(cache, state, sanitizeHTML);
  window.updatePreview = triggerPreview;

  // --- Dynamic Date Computations ---
  const calculateCalculatedDueDate = () => {
    const offsetSelect = document.getElementById('dueDateOffset');
    if (!offsetSelect || offsetSelect.value === 'manual' || !cache.issueDate?.value) return;
    const offsetDays = parseInt(offsetSelect.value, 10);
    const baseDate = new Date(cache.issueDate.value);
    if (!isNaN(baseDate.getTime())) {
      baseDate.setDate(baseDate.getDate() + offsetDays);
      if(cache.dueDate) cache.dueDate.value = baseDate.toISOString().split('T')[0];
      triggerPreview();
    }
  };
  document.getElementById('dueDateOffset')?.addEventListener('change', calculateCalculatedDueDate);
  cache.issueDate?.addEventListener('change', calculateCalculatedDueDate);

  // --- Template Library ---
  const renderNotesLibraryDropdown = () => {
    const dbox = document.getElementById('libraryTargetSelect');
    if (!dbox) return;
    const fragment = document.createDocumentFragment();
    const defaultOpt = document.createElement('option');
    defaultOpt.value = ""; defaultOpt.textContent = "-- Choose From Notes & Terms Library --";
    fragment.appendChild(defaultOpt);
    notesLibrary.forEach((item, index) => {
      const opt = document.createElement('option');
      opt.value = index; opt.textContent = `${item.title} (${item.type})`;
      fragment.appendChild(opt);
    });
    dbox.innerHTML = ''; dbox.appendChild(fragment);
  };

  document.getElementById('btnSaveToLibrary')?.addEventListener('click', () => {
    const titlePrompt = prompt("Enter a unique lookup name for this snippet asset:");
    if (!titlePrompt) return;
    const noteVal = cache.notes?.value || ''; const termVal = cache.terms?.value || '';
    const record = { title: titlePrompt, notes: noteVal, terms: termVal, bank: cache.bankDetails?.value || '', type: noteVal ? 'Notes' : (termVal ? 'Terms' : 'Bank') };
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
      triggerPreview();
    }
  });

  renderNotesLibraryDropdown();

  // --- Snapshot Memento Management Subsystem ---
  const captureCurrentFormSnapshot = () => ({
      bizName: cache.bizName?.value || '', bizEmail: cache.bizEmail?.value || '', bizPhone: cache.bizPhone?.value || '', bizAddress: cache.bizAddress?.value || '',
      custName: cache.custName?.value || '', custCompany: cache.custCompany?.value || '', custEmail: cache.custEmail?.value || '', custPhone: cache.custPhone?.value || '', custAddress: cache.custAddress?.value || '',
      receiptNumber: cache.receiptNumber?.value || '', issueDate: cache.issueDate?.value || '', dueDate: cache.dueDate?.value || '',
      invoiceStatus: cache.invoiceStatus?.value || 'Draft', watermark: cache.watermarkSelect?.value || '', currency: cache.currencySelect?.value || '',
      discount: cache.discountVal?.value || '', tax: cache.taxRate?.value || '', taxLabel: cache.taxLabelInput?.value || '', shipping: cache.shippingCost?.value || '',
      themeColor: cache.themeColorSelect?.value || '', paymentArch: cache.paymentArchType?.value || '', bankDetails: cache.bankDetails?.value || '',
      payUrl: cache.payUrl?.value || '', payMethodText: cache.payMethod?.value || '', notes: cache.notes?.value || '', terms: cache.terms?.value || '', items: state.items
  });

  const applySnapshotToForm = (snap) => {
    if (!snap) return;
    Object.keys(snap).forEach(key => {
      if (cache[key] && key !== 'items') cache[key].value = snap[key];
      else if (key === 'watermark' && cache.watermarkSelect) cache.watermarkSelect.value = snap.watermark;
      else if (key === 'paymentArch' && cache.paymentArchType) cache.paymentArchType.value = snap.paymentArch;
      else if (key === 'taxLabel' && cache.taxLabelInput) cache.taxLabelInput.value = snap.taxLabel;
      else if (key === 'payMethodText' && cache.payMethod) cache.payMethod.value = snap.payMethodText;
    });
    if (snap.items !== undefined) state.items = snap.items;
    renderItemsEditor(); triggerPreview();
  };

  const autoSaveDraftAction = debounce(() => {
    const snap = captureCurrentFormSnapshot();
    localStorage.setItem('rgp_autosave_draft_cache', JSON.stringify(snap));
    UndoRedoEngine.pushState(snap);
    executeStorageBackup(snap);
  }, 700);

  const validateForm = () => {
    let formsValid = true;
    if (cache.bizName && !runSmartFieldValidation(cache.bizName, 'string', cache)) formsValid = false;
    if (cache.custName && !runSmartFieldValidation(cache.custName, 'string', cache)) formsValid = false;
    if (cache.bizEmail?.value && !runSmartFieldValidation(cache.bizEmail, 'email', cache)) formsValid = false;
    if (cache.custEmail?.value && !runSmartFieldValidation(cache.custEmail, 'email', cache)) formsValid = false;
    if (cache.custPhone?.value && !runSmartFieldValidation(cache.custPhone, 'phone', cache)) formsValid = false;
    if (cache.dueDate?.value && !runSmartFieldValidation(cache.dueDate, 'date-order', cache)) formsValid = false;
    
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
    if(cache.receiptPaper) cache.receiptPaper.className = `template-${selectedTemplate}`;
    triggerPreview();
  });

  const recomputeDashboardMetrics = () => {
    const metrics = { count: historyLogs.length, paid: 0, pending: 0, overdue: 0, draft: 0, revenue: 0 };
    historyLogs.forEach(log => {
      const status = log.status || 'Draft';
      const parsedValue = parseFloat(String(log.totalVal).replace(/[^0-9.-]+/g, "")) || 0;
      if (status === 'Paid') { metrics.paid++; metrics.revenue += parsedValue; }
      else if (status === 'Pending') metrics.pending++;
      else if (status === 'Overdue') metrics.overdue++;
      else metrics.draft++;
    });
    if (document.getElementById('statTotalCount')) {
      document.getElementById('statTotalCount').textContent = metrics.count;
      document.getElementById('statPaidCount').textContent = metrics.paid;
      document.getElementById('statTotalRevenue').textContent = formatMoney(metrics.revenue);
    }
  };

  const renderHistoryLogs = (filterKeyword = "") => {
    if(!cache.historyLogsContainer) return;
    if(cache.dashTotalClients) cache.dashTotalClients.textContent = savedClients.length;
    
    const query = filterKeyword.toLowerCase().trim();
    const filteredLogs = historyLogs.filter(h => 
      (h.custName || '').toLowerCase().includes(query) || (h.number || '').toLowerCase().includes(query)
    );

    if (filteredLogs.length === 0) {
      cache.historyLogsContainer.innerHTML = `<p class="text-sm" style="color:var(--text-secondary);">No historical metrics match current filters.</p>`;
      recomputeDashboardMetrics(); return;
    }

    const fragment = document.createDocumentFragment();
    filteredLogs.forEach((h) => {
      const realIndex = historyLogs.indexOf(h);
      const itemRow = document.createElement('div');
      itemRow.className = "list-item";
      itemRow.innerHTML = `<div><strong>${sanitizeHTML(h.custName || 'Unknown Profile')}</strong><br><small>${sanitizeHTML(h.number)} | Total: ${sanitizeHTML(h.totalVal)}</small></div>
        <div><button class="btn-secondary text-sm btn-action-load" data-index="${realIndex}">Load</button> <button class="btn-danger text-sm btn-action-del" data-index="${realIndex}">Del</button></div>`;
      fragment.appendChild(itemRow);
    });
    cache.historyLogsContainer.innerHTML = '';
    cache.historyLogsContainer.appendChild(fragment);
    recomputeDashboardMetrics();
  };

  cache.historyLogsContainer?.addEventListener('click', (e) => {
    const loadBtn = e.target.closest('.btn-action-load');
    const delBtn = e.target.closest('.btn-action-del');
    if (loadBtn) handlers.loadHistoryItem(parseInt(loadBtn.dataset.index, 10));
    else if (delBtn) handlers.deleteHistoryItem(parseInt(delBtn.dataset.index, 10));
  });

  cache.searchHistory?.addEventListener('input', (e) => renderHistoryLogs(e.target.value));

  const savedProfile = safeParseJSON(localStorage.getItem('rgp_company_profile'), {});
  if(savedProfile.bizName && cache.bizName) cache.bizName.value = savedProfile.bizName;
  if(savedProfile.bizEmail && cache.bizEmail) cache.bizEmail.value = savedProfile.bizEmail;
  if(savedProfile.bizPhone && cache.bizPhone) cache.bizPhone.value = savedProfile.bizPhone;
  if(savedProfile.bizAddress && cache.bizAddress) cache.bizAddress.value = savedProfile.bizAddress;

  document.getElementById('btnQuickSaveProfile')?.addEventListener('click', () => {
    localStorage.setItem('rgp_company_profile', JSON.stringify({ bizName: cache.bizName?.value || '', bizEmail: cache.bizEmail?.value || '', bizPhone: cache.bizPhone?.value || '', bizAddress: cache.bizAddress?.value || '' }));
    triggerPreview(); alert("Company Profile Configuration Saved!");
  });

  const savedLang = localStorage.getItem('rgp_lang') || 'en';
  const langSwitcher = document.getElementById('langSwitcher');
  if(langSwitcher) { langSwitcher.value = savedLang; langSwitcher.addEventListener('change', (e) => setLanguage(e.target.value)); }
  setLanguage(savedLang);

  document.getElementById('btnDuplicate')?.addEventListener('click', () => {
    validateForm();
    if(cache.receiptNumber) cache.receiptNumber.value = generateAutoNumber();
    if(cache.issueDate) cache.issueDate.valueAsDate = new Date();
    triggerPreview(); alert("Invoice Duplicated safely.");
  });

  cache.themeColorSelect?.addEventListener('input', (e) => {
    document.documentElement.style.setProperty('--receipt-theme-color', e.target.value);
    document.documentElement.style.setProperty('--receipt-light-bg', e.target.value + '15');
    triggerPreview();
  });

  cache.paymentArchType?.addEventListener('change', (e) => {
    if(cache.bankFields) cache.bankFields.style.display = e.target.value === 'bank' ? 'block' : 'none';
    if(cache.stripeFields) cache.stripeFields.style.display = e.target.value === 'bank' ? 'none' : 'block';
    triggerPreview();
  });

  const autoNumberLineHook = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const el = e.target;
      const val = el.value;
      const lines = val.substring(0, el.selectionStart).split('\n');
      const match = lines[lines.length - 1].match(/^(\d+)\.\s/);
      const insertText = '\n' + (match ? `${parseInt(match[1], 10) + 1}. ` : (val.trim() === '' ? '1. ' : ''));
      el.value = val.substring(0, el.selectionStart) + insertText + val.substring(el.selectionEnd);
      el.selectionStart = el.selectionEnd = el.selectionStart + insertText.length - 1;
      triggerPreview();
    }
  };
  cache.notes?.addEventListener('keydown', autoNumberLineHook);
  cache.terms?.addEventListener('keydown', autoNumberLineHook);

  const updateBankString = () => {
    let str = '';
    ['bankAccTitle', 'bankName', 'bankAccNo', 'bankIban', 'bankSwift', 'bankBranch', 'bankCode', 'bankRef'].forEach((id, idx) => {
      const el = document.getElementById(id);
      if(el?.value) str += `${['Account Title', 'Bank Name', 'Account No', 'IBAN', 'SWIFT', 'Branch', 'Code', 'Ref'][idx]}: ${el.value}\n`;
    });
    if(cache.bankDetails) cache.bankDetails.value = str.trim();
    triggerPreview();
  };
  document.querySelectorAll('.bank-grid input').forEach(input => input.addEventListener('input', updateBankString));

  document.addEventListener('input', (e) => {
    if(['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) { triggerPreview(); autoSaveDraftAction(); }
  });

  const updateItemMemoryList = () => {
    const dl = document.getElementById('itemMemoryList');
    if (!dl) return;
    const fragment = document.createDocumentFragment();
    itemMemory.forEach(desc => {
      const opt = document.createElement('option'); opt.value = desc; fragment.appendChild(opt);
    });
    dl.innerHTML = ''; dl.appendChild(fragment);
  };
  updateItemMemoryList();

  const internalItemActions = {
    duplicate(id) { state.items = itemActions.duplicate(state.items, id); postMutationSequence(); },
    moveUp(id) { state.items = itemActions.moveUp(state.items, id); postMutationSequence(); },
    moveDown(id) { state.items = itemActions.moveDown(state.items, id); postMutationSequence(); },
    remove(id) { if(state.items.length > 1) { state.items = state.items.filter(i => i.id !== id); postMutationSequence(); } }
  };

  const postMutationSequence = () => { renderItemsEditor(); triggerPreview(); autoSaveDraftAction(); };

  const renderItemsEditor = () => {
    if(!cache.itemsBody) return;
    const fragment = document.createDocumentFragment();
    state.items.forEach((item, index) => {
      const tr = document.createElement('tr'); tr.dataset.id = item.id;
      tr.innerHTML = `
        <td style="text-align: center;">${index + 1}</td>
        <td><input type="text" class="item-desc req-field" value="${sanitizeHTML(item.desc)}" list="itemMemoryList" style="width:100%;"></td>
        <td><input type="number" class="item-qty req-field" value="${item.qty}" min="0" style="width:100%;"></td>
        <td><input type="number" class="item-price req-field" value="${item.price}" min="0" style="width:100%;"></td>
        <td style="text-align:right;">
          <button type="button" class="btn-secondary text-sm action-up">↑</button>
          <button type="button" class="btn-secondary text-sm action-down">↓</button>
          <button type="button" class="btn-secondary text-sm action-dup">📋</button>
          <button type="button" class="btn-danger action-del">✕</button>
        </td>`;
      fragment.appendChild(tr);
    });
    cache.itemsBody.innerHTML = ''; cache.itemsBody.appendChild(fragment);
  };

  cache.itemsBody?.addEventListener('click', (e) => {
    const tr = e.target.closest('tr'); if (!tr) return;
    const id = parseInt(tr.dataset.id, 10);
    if (e.target.classList.contains('action-up')) internalItemActions.moveUp(id);
    else if (e.target.classList.contains('action-down')) internalItemActions.moveDown(id);
    else if (e.target.classList.contains('action-dup')) internalItemActions.duplicate(id);
    else if (e.target.classList.contains('action-del')) internalItemActions.remove(id);
  });

  cache.itemsBody?.addEventListener('input', (e) => {
    const tr = e.target.closest('tr'); if (!tr) return;
    const item = state.items.find(i => i.id === parseInt(tr.dataset.id, 10));
    if (!item) return;
    if (e.target.classList.contains('item-desc')) { item.desc = e.target.value; runSmartFieldValidation(e.target, 'string', cache); }
    else if (e.target.classList.contains('item-qty')) { item.qty = e.target.value; runSmartFieldValidation(e.target, 'numeric-positive', cache); }
    else if (e.target.classList.contains('item-price')) { item.price = e.target.value; runSmartFieldValidation(e.target, 'numeric-positive', cache); }
  });

  cache.itemsBody?.addEventListener('blur', (e) => {
    if (e.target.classList.contains('item-desc') && e.target.value && !itemMemory.includes(e.target.value)) {
      itemMemory.push(e.target.value); localStorage.setItem('rgp_item_memory', JSON.stringify(itemMemory)); updateItemMemoryList();
    }
  }, true);

  document.getElementById('btnAddItem')?.addEventListener('click', () => { state.items.push({ id: Date.now(), desc: '', qty: '', price: '' }); renderItemsEditor(); });

  const bindImageUpload = (id, stateKey) => {
    document.getElementById(id)?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file && validateUploadedFile(file)) {
        handleImageUpload(file, (base64) => {
          state[stateKey] = base64; localStorage.setItem('rgp_' + stateKey, base64); triggerPreview();
        });
      }
    });
  };
  bindImageUpload('logoUpload', 'logoData'); bindImageUpload('sigUpload', 'sigData'); bindImageUpload('qrUpload', 'qrData');

  document.getElementById('btnAutoNum')?.addEventListener('click', () => { if(cache.receiptNumber) cache.receiptNumber.value = generateAutoNumber(); triggerPreview(); });

  const updateDropdowns = () => {
    domUpdateDropdowns(savedClients, savedPayments, sanitizeHTML);
    initClientSelection(savedClients, cache, triggerPreview);
    initPaymentSelection(savedPayments, cache, triggerPreview);
  };
  updateDropdowns();

  document.getElementById('btnSaveClient')?.addEventListener('click', () => {
    if(!cache.custName?.value) return alert("Customer name required to save.");
    savedClients.push({ custName: cache.custName.value, custCompany: cache.custCompany?.value || '', custEmail: cache.custEmail?.value || '', custPhone: cache.custPhone?.value || '', custAddress: cache.custAddress?.value || '' });
    localStorage.setItem('rgp_clients', JSON.stringify(savedClients)); updateDropdowns(); alert("Client Record Cataloged.");
  });

  document.getElementById('btnSavePaymentProfile')?.addEventListener('click', () => {
    savedPayments.push({
      payArch: cache.paymentArchType?.value || '', bank: cache.bankDetails?.value || '', stripe: cache.payUrl?.value || '', payMethodText: cache.payMethod?.value || '',
      bTitle: document.getElementById('bankAccTitle')?.value || '', bName: document.getElementById('bankName')?.value || '', bAcc: document.getElementById('bankAccNo')?.value || ''
    });
    localStorage.setItem('rgp_payments', JSON.stringify(savedPayments)); updateDropdowns(); alert("Payment Profile Saved!");
  });

  document.getElementById('btnReset')?.addEventListener('click', () => {
    if(confirm("Reset entire layout sheet?")) {
      document.querySelectorAll('input:not([type="file"]):not(#themeColorSelect), textarea').forEach(el => el.value = '');
      state.items = [{ id: Date.now(), desc: '', qty: '', price: '' }];
      if(cache.receiptNumber) cache.receiptNumber.value = generateAutoNumber();
      if(cache.issueDate) cache.issueDate.valueAsDate = new Date();
      localStorage.removeItem('rgp_autosave_draft_cache'); renderItemsEditor(); triggerPreview();
    }
  });

  document.getElementById('btnSaveHistory')?.addEventListener('click', () => {
    if(!validateForm()) return alert("Fill required fields correctly.");
    historyLogs.push(captureCurrentFormSnapshot());
    localStorage.setItem('rgp_history', JSON.stringify(historyLogs));
    renderHistoryLogs(); alert("Record Saved To Ledger.");
  });

  // --- External Actions Export Bindings ---
  document.getElementById('btnDownloadPDF')?.addEventListener('click', () => executePdfPrint(cache));
  document.getElementById('btnExportCSV')?.addEventListener('click', () => exportToCSV(historyLogs));
  document.getElementById('btnBackupJSON')?.addEventListener('click', () => backupToJSON(historyLogs));
  document.getElementById('jsonUpload')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if(file) restoreFromJSON(file, (data) => {
          if (Array.isArray(data)) { historyLogs = data; localStorage.setItem('rgp_history', JSON.stringify(historyLogs)); renderHistoryLogs(); alert("Backup Restored."); }
      });
  });

  const handlers = {
    loadHistoryItem: (i) => {
      applySnapshotToForm(historyLogs[i]);
      alert("Ledger Item Loaded Into Sandbox.");
    },
    deleteHistoryItem: (i) => {
      if(confirm("Wipe this ledger log?")) { historyLogs.splice(i, 1); localStorage.setItem('rgp_history', JSON.stringify(historyLogs)); renderHistoryLogs(); }
    },
    showAuth: (type) => {
      const modal = document.getElementById('authModal'); if (!modal) return;
      if(document.getElementById('authTitle')) document.getElementById('authTitle').innerText = type === 'login' ? 'Login' : 'Create Account';
      modal.classList.add('active');
    }
  };
  
  // Expose to window for inline HTML onclick handlers
  window.app = handlers;

  // --- Secure Component Initialization ---
  initTabSwitching(validateForm, triggerPreview);
  initDarkMode(); initModalClosers();
  
  if(cache.receiptNumber && !cache.receiptNumber.value) cache.receiptNumber.value = generateAutoNumber();
  if(cache.issueDate && !cache.issueDate.value) cache.issueDate.valueAsDate = new Date();

  renderItemsEditor(); renderHistoryLogs(); triggerPreview();

  const recoveryTarget = localStorage.getItem('rgp_autosave_draft_cache');
  if (recoveryTarget) { try { applySnapshotToForm(JSON.parse(recoveryTarget)); } catch (err) {} }
});
