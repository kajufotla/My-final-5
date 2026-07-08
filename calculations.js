// ==========================================
// CORE COMPUTATION & STORAGE EXECUTIONS
// ==========================================
const executeStorageBackup = (data) => {
  try {
    localStorage.setItem('rgp_secure_auto_backup', JSON.stringify(data));
  } catch(e) {
    console.error("Localstorage background serialization threshold breached", e);
  }
};

const generateAutoNumber = (historyLogs) => {
  const year = new Date().getFullYear();
  let currentSequence = parseInt(localStorage.getItem('rgp_invoice_seq_counter') || '0', 10);
  
  if (historyLogs && historyLogs.length > 0) {
    historyLogs.forEach(h => {
      if (h.number && h.number.startsWith(`INV-${year}-`)) {
        const extractedId = parseInt(h.number.split('-')[2], 10);
        if (!isNaN(extractedId) && extractedId > currentSequence) {
          currentSequence = extractedId;
        }
      }
    });
  }

  const nextSequence = currentSequence + 1;
  localStorage.setItem('rgp_invoice_seq_counter', nextSequence.toString());
  return `INV-${year}-${nextSequence.toString().padStart(5, '0')}`;
};

const formatMoney = (amount, currencySelectValue) => {
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
