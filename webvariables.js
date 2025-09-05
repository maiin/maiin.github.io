class WebVariables extends HTMLElement {
  constructor() {
    super();
    this._variables = {};
    this._storageType = null;
    this._db = null;
  }

  async connectedCallback() {
    // Determine storage type
    const storage = this.getAttribute("storage")?.toLowerCase() || null;
    if (storage === "localstorage") this._storageType = localStorage;
    else if (storage === "sessionstorage") this._storageType = sessionStorage;
    else if (storage === "indexeddb") await this._initIndexedDB();

    // Load persisted variables
    await this._loadStoredVariables();

    // Listen for clicks on elements with webvariable
    document.addEventListener("click", (e) => {
      const target = e.target.closest("[webvariable]");
      if (!target) return;

      const definitions = target.getAttribute("webvariable").split(/\s+/);
      definitions.forEach(def => {
        const match = def.match(/^([^(]+)(\(([^)]+)\))?$/);
        if (!match) return;
        const key = match[1];
        let value = match[3] ?? true;

        if (/^\d+$/.test(value)) value = Number(value);
        else if (/^'(.*)'$/.test(value)) value = value.slice(1, -1);

        this.setVariable(key, value);
      });
    });

    this.refreshAll();
    // Observe DOM changes for dynamically added elements
    const observer = new MutationObserver(() => this.refreshAll());
    observer.observe(document.body, { childList: true, subtree: true });
  }

  async _initIndexedDB() {
    return new Promise((resolve) => {
      const request = indexedDB.open("webVariablesDB", 1);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("variables")) {
          db.createObjectStore("variables");
        }
      };
      request.onsuccess = (event) => {
        this._db = event.target.result;
        resolve();
      };
      request.onerror = () => resolve();
    });
  }

  async _loadStoredVariables() {
    if (this._storageType === localStorage || this._storageType === sessionStorage) {
      Object.keys(this._storageType).forEach(key => {
        try { this._variables[key] = JSON.parse(this._storageType[key]); } catch { this._variables[key] = this._storageType[key]; }
      });
    } else if (this._db) {
      const tx = this._db.transaction("variables", "readonly");
      const store = tx.objectStore("variables");
      const allKeysRequest = store.getAllKeys();
      allKeysRequest.onsuccess = () => {
        allKeysRequest.result.forEach(key => {
          const getRequest = store.get(key);
          getRequest.onsuccess = () => this._variables[key] = getRequest.result;
        });
      };
    }
  }

  async _saveVariable(key, value) {
    if (this._storageType === localStorage || this._storageType === sessionStorage) {
      this._storageType[key] = JSON.stringify(value);
    } else if (this._db) {
      const tx = this._db.transaction("variables", "readwrite");
      const store = tx.objectStore("variables");
      store.put(value, key);
    }
  }

  setVariable(key, value) {
    const oldValue = this._variables[key];
    this._variables[key] = value;
    if (oldValue !== value) {
      this._saveVariable(key, value);
      this.refreshAll();
      if (this.hasAttribute("debug")) {
        alert(`Variable changed: ${key} = ${value}`);
      }
    }
  }

  getVariable(key) {
    return this._variables[key];
  }

  refreshAll() {
    // Update getvariable elements - set data attributes instead
    document.querySelectorAll("[getvariable]").forEach(el => {
      const keys = el.getAttribute("getvariable").split(/\s+/);
      keys.forEach(k => {
        const val = this.getVariable(k);
        if (val !== undefined) {
          // Set data attribute instead of regular attribute
          el.setAttribute(`data-${k}`, val);
        }
      });
    });

    // Update ifvariable elements
    document.querySelectorAll("[ifvariable]").forEach(el => {
      const checks = el.getAttribute("ifvariable").split(/\s+/);
      let show = true;
      checks.forEach(check => {
        const match = check.match(/^([^(]+)(\(([^)]+)\))?$/);
        if (!match) return;
        const key = match[1];
        let expected = match[3] ?? true;
        if (/^\d+$/.test(expected)) expected = Number(expected);
        else if (/^'(.*)'$/.test(expected)) expected = expected.slice(1, -1);

        const actual = this.getVariable(key);
        if (actual !== expected) show = false;
      });
      el.style.display = show ? "block" : "none";
    });
  }
}

customElements.define("web-variables", WebVariables);