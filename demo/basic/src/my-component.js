/* eslint-disable no-undef */

/**
 * Test component
 *
 * @status beta - A beta component
 * @dependency Button - A button component
 * @dependency Icon
 *
 * @slot - Default slot content
 * @slot footer - Footer slot content
 * @slot icon - Optional icon slot
 *
 * @cssprop --my-component-color - Title color
 * @cssprop --my-component-padding - Host padding
 */
export class MyComponent extends HTMLElement {
  static get observedAttributes() {
    return ["title", "count", "disabled", "variant"];
  }

  /** @type {string} */
  title = "Hello, World!";

  /** @type {number} */
  count = 0;

  /** @type {boolean} */
  disabled = false;

  /** @type {'primary' | 'neutral' | 'danger'} */
  variant = "neutral";

  /** @type {{ name: string } | null} */
  user = null;

  /** @type {string[]} */
  items = [];

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.render();

    // Let consumers know the element is ready.
    this.dispatchEvent(new Event("ready", { bubbles: true, composed: true }));
  }

  attributeChangedCallback(name, _oldValue, newValue) {
    switch (name) {
      case "title":
        this.title = newValue ?? "";
        break;
      case "count":
        this.count = Number(newValue ?? 0);
        break;
      case "disabled":
        this.disabled = newValue !== null;
        break;
      case "variant":
        // guard invalid values
        this.variant =
          newValue === "primary" || newValue === "danger"
            ? newValue
            : "neutral";
        break;
    }

    this.render();
  }

  /**
   * Increment the counter.
   * @param {number} [by=1]
   * @returns {number}
   */
  increment(by = 1) {
    if (this.disabled) return this.count;

    this.count += by;
    this.setAttribute("count", String(this.count));

    this.dispatchEvent(
      new CustomEvent("count-change", {
        detail: { count: this.count },
        bubbles: true,
        composed: true,
      }),
    );

    return this.count;
  }

  /** Reset the counter back to 0. */
  reset() {
    if (this.disabled) return;
    this.count = 0;
    this.setAttribute("count", "0");

    this.dispatchEvent(
      new CustomEvent("count-change", {
        detail: { count: this.count },
        bubbles: true,
        composed: true,
      }),
    );

    this.render();
  }

  /** Focus the internal action button. */
  focusButton() {
    this.shadowRoot?.querySelector("button")?.focus();
  }

  render() {
    const variantColor =
      this.variant === "primary"
        ? "#2563eb"
        : this.variant === "danger"
          ? "#dc2626"
          : "#1f2937";

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          padding: var(--my-component-padding, 12px);
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
        }

        h2 {
          margin: 0 0 8px;
          color: var(--my-component-color, ${variantColor});
          font-size: 16px;
        }

        .row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        button {
          padding: 6px 10px;
          border-radius: 6px;
          border: 1px solid #d1d5db;
          background: white;
          cursor: pointer;
        }

        button[disabled] {
          cursor: not-allowed;
          opacity: 0.6;
        }

        .meta {
          font-size: 12px;
          color: #6b7280;
          margin-top: 8px;
        }

        .footer {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid #f3f4f6;
        }
      </style>

      <h2 part="title">
        <span part="icon"><slot name="icon"></slot></span>
        ${this.title}
      </h2>

      <div class="row" part="controls">
        <button part="button" ${this.disabled ? "disabled" : ""}>
          Increment
        </button>
        <div part="count">Count: <strong>${this.count}</strong></div>
      </div>

      <div part="content"><slot></slot></div>

      <div class="meta" part="meta">
        disabled: <code>${this.disabled}</code>, variant: <code>${this.variant}</code>
      </div>

      <div class="footer" part="footer">
        <slot name="footer"></slot>
      </div>
    `;

    const btn = this.shadowRoot?.querySelector("button");
    btn?.addEventListener("click", () => {
      this.increment(1);

      // Example payload event.
      this.dispatchEvent(
        new CustomEvent("value-submit", {
          detail: { value: `${this.title}:${this.count}` },
          bubbles: true,
          composed: true,
        }),
      );
    });
  }
}

customElements.define("my-component", MyComponent);
