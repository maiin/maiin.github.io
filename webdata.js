class WebData extends HTMLElement {
  constructor() {
    super();
    this._abortController = null;
  }

  connectedCallback() {
    this._loadData();
  }

  static get observedAttributes() {
    return ['src', 'store-as', 'refresh-trigger'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'src' || name === 'refresh-trigger') {
      this._loadData();
    }
  }

  async _loadData() {
    const src = this.getAttribute('src');
    const storeAs = this.getAttribute('store-as');
    const method = this.getAttribute('method') || 'GET';
    
    if (!src || !storeAs) return;

    // Cancel previous request if still pending
    if (this._abortController) {
      this._abortController.abort();
    }

    this._abortController = new AbortController();
    
    try {
      // Show loading state
      this.dispatchEvent(new CustomEvent('data-loading'));
      this._showSlot('loading');

      const response = await fetch(src, {
        method,
        signal: this._abortController.signal,
        headers: this._getHeaders(),
        body: method !== 'GET' ? this._getBody() : undefined
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Store the data in web-variables
      const variables = document.querySelector('web-variables');
      if (variables) {
        variables.setVariable(storeAs, data);
        variables.setVariable(`${storeAs}-loading`, false);
        variables.setVariable(`${storeAs}-error`, null);
      }

      // Show success state
      this.dispatchEvent(new CustomEvent('data-loaded', { detail: data }));
      this._showSlot('default');

    } catch (error) {
      if (error.name === 'AbortError') {
        return; // Request was cancelled, do nothing
      }
      
      // Show error state
      const variables = document.querySelector('web-variables');
      if (variables) {
        variables.setVariable(`${storeAs}-error`, error.message);
        variables.setVariable(`${storeAs}-loading`, false);
      }
      
      this.dispatchEvent(new CustomEvent('data-error', { detail: error }));
      this._showSlot('error');
    }
  }

  _getHeaders() {
    const headers = {};
    
    // Add content-type if not GET
    if (this.getAttribute('method') !== 'GET') {
      headers['Content-Type'] = 'application/json';
    }
    
    // Add custom headers
    const headersAttr = this.getAttribute('headers');
    if (headersAttr) {
      try {
        Object.assign(headers, JSON.parse(headersAttr));
      } catch (e) {
        console.error('Failed to parse headers attribute', e);
      }
    }
    
    return headers;
  }

  _getBody() {
    const bodyAttr = this.getAttribute('body');
    if (!bodyAttr) return null;
    
    try {
      return JSON.stringify(JSON.parse(bodyAttr));
    } catch (e) {
      // If not valid JSON, send as plain text
      return bodyAttr;
    }
  }

  _showSlot(slotName) {
    // Hide all slots
    this.querySelectorAll('[slot]').forEach(el => {
      el.style.display = 'none';
    });
    
    // Show requested slot
    const slotEl = this.querySelector(`[slot="${slotName}"]`);
    if (slotEl) {
      slotEl.style.display = 'block';
    }
  }

  refresh() {
    this._loadData();
  }
}

customElements.define('web-data', WebData);
