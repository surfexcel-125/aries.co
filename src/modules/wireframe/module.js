// /src/modules/wireframe/module.js
// Aries Wireframe Module — idea → visual, fast + clean.

import { apply as applyUiKit } from '../shared/ui-kit.js';

/**
 * Public metadata (your loader/router can use this).
 */
export const meta = {
  id: 'wireframe',
  title: 'Wireframe',
  icon: 'layout-dashboard', // use whatever icon set you map this to
  description: 'Turn ideas and user flows into quick, low-fidelity screens.'
};

// ---- Internal state --------------------------------------------------------

let rootEl = null;
let canvasEl = null;
let canvasInnerEl = null;
let paletteEl = null;
let inspectorEl = null;
let zoomLabelEl = null;
let zoomInputEl = null;

let nodes = [];
let selectedId = null;
let zoomFactor = 1;

let dragState = null;

const POINTER_MOVE_HANDLER = handlePointerMove;
const POINTER_UP_HANDLER = handlePointerUp;

// ---- Utilities -------------------------------------------------------------

function createId() {
  return 'wf_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
}

function getNodeById(id) {
  return nodes.find(n => n.id === id) || null;
}

function getSelectedNode() {
  return selectedId ? getNodeById(selectedId) : null;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// ---- Node creation & rendering --------------------------------------------

const NODE_TEMPLATES = {
  screen: {
    title: 'Screen',
    description: 'A generic app or web screen',
    badge: 'Screen',
    width: 420,
    height: 280
  },
  flow: {
    title: 'Flow Step',
    description: 'Step in a journey',
    badge: 'Flow',
    width: 320,
    height: 200
  },
  card: {
    title: 'Card',
    description: 'Content or feature block',
    badge: 'Card',
    width: 260,
    height: 180
  },
  list: {
    title: 'List / Table',
    description: 'Items, results, or records',
    badge: 'Data',
    width: 420,
    height: 220
  },
  form: {
    title: 'Form',
    description: 'Inputs, fields, actions',
    badge: 'Form',
    width: 380,
    height: 260
  },
  modal: {
    title: 'Modal',
    description: 'Overlay or pop-up pattern',
    badge: 'Modal',
    width: 360,
    height: 220
  }
};

function createNode(type) {
  const tpl = NODE_TEMPLATES[type] || NODE_TEMPLATES.screen;
  const baseX = 80 + nodes.length * 40;
  const baseY = 80 + nodes.length * 30;

  return {
    id: createId(),
    type,
    title: tpl.title,
    description: tpl.description,
    badge: tpl.badge,
    x: baseX,
    y: baseY,
    width: tpl.width,
    height: tpl.height,
    layout: 'column', // 'row' or 'column'
    tone: 'outline',  // 'outline' | 'filled' | 'ghost'
    primary: false,
    emphasis: 'normal' // 'normal' | 'quiet'
  };
}

function nodeToneClass(node) {
  return `mw-wf-node--tone-${node.tone}`;
}

function nodeLayoutClass(node) {
  return node.layout === 'row' ? 'mw-wf-node--layout-row' : 'mw-wf-node--layout-column';
}

function nodeEmphasisClass(node) {
  return node.emphasis === 'quiet' ? 'mw-wf-node--quiet' : '';
}

function renderNode(node) {
  if (!canvasInnerEl) return;

  let el = canvasInnerEl.querySelector(`.mw-wf-node[data-id="${node.id}"]`);

  const baseClasses = [
    'mw-wf-node',
    nodeToneClass(node),
    nodeLayoutClass(node),
    nodeEmphasisClass(node),
    node.primary ? 'mw-wf-node--primary' : '',
    selectedId === node.id ? 'is-selected' : ''
  ].filter(Boolean).join(' ');

  const styleAttr = [
    `transform: translate(${node.x}px, ${node.y}px);`,
    `width: ${node.width}px;`,
    `height: ${node.height}px;`
  ].join(' ');

  const html = `
    <article
      class="${baseClasses}"
      data-id="${node.id}"
      data-type="${node.type}"
      tabindex="0"
      style="${styleAttr}"
    >
      <header class="mw-wf-node-header" data-wf-drag-handle>
        <div class="mw-wf-node-header-main">
          <span class="mw-wf-node-badge">${node.badge}</span>
          <span class="mw-wf-node-title">${node.title}</span>
        </div>
        <div class="mw-wf-node-header-actions">
          <button type="button" class="mw-wf-chip mw-wf-chip--ghost" data-wf-action="duplicate">
            ⧉
          </button>
          <button type="button" class="mw-wf-chip mw-wf-chip--ghost" data-wf-action="delete">
            ✕
          </button>
        </div>
      </header>

      <section class="mw-wf-node-body">
        <div class="mw-wf-skeleton-line mw-wf-skeleton-line--lg"></div>
        <div class="mw-wf-skeleton-line"></div>
        <div class="mw-wf-skeleton-line"></div>
        <div class="mw-wf-skeleton-line mw-wf-skeleton-line--muted"></div>
        <div class="mw-wf-skeleton-row">
          <div class="mw-wf-skeleton-pill"></div>
          <div class="mw-wf-skeleton-pill mw-wf-skeleton-pill--short"></div>
        </div>
      </section>

      <footer class="mw-wf-node-footer">
        <span class="mw-wf-node-footer-label">${node.description}</span>
      </footer>
    </article>
  `;

  if (!el) {
    canvasInnerEl.insertAdjacentHTML('beforeend', html);
  } else {
    el.outerHTML = html;
  }
}

function renderAllNodes() {
  if (!canvasInnerEl) return;
  canvasInnerEl.innerHTML = '';
  nodes.forEach(renderNode);
}

function syncSelectionClasses() {
  if (!canvasInnerEl) return;
  canvasInnerEl.querySelectorAll('.mw-wf-node').forEach(el => {
    const id = el.getAttribute('data-id');
    if (id === selectedId) {
      el.classList.add('is-selected');
    } else {
      el.classList.remove('is-selected');
    }
  });
}

// ---- Inspector -------------------------------------------------------------

function syncInspector() {
  if (!inspectorEl) return;

  const emptyState = inspectorEl.querySelector('[data-wf-inspector-empty]');
  const panel = inspectorEl.querySelector('[data-wf-inspector-panel]');

  const titleInput = inspectorEl.querySelector('[data-wf-prop="title"]');
  const descInput = inspectorEl.querySelector('[data-wf-prop="description"]');
  const typeBadge = inspectorEl.querySelector('[data-wf-prop="type"]');
  const layoutSelect = inspectorEl.querySelector('[data-wf-prop="layout"]');
  const toneSelect = inspectorEl.querySelector('[data-wf-prop="tone"]');
  const primaryCheckbox = inspectorEl.querySelector('[data-wf-prop="primary"]');
  const emphasisSelect = inspectorEl.querySelector('[data-wf-prop="emphasis"]');

  const node = getSelectedNode();

  if (!node) {
    if (emptyState) emptyState.hidden = false;
    if (panel) panel.hidden = true;
    return;
  }

  if (emptyState) emptyState.hidden = true;
  if (panel) panel.hidden = false;

  if (titleInput) titleInput.value = node.title || '';
  if (descInput) descInput.value = node.description || '';
  if (typeBadge) typeBadge.textContent = node.badge || node.type || 'Node';
  if (layoutSelect) layoutSelect.value = node.layout || 'column';
  if (toneSelect) toneSelect.value = node.tone || 'outline';
  if (primaryCheckbox) primaryCheckbox.checked = !!node.primary;
  if (emphasisSelect) emphasisSelect.value = node.emphasis || 'normal';
}

function applyInspectorChange(prop, value) {
  const node = getSelectedNode();
  if (!node) return;

  if (prop === 'primary') {
    node.primary = !!value;
  } else {
    node[prop] = value;
  }

  renderNode(node);
  syncSelectionClasses();
}

// ---- Selection -------------------------------------------------------------

function selectNode(id) {
  selectedId = id;
  syncSelectionClasses();
  syncInspector();
}

function deleteNode(id) {
  if (!id) return;
  nodes = nodes.filter(n => n.id !== id);
  const nodeEl = canvasInnerEl?.querySelector(`.mw-wf-node[data-id="${id}"]`);
  if (nodeEl && nodeEl.parentNode) nodeEl.parentNode.removeChild(nodeEl);
  if (selectedId === id) {
    selectedId = null;
    syncInspector();
  }
}

function duplicateNode(id) {
  const node = getNodeById(id);
  if (!node) return;

  const copy = {
    ...node,
    id: createId(),
    title: node.title + ' copy',
    x: node.x + 40,
    y: node.y + 40
  };

  nodes.push(copy);
  renderNode(copy);
  selectNode(copy.id);
}

// ---- Canvas interactions ---------------------------------------------------

function handleCanvasClick(event) {
  const nodeEl = event.target.closest('.mw-wf-node');
  if (!nodeEl) {
    selectNode(null);
    return;
  }

  const id = nodeEl.getAttribute('data-id');
  selectNode(id);
}

function handleNodeButtons(event) {
  const actionBtn = event.target.closest('[data-wf-action]');
  if (!actionBtn) return;

  const action = actionBtn.getAttribute('data-wf-action');
  const nodeEl = actionBtn.closest('.mw-wf-node');
  if (!nodeEl) return;

  const id = nodeEl.getAttribute('data-id');
  if (!id) return;

  if (action === 'delete') {
    deleteNode(id);
  } else if (action === 'duplicate') {
    duplicateNode(id);
  }
}

function handlePointerDown(event) {
  const handle = event.target.closest('[data-wf-drag-handle]');
  if (!handle) return;

  const nodeEl = handle.closest('.mw-wf-node');
  if (!nodeEl) return;

  const id = nodeEl.getAttribute('data-id');
  const node = getNodeById(id);
  if (!node) return;

  event.preventDefault();
  selectNode(id);

  dragState = {
    nodeId: id,
    startX: event.clientX,
    startY: event.clientY,
    nodeStartX: node.x,
    nodeStartY: node.y
  };

  nodeEl.classList.add('is-dragging');
  window.addEventListener('pointermove', POINTER_MOVE_HANDLER);
  window.addEventListener('pointerup', POINTER_UP_HANDLER);
}

function handlePointerMove(event) {
  if (!dragState) return;

  const node = getNodeById(dragState.nodeId);
  if (!node) return;

  const dx = (event.clientX - dragState.startX) / zoomFactor;
  const dy = (event.clientY - dragState.startY) / zoomFactor;

  node.x = dragState.nodeStartX + dx;
  node.y = dragState.nodeStartY + dy;

  renderNode(node);
  syncSelectionClasses();
}

function handlePointerUp() {
  if (!dragState) return;

  const node = getNodeById(dragState.nodeId);
  const nodeEl = node && canvasInnerEl?.querySelector(`.mw-wf-node[data-id="${node.id}"]`);
  if (nodeEl) nodeEl.classList.remove('is-dragging');

  dragState = null;
  window.removeEventListener('pointermove', POINTER_MOVE_HANDLER);
  window.removeEventListener('pointerup', POINTER_UP_HANDLER);
}

// ---- Zoom ------------------------------------------------------------------

function setZoomFromInput(value) {
  const v = clamp(Number(value) || 100, 50, 200);
  zoomFactor = v / 100;

  if (zoomLabelEl) zoomLabelEl.textContent = `${v}%`;
  if (zoomInputEl) zoomInputEl.value = String(v);
  if (canvasInnerEl) {
    canvasInnerEl.style.transform = `scale(${zoomFactor})`;
    canvasInnerEl.style.transformOrigin = '0 0';
  }
}

// ---- Keyboard shortcuts ----------------------------------------------------

function handleKeyDown(event) {
  const node = getSelectedNode();
  if (!node) return;

  if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault();
    deleteNode(node.id);
    return;
  }

  // Move by arrow keys (nudge)
  const step = event.shiftKey ? 16 : 4;

  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
    event.preventDefault();

    if (event.key === 'ArrowUp') node.y -= step;
    if (event.key === 'ArrowDown') node.y += step;
    if (event.key === 'ArrowLeft') node.x -= step;
    if (event.key === 'ArrowRight') node.x += step;

    renderNode(node);
    syncSelectionClasses();
    return;
  }

  // Duplicate: Ctrl/Cmd + D
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
    event.preventDefault();
    duplicateNode(node.id);
  }
}

