// ==========================================
// SECURITY, SANITIZATION & VALIDATION UTILITIES
// ==========================================
const sanitizeHTML = (str) => {
  if (typeof str !== 'string') return '';
  return str.replace(/[&<>"']/g, (m) => {
    switch (m) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#039;';
      default: return m;
    }
  });
};

const safeParseJSON = (jsonStr, fallback) => {
  try {
    return jsonStr ? JSON.parse(jsonStr) : fallback;
  } catch (e) {
    console.warn("Corrupt JSON structure detected. Restoring clean data layout.", e);
    return fallback;
  }
};

const validateUploadedFile = (file) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/svg+xml'];
  const maxSize = 2 * 1024 * 1024; // 2MB Limit
  if (!allowedTypes.includes(file.type)) {
    alert("Invalid file format. Please upload JPG, PNG, or SVG.");
    return false;
  }
  if (file.size > maxSize) {
    alert("File is too large. Maximum size limit is 2MB.");
    return false;
  }
  return true;
};

const runSmartFieldValidation = (field, validationType, cache) => {
  if(!field) return true;
  const value = field.value.trim();
  let isFieldValid = true;

  if (value === "") {
    isFieldValid = false;
  } else {
    if (validationType === 'email') {
      isFieldValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    } else if (validationType === 'phone') {
      isFieldValid = /^\+?[0-9\s\-()]{7,20}$/.test(value);
    } else if (validationType === 'numeric-positive') {
      const num = parseFloat(value);
      isFieldValid = !isNaN(num) && num >= 0;
    } else if (validationType === 'date-order') {
      if (cache && cache.issueDate?.value && cache.dueDate?.value) {
        isFieldValid = new Date(cache.dueDate.value) >= new Date(cache.issueDate.value);
      }
    }
  }

  if (!isFieldValid) {
    field.classList.add('error');
    if (field.nextElementSibling?.classList.contains('error-msg')) {
      field.nextElementSibling.style.display = 'block';
    }
  } else {
    field.classList.remove('error');
    if (field.nextElementSibling?.classList.contains('error-msg')) {
      field.nextElementSibling.style.display = 'none';
    }
  }
  return isFieldValid;
};
