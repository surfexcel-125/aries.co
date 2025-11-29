// /modules/ui-kit.js

// Apply Aries module chrome + inject shared styling once
export function apply(container) {
  // Inject global UI kit CSS once
  if (!document.getElementById('mw-ui-kit-style')) {
    const css = `
      /* -------------------------------------------------
         Aries Module UI Kit — glass / dark theme
         ------------------------------------------------- */

      :root {
        /* Core tokens (override from workspace.css if needed) */
        --mw-bg:             #020617;
        --mw-surface:        #020617;
        --mw-surface-soft:   #020617;

        --mw-card:           rgba(15,23,42,0.98);
        --mw-card-soft:      rgba(15,23,42,0.96);
        --mw-card-subtle:    rgba(15,23,42,0.92);

        --mw-accent:         #3b82f6;
        --mw-accent-soft:    rgba(37,99,235,0.18);
        --mw-accent-strong:  #2563eb;

        --mw-success:        #22c55e;
        --mw-warning:        #eab308;
        --mw-danger:         #ef4444;

        --mw-text:           #e5e7eb;
        --mw-text-soft:      #cbd5f5;
        --mw-muted:          #9ca3af;
        --mw-border-subtle:  rgba(148,163,184,0.55);
        --mw-border-strong:  rgba(148,163,184,0.9);

        --mw-radius:         14px;
        --mw-radius-sm:      10px;
        --mw-radius-pill:    999px;
        --mw-gap:            12px;
      }

      /* Root module wrapper */
      .mw-module {
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: var(--mw-text);
        background: transparent;
        font-size: 14px;
        display: flex;
        flex-direction: column;
        min-height: 0;
      }

      /* Nice scrollbars inside modules (desktop only) */
      .mw-module * {
        scrollbar-width: thin;
        scrollbar-color: rgba(148,163,184,0.9) rgba(15,23,42,0.9);
      }

      .mw-module *::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      .mw-module *::-webkit-scrollbar-track {
        background: rgba(15,23,42,0.95);
      }
      .mw-module *::-webkit-scrollbar-thumb {
        background: rgba(148,163,184,0.9);
        border-radius: 999px;
      }
      .mw-module *::-webkit-scrollbar-thumb:hover {
        background: #e5e7eb;
      }

      /* -------------------------------------------------
         Cards / Panels
         ------------------------------------------------- */

      /* Generic glass card */
      .mw-card {
        background:
          radial-gradient(circle at top left, rgba(148,163,184,0.18), transparent 55%),
          radial-gradient(circle at bottom right, rgba(59,130,246,0.2), transparent 55%),
          var(--mw-card-soft);
        border-radius: var(--mw-radius);
        padding: 12px;
        border: 1px solid var(--mw-border-subtle);
        box-shadow:
          0 24px 60px rgba(0,0,0,0.75),
          0 0 0 1px rgba(15,23,42,0.9);
      }

      /* Slightly softer / flatter card */
      .mw-card-soft {
        background: var(--mw-card-subtle);
        border-radius: var(--mw-radius);
        padding: 10px;
        border: 1px solid rgba(30,64,175,0.7);
        box-shadow: 0 16px 38px rgba(15,23,42,0.85);
      }

      /* High elevation panel (good for sidebars / toolbars) */
      .mw-panel {
        background:
          radial-gradient(circle at top left, rgba(56,189,248,0.14), transparent 55%),
          radial-gradient(circle at bottom right, rgba(236,72,153,0.18), transparent 55%),
          rgba(15,23,42,0.98);
        border-radius: var(--mw-radius);
        padding: 10px 12px;
        border: 1px solid var(--mw-border-subtle);
        box-shadow: 0 20px 50px rgba(15,23,42,0.95);
      }

      /* -------------------------------------------------
         Typography helpers
         ------------------------------------------------- */

      .mw-heading {
        font-size: 0.98rem;
        font-weight: 600;
        letter-spacing: 0.02em;
        color: #f9fafb;
      }

      .mw-label {
        font-size: 0.76rem;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--mw-muted);
      }

      .mw-kicker {
        font-size: 0.78rem;
        text-transform: uppercase;
        color: var(--mw-accent-soft);
        letter-spacing: 0.18em;
      }

      .mw-small {
        font-size: 12px;
        color: var(--mw-muted);
      }

      /* Pills / badges */
      .mw-pill {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.1rem 0.55rem;
        border-radius: var(--mw-radius-pill);
        background: rgba(15,23,42,0.95);
        border: 1px solid rgba(148,163,184,0.7);
        font-size: 0.72rem;
        color: var(--mw-text-soft);
      }

      .mw-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.05rem 0.4rem;
        border-radius: 999px;
        font-size: 0.68rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        background: rgba(37,99,235,0.16);
        color: #bfdbfe;
      }

      .mw-badge-success {
        background: rgba(22,163,74,0.22);
        color: #bbf7d0;
      }

      .mw-badge-warning {
        background: rgba(234,179,8,0.24);
        color: #fef9c3;
      }

      .mw-badge-danger {
        background: rgba(239,68,68,0.26);
        color: #fecaca;
      }

      /* -------------------------------------------------
         Layout helpers
         ------------------------------------------------- */

      .mw-row {
        display: flex;
        gap: 10px;
        align-items: center;
      }

      .mw-col {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .mw-toolbar {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        align-items: center;
      }

      .mw-toolbar + * {
        margin-top: 4px;
      }

      /* -------------------------------------------------
         Buttons
         ------------------------------------------------- */

      .mw-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 7px 13px;
        border-radius: var(--mw-radius-pill);
        border: 1px solid rgba(15,23,42,0.9);
        background: linear-gradient(135deg, var(--mw-accent-strong), #1d4ed8);
        color: #f9fafb;
        cursor: pointer;
        font-weight: 600;
        font-size: 0.82rem;
        letter-spacing: 0.01em;
        text-decoration: none;
        white-space: nowrap;
        box-shadow:
          0 12px 30px rgba(37,99,235,0.65),
          0 0 0 1px rgba(15,23,42,0.9);
        transition:
          background 0.15s ease,
          box-shadow 0.15s ease,
          transform 0.12s ease,
          border-color 0.15s ease,
          color 0.15s ease;
      }

      .mw-btn:hover {
        background: linear-gradient(135deg, #1d4ed8, #1d4ed8);
        box-shadow:
          0 16px 40px rgba(37,99,235,0.85),
          0 0 0 1px rgba(15,23,42,0.9);
        transform: translateY(-1px);
      }

      .mw-btn:active {
        transform: translateY(0);
        box-shadow:
          0 8px 18px rgba(15,23,42,0.9),
          0 0 0 1px rgba(15,23,42,0.9);
      }

      .mw-btn:focus-visible {
        outline: 2px solid #38bdf8;
        outline-offset: 2px;
      }

      .mw-btn[disabled],
      .mw-btn[aria-disabled="true"] {
        opacity: 0.55;
        cursor: default;
        box-shadow: none;
        background: rgba(15,23,42,0.85);
        border-color: rgba(55,65,81,0.9);
      }

      /* Size variant */
      .mw-btn-sm {
        padding: 4px 9px;
        font-size: 0.76rem;
        border-radius: 999px;
      }

      /* Icon-only button */
      .mw-btn-icon {
        width: 30px;
        height: 30px;
        padding: 0;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      /* Ghost / subtle button variant */
      .mw-btn-ghost {
        background: rgba(15,23,42,0.9);
        border-color: var(--mw-border-subtle);
        color: var(--mw-text);
        box-shadow: 0 10px 24px rgba(15,23,42,0.9);
      }

      .mw-btn-ghost:hover {
        background: rgba(37,99,235,0.12);
        border-color: var(--mw-accent);
        color: #e5e7eb;
      }

      /* Outline button */
      .mw-btn-outline {
        background: transparent;
        border-color: rgba(148,163,184,0.8);
        color: var(--mw-text-soft);
        box-shadow: none;
      }

      .mw-btn-outline:hover {
        background: rgba(37,99,235,0.12);
        border-color: var(--mw-accent);
        box-shadow: 0 8px 20px rgba(15,23,42,0.85);
      }

      /* Danger button */
      .mw-btn-danger {
        background: #b91c1c;
        border-color: #7f1d1d;
        box-shadow: 0 12px 30px rgba(239,68,68,0.65);
      }

      .mw-btn-danger:hover {
        background: #dc2626;
        border-color: #b91c1c;
      }

      /* -------------------------------------------------
         Inputs / Textareas
         ------------------------------------------------- */

      .mw-input,
      .mw-textarea {
        padding: 8px 10px;
        border-radius: var(--mw-radius-sm);
        border: 1px solid var(--mw-border-subtle);
        min-width: 120px;
        box-sizing: border-box;
        background: rgba(15,23,42,0.96);
        color: var(--mw-text);
        font: inherit;
      }

      .mw-input::placeholder,
      .mw-textarea::placeholder {
        color: var(--mw-muted);
      }

      .mw-input:focus-visible,
      .mw-textarea:focus-visible {
        outline: 2px solid var(--mw-accent);
        outline-offset: 1px;
        border-color: var(--mw-accent);
        box-shadow: 0 0 0 1px rgba(15,23,42,0.9);
      }

      .mw-input[disabled],
      .mw-textarea[disabled] {
        opacity: 0.6;
        cursor: not-allowed;
        background: rgba(15,23,42,0.8);
      }

      .mw-textarea {
        min-height: 120px;
        width: 100%;
        resize: vertical;
      }

      /* Field wrapper helpers */
      .mw-field {
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-size: 0.8rem;
      }

      .mw-field-inline {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .mw-help {
        font-size: 0.75rem;
        color: var(--mw-muted);
      }

      /* Chips / small tokens */
      .mw-chip {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.12rem 0.55rem;
        border-radius: 999px;
        font-size: 0.76rem;
        background: rgba(15,23,42,0.9);
        border: 1px solid rgba(75,85,99,0.9);
        color: var(--mw-text-soft);
      }

      /* -------------------------------------------------
         Workspace layout overrides (full-screen modules)
         ------------------------------------------------- */

      html,
      body {
        height: 100%;
      }

      .page-wrapper.workspace-page,
      .workspace-frame,
      .workspace-main {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
      }

      #workspace-root,
      .workspace-root,
      .workspace-module-host {
        flex: 1 1 auto;
        min-height: 0;
        display: flex;
      }

      #workspace-root > .mw-module,
      .workspace-root > .mw-module,
      .workspace-module-host > .mw-module {
        flex: 1 1 auto;
        min-height: 0;
        display: flex;
        flex-direction: column;
      }

      /* Hide breadcrumb + subtitle line on workspace page */
      .workspace-breadcrumb,
      .workspace-page-subtitle {
        display: none !important;
      }
    `;
    const s = document.createElement('style');
    s.id = 'mw-ui-kit-style';
    s.innerHTML = css;
    document.head.appendChild(s);
  }

  // ensure module root exists
  let root = container.querySelector('.mw-module');
  if (!root) {
    root = document.createElement('div');
    root.className = 'mw-module';
    container.appendChild(root);
  }
  return root;
}

// small DOM helpers
export function mk(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const k in attrs) {
    if (k === 'class') {
      el.className = attrs[k];
    } else if (k === 'html') {
      el.innerHTML = attrs[k];
    } else if (k.startsWith('on') && typeof attrs[k] === 'function') {
      el.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
    } else {
      el.setAttribute(k, attrs[k]);
    }
  }
  for (const c of children) {
    if (c == null) continue;
    el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return el;
}

// debounce util
export function debounce(fn, wait = 300) {
  let t = 0;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}
