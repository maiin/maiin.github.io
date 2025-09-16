class WebData extends HTMLElement {
            static get observedAttributes() {
                return ['get', 'post', 'put', 'patch', 'delete', 'data', 'save-token', 'use-token', 'token-path', 'headers'];
            }
            
            constructor() {
                super();
                this._data = null;
                this._loading = false;
                this._error = null;
                this._response = null;
                this.attachShadow({ mode: 'open' });
            }
            
            connectedCallback() {
                this.render();
                
                // Set up trigger buttons
                const triggerButtons = this.querySelectorAll('[trigger]');
                triggerButtons.forEach(button => {
                    button.addEventListener('click', () => {
                        const method = button.getAttribute('trigger').toUpperCase();
                        this.sendRequest(method);
                    });
                });
            }
            
            async sendRequest(method) {
                let url;
                let data;
                
                // Determine URL based on method
                switch(method) {
                    case 'GET': url = this.getAttribute('get'); break;
                    case 'POST': url = this.getAttribute('post'); break;
                    case 'PUT': url = this.getAttribute('put'); break;
                    case 'PATCH': url = this.getAttribute('patch'); break;
                    case 'DELETE': url = this.getAttribute('delete'); break;
                    default: 
                        this._error = 'Invalid method';
                        this.render();
                        return;
                }
                
                if (!url) {
                    this._error = 'No URL specified for method: ' + method;
                    this.render();
                    return;
                }
                
                // Prepare data based on data attribute
                const dataAttr = this.getAttribute('data');
                if (dataAttr === 'auto') {
                    // Collect data from form inputs
                    data = this.collectFormData();
                } else if (dataAttr) {
                    try {
                        // Parse JSON data
                        data = JSON.parse(dataAttr);
                    } catch (e) {
                        this._error = 'Invalid JSON data: ' + e.message;
                        this.render();
                        return;
                    }
                }
                
                // Prepare headers
                const headers = {};
                
                // Add content type for methods with body
                if (['POST', 'PUT', 'PATCH'].includes(method) && data) {
                    headers['Content-Type'] = 'application/json';
                }
                
                // Add authorization token if specified
                const useToken = this.getAttribute('use-token');
                if (useToken) {
                    const token = this.getToken(useToken);
                    if (token) {
                        headers['Authorization'] = `Bearer ${token}`;
                    }
                }
                
                // Add custom headers if specified
                const headersAttr = this.getAttribute('headers');
                if (headersAttr) {
                    try {
                        const customHeaders = JSON.parse(headersAttr);
                        Object.assign(headers, customHeaders);
                    } catch (e) {
                        console.error('Failed to parse headers', e);
                    }
                }
                
                this._loading = true;
                this._error = null;
                this.dispatchEvent(new CustomEvent('api-loading', { detail: { url, method } }));
                this.render();
                
                try {
                    const options = {
                        method,
                        headers
                    };
                    
                    // Add body for methods that need it
                    if (['POST', 'PUT', 'PATCH'].includes(method) && data) {
                        options.body = JSON.stringify(data);
                    }
                    
                    const response = await fetch(url, options);
                    
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                    
                    // Try to parse JSON response
                    try {
                        this._response = await response.json();
                    } catch (e) {
                        this._response = { status: response.status, statusText: response.statusText };
                    }
                    
                    // Save token if specified
                    const saveToken = this.getAttribute('save-token');
                    if (saveToken && this._response) {
                        this.saveToken(saveToken, this._response);
                    }
                    
                    this._loading = false;
                    this.dispatchEvent(new CustomEvent('api-success', { detail: this._response }));
                    this.render();
                } catch (error) {
                    this._loading = false;
                    this._error = error.message;
                    this.dispatchEvent(new CustomEvent('api-error', { detail: error.message }));
                    this.render();
                }
            }
            
            collectFormData() {
                const data = {};
                const inputs = this.querySelectorAll('input, textarea, select');
                
                inputs.forEach(input => {
                    // Skip trigger buttons
                    if (input.hasAttribute('trigger')) return;
                    
                    const name = input.getAttribute('name');
                    if (name) {
                        if (input.type === 'checkbox') {
                            data[name] = input.checked;
                        } else if (input.type === 'radio') {
                            if (input.checked) data[name] = input.value;
                        } else {
                            data[name] = input.value;
                        }
                    }
                });
                
                return data;
            }
            
            saveToken(tokenName, response) {
                const tokenPath = this.getAttribute('token-path') || 'token';
                
                // Extract token from response using dot notation path
                const tokenValue = tokenPath.split('.').reduce((obj, key) => {
                    return obj && obj[key];
                }, response);
                
                if (tokenValue) {
                    localStorage.setItem(tokenName, tokenValue);
                    this.dispatchEvent(new CustomEvent('token-saved', { 
                        detail: { name: tokenName, value: tokenValue } 
                    }));
                }
            }
            
            getToken(tokenName) {
                return localStorage.getItem(tokenName);
            }
            
            clearToken(tokenName) {
                localStorage.removeItem(tokenName);
                this.dispatchEvent(new CustomEvent('token-cleared', { detail: { name: tokenName } }));
            }
            
            render() {
                if (!this.shadowRoot) return;
                
                if (this._loading) {
                    this.shadowRoot.innerHTML = `
                        <style>
                            .loading {
                                text-align: center;
                                padding: 20px;
                                color: #3498db;
                            }
                        </style>
                        <div class="loading">Sending request...</div>
                    `;
                    return;
                }
                
                if (this._error) {
                    this.shadowRoot.innerHTML = `
                        <style>
                            .error {
                                text-align: center;
                                padding: 20px;
                                color: #e74c3c;
                                background-color: #ffeded;
                            }
                        </style>
                        <div class="error">Error: ${this._error}</div>
                    `;
                    return;
                }
                
                // Default rendering - just a slot for the content
                this.shadowRoot.innerHTML = `<slot></slot>`;
            }
            
            get response() {
                return this._response;
            }
            
            get loading() {
                return this._loading;
            }
            
            get error() {
                return this._error;
            }
        }
        
        // Register the custom element
        customElements.define('web-data', WebData);
