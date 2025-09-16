class WebRouter extends HTMLElement {
  constructor() {
    super();
    this.routes = new Map();
    this._currentRoute = null;
  }

  connectedCallback() {
    // Parse the initial URL
    this._defineRoutes();
    this._parseUrl(window.location.pathname);

    // Listen to popstate events (back/forward button)
    window.addEventListener('popstate', () => {
      this._parseUrl(window.location.pathname);
    });

    // Listen for variable changes that should update the URL
    document.addEventListener('variable-change', (e) => {
      this._updateUrlFromVariables(e.detail);
    });
  }

  // Define routes by looking for <app-route> elements inside the router
  _defineRoutes() {
    const routeElements = this.querySelectorAll('app-route');
    routeElements.forEach(routeEl => {
      const pathTemplate = routeEl.getAttribute('path');
      const viewName = routeEl.getAttribute('view');
      this.routes.set(viewName, pathTemplate);
    });
  }

  // The core function: extract parameters from the current URL and set them as variables
  _parseUrl(url) {
    let matchedView = null;
    let extractedParams = {};

    // Try to match the URL against all defined route templates
    for (const [viewName, pathTemplate] of this.routes.entries()) {
      const pattern = this._convertTemplateToRegex(pathTemplate);
      const match = url.match(pattern);

      if (match) {
        matchedView = viewName;
        // Extract the named groups from the regex match
        extractedParams = match.groups || {};
        break;
      }
    }

    if (matchedView) {
      // 1. Set the app view
      const variablesEl = document.querySelector('web-variables');
      if (variablesEl) {
        variablesEl.setVariable('app-view', matchedView);
      }

      // 2. Set all extracted parameters as variables
      Object.entries(extractedParams).forEach(([key, value]) => {
        // This will trigger a 'variable-change' event
        variablesEl.setVariable(key, value);
      });

      this._currentRoute = { view: matchedView, params: extractedParams };
    } else {
      // Handle 404 - no route matched
      console.warn(`Webrouter: No route found for URL "${url}"`);
      const variablesEl = document.querySelector('web-variables');
      if (variablesEl && variablesEl.getVariable('app-view') !== 'not-found') {
        variablesEl.setVariable('app-view', 'not-found');
      }
    }
  }

  // Convert a path template like "/user/:userid" to a regex
  _convertTemplateToRegex(template) {
    const regexPattern = template.replace(/\/:(\w+)/g, (_, paramName) => `/(?<${paramName}>[^/]+)`);
    return new RegExp(`^${regexPattern}$`);
  }

  // Update the URL when specific variables change (e.g., userid)
  _updateUrlFromVariables(variableChange) {
    const { key, value } = variableChange;
    const variablesEl = document.querySelector('web-variables');

    // Check if the changed variable is part of the current route's template
    if (this._currentRoute && this.routes.has(this._currentRoute.view)) {
      const routeTemplate = this.routes.get(this._currentRoute.view);

      // If this variable is a parameter in the route template (e.g., :userid)
      if (routeTemplate.includes(`:${key}`)) {
        // Build the new path by replacing the template placeholders with current variable values
        let newPath = routeTemplate;

        // Get all possible params from the template
        const paramMatches = [...routeTemplate.matchAll(/\/:(\w+)/g)];
        for (const match of paramMatches) {
          const paramName = match[1];
          const paramValue = variablesEl.getVariable(paramName) || '';
          newPath = newPath.replace(`:${paramName}`, paramValue);
        }

        // Update the browser URL without refreshing the page
        window.history.pushState({}, '', newPath);
        this._currentRoute.params[key] = value; // Update internal state
      }
    }
  }
}

// Define the custom element for the route definitions
class AppRoute extends HTMLElement {
  // This element is just a declarative marker for the router to find.
  // Its logic is handled entirely by the parent <web-router>.
}
