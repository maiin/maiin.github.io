/**
 * A custom web component for looping through data and rendering a template.
 *
 * It supports three types of data sources:
 * 1. A variable from a <web-variables> component:
 * <div webloop="webvariables(users) as user">...</div>
 * 2. A number of times:
 * <div webloop="n in 10">...</div>
 * 3. A URL that returns a JSON array:
 * <div webloop="https://demo.com/users as user">...</div>
 *
 * The content of the webloop element is used as the template for each item.
 * Placeholders like {{user.name}} are replaced with the data from the current item.
 *
 * @extends HTMLElement
 */
class WebLoop extends HTMLElement {
    constructor() {
        super();
        this._template = null;
        this._loopConfig = {};
        this._cleanupWatcher = null;
        this._fetchCache = {};
    }

    connectedCallback() {
        const loopAttribute = this.getAttribute("webloop");
        if (!loopAttribute) {
            console.error("webloop attribute is missing on element", this);
            return;
        }

        // Store the original innerHTML as the template for later use.
        // We use a temporary container to handle multiple root elements in the template.
        const tempContainer = document.createElement('div');
        tempContainer.innerHTML = this.innerHTML;
        this._template = tempContainer.innerHTML;
        this.innerHTML = ''; // Clear content for rendering

        // Parse the webloop attribute to determine the loop source and alias.
        this._parseLoopConfig(loopAttribute);

        // Set up the loop.
        if (this._loopConfig.type === 'webvariables') {
            this._setupVariableWatcher();
        } else {
            this._renderLoop();
        }
    }

    disconnectedCallback() {
        // Clean up event listeners to prevent memory leaks.
        if (this._cleanupWatcher) {
            this._cleanupWatcher();
        }
    }

    _parseLoopConfig(attribute) {
        // Regex for webvariables(key) as alias
        const varMatch = attribute.match(/^webvariables\((.+?)\)\s+as\s+(\S+)$/);
        if (varMatch) {
            this._loopConfig = {
                type: 'webvariables',
                key: varMatch[1],
                alias: varMatch[2]
            };
            return;
        }

        // Regex for n in count
        const numMatch = attribute.match(/^(\S+)\s+in\s+(\d+)$/);
        if (numMatch) {
            this._loopConfig = {
                type: 'number',
                alias: numMatch[1],
                count: parseInt(numMatch[2], 10)
            };
            return;
        }
        
        // Regex for URL as alias
        const urlMatch = attribute.match(/^((https?:\S+))\s+as\s+(\S+)$/);
        if (urlMatch) {
             this._loopConfig = {
                type: 'url',
                url: urlMatch[1],
                alias: urlMatch[3]
            };
            return;
        }

        console.error("Invalid webloop attribute format:", attribute);
    }

    _setupVariableWatcher() {
        const webVariables = document.querySelector('web-variables');
        if (webVariables) {
            // Initial render
            const initialData = webVariables.getVariable(this._loopConfig.key);
            this._renderLoop(initialData);

            // Watch for changes and re-render
            this._cleanupWatcher = webVariables.watchVariable(this._loopConfig.key, (newValue) => {
                this._renderLoop(newValue);
            });
        }
    }

    async _renderLoop(data = null) {
        this.innerHTML = ''; // Clear old content
        const { type, alias, count, url } = this._loopConfig;

        let items = data;

        // Fetch data if not provided (e.g., initial render for URL or number loop)
        if (type === 'url' && !items) {
             if (this._fetchCache[url]) {
                 items = this._fetchCache[url];
             } else {
                try {
                    const response = await fetch(url);
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    items = await response.json();
                    this._fetchCache[url] = items;
                } catch (error) {
                    console.error(`Failed to fetch data from ${url}:`, error);
                    return;
                }
             }
        } else if (type === 'number') {
            items = Array.from({ length: count }, (_, i) => i + 1);
        } else if (type === 'webvariables' && !items) {
             // Data was not provided, but it's a webvariables loop.
             // This case is handled by the initial render in _setupVariableWatcher.
             return;
        }

        if (!Array.isArray(items)) {
            console.warn(`Data for loop is not an array. Found type: ${typeof items}`, items);
            return;
        }

        items.forEach(item => {
            const tempContainer = document.createElement('div');
            tempContainer.innerHTML = this._template;
            
            this._processNode(tempContainer, { [alias]: item });

            // Append processed children to the component
            while (tempContainer.firstChild) {
                this.appendChild(tempContainer.firstChild);
            }
        });
    }

    _processNode(node, context) {
        // Process attributes of the current node
        if (node.attributes) {
            for (let i = 0; i < node.attributes.length; i++) {
                const attr = node.attributes[i];
                attr.value = this._replacePlaceholders(attr.value, context);
            }
        }

        // Process child nodes
        for (let i = 0; i < node.childNodes.length; i++) {
            const childNode = node.childNodes[i];
            
            if (childNode.nodeType === Node.TEXT_NODE) {
                childNode.textContent = this._replacePlaceholders(childNode.textContent, context);
            } else if (childNode.nodeType === Node.ELEMENT_NODE) {
                this._processNode(childNode, context); // Recursive call
            }
        }
    }

    _replacePlaceholders(text, context) {
        if (typeof text !== 'string') return text;
        
        return text.replace(/{{(.+?)}}/g, (match, path) => {
            const parts = path.trim().split('.');
            let value = context;
            for (const part of parts) {
                if (value === undefined || value === null) return '';
                value = value[part];
            }
            return value !== undefined ? value : '';
        });
    }
}

// Define the custom element
customElements.define("web-loop", WebLoop);
