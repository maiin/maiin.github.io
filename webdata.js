class WebData extends HTMLElement {
            static get observedAttributes() {
                return ['get', 'itemname', 'loop'];
            }
            
            constructor() {
                super();
                this._data = null;
                this._loading = false;
                this._error = null;
                this.attachShadow({ mode: 'open' });
            }
            
            connectedCallback() {
                // Store the template from the light DOM
                this._template = this.innerHTML;
                // Clear the light DOM to avoid showing {{}} expressions
                this.innerHTML = '';
                
                this.render();
                this.fetchData();
            }
            
            attributeChangedCallback(name, oldValue, newValue) {
                if (name === 'get' && this.hasAttribute('auto')) {
                    this.fetchData();
                }
            }
            
            async fetchData() {
                const url = this.getAttribute('get');
                if (!url) {
                    this._error = 'No URL specified';
                    this.dispatchEvent(new CustomEvent('data-error', { detail: this._error }));
                    return;
                }
                
                this._loading = true;
                this._error = null;
                this.dispatchEvent(new CustomEvent('data-loading'));
                this.render();
                
                try {
                    const response = await fetch(url);
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                    
                    const data = await response.json();
                    this._data = data;
                    this._loading = false;
                    
                    this.dispatchEvent(new CustomEvent('data-ready', { detail: data }));
                    this.render();
                } catch (error) {
                    this._loading = false;
                    this._error = error.message;
                    this.dispatchEvent(new CustomEvent('data-error', { detail: error.message }));
                    this.render();
                }
            }
            
            get data() {
                return this._data;
            }
            
            get loading() {
                return this._loading;
            }
            
            get error() {
                return this._error;
            }
            
            clearData() {
                this._data = null;
                this.dispatchEvent(new CustomEvent('data-clear'));
                this.render();
            }
            
            // Render the component based on current state
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
                        <div class="loading">Loading data...</div>
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
                
                if (!this._data) {
                    this.shadowRoot.innerHTML = `
                        <style>
                            .placeholder {
                                text-align: center;
                                padding: 20px;
                                color: #7f8c8d;
                            }
                        </style>
                        <div class="placeholder">No data loaded</div>
                    `;
                    return;
                }
                
                let output = '';
                
                if (this.hasAttribute('loop') && Array.isArray(this._data)) {
                    const itemName = this.getAttribute('itemname') || 'item';
                    
                    // Loop through array items
                    this._data.forEach(item => {
                        let itemOutput = this._template;
                        
                        // Replace all {{property}} with actual values
                        itemOutput = itemOutput.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, path) => {
                            // Handle itemname.property syntax
                            if (path.startsWith(itemName + '.')) {
                                const propPath = path.substring(itemName.length + 1);
                                const value = this.getNestedValue(item, propPath);
                                return value !== undefined ? value : '';
                            }
                            return '';
                        });
                        
                        output += itemOutput;
                    });
                } else {
                    // Single item rendering
                    output = this._template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, path) => {
                        const value = this.getNestedValue(this._data, path);
                        return value !== undefined ? value : '';
                    });
                }
                
                this.shadowRoot.innerHTML = output;
            }
            
            // Get nested property values
            getNestedValue(obj, path) {
                return path.split('.').reduce((acc, part) => {
                    return acc && acc[part] !== undefined ? acc[part] : '';
                }, obj);
            }
        }
        
        // Register the custom element
        customElements.define('web-data', WebData);
