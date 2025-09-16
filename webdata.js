class WebData extends HTMLElement {
  static get observedAttributes() {
    return ['url', 'method', 'store-as', 'trigger', 'trigger-on', 'body', 'headers', 'auto-trigger'];
  }

  constructor() {
    super();
    this.abortController = null;
  }

  connectedCallback() {
    this._setupTrigger();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (name === 'trigger' || name === 'trigger-on' || name === 'auto-trigger') {
      this._setupTrigger();
    }
  }

  _setupTrigger() {
    const trigger = this.getAttribute('trigger') || 'auto';
    const autoTrigger = this.getAttribute('auto-trigger'); // For backward compatibility
    const effectiveTrigger = autoTrigger ? 'auto' : trigger;

    if (effectiveTrigger === 'auto') {
      this.fetchData();
    } else if (effectiveTrigger === 'click') {
      const triggerOn = this.getAttribute('trigger-on');
      if (triggerOn) {
        const element = document.querySelector(triggerOn);
        if (element) {
          element.addEventListener('click', () => this.fetchData());
        }
      } else {
        this.addEventListener('click', () => this.fetchData());
      }
    } else if (effectiveTrigger === 'event') {
      const eventName = this.getAttribute('trigger-on');
      if (eventName) {
        document.addEventListener(eventName, () => this.fetchData());
      }
    }
  }

  async fetchData() {
    const url = this.getAttribute('url');
    const method = this.getAttribute('method') || 'GET';
    const storeAs = this.getAttribute('store-as');
    const body = this.getAttribute('body');
    const headers = this.getAttribute('headers');

    if (!url) return;

    // Abort previous request if any
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();

    // Prepare request options
    const options = {
      method,
      signal: this.abortController.signal,
      headers: {}
    };

    if (headers) {
      try {
        options.headers = JSON.parse(headers);
      } catch (e) {
        console.error('Failed to parse headers', e);
      }
    }

    if (body && method !== 'GET' && method !== 'HEAD') {
      options.body = body;
      if (!options.headers['Content-Type']) {
        options.headers['Content-Type'] = 'application/json';
      }
    }

    // Emit loading event and update webvariables
    this.dispatchEvent(new CustomEvent('api-loading', { detail: { url, method } }));
    if (storeAs) {
      const webVariables = document.querySelector('web-variables');
      if (webVariables) {
        webVariables.setVariable(`${storeAs}-loading`, true);
        webVariables.setVariable(`${storeAs}-error`, null);
      }
    }

    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();

      // Store data in webvariables if store-as is set
      if (storeAs) {
        const webVariables = document.querySelector('web-variables');
        if (webVariables) {
          webVariables.setVariable(storeAs, data);
          webVariables.setVariable(`${storeAs}-loading`, false);
          webVariables.setVariable(`${storeAs}-error`, null);
        }
      }

      // Emit success event
      this.dispatchEvent(new CustomEvent('api-success', { detail: data }));
    } catch (error) {
      if (error.name === 'AbortError') return;

      // Store error in webvariables if store-as is set
      if (storeAs) {
        const webVariables = document.querySelector('web-variables');
        if (webVariables) {
          webVariables.setVariable(`${storeAs}-error`, error.message);
          webVariables.setVariable(`${storeAs}-loading`, false);
        }
      }

      // Emit error event
      this.dispatchEvent(new CustomEvent('api-error', { detail: error }));
    }
  }
}

customElements.define('webdata', WebData);
