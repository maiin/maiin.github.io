class WebData extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.responseData = null;
    }

    connectedCallback() {
        this.render();
        if (this.hasAttribute('autoload') && this.hasAttribute('get')) this.api('GET');
        
        // Listen for the webtrigger button
        this.addEventListener('click', e => {
            const btn = e.target.closest('[webtrigger]');
            if (!btn) return;
            
            // Find which method attribute is on the <web-data> tag
            const method = ['post', 'patch', 'put', 'delete', 'get'].find(m => this.hasAttribute(m)) || 'get';
            this.api(method.toUpperCase(), btn.getAttribute('webtrigger'));
        });
    }

    async api(method, callback) {
        const url = this.getAttribute('url');
        this.render("Sending...");

        try {
            const options = { method, credentials: 'include', headers: {} };

            if (method !== 'GET') {
                const fd = new FormData();
                // Find inputs inside the component
                this.querySelectorAll('input, textarea, select').forEach(i => fd.append(i.name, i.value));
                
                // Convert to the nested JSON structure your PHP API expects
                const plainData = Object.fromEntries(fd);
                const { pageslug, ...rest } = plainData;
                const payload = { pageslug, data: rest };

                options.body = JSON.stringify(payload);
                options.headers['Content-Type'] = 'application/json';
            }

            const res = await fetch(url, options);
            this.responseData = await res.json();

            if (!res.ok) throw new Error(this.responseData.error || 'API Error');

            this.render(); // Success!
            if (callback) eval(callback); // Run your custom JS string
        } catch (err) {
            this.render(`Error: ${err.message}`);
        }
    }

    render(msg = '') {
        this.shadowRoot.innerHTML = `
            <style>
                .status { color: #555; font-size: 13px; margin: 5px 0; }
                pre { background: #f4f4f4; padding: 10px; font-size: 12px; overflow: auto; border: 1px solid #ddd; }
            </style>
            ${msg ? `<div class="status">${msg}</div>` : ''}
            <slot></slot>
            ${(this.responseData && !msg) ? `<pre>${JSON.stringify(this.responseData, null, 2)}</pre>` : ''}
        `;
    }
}
customElements.define('web-data', WebData);
