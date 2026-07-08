// ==========================================================================
// domHandlers.js - UI INTERACTION, EVENT LISTENERS & DROPDOWNS MANAGEMENT
// ==========================================================================

// 1. Sidebar Tab Switching Fix
export const initTabSwitching = (validateForm, updatePreview) => {
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
    validateForm(); // Visually highlight missing inputs, but DO NOT block switching
    e.target.classList.add('active');
    document.getElementById('tabEditor')?.classList.remove('active');
    document.querySelector('.preview-section')?.classList.add('active-tab');
    document.querySelector('.editor-section')?.classList.remove('active-tab');
    updatePreview();
  });
};

// 2. Dark Mode Toggle setup
export const initDarkMode = () => {
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
};

// 3. Render and Manage Saved Clients and Payments Dropdowns
export const updateDropdowns = (savedClients, savedPayments, sanitizeHTML) => {
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

// 4. Client Dropdown Change Interceptor (Fixed to dynamic check)
export const initClientSelection = (savedClients, cache, updatePreview) => {
  // Purانے ایونٹ لسنر کے ٹکراؤ سے بچنے کے لیے پہلے ریموو کرنا یا ڈاکیومنٹ لیول پر ہینڈل کرنا بہتر ہے
  const dropdown = document.getElementById('savedClientsDropdown');
  if (!dropdown) return;

  // موجودہ لسنر کو صاف کر کے نیا لگانا تاکہ کلک/چینج ہمیشہ کام کرے
  dropdown.removeEventListener('change', dropdown._changeHandler);
  
  dropdown._changeHandler = (e) => {
    if(e.target.value !== "") {
      const c = savedClients[e.target.value];
      if(c) {
        if(cache.custName) cache.custName.value = c.custName || '';
        if(cache.custCompany) cache.custCompany.value = c.custCompany || '';
        if(cache.custEmail) cache.custEmail.value = c.custEmail || '';
        if(cache.custPhone) cache.custPhone.value = c.custPhone || '';
        if(cache.custAddress) cache.custAddress.value = c.custAddress || '';
        updatePreview();
      }
    }
  };
  
  dropdown.addEventListener('change', dropdown._changeHandler);
};

// 5. Payment Profile Selection Interceptor (Fixed to dynamic check)
export const initPaymentSelection = (savedPayments, cache, updatePreview) => {
  const dropdown = document.getElementById('savedPaymentsDropdown');
  if (!dropdown) return;

  dropdown.removeEventListener('change', dropdown._changeHandler);

  dropdown._changeHandler = (e) => {
    if(e.target.value !== "") {
      const p = savedPayments[e.target.value];
      if(p) {
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
    }
  };

  dropdown.addEventListener('change', dropdown._changeHandler);
};

// 6. Notes and Snippets Library Rendering
export const renderNotesLibraryDropdown = (notesLibrary, sanitizeHTML) => {
  const dbox = document.getElementById('libraryTargetSelect');
  if (!dbox) return;
  dbox.innerHTML = '<option value="">-- Choose From Notes & Terms Library --</option>';
  notesLibrary.forEach((item, index) => {
    dbox.innerHTML += `<option value="${index}">${sanitizeHTML(item.title)} (${item.type})</option>`;
  });
};

// 7. Modal Closing Handler Global Setup
export const initModalClosers = () => {
  document.querySelectorAll('.close-modal').forEach(b => 
    b.addEventListener('click', (e) => e.target.closest('.modal-overlay').classList.remove('active'))
  );
};
