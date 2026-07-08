import { formatMoney } from './calculations.js';

export const renderList = (textId, listId, wrapId) => {
  const textEl = document.getElementById(textId);
  const wrap = document.getElementById(wrapId);
  const list = document.getElementById(listId);
  if (!textEl || !wrap || !list) return;
  const text = textEl.value;
  if (text.trim()) { wrap.style.display = 'block'; list.innerHTML = text.replace(/\n/g, '<br>'); } 
  else wrap.style.display = 'none';
};

export const updatePreview = (cache, state, sanitizeHTML) => {
  document.querySelectorAll('[data-bind]').forEach(el => {
    const key = el.getAttribute('data-bind');
    if(['notes', 'terms', 'bankDetails', 'payUrl', 'payMethod'].includes(key)) return;
    document.querySelectorAll(`[id^="prev${key.charAt(0).toUpperCase() + key.slice(1)}"]`).forEach(target => {
      if(el.tagName === 'TEXTAREA') target.textContent = el.value;
      else target.innerHTML = sanitizeHTML(el.value);
    });
  });

  if(cache.prevTaxLabel && cache.taxLabelInput) cache.prevTaxLabel.textContent = cache.taxLabelInput.value || 'Tax';
  if(cache.prevBizContact) cache.prevBizContact.innerHTML = [sanitizeHTML(cache.bizPhone?.value), sanitizeHTML(cache.bizEmail?.value)].filter(Boolean).join(' | ');
  if(cache.prevCustContact) cache.prevCustContact.innerHTML = [sanitizeHTML(cache.custPhone?.value), sanitizeHTML(cache.custEmail?.value)].filter(Boolean).join(' | ');
  
  renderList('notes', 'prevNotesList', 'wrapNotes');
  renderList('terms', 'prevTermsList', 'wrapTerms');

  const payUrl = cache.payUrl?.value || '';
  if(cache.prevPayMethod) cache.prevPayMethod.textContent = cache.payMethod?.value || '';
  
  if(cache.paymentArchType?.value === 'bank') {
    if(cache.prevBankDetails) cache.prevBankDetails.innerHTML = (cache.bankDetails?.value || '').replace(/\n/g, '<br>');
    if(cache.prevPayUrl) cache.prevPayUrl.style.display = 'none';
  } else {
    if(cache.prevBankDetails) cache.prevBankDetails.textContent = '';
    if(payUrl && cache.prevPayUrl) {
      cache.prevPayUrl.href = payUrl; cache.prevPayUrl.textContent = "Click here to Pay ↗"; cache.prevPayUrl.style.display = 'block';
    } else if (cache.prevPayUrl) cache.prevPayUrl.style.display = 'none';
  }

  if(state.logoData && cache.prevLogo) { cache.prevLogo.src = state.logoData; cache.prevLogo.style.display = 'block'; }
  if(state.sigData && cache.prevSig) { cache.prevSig.src = state.sigData; cache.prevSig.style.display = 'block'; }
  
  if(cache.payUrl && cache.prevQr && cache.wrapQr) {
    const rawStripeUrl = cache.payUrl.value.trim();
    if (rawStripeUrl && !state.qrData) {
      cache.prevQr.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(rawStripeUrl)}`;
      cache.wrapQr.style.display = 'flex';
    } else if (state.qrData) { cache.prevQr.src = state.qrData; cache.wrapQr.style.display = 'flex'; }
    else cache.wrapQr.style.display = 'none';
  }

  if(cache.prevItemsBody) {
      cache.prevItemsBody.innerHTML = '';
      let subtotal = 0;
      state.items.forEach((item, index) => {
        let p = parseFloat(item.price) || 0, q = parseFloat(item.qty) || 0;
        if(!item.desc && p === 0) return;
        let t = p * q; subtotal += t;
        cache.prevItemsBody.innerHTML += `<tr><td style="text-align:center;">${index + 1}</td><td>${sanitizeHTML(item.desc)}</td><td style="text-align:center;">${q||''}</td><td style="text-align:right;">${formatMoney(p, cache.currencySelect?.value)}</td><td style="text-align:right;">${formatMoney(t, cache.currencySelect?.value)}</td></tr>`;
      });

      let d = parseFloat(cache.discountVal?.value) || 0, tR = parseFloat(cache.taxRate?.value) || 0, s = parseFloat(cache.shippingCost?.value) || 0;
      let taxAmt = (subtotal - d) * (tR / 100); let gTotal = (subtotal - d) + taxAmt + s;

      if(cache.prevSubtotal) cache.prevSubtotal.textContent = formatMoney(subtotal, cache.currencySelect?.value);
      if(cache.rowDiscount) cache.rowDiscount.style.display = d > 0 ? 'flex' : 'none';
      if(cache.rowTax) cache.rowTax.style.display = taxAmt > 0 ? 'flex' : 'none';
      if(cache.rowShipping) cache.rowShipping.style.display = s > 0 ? 'flex' : 'none';
      if(cache.prevTotal) cache.prevTotal.textContent = formatMoney(gTotal, cache.currencySelect?.value);
  }

  if (cache.watermarkSelect && cache.prevWatermark) {
    if (cache.watermarkSelect.value) {
      cache.prevWatermark.textContent = cache.watermarkSelect.value;
      cache.prevWatermark.style.display = 'block';
    } else cache.prevWatermark.style.display = 'none';
  }

  if (cache.dueDate?.value) {
    let prevDue = document.getElementById('prevDueDate');
    if (!prevDue) { document.getElementById('prevIssueDate')?.insertAdjacentHTML('afterend', '<div id="prevDueDate"></div>'); prevDue = document.getElementById('prevDueDate'); }
    if (prevDue) { prevDue.textContent = `Due Date: ${cache.dueDate.value}`; prevDue.style.display = 'block'; }
  } else if (document.getElementById('prevDueDate')) document.getElementById('prevDueDate').style.display = 'none';
};
