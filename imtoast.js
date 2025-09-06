// imtoast.js - Minimal Toast Web Component
class ToastMessage extends HTMLElement {
  static get observedAttributes() {
    return ['duration', 'closable', 'variant', 'position', 'pause-on-hover'];
  }

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });

    const template = document.createElement('template');
    template.innerHTML = `
      <style>
        :host {
          --toast-bg: #333;
          --toast-color: white;
          --toast-success-bg: #4CAF50;
          --toast-error-bg: #f44336;
          --toast-warning-bg: #ff9800;
          --toast-info-bg: #2196F3;

          display: block;
          position: fixed;
          min-width: 250px;
          max-width: 90vw;
          padding: 16px;
          border-radius: 4px;
          color: var(--toast-color);
          background-color: var(--toast-bg);
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
          z-index: 1000;
          opacity: 0;
          transform: translateX(-50%) translateY(-100px);
          transition: opacity 0.3s ease, transform 0.3s ease;
          
          /* DEFAULT POSITION: TOP-CENTER */
          top: 20px;
          left: 50%;
        }

        /* Position Variations */
        :host([position="top-right"]) {
          left: auto;
          right: 20px;
          transform: translateY(-100px);
        }
        :host([position="top-right"][visible]) {
          transform: translateY(0);
        }
        
        :host([position="top-left"]) {
          left: 20px;
          transform: translateY(-100px);
        }
        :host([position="top-left"][visible]) {
          transform: translateY(0);
        }
        
        :host([position="bottom-right"]) {
          top: auto;
          left: auto;
          bottom: 20px;
          right: 20px;
          transform: translateY(100px);
        }
        :host([position="bottom-right"][visible]) {
          transform: translateY(0);
        }
        
        :host([position="bottom-left"]) {
          top: auto;
          left: 20px;
          bottom: 20px;
          transform: translateY(100px);
        }
        :host([position="bottom-left"][visible]) {
          transform: translateY(0);
        }
        
        :host([position="bottom-center"]) {
          top: auto;
          bottom: 20px;
          transform: translateX(-50%) translateY(100px);
        }
        :host([position="bottom-center"][visible]) {
          transform: translateX(-50%) translateY(0);
        }

        /* Variant Styles */
        :host([variant="success"]) { background-color: var(--toast-success-bg); }
        :host([variant="error"]) { background-color: var(--toast-error-bg); }
        :host([variant="warning"]) { background-color: var(--toast-warning-bg); }
        :host([variant="info"]) { background-color: var(--toast-info-bg); }

        /* Visible State */
        :host([visible]) {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }

        /* Close Button */
        .close-btn {
          position: absolute;
          top: 8px;
          right: 8px;
          background: transparent;
          border: none;
          color: inherit;
          font-size: 18px;
          font-weight: bold;
          cursor: pointer;
          opacity: 0.7;
          padding: 0;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .close-btn:hover {
          opacity: 1;
        }

        /* Message Text */
        .message {
          margin: 0;
          padding-right: 24px;
          text-align: center;
        }
      </style>
      <p class="message"><slot></slot></p>
      <button class="close-btn" aria-label="Close">&times;</button>
    `;

    shadow.appendChild(template.content.cloneNode(true));
    this.closeBtn = shadow.querySelector('.close-btn');
    this.messageEl = shadow.querySelector('.message');

    this.hide = this.hide.bind(this);
    this.handleMouseEnter = this.handleMouseEnter.bind(this);
    this.handleMouseLeave = this.handleMouseLeave.bind(this);
  }

  connectedCallback() {
    this.closeBtn.addEventListener('click', this.hide);
    this.addEventListener('mouseenter', this.handleMouseEnter);
    this.addEventListener('mouseleave', this.handleMouseLeave);
    this.updateClosable();
    this.show();
  }

  disconnectedCallback() {
    this.closeBtn.removeEventListener('click', this.hide);
    this.removeEventListener('mouseenter', this.handleMouseEnter);
    this.removeEventListener('mouseleave', this.handleMouseLeave);
    clearTimeout(this._timer);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'closable') {
      this.updateClosable();
    }
  }

  updateClosable() {
    this.closeBtn.style.display = this.hasAttribute('closable') ? 'flex' : 'none';
  }

  show() {
    this.setAttribute('visible', '');
    
    const duration = parseInt(this.getAttribute('duration')) || 3000;
    const pauseOnHover = this.hasAttribute('pause-on-hover');

    if (duration > 0 && !pauseOnHover) {
      this._timer = setTimeout(this.hide, duration);
    }
  }

  hide() {
    this.removeAttribute('visible');
    setTimeout(() => {
      if (this.parentNode) {
        this.parentNode.removeChild(this);
      }
    }, 300);
  }

  handleMouseEnter() {
    if (this.hasAttribute('pause-on-hover')) {
      clearTimeout(this._timer);
    }
  }

  handleMouseLeave() {
    if (this.hasAttribute('pause-on-hover') && this.hasAttribute('visible')) {
      const duration = parseInt(this.getAttribute('duration')) || 3000;
      if (duration > 0) {
        this._timer = setTimeout(this.hide, duration);
      }
    }
  }

  // Property getters/setters
  get duration() { return this.getAttribute('duration') || 3000; }
  set duration(value) { this.setAttribute('duration', value); }

  get variant() { return this.getAttribute('variant'); }
  set variant(value) { value ? this.setAttribute('variant', value) : this.removeAttribute('variant'); }

  get position() { return this.getAttribute('position') || 'top-center'; }
  set position(value) { this.setAttribute('position', value); }

  get closable() { return this.hasAttribute('closable'); }
  set closable(value) { value ? this.setAttribute('closable', '') : this.removeAttribute('closable'); }

  get pauseOnHover() { return this.hasAttribute('pause-on-hover'); }
  set pauseOnHover(value) { value ? this.setAttribute('pause-on-hover', '') : this.removeAttribute('pause-on-hover'); }
}

// Define the custom element
customElements.define('im-toast', ToastMessage);

// Helper function to create and show a toast
function showToast(message, options = {}) {
  const toast = document.createElement('im-toast');
  toast.textContent = message;
  
  if (options.duration !== undefined) toast.duration = options.duration;
  if (options.closable) toast.closable = true;
  if (options.variant) toast.variant = options.variant;
  if (options.position) toast.position = options.position;
  if (options.pauseOnHover) toast.pauseOnHover = true;
  
  document.body.appendChild(toast);
  return toast;
}