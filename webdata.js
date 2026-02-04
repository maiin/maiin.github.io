class WebData extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.res = null;
    }

    connectedCallback() {
        this.render();
        // Trigger GET automatically if 'get' and 'autoload' are present
        if (this.hasAttribute('autoload') && this.hasAttribute('get')) this.api('GET');
        
        this.addEventListener('click', e => {
            const btn = e.target.closest('[webtrigger]');
            if (!btn) return;
            
            // Auto-detect method from the <web-data> attributes
            const method = ['post', 'patch', 'put', 'delete', 'get'].find(m => this.hasAttribute(m)) || 'get';
            this.api(method.toUpperCase(), btn.getAttribute('webtrigger'));
        });
    }

    async api(method, callback) {
        let url = this.getAttribute('url');
        this.render("Processing...");

        try {
            const options = { method, credentials: 'include', headers: { 'Content-Type': 'application/json' } };

            if (method !== 'GET') {
                const inputs = Array.from(this.querySelectorAll('input, textarea, select'));
                const rawData = {};
                inputs.forEach(i => { if(i.name) rawData[i.name] = i.value });

                let bodyPayload;
                
                // --- SMART DATA MAPPING ---
                if (url.includes('/user/login')) {
                    // Login needs FLAT data
                    bodyPayload = rawData;
                } else if (url.includes('/phable')) {
                    // Phable POST/PATCH needs WRAPPED data
                    const { pageslug, ...rest } = rawData;
                    bodyPayload = { pageslug, data: rest };
                    
                    // If PATCHing, ensure the slug is in the URL if it's not there
                    if (method === 'PATCH' && !url.split('/').pop().includes(pageslug) && pageslug) {
                        url = `${url.replace(/\/$/, '')}/${pageslug}`;
                    }
                } else {
                    bodyPayload = rawData;
                }

                options.body = JSON.stringify(bodyPayload);
            }

            const response = await fetch(url, options);
            this.res = await response.json();

            if (!response.ok) throw new Error(this.res.error || 'Request Failed');

            this.render(); // Success
            if (callback) new Function(callback).call(this); // Execute webtrigger string
        } catch (err) {
            this.render(err.message, true);
        }
    }

    render(msg = '', isError = false) {
        this.shadowRoot.innerHTML = `
            <style>
                .msg { padding: 8px; margin-bottom: 10px; border-radius: 4px; font-family: sans-serif; font-size: 13px; }
                .err { background: #fff1f0; color: #cf1322; border: 1px solid #ffa39e; }
                .info { background: #e6f7ff; color: #1890ff; border: 1px solid #91d5ff; }
                pre { background: #f5f5f5; padding: 10px; font-size: 12px; border: 1px solid #ccc; overflow: auto; max-height: 200px; }
            </style>
            ${msg ? `<div class="msg ${isError ? 'err' : 'info'}">${msg}</div>` : ''}
            <slot></slot>
            ${(this.res && !msg) ? `<pre>${JSON.stringify(this.res, null, 2)}</pre>` : ''}
        `;
    }
}
customElements.define('web-data', WebData);
