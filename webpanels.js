class WebPanels extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = this._getStyles('default');

    const slot = document.createElement("slot");
    shadow.append(style, slot);
  }

  static get observedAttributes() {
    return ['cssfrom'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'cssfrom') {
      this.shadowRoot.querySelector('style').textContent = this._getStyles(newValue);
      this._updateDemoColors(newValue);
    }
  }

  _getStyles(variant) {
    const baseStyles = `
      :host {
        display: grid;
        width: 100%;
        height: 100%;
        position: relative;
        grid-template-columns: auto 1fr auto;
        grid-template-rows: auto 1fr auto;
        grid-template-areas: 
            "top top top"
            "left main right"
            "bottom bottom bottom";
        container: webpanels / inline-size;
      }
      ::slotted(panel) {
      display: block;
      min-width: 300px;
      }
      ::slotted(panel[main]) {
        grid-area: main;
      }
      ::slotted(panel[top]) {
        grid-area: top;
      }
      ::slotted(panel[left]) {
        grid-area: left;
      }
      ::slotted(panel[right]) {
        grid-area: right;
      }
      ::slotted(panel[bottom]) {
        grid-area: bottom;
      }
                    
        ::slotted(panel[overlay]) {
            position: absolute;
            z-index: 10;
        }
                    
        ::slotted(panel[overlay][right]) {
            grid-area: main;
            inset: 0 0 0 auto;
        }
        
        ::slotted(panel[overlay][left]) {
            grid-area: main;
            left: 0;
            top: 0;
            bottom: 0;
            inset: 0 auto 0 0;
        }
        
        ::slotted(panel[overlay][top]) {
            grid-area: top;
            inset: 0 0 auto;
            z-index: 20;
            position: absolute;
        }
        
        ::slotted(panel[overlay][bottom]) {
            grid-area: bottom;
            inset: auto 0 0;
            z-index: 20;
            position: absolute;
        }
        
        ::slotted(panel[sticky]) {
            position: sticky;
        }
        
        ::slotted(panel[sticky][top]) {
            top: 0;
        }
        
        ::slotted(panel[sticky][bottom]) {
            bottom: 0;
        }
        
        /* Multiple panels in same area */
        ::slotted(panel[top]) ~ ::slotted(panel[top]) {
            grid-area: top;
        }
        
        ::slotted(panel[bottom]) ~ ::slotted(panel[bottom]) {
            grid-area: bottom;
        }
        
        ::slotted(panel[left]) ~ ::slotted(panel[left]) {
            grid-area: left;
        }
        
        ::slotted(panel[right]) ~ ::slotted(panel[right]) {
            grid-area: right;
        }
      @container webpanels (max-width: 767px) {
        :host{
          grid-template-columns: 1fr;
            grid-template-areas: 
                "top"
                "left"
                "main"
                "right"
                "bottom";
            grid-template-rows: auto auto 1fr auto auto;
        }
        ::slotted(panel) {
          width: 100%;
        }
                        
        ::slotted(panel[overlay][right]),
        ::slotted(panel[overlay][left]) {
            grid-area: main;
            width: 80%;
        }
      }
    `;

    const variantStyles = {
      default: `
        :host {
          gap: 10px;
          padding: 10px;
        }
        ::slotted(panel) {
          padding: 20px;
          border-radius: 20px;
          background-color: #ededed;
        }
      `,
      demo: `
        :host {
          gap: 0;
        }
        ::slotted(panel) {
          padding: 0;
          border-radius: 0;
        }
      `,
      css: `
        :host {
          gap: 0;
        }
        ::slotted(panel) {
          padding: 0;
          border-radius: 0;
          background-color: transparent;
        }
      `
    };

    return baseStyles + (variantStyles[variant] || variantStyles.default);
  }

  _updateDemoColors(variant) {
    const colors = ['#130f17ff', '#c7cae4ff', '#9D8AB1', '#B7D2CC', '#C9B4D8',
      '#9396BE', '#EADDE3', '#9D8AB1', '#B2D8D6', '#C9C4CE'
    ];

    this.querySelectorAll('panel').forEach((panel, index) => {
      if (variant === 'demo') {
        panel.style.backgroundColor = colors[index % colors.length];
        panel.style.padding = '20px';
        panel.style.color = '#37474F';
      } else {
        panel.style.backgroundColor = '';
        panel.style.color = '';
        panel.style.padding = '';
      }
    });
  }
}

customElements.define("web-panels", WebPanels);
