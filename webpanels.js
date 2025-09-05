class WebPanels extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = `
      :host {
        display: flex;
        gap: 10px;
        width: 100%;
        height: 100%;
      }
      ::slotted(panel) {
        padding: 20px;
        border-radius: 20px;
        background-color: #ededed;
        flex: 0 0 auto;
        display: none;
        width: 300px;
      }
      ::slotted(panel[main]) {
        flex: 1;
      }
      ::slotted(panel[visible]) {
        display: block;
      }
      @media (min-width: 768px) {
        ::slotted(panel) {
          display: block;
        }
        ::slotted(panel[hidden]) {
          display: none;
        }
      }
      @media (max-width: 767px) {
        :host{
          flex-direction: column;
        }
        ::slotted(panel) {
          width: 100%;
        }
        ::slotted(panel[mainmobile]) {
          display: block;
        }
      }
    `;

    const slot = document.createElement("slot");
    shadow.append(style, slot);
  }
}

customElements.define("web-panels", WebPanels);