// ---- Palette ---------------------------------------------------------------

function handlePaletteClick(event) {
  const btn = event.target.closest('[data-wf-palette-type]');
  if (!btn) return;

  const type = btn.getAttribute('data-wf-palette-type');
  const node = createNode(type);
  nodes.push(node);
  renderNode(node);
  selectNode(node.id);
}

// ---- Inspector change handlers --------------------------------------------

function setupInspectorBindings() {
  if (!inspectorEl) return;

  inspectorEl.addEventListener('input', event => {
    const target = event.target;
    const prop = target.getAttribute('data-wf-prop');
    if (!prop) return;

    if (prop === 'title') {
      applyInspectorChange('title', target.value);
    } else if (prop === 'description') {
      applyInspectorChange('description', target.value);
    }
  });

  inspectorEl.addEventListener('change', event => {
    const target = event.target;
    const prop = target.getAttribute('data-wf-prop');
    if (!prop) return;

    if (prop === 'layout') {
      applyInspectorChange('layout', target.value);
    } else if (prop === 'tone') {
      applyInspectorChange('tone', target.value);
    } else if (prop === 'primary') {
      applyInspectorChange('primary', target.checked);
    } else if (prop === 'emphasis') {
      applyInspectorChange('emphasis', target.value);
    }
  });
}

