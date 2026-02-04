class WebData extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.res = null;
        this.templateMarkup = null;
    }

    connectedCallback() {
        // Find and store the template from [webresult] before rendering shadow DOM
        const resultEl = this.querySelector('[webresult]');
        if (resultEl) {
            this.templateMarkup = resultEl.innerHTML;
            resultEl.style.display = 'none'; // Hide the original "source" template
        }
        
        this.render();
        if (this.hasAttribute('autoload') && this.hasAttribute('get')) this.api('GET');
        
        this.addEventListener('click', e => {
            const btn = e.target.closest('[webtrigger]');
            if (btn) {
                const method = ['post', 'patch', 'put', 'delete', 'get'].find(m => this.hasAttribute(m)) || 'get';
                this.api(method.toUpperCase(), btn.getAttribute('webtrigger'));
            }
        });
    }

    async api(method, callback) {
        let url = this.getAttribute('url');
        this.render("Loading...");

        try {
            const options = { method, credentials: 'include', headers: { 'Content-Type': 'application/json' } };
            if (method !== 'GET') {
                const rawData = {};
                this.querySelectorAll('input, textarea, select').forEach(i => { if(i.name) rawData[i.name] = i.value });
                
                let bodyPayload = rawData;
                if (url.includes('/phable')) {
                    const { pageslug, ...rest } = rawData;
                    bodyPayload = { pageslug, data: rest };
                    if (method === 'PATCH' && pageslug && !url.endsWith(pageslug)) {
                        url = `${url.replace(/\/$/, '')}/${pageslug}`;
                    }
                }
                options.body = JSON.stringify(bodyPayload);
            }

            const response = await fetch(url, options);
            this.res = await response.json();
            if (!response.ok) throw new Error(this.res.error || 'Failed');

            this.render(); 
            if (callback) new Function(callback).call(this);
        } catch (err) {
            this.render(err.message, true);
        }
    }

    // Simple template parser: replaces {{key}} with data[key]
    parseTemplate(html, data) {
        // Support nested 'data' object from Phable API
        const combinedData = { ...data, ...(data.data || {}) };
        return html.replace(/{{(.*?)}}/g, (match, key) => {
            return combinedData[key.trim()] ?? '';
        });
    }

    render(msg = '', isError = false) {
        let output = '';
        
        if (this.res && !msg) {
            if (this.templateMarkup) {
                // If the response is an array (like a list of articles)
                if (Array.isArray(this.res)) {
                    output = this.res.map(item => this.parseTemplate(this.templateMarkup, item)).join('');
                } else {
                    // Single object response
                    output = this.parseTemplate(this.templateMarkup, this.res);
                }
            } else {
                // Fallback to raw JSON if no webresult template is found
                output = `<pre>${JSON.stringify(this.res, null, 2)}</pre>`;
            }
        }

        this.shadowRoot.innerHTML = `
            <style>
                .msg { padding: 10px; margin: 10px 0; border-radius: 4px; font-family: sans-serif; }
                .err { background: #fff1f0; color: #cf1322; border: 1px solid #ffa39e; }
                .loading { color: #1890ff; font-style: italic; }
                pre { background: #f5f5f5; padding: 10px; border: 1px solid #ccc; }
            </style>
            ${msg ? `<div class="msg ${isError ? 'err' : 'loading'}">${msg}</div>` : ''}
            <slot></slot>
            <div id="result-container">${output}</div>
        `;
    }
}
customElements.define('web-data', WebData);
