class WebData extends HTMLElement {
    static get observedAttributes() {
        return ['url', 'autoload', 'get', 'post', 'patch', 'put', 'delete', 'wrap-data'];
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
        
        // 1. Autoload Logic
        if (this.hasAttribute('autoload') && this.hasAttribute('get')) {
            this.sendRequest('GET');
        }

        // 2. Webtrigger Logic (Event Delegation)
        this.addEventListener('click', async (e) => {
            const triggerBtn = e.target.closest('[webtrigger]');
            if (!triggerBtn) return;

            e.preventDefault();
            
            // Determine method: looks for method flags on the component
            // Priority: POST > PATCH > PUT > DELETE > GET
            const method = ['post', 'patch', 'put', 'delete', 'get']
                .find(m => this.hasAttribute(m))?.toUpperCase() || 'GET';

            await this.sendRequest(method);

            // 3. Execute JS if webtrigger has a value
            const callbackCode = triggerBtn.getAttribute('webtrigger');
            if (callbackCode && !this._error) {
                try {
                    // Create a function from the string and execute it
                    new Function(callbackCode).call(this);
                } catch (err) {
                    console.error("Webtrigger callback error:", err);
                }
            }
        });
    }

    async sendRequest(method) {
        const url = this.getAttribute('url');
        if (!url) return;

        this._loading = true;
        this._error = null;
        this.render();

        try {
            const options = {
                method,
                credentials: 'include', // Support PHP Sessions
                headers: { 'Accept': 'application/json' }
            };

            if (['POST', 'PATCH', 'PUT'].includes(method)) {
                let payload = this.collectFormData();
                
                // Nest data to match your PHABLE PHP API structure
                if (this.hasAttribute('wrap-data') || this.hasAttribute('post') || this.hasAttribute('patch')) {
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
        } catch (err) {
            this._error = err.message;
        } finally {
            this._loading = false;
            this.render();
        }
    }

    collectFormData() {
        const data = {};
        this.querySelectorAll('input, textarea, select').forEach(input => {
            if (!input.name || input.hasAttribute('webtrigger')) return;
            if (input.type === 'checkbox') data[input.name] = input.checked;
            else if (input.type === 'radio') { if (input.checked) data[input.name] = input.value; }
            else { data[input.name] = input.value; }
        });
        return data;
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host { display: block; font-family: sans-serif; }
                .msg { padding: 10px; margin: 10px 0; border-radius: 4px; font-size: 14px; }
                .error { background: #fee2e2; color: #dc2626; border: 1px solid #fecaca; }
                .loading { color: #2563eb; font-style: italic; }
                .json-box { 
                    background: #f8fafc; border: 1px solid #e2e8f0; 
                    padding: 10px; border-radius: 4px; overflow-x: auto;
                    font-family: monospace; font-size: 12px; color: #334155;
                }
                .hidden { display: none; }
            </style>
            
            <div class="msg loading ${this._loading ? '' : 'hidden'}">Processing request...</div>
            <div class="msg error ${this._error ? '' : 'hidden'}">⚠️ ${this._error}</div>
            
            <slot></slot>

            ${(this._response && !this._loading) ? `
                <div class="msg success">
                    <strong>Success:</strong>
                    <pre class="json-box">${JSON.stringify(this._response, null, 2)}</pre>
                </div>
            ` : ''}
        `;
    }
}

customElements.define('web-data', WebData);