// ---- Mount / Unmount -------------------------------------------------------

export function mount(container, context = {}) {
  applyUiKit(container);

  container.classList.add('mw-wireframe-host');
  container.tabIndex = 0;

  container.innerHTML = `
    <div class="mw-wireframe">
      <header class="mw-wf-header">
        <div class="mw-wf-header-left">
          <span class="mw-wf-header-pill">Wireframe</span>
          <div class="mw-wf-header-titles">
            <h1 class="mw-wf-header-title">Idea-to-UI workspace</h1>
            <p class="mw-wf-header-subtitle">
              Sketch flows, screens, and states before you commit to pixels.
            </p>
          </div>
        </div>
        <div class="mw-wf-header-actions">
          <button type="button" class="mw-wf-btn mw-wf-btn--ghost" data-wf-action="autotidy">
            Auto tidy
          </button>
          <button type="button" class="mw-wf-btn mw-wf-btn--primary" data-wf-action="quick-screen">
            + Screen
          </button>
        </div>
      </header>

      <section class="mw-wf-body">
        <aside class="mw-wf-panel mw-wf-panel--left">
          <div class="mw-wf-panel-header">
            <span class="mw-wf-panel-title">Palette</span>
            <span class="mw-wf-panel-subtitle">Drag concepts into the canvas</span>
          </div>
          <div class="mw-wf-palette-grid" data-wf-palette>
            <button type="button" class="mw-wf-palette-item" data-wf-palette-type="screen">
              <span class="mw-wf-palette-label">Screen</span>
              <span class="mw-wf-palette-desc">Full view</span>
            </button>
            <button type="button" class="mw-wf-palette-item" data-wf-palette-type="flow">
              <span class="mw-wf-palette-label">Flow step</span>
              <span class="mw-wf-palette-desc">Journey node</span>
            </button>
            <button type="button" class="mw-wf-palette-item" data-wf-palette-type="card">
              <span class="mw-wf-palette-label">Card</span>
              <span class="mw-wf-palette-desc">Block content</span>
            </button>
            <button type="button" class="mw-wf-palette-item" data-wf-palette-type="list">
              <span class="mw-wf-palette-label">List / table</span>
              <span class="mw-wf-palette-desc">Results, rows</span>
            </button>
            <button type="button" class="mw-wf-palette-item" data-wf-palette-type="form">
              <span class="mw-wf-palette-label">Form</span>
              <span class="mw-wf-palette-desc">Inputs, fields</span>
            </button>
            <button type="button" class="mw-wf-palette-item" data-wf-palette-type="modal">
              <span class="mw-wf-palette-label">Modal</span>
              <span class="mw-wf-palette-desc">Overlay</span>
            </button>
          </div>
        </aside>

        <main class="mw-wf-canvas-shell">
          <div class="mw-wf-canvas-toolbar">
            <div class="mw-wf-crumbs">
              <span class="mw-wf-crumb mw-wf-crumb--muted">User journey</span>
              <span class="mw-wf-crumb">Wireframe map</span>
            </div>
            <div class="mw-wf-toolbar-right">
              <div class="mw-wf-zoom-control">
                <button type="button" class="mw-wf-chip mw-wf-chip--ghost" data-wf-zoom="out">−</button>
                <span class="mw-wf-zoom-label" data-wf-zoom-label>100%</span>
                <button type="button" class="mw-wf-chip mw-wf-chip--ghost" data-wf-zoom="in">+</button>
                <input type="range" min="50" max="200" value="100" class="mw-wf-zoom-slider" data-wf-zoom-input />
              </div>
            </div>
          </div>

          <div class="mw-wf-canvas-viewport">
            <div class="mw-wf-canvas-grid"></div>
            <div class="mw-wf-canvas-inner"></div>
          </div>
        </main>

        <aside class="mw-wf-panel mw-wf-panel--right" data-wf-inspector>
          <div class="mw-wf-panel-header">
            <span class="mw-wf-panel-title">Inspector</span>
            <span class="mw-wf-panel-subtitle">Tune the selected frame</span>
          </div>

          <div class="mw-wf-inspector-empty" data-wf-inspector-empty>
            <p class="mw-wf-inspector-empty-title">Nothing selected</p>
            <p class="mw-wf-inspector-empty-text">
              Add a screen or node, then click it to edit details here.
            </p>
          </div>

          <div class="mw-wf-inspector-panel" data-wf-inspector-panel hidden>
            <section class="mw-wf-inspector-section">
              <label class="mw-wf-field">
                <span class="mw-wf-field-label">Title</span>
                <input type="text" data-wf-prop="title" class="mw-wf-input" placeholder="Screen title" />
              </label>

              <label class="mw-wf-field">
                <span class="mw-wf-field-label">Purpose</span>
                <textarea data-wf-prop="description" class="mw-wf-textarea" rows="2"
                  placeholder="What happens here?"></textarea>
              </label>

              <div class="mw-wf-field-row">
                <div class="mw-wf-field">
                  <span class="mw-wf-field-label">Type</span>
                  <span class="mw-wf-pill" data-wf-prop="type">Node</span>
                </div>
                <label class="mw-wf-field mw-wf-field--checkbox">
                  <input type="checkbox" data-wf-prop="primary" />
                  <span>Primary step</span>
                </label>
              </div>
            </section>

            <section class="mw-wf-inspector-section">
              <div class="mw-wf-field-row">
                <label class="mw-wf-field">
                  <span class="mw-wf-field-label">Layout</span>
                  <select class="mw-wf-select" data-wf-prop="layout">
                    <option value="column">Stacked</option>
                    <option value="row">Side-by-side</option>
                  </select>
                </label>

                <label class="mw-wf-field">
                  <span class="mw-wf-field-label">Tone</span>
                  <select class="mw-wf-select" data-wf-prop="tone">
                    <option value="outline">Outline</option>
                    <option value="filled">Filled</option>
                    <option value="ghost">Ghost</option>
                  </select>
                </label>
              </div>

              <label class="mw-wf-field">
                <span class="mw-wf-field-label">Emphasis</span>
                <select class="mw-wf-select" data-wf-prop="emphasis">
                  <option value="normal">Normal</option>
                  <option value="quiet">Quiet</option>
                </select>
              </label>
            </section>

            <section class="mw-wf-inspector-section mw-wf-inspector-hint">
              <p class="mw-wf-inspector-hint-title">Tip</p>
              <p class="mw-wf-inspector-hint-text">
                Use <kbd>Shift</kbd> + arrow keys to nudge frames faster, and
                <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>D</kbd> to duplicate.
              </p>
            </section>
          </div>
        </aside>
      </section>
    </div>
  `;

  rootEl = container.querySelector('.mw-wireframe');
  canvasEl = container.querySelector('.mw-wf-canvas-viewport');
  canvasInnerEl = container.querySelector('.mw-wf-canvas-inner');
  paletteEl = container.querySelector('[data-wf-palette]');
  inspectorEl = container.querySelector('[data-wf-inspector]');
  zoomLabelEl = container.querySelector('[data-wf-zoom-label]');
  zoomInputEl = container.querySelector('[data-wf-zoom-input]');

  // Initial zoom
  setZoomFromInput(100);

  // Seed with one screen
  nodes = [createNode('screen')];
  renderAllNodes();
  selectNode(nodes[0].id);

  // Events
  if (canvasEl) {
    canvasEl.addEventListener('click', handleCanvasClick);
    canvasEl.addEventListener('pointerdown', handlePointerDown);
    canvasEl.addEventListener('click', handleNodeButtons);
  }

  if (paletteEl) {
    paletteEl.addEventListener('click', handlePaletteClick);
  }

  if (zoomInputEl) {
    zoomInputEl.addEventListener('input', e => setZoomFromInput(e.target.value));
  }

  const zoomOutBtn = container.querySelector('[data-wf-zoom="out"]');
  const zoomInBtn = container.querySelector('[data-wf-zoom="in"]');

  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', () => {
      const next = clamp((zoomFactor * 100) - 10, 50, 200);
      setZoomFromInput(next);
    });
  }

  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', () => {
      const next = clamp((zoomFactor * 100) + 10, 50, 200);
      setZoomFromInput(next);
    });
  }

  const autoTidyBtn = container.querySelector('[data-wf-action="autotidy"]');
  if (autoTidyBtn) {
    autoTidyBtn.addEventListener('click', () => {
      // Simple auto-layout: grid the nodes
      const cols = 3;
      const hGap = 80;
      const vGap = 80;
      const startX = 80;
      const startY = 80;

      nodes.forEach((node, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        node.x = startX + col * (node.width + hGap);
        node.y = startY + row * (node.height + vGap);
      });

      renderAllNodes();
      syncSelectionClasses();
    });
  }

  const quickScreenBtn = container.querySelector('[data-wf-action="quick-screen"]');
  if (quickScreenBtn) {
    quickScreenBtn.addEventListener('click', () => {
      const node = createNode('screen');
      nodes.push(node);
      renderNode(node);
      selectNode(node.id);
    });
  }

  setupInspectorBindings();
  container.addEventListener('keydown', handleKeyDown);

  // Give keyboard focus so shortcuts work immediately
  container.focus();
}

export function unmount(container) {
  window.removeEventListener('pointermove', POINTER_MOVE_HANDLER);
  window.removeEventListener('pointerup', POINTER_UP_HANDLER);

  if (container) {
    container.removeEventListener('keydown', handleKeyDown);
    container.innerHTML = '';
    container.classList.remove('mw-wireframe-host');
  }

  rootEl = null;
  canvasEl = null;
  canvasInnerEl = null;
  paletteEl = null;
  inspectorEl = null;
  zoomLabelEl = null;
  zoomInputEl = null;

  nodes = [];
  selectedId = null;
  dragState = null;
  zoomFactor = 1;
}

export default {
  meta,
  mount,
  unmount
};
