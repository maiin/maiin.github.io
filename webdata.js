class WebData extends HTMLElement {
    static get observedAttributes() {
        return ['url', 'method', 'autoload', 'wrap-data'];
    }

    constructor() {
        super();
        this._response = null;
        this._loading = false;
        this._error = null;
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
        
        // Auto-fetch if the attribute is present
        if (this.hasAttribute('autoload') && this.getAttribute('url')) {
            this.sendRequest();
        }

        // Listen for clicks on children with [trigger] attribute
        this.addEventListener('click', (e) => {
            const btn = e.target.closest('[trigger]');
            if (btn) {
                const method = btn.getAttribute('trigger').toUpperCase();
                this.sendRequest(method);
            }
        });
    }

    async sendRequest(overrideMethod = null) {
        const url = this.getAttribute('url');
        const method = overrideMethod || this.getAttribute('method') || 'GET';
        
        if (!url) return;

        this._loading = true;
        this._error = null;
        this.render();
        this.dispatchEvent(new CustomEvent('api-start'));

        try {
            const options = {
                method,
                // CRITICAL: This allows PHP sessions to work
                credentials: 'include', 
                headers: { 'Accept': 'application/json' }
            };

            if (['POST', 'PATCH', 'PUT'].includes(method)) {
                let payload = this.collectFormData();
                
                // Nest data for Phable API if 'wrap-data' is set
                if (this.hasAttribute('wrap-data')) {
                    const { pageslug, ...rest } = payload;
                    payload = {
                        pageslug: pageslug || undefined,
                        data: rest
                    };
                }

                options.body = JSON.stringify(payload);
                options.headers['Content-Type'] = 'application/json';
            }

            const response = await fetch(url, options);
            const result = await response.json();

            if (!response.ok) throw new Error(result.error || `Error ${response.status}`);

            this._response = result;
            this.dispatchEvent(new CustomEvent('api-success', { detail: result, bubbles: true }));
        } catch (err) {
            this._error = err.message;
            this.dispatchEvent(new CustomEvent('api-error', { detail: err.message, bubbles: true }));
        } finally {
            this._loading = false;
            this.render();
        }
    }

    collectFormData() {
        const data = {};
        // Find all inputs in the light DOM
        const inputs = this.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            if (!input.name || input.hasAttribute('trigger')) return;
            
            if (input.type === 'checkbox') data[input.name] = input.checked;
            else if (input.type === 'radio') {
                if (input.checked) data[input.name] = input.value;
            } else {
                data[input.name] = input.value;
            }
        });
        return data;
    }

    render() {
        // We use a slot so your HTML stays visible. 
        // We only show a small status indicator if loading or error exists.
        this.shadowRoot.innerHTML = `
            <style>
                :host { display: block; position: relative; }
                .status { font-size: 0.8rem; padding: 5px; margin-bottom: 10px; border-radius: 4px; }
                .loading { color: #2980b9; background: #e1f5fe; }
                .error { color: #c0392b; background: #fdf2f2; }
                .hidden { display: none; }
            </style>
            <div class="status ${this._loading ? '' : 'hidden'} loading">Processing...</div>
            <div class="status ${this._error ? '' : 'hidden'} error">${this._error}</div>
            <slot></slot>
        `;
    }
}

customElements.define('web-data', WebData);
