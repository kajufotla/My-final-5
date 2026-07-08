// ==========================================================================
// preview.js - PREVIEW, RENDERING, AND A4 OVERFLOW CHECK ENGINE
// ==========================================================================

// Helper function to format money (relies on cache structure from main thread)
export const formatMoney = (amount, currencySelectValue) => {
  const val = currencySelectValue || 'USD|$';
  const parts = val.split('|');
  const code = parts[0] || 'USD';
  const symbol = parts[1] || '';
  try {
    return new Intl.NumberFormat(document.documentElement.lang || 'en-US', { style: 'currency', currency: code }).format(amount || 0);
  } catch(e) {
    return `${symbol} ${new Intl.NumberFormat(document.documentElement.lang || 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount || 0)}`;
  }
};

// Helper to render dynamic line breaks inside preview containers
export const renderList = (textId, listId, wrapId) => {
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

// Core Preview Update Engine
export const updatePreview = (cache, state, sanitizeHTML) => {
  // 1. Dynamic Data Binding for standard fields
  document.querySelectorAll('[data-bind]').forEach(el => {
    const key = el.getAttribute('data-bind');
    
    if(['notes', 'terms', 'bankDetails', 'payUrl', 'payMethod'].includes(key)) return;

    const targets = document.querySelectorAll(`[id^="prev${key.charAt(0).toUpperCase() + key.slice(1)}"]`);
    targets.forEach(target => {
      if(el.tagName === 'TEXTAREA') target.textContent = el.value;
      else target.innerHTML = sanitizeHTML(el.value);
    });
  });

  // 2. Tax Label and Contact Layouts
  if(cache.prevTaxLabel && cache.taxLabelInput) cache.prevTaxLabel.textContent = cache.taxLabelInput.value || 'Tax';
  
  if(cache.prevBizContact) {
      cache.prevBizContact.innerHTML = [sanitizeHTML(cache.bizPhone?.value), sanitizeHTML(cache.bizEmail?.value)].filter(Boolean).join(' | ');
  }
  if(cache.prevCustContact) {
      cache.prevCustContact.innerHTML = [sanitizeHTML(cache.custPhone?.value), sanitizeHTML(cache.custEmail?.value)].filter(Boolean).join(' | ');
  }
  
  // 3. Render Notes & Terms Lists
  renderList('notes', 'prevNotesList', 'wrapNotes');
  renderList('terms', 'prevTermsList', 'wrapTerms');

  // 4. Payment Methods & Gateway Logic
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
        'stripe': 'Pay Securely Via Stripe ↗',
        'paypal': 'Pay Securely Via PayPal ↗',
        'payoneer': 'Pay Securely Via Payoneer ↗',
        'wise': 'Pay Securely Via Wise ↗',
        'crypto': 'Pay via Crypto Wallet ↗'
      };
      cache.prevPayUrl.textContent = paymentNames[cache.paymentArchType?.value] || "Click here to Pay ↗";
      cache.prevPayUrl.style.display = 'block';
    } else if (cache.prevPayUrl) {
      cache.prevPayUrl.style.display = 'none';
    }
  }

  // 5. Image Artifacts (Logo & Signature)
  if(state.logoData && cache.prevLogo) {
    cache.prevLogo.src = state.logoData;
    cache.prevLogo.style.display = 'block';
  }
  if(state.sigData && cache.prevSig) {
    cache.prevSig.src = state.sigData;
    cache.prevSig.style.display = 'block';
  }

  // 6. Dynamic Payment QR Engine
  if(cache.payUrl && cache.prevQr && cache.wrapQr) {
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
  }

  // 7. Dynamic Table Rows and Totals Processing
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
            <td style="width: 15%; text-align:right;">${formatMoney(p, cache.currencySelect?.value)}</td>
            <td style="width: 20%; text-align:right; font-weight:700; color:#0f172a;">${formatMoney(t, cache.currencySelect?.value)}</td>
          </tr>`;
        indexCounter++;
      });

      let d = parseFloat(cache.discountVal?.value) || 0, tR = parseFloat(cache.taxRate?.value) || 0, s = parseFloat(cache.shippingCost?.value) || 0;
      let taxAmt = (subtotal - d) * (tR / 100);
      let gTotal = (subtotal - d) + taxAmt + s;

      if(cache.prevSubtotal) cache.prevSubtotal.textContent = formatMoney(subtotal, cache.currencySelect?.value);
      if(cache.rowDiscount) cache.rowDiscount.style.display = d > 0 ? 'flex' : 'none';
      if(d>0 && cache.prevDiscount) cache.prevDiscount.textContent = `-${formatMoney(d, cache.currencySelect?.value)}`;
      if(cache.rowTax) cache.rowTax.style.display = taxAmt > 0 ? 'flex' : 'none';
      if(taxAmt>0 && cache.prevTax) cache.prevTax.textContent = formatMoney(taxAmt, cache.currencySelect?.value);
      if(cache.rowShipping) cache.rowShipping.style.display = s > 0 ? 'flex' : 'none';
      if(s>0 && cache.prevShipping) cache.prevShipping.textContent = formatMoney(s, cache.currencySelect?.value);
      if(cache.prevTotal) cache.prevTotal.textContent = formatMoney(gTotal, cache.currencySelect?.value);
  }

  // 8. Watermark Display Controls
  if (cache.watermarkSelect && cache.prevWatermark) {
    if (cache.watermarkSelect.value) {
      cache.prevWatermark.textContent = cache.watermarkSelect.value;
      cache.prevWatermark.style.display = 'block';
      cache.prevWatermark.style.color = cache.watermarkSelect.value === 'PAID' ? 'green' : (cache.watermarkSelect.value === 'UNPAID' ? 'red' : 'gray');
    } else {
      cache.prevWatermark.style.display = 'none';
    }
  }

  if (cache.invoiceStatus && cache.prevInvoiceStatus) {
    cache.prevInvoiceStatus.style.display = 'none'; 
  }

  // 9. Due Date Rendering Logic
  let prevDue = document.getElementById('prevDueDate');
  if (cache.dueDate && cache.dueDate.value) {
    if (!prevDue) {
      document.getElementById('prevIssueDate')?.insertAdjacentHTML('afterend', '<div id="prevDueDate"></div>');
      prevDue = document.getElementById('prevDueDate');
    }
    if (prevDue) {
      prevDue.textContent = `Due Date: ${cache.dueDate.value}`;
      prevDue.style.display = 'block';
    }
  } else if (prevDue) {
    prevDue.style.display = 'none';
  }

  // 10. Live A4 PDF Page Overflow Checking Engine
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
      if (safeLine) {
          safeLine.style.display = 'block';
      }

      if (usagePercent <= 100) {
          statusEl.innerHTML = `✅ Perfect Fit – 1 Page <br><span style="font-weight:normal; font-size:13px;">${usagePercent}% A4 Used</span>`;
          statusEl.style.backgroundColor = '#dcfce7'; 
          statusEl.style.color = '#166534'; 
          statusEl.style.border = '1px solid #bbf7d0';
          statusEl.setAttribute('data-exceeds', 'false');
      } else {
          statusEl.innerHTML = `⚠ Invoice exceeds one A4 page. The generated Print will contain 2 pages. <br><span style="font-weight:normal; font-size:13px;">${usagePercent}% → Second page required</span>`;
          statusEl.style.backgroundColor = '#fee2e2'; 
          statusEl.style.color = '#991b1b'; 
          statusEl.style.border = '1px solid #fecaca';
          statusEl.setAttribute('data-exceeds', 'true');
      }
    }
  }, 100);
};

// PDF Page Setup Modal Opening Engine
export const openPdfSetupModal = (safeParseJSON) => {
  const modal = document.getElementById('pdfSetupModal');
  if(!modal) return;
  
  const savedSettings = safeParseJSON(localStorage.getItem('rgp_pdf_settings'), {
    size: 'A4', orientation: 'portrait', margins: '10mm', scale: '1', numbers: false, watermark: true, bg: true
  });
  
  document.getElementById('pdfPaperSize').value = savedSettings.size;
  document.getElementById('pdfOrientation').value = savedSettings.orientation;
  document.getElementById('pdfMargins').value = savedSettings.margins;
  document.getElementById('pdfScale').value = savedSettings.scale;
  document.getElementById('pdfPageNumbers').checked = savedSettings.numbers;
  document.getElementById('pdfWatermark').checked = savedSettings.watermark;
  document.getElementById('pdfBgColors').checked = savedSettings.bg;

  const paper = document.getElementById('receiptPaper');
  let pageHeight = 297; 
  if(savedSettings.orientation === 'landscape') pageHeight = 210;
  if(savedSettings.size === 'Letter') pageHeight = 279;
  if(savedSettings.size === 'Legal') pageHeight = 356;
  
  const pxPerMm = 3.7795275591; 
  const contentHeightPx = paper ? paper.scrollHeight : 0;
  const pageHeightPx = pageHeight * pxPerMm;
  const estimated = Math.max(1, Math.ceil(contentHeightPx / pageHeightPx));
  document.getElementById('pdfEstPages').textContent = estimated;

  modal.style.display = 'flex';
};
