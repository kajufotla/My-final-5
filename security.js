export const sanitizeHTML = (str) => {
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

export const safeParseJSON = (jsonStr, fallback) => {
  try {
    return jsonStr ? JSON.parse(jsonStr) : fallback;
  } catch (e) {
    return fallback;
  }
};

export const validateUploadedFile = (file) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/svg+xml'];
  const maxSize = 2 * 1024 * 1024;
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
