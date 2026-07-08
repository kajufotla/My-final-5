// ==========================================================================
// storageAndExport.js - IMAGE PROCESSING, LOCALSTORAGE, HISTORY, & PDF ENGINE
// ==========================================================================

// 1. Image Upload & Base64 Reader Engine (Logo, Signature, QR)
export const handleImageUpload = (file, callback) => {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let ctx = canvas.getContext('2d');
      
      // Limit large images for local storage optimization
      let width = img.width;
      let height = img.height;
      if (width > 800) {
        height = Math.round((height * 800) / width);
        width = 800;
      }
      
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      callback(canvas.toDataURL('image/jpeg', 0.75));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
};

// 2. LocalStorage Syncing Engines (Clients, Payments, History Logs)
export const saveInvoiceToHistory = (state, cache, safeParseJSON) => {
  const history = safeParseJSON(localStorage.getItem('rgp_invoice_history'), []);
  
  let subtotal = 0;
  state.items.forEach(item => {
    subtotal += (parseFloat(item.price) || 0) * (parseFloat(item.qty) || 0);
  });
  
  let d = parseFloat(cache.discountVal?.value) || 0;
  let tR = parseFloat(cache.taxRate?.value) || 0;
  let s = parseFloat(cache.shippingCost?.value) || 0;
  let taxAmt = (subtotal - d) * (tR / 100);
  let gTotal = (subtotal - d) + taxAmt + s;

  const newRecord = {
    id: cache.invoiceNo?.value || 'INV-' + Date.now(),
    date: cache.issueDate?.value || new Date().toISOString().split('T')[0],
    client: cache.custName?.value || 'Unknown Client',
    amount: gTotal,
    currency: cache.currencySelect?.value || 'USD|$',
    status: cache.watermarkSelect?.value || 'UNPAID',
    timestamp: Date.now()
  };

  // Prevent duplicate storage of same invoice ID
  const filtered = history.filter(item => item.id !== newRecord.id);
  filtered.unshift(newRecord);
  
  // Cap historical log records to 50 entries
  if (filtered.length > 50) filtered.pop();
  
  localStorage.setItem('rgp_invoice_history', JSON.stringify(filtered));
  return filtered;
};

// 3. Render Invoice History Logs Grid Utility
export const renderHistoryTable = (history, formatMoney, sanitizeHTML) => {
  const tbody = document.getElementById('historyLogTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (history.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-slate-400">No invoice records found in local storage.</td></tr>`;
    return;
  }

  history.forEach(item => {
    const statusBadges = {
      'PAID': '<span class="bg-green-100 text-green-800 text-xs font-semibold px-2 py-0.5 rounded">Paid</span>',
      'UNPAID': '<span class="bg-red-100 text-red-800 text-xs font-semibold px-2 py-0.5 rounded">Unpaid</span>',
      'OVERDUE': '<span class="bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-0.5 rounded">Overdue</span>'
    };
    
    tbody.innerHTML += `
      <tr class="border-b border-slate-100 dark:border-slate-800 text-sm hover:bg-slate-50/50">
        <td class="py-3 px-2 font-mono font-bold text-slate-700">${sanitizeHTML(item.id)}</td>
        <td class="py-3 px-2 text-slate-500">${sanitizeHTML(item.date)}</td>
        <td class="py-3 px-2 font-medium text-slate-800">${sanitizeHTML(item.client)}</td>
        <td class="py-3 px-2 font-bold text-right">${formatMoney(item.amount, item.currency)}</td>
        <td class="py-3 px-2 text-center">${statusBadges[item.status] || '<span class="bg-gray-100 text-gray-800 text-xs px-2 py-0.5 rounded">Draft</span>'}</td>
      </tr>
    `;
  });
};

// 4. Native Browser PDF Printing Engine
export const executePdfPrint = (cache) => {
  const paper = cache.receiptPaper;
  if (!paper) return;

  // Fetch target print configurations from localStorage
  const savedSettings = JSON.parse(localStorage.getItem('rgp_pdf_settings') || '{}');
  const size = savedSettings.size || 'A4';
  const orientation = savedSettings.orientation || 'portrait';
  const margins = savedSettings.margins || '10mm';
  const scale = savedSettings.scale || '1';

  // Build temporary dynamic print styles element
  const printStyle = document.createElement('style');
  printStyle.id = 'pdf-runtime-print-css';
  printStyle.innerHTML = `
    @media print {
      @page {
        size: ${size} ${orientation};
        margin: ${margins};
      }
      body {
        background: #ffffff !important;
        color: #000000 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      #receiptPaper {
        box-shadow: none !important;
        border: none !important;
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        transform: scale(${scale}) !important;
        transform-origin: top left !important;
      }
      /* Hide all UI dashboard elements during capture */
      .no-print, .editor-section, .sticker-sidebar, header, nav, footer, .modal-overlay, #a4-overflow-status, #a4-safe-area-line {
        display: none !important;
      }
      .preview-section {
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        background: transparent !important;
      }
    }
  `;

  document.head.appendChild(printStyle);
  
  // Trigger system native printing dialog
  window.print();

  // Safely cleanup temporary styles post rendering cycle
  setTimeout(() => {
    const el = document.getElementById('pdf-runtime-print-css');
    if (el) el.remove();
  }, 500);
};
