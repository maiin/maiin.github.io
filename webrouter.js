class WebRouter extends HTMLElement {
  constructor() {
    super();
    this._currentView = null;
    this._views = new Map();
  }

  connectedCallback() {
    this._loadViews();
    this._setupRouting();
  }

  _loadViews() {
    // Get all view elements
    const viewElements = this.querySelectorAll('app-view');
    
    viewElements.forEach(view => {
      const name = view.getAttribute('name');
      const mode = view.getAttribute('mode');
      const isDefault = view.hasAttribute('default');
      
      if (name) this._views.set(name, view);
      if (mode) this._views.set(mode, view);
      if (isDefault) this._defaultView = view;
      
      // Hide all views initially
      view.style.display = 'none';
    });
  }

  _setupRouting() {
    // Listen for variable changes that affect routing
    document.addEventListener('variable-change', (e) => {
      const { key, value } = e.detail;
      
      // Check if this variable controls a view
      if (this._views.has(key)) {
        this.navigateTo(key);
      } else if (key === 'app-mode' || key === 'view') {
        // Common convention for view state
        this.navigateTo(value);
      }
    });

    // Check initial state
    const variables = document.querySelector('web-variables');
    if (variables) {
      const initialView = variables.getVariable('app-mode') || 
                         variables.getVariable('view') ||
                         this._defaultView;
      if (initialView) this.navigateTo(initialView);
    } else if (this._defaultView) {
      this.navigateTo(this._defaultView);
    }
  }

  navigateTo(viewName) {
    const targetView = this._views.get(viewName);
    
    if (!targetView) {
      console.warn(`View "${viewName}" not found`);
      if (this._defaultView) targetView = this._defaultView;
      else return;
    }

    // Hide current view
    if (this._currentView) {
      this._currentView.style.display = 'none';
      this._currentView.dispatchEvent(new CustomEvent('view-hidden'));
    }

    // Show new view
    targetView.style.display = 'block';
    this._currentView = targetView;
    targetView.dispatchEvent(new CustomEvent('view-visible'));
    
    // Update URL if needed
    if (this.hasAttribute('update-url')) {
      const url = new URL(window.location);
      url.searchParams.set('view', viewName);
      window.history.pushState({}, '', url);
    }
  }
}

customElements.define('web-router', WebRouter);
