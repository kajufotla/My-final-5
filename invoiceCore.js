// ==========================================================================
// INVOICE CORE ENGINE (History, Dynamic Validations & Mutation Actions)
// ==========================================================================

// 1. UNDO / REDO HISTORY ENGINE
export const UndoRedoEngine = {
  history: [],
  index: -1,
  maxStates: 50,
  isProcessing: false,

  pushState(stateData) {
    if (this.isProcessing) return;
    if (this.index < this.history.length - 1) {
      this.history = this.history.slice(0, this.index + 1);
    }
    this.history.push(JSON.stringify(stateData));
    if (this.history.length > this.maxStates) {
      this.history.shift();
    }
    this.index = this.history.length - 1;
  },

  undo(callback) {
    if (this.index > 0) {
      this.isProcessing = true;
      this.index--;
      const state = JSON.parse(this.history[this.index]);
      callback(state);
      this.isProcessing = false;
    }
  },

  redo(callback) {
    if (this.index < this.history.length - 1) {
      this.isProcessing = true;
      this.index++;
      const state = JSON.parse(this.history[this.index]);
      callback(state);
      this.isProcessing = false;
    }
  }
};

// 2. SMART FIELD VALIDATION ENGINE
export const runSmartFieldValidation = (field, validationType, cacheRefs) => {
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
      if (cacheRefs?.issueDate?.value && cacheRefs?.dueDate?.value) {
        isFieldValid = new Date(cacheRefs.dueDate.value) >= new Date(cacheRefs.issueDate.value);
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

// 3. GLOBAL ITEM MUTATIONS BRIDGE
export const itemActions = {
  duplicate(items, id) {
    const idx = items.findIndex(i => i.id === id);
    if (idx !== -1) {
      const itemClone = { ...items[idx], id: Date.now() };
      items.splice(idx + 1, 0, itemClone);
    }
    return items;
  },
  moveUp(items, id) {
    const idx = items.findIndex(i => i.id === id);
    if (idx > 0) {
      const target = items[idx];
      items[idx] = items[idx - 1];
      items[idx - 1] = target;
    }
    return items;
  },
  moveDown(items, id) {
    const idx = items.findIndex(i => i.id === id);
    if (idx !== -1 && idx < items.length - 1) {
      const target = items[idx];
      items[idx] = items[idx + 1];
      items[idx + 1] = target;
    }
    return items;
  }
};

// 4. DEBOUNCE UTILITY FOR AUTOSAVE
export const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};